import os
from difflib import get_close_matches
from typing import Dict, List, Optional, Set, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "drug_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "nirog_profile_ranker.pkl")

RANDOM_STATE = 42
MAX_RESULTS = 8

FREQUENCY_BASE_SCORE = {
    "Very Common": 82,
    "Common": 68,
    "Uncommon": 36,
    "Rare": 12,
}

SEVERITY_MULTIPLIER = {
    "Mild": 0.94,
    "Moderate": 1.08,
    "Severe": 1.22,
}

_MODEL_CACHE = None


def _load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH).fillna("")
    for column in ["Drug_Name", "Side_Effect", "Frequency", "Severity", "Risk_Factors"]:
        df[column] = df[column].astype(str).str.strip()
    return df


def _normalize_token(value: str) -> str:
    return str(value).strip().lower().replace(" ", "_")


def _normalize_drug_name(value: str) -> str:
    return str(value).strip().lower()


def _split_risk_factors(value: str) -> Set[str]:
    if not value or str(value).strip().lower() == "nan":
        return set()
    return {
        _normalize_token(token)
        for token in str(value).split(";")
        if str(token).strip()
    }


def _build_effect_profiles(df: pd.DataFrame) -> Dict[str, Dict]:
    profiles = {}
    for effect_name, group in df.groupby("Side_Effect"):
        frequency = group["Frequency"].mode().iloc[0] if not group["Frequency"].mode().empty else "Uncommon"
        severity = group["Severity"].mode().iloc[0] if not group["Severity"].mode().empty else "Moderate"
        risk_factors = set()
        for value in group["Risk_Factors"]:
            risk_factors.update(_split_risk_factors(value))

        profiles[effect_name] = {
            "frequency": frequency,
            "severity": severity,
            "risk_factors": risk_factors,
            "support": int(len(group)),
        }

    return profiles


def _build_feature_dict(
    drug_name: str,
    effect_name: str,
    frequency: str,
    severity: str,
    patient_risks: Set[str],
    effect_risks: Set[str],
    effect_support: int,
) -> Dict[str, float]:
    matched_risks = patient_risks & effect_risks
    features: Dict[str, float] = {
        "drug_name": _normalize_drug_name(drug_name),
        "candidate_effect": effect_name.lower(),
        "frequency": frequency,
        "severity": severity,
        "patient_risk_count": float(len(patient_risks)),
        "effect_risk_count": float(len(effect_risks)),
        "matched_risk_count": float(len(matched_risks)),
        "risk_match_ratio": float(len(matched_risks) / max(1, len(effect_risks))),
        "effect_support": float(effect_support),
        "has_any_patient_risk": float(bool(patient_risks)),
        "has_any_effect_risk": float(bool(effect_risks)),
    }

    for token in patient_risks:
        features[f"patient_risk::{token}"] = 1.0

    for token in effect_risks:
        features[f"effect_risk::{token}"] = 1.0

    for token in matched_risks:
        features[f"matched_risk::{token}"] = 1.0

    return features


def _generate_patient_profiles(
    effect_risks: Set[str],
    all_risks: List[str],
    rng: np.random.Generator,
) -> List[Set[str]]:
    profiles: List[Set[str]] = []
    base_risks = set(effect_risks)
    extras_pool = [risk for risk in all_risks if risk not in base_risks]

    profiles.append(set(base_risks))

    if base_risks:
        subset_size = max(1, len(base_risks) // 2)
        subset = set(rng.choice(sorted(base_risks), size=subset_size, replace=False).tolist())
        profiles.append(subset)
        profiles.append(set(base_risks))
    else:
        profiles.append(set())
        profiles.append(set())

    if extras_pool:
        extra_count = min(2, len(extras_pool))
        extras = set(rng.choice(extras_pool, size=extra_count, replace=False).tolist())
        profiles.append(set(base_risks) | extras)
    else:
        profiles.append(set(base_risks))

    unique_profiles = []
    seen = set()
    for profile in profiles:
        key = tuple(sorted(profile))
        if key not in seen:
            unique_profiles.append(profile)
            seen.add(key)

    return unique_profiles


def _build_training_examples(df: pd.DataFrame) -> Tuple[List[Dict[str, float]], np.ndarray, Dict]:
    rng = np.random.default_rng(RANDOM_STATE)
    effect_profiles = _build_effect_profiles(df)
    all_effects = sorted(effect_profiles.keys())
    all_risks = sorted(
        {
            risk
            for profile in effect_profiles.values()
            for risk in profile["risk_factors"]
        }
    )
    drug_to_effects = df.groupby("Drug_Name")["Side_Effect"].apply(set).to_dict()

    features: List[Dict[str, float]] = []
    labels: List[int] = []

    for row in df.itertuples(index=False):
        effect_risks = _split_risk_factors(row.Risk_Factors)
        patient_profiles = _generate_patient_profiles(effect_risks, all_risks, rng)

        for patient_risks in patient_profiles:
            features.append(
                _build_feature_dict(
                    drug_name=row.Drug_Name,
                    effect_name=row.Side_Effect,
                    frequency=row.Frequency,
                    severity=row.Severity,
                    patient_risks=patient_risks,
                    effect_risks=effect_risks,
                    effect_support=effect_profiles[row.Side_Effect]["support"],
                )
            )
            labels.append(1)

            unavailable_effects = [
                effect for effect in all_effects if effect not in drug_to_effects[row.Drug_Name]
            ]
            if not unavailable_effects:
                continue

            negative_count = min(3, len(unavailable_effects))
            negative_candidates = rng.choice(unavailable_effects, size=negative_count, replace=False)
            for negative_effect in negative_candidates.tolist():
                negative_profile = effect_profiles[negative_effect]
                features.append(
                    _build_feature_dict(
                        drug_name=row.Drug_Name,
                        effect_name=negative_effect,
                        frequency=negative_profile["frequency"],
                        severity=negative_profile["severity"],
                        patient_risks=patient_risks,
                        effect_risks=negative_profile["risk_factors"],
                        effect_support=negative_profile["support"],
                    )
                )
                labels.append(0)

    metadata = {
        "unique_drugs": int(df["Drug_Name"].nunique()),
        "unique_side_effects": int(df["Side_Effect"].nunique()),
        "raw_rows": int(len(df)),
        "all_risk_factors": all_risks,
        "effect_profiles": effect_profiles,
    }

    return features, np.array(labels), metadata


def train_model() -> Dict:
    """Train the NIROG profile-aware ranking model."""
    global _MODEL_CACHE

    df = _load_dataset()
    X_dicts, y, metadata = _build_training_examples(df)
    vectorizer = DictVectorizer(sparse=True)
    X = vectorizer.fit_transform(X_dicts)

    candidate_models = {
        "extra_trees": ExtraTreesClassifier(
            n_estimators=700,
            max_depth=None,
            min_samples_leaf=1,
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=500,
            max_depth=28,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    best_name = None
    best_score = float("-inf")
    benchmark_scores = {}

    for name, estimator in candidate_models.items():
        auc_scores = cross_val_score(estimator, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
        benchmark_scores[name] = float(np.mean(auc_scores))
        if benchmark_scores[name] > best_score:
            best_name = name
            best_score = benchmark_scores[name]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=RANDOM_STATE,
    )

    selected_model = clone(candidate_models[best_name])
    selected_model.fit(X_train, y_train)
    test_probabilities = selected_model.predict_proba(X_test)[:, 1]
    test_predictions = (test_probabilities >= 0.5).astype(int)

    holdout_metrics = {
        "accuracy": float(accuracy_score(y_test, test_predictions)),
        "f1": float(f1_score(y_test, test_predictions)),
        "roc_auc": float(roc_auc_score(y_test, test_probabilities)),
    }

    final_model = clone(candidate_models[best_name])
    final_model.fit(X, y)

    bundle = {
        "model": final_model,
        "vectorizer": vectorizer,
        "metadata": {
            **metadata,
            "model_family": best_name,
            "cv_roc_auc": float(best_score),
            "benchmark_scores": benchmark_scores,
            "holdout_metrics": holdout_metrics,
            "generated_samples": int(len(y)),
            "training_strategy": (
                "Synthetic patient-profile expansion from curated drug/effect records "
                "with profile-aware binary ranking over candidate side effects."
            ),
        },
    }

    joblib.dump(bundle, MODEL_PATH)
    _MODEL_CACHE = bundle

    print(f"Training data rows: {metadata['raw_rows']}")
    print(f"Generated training samples: {len(y)}")
    print(f"Selected model: {best_name}")
    print(f"Cross-validated ROC-AUC: {best_score:.4f}")
    print(f"Holdout accuracy: {holdout_metrics['accuracy']:.4f}")

    return bundle


def load_model(force_reload: bool = False) -> Dict:
    """Load the trained model bundle, training it if needed."""
    global _MODEL_CACHE

    if _MODEL_CACHE is not None and not force_reload:
        return _MODEL_CACHE

    if not os.path.exists(MODEL_PATH):
        return train_model()

    _MODEL_CACHE = joblib.load(MODEL_PATH)
    return _MODEL_CACHE


def get_model_metadata() -> Dict:
    return load_model()["metadata"]


def _clamp_probability(score: float) -> int:
    return int(max(1, min(99, round(score))))


def calculate_risk_score(
    base_probability: int,
    user_risk_factors: List[str],
    effect_risk_factors: str,
    age: int,
    severity: str,
    dosage: Optional[int] = None,
    duration: Optional[int] = None,
) -> int:
    """Calculate an evidence-weighted risk score from known frequency and profile data."""
    score = float(base_probability)
    effect_risks = _split_risk_factors(effect_risk_factors)
    user_risks = {_normalize_token(risk) for risk in user_risk_factors}
    matched_risks = user_risks & effect_risks

    if matched_risks:
        score += len(matched_risks) * 10
        score += min(8, (len(matched_risks) / max(1, len(effect_risks))) * 12)

    if age:
        if age >= 65:
            score += 8 if "elderly" in effect_risks else 4
        elif age <= 18:
            score += 8 if "child" in effect_risks else 3
        elif age <= 25 and "young_adult" in effect_risks:
            score += 5

    if dosage:
        if dosage >= 1000:
            score += 8 if "high_dose" in effect_risks else 4
        elif dosage >= 500:
            score += 3

    if duration:
        if duration >= 90:
            score += 10 if "long_term_use" in effect_risks else 4
        elif duration >= 30:
            score += 6 if "long_term_use" in effect_risks else 2

    score *= SEVERITY_MULTIPLIER.get(severity, 1.0)
    return _clamp_probability(score)


def extract_user_risk_factors(
    age: int = None,
    gender: str = None,
    medical_conditions: List[str] = None,
    current_medications: List[str] = None,
    allergies: List[str] = None,
    lifestyle: List[str] = None,
    dosage: Optional[int] = None,
    duration: Optional[int] = None,
) -> List[str]:
    """Extract normalized risk factors from the user profile."""
    risk_factors = []

    if age:
        if age >= 65:
            risk_factors.append("elderly")
        elif age <= 18:
            risk_factors.append("child")
        elif age <= 25:
            risk_factors.append("young_adult")

    if gender:
        gender_lower = gender.lower().strip()
        if gender_lower == "male":
            risk_factors.append("male")
        elif gender_lower == "female":
            risk_factors.append("female")

    condition_map = {
        "diabetes": ["diabetes", "prediabetes"],
        "heart disease": ["heart_disease", "cardiovascular"],
        "kidney disease": ["kidney_disease"],
        "liver disease": ["liver_disease"],
        "asthma": ["asthma"],
        "copd": ["copd"],
        "hypertension": ["hypertension"],
        "depression": ["depression_history", "psychiatric_disorder"],
        "anxiety": ["psychiatric_disorder"],
        "seizures": ["seizure_history"],
        "epilepsy": ["seizure_history"],
        "bleeding disorder": ["bleeding_disorder"],
        "stomach ulcer": ["stomach_ulcer", "gerd"],
        "gerd": ["gerd"],
        "osteoporosis": ["osteoporosis"],
        "glaucoma": ["glaucoma_history"],
        "prostate enlargement": ["prostate_enlargement"],
        "substance abuse": ["substance_abuse_history"],
        "pregnancy": ["pregnant"],
    }

    if medical_conditions:
        for condition in medical_conditions:
            condition_lower = condition.lower().strip()
            for key, values in condition_map.items():
                if key in condition_lower:
                    risk_factors.extend(values)

    medication_map = {
        "warfarin": ["anticoagulant_use"],
        "aspirin": ["nsaid_use", "antiplatelet_use"],
        "ibuprofen": ["nsaid_use"],
        "naproxen": ["nsaid_use"],
        "prednisone": ["steroid_use"],
        "opioid": ["opioid_use"],
        "hydrocodone": ["opioid_use"],
        "oxycodone": ["opioid_use"],
        "morphine": ["opioid_use"],
        "fentanyl": ["opioid_use"],
        "tramadol": ["opioid_use", "tramadol_use"],
        "ssri": ["ssri_use"],
        "sertraline": ["ssri_use"],
        "fluoxetine": ["ssri_use"],
        "escitalopram": ["ssri_use"],
        "maoi": ["maoi_use"],
        "benzodiazepine": ["benzodiazepine_use"],
        "alprazolam": ["benzodiazepine_use"],
        "diazepam": ["benzodiazepine_use"],
        "lorazepam": ["benzodiazepine_use"],
        "clonazepam": ["benzodiazepine_use"],
        "diuretic": ["diuretic_use"],
        "ace inhibitor": ["ace_inhibitor_use"],
        "lisinopril": ["ace_inhibitor_use"],
        "valproic acid": ["valproic_acid_use"],
        "ppi": ["ppi_use"],
        "omeprazole": ["ppi_use"],
        "potassium": ["potassium_supplements"],
    }

    if current_medications:
        for medication in current_medications:
            medication_lower = medication.lower().strip()
            for key, values in medication_map.items():
                if key in medication_lower:
                    risk_factors.extend(values)

    if allergies:
        for allergy in allergies:
            allergy_lower = allergy.lower().strip()
            if "penicillin" in allergy_lower:
                risk_factors.append("penicillin_allergy")
            if "aspirin" in allergy_lower:
                risk_factors.append("aspirin_allergy")
            risk_factors.append("allergy_history")

    lifestyle_map = {
        "alcohol": ["alcohol_use"],
        "smoking": ["smoking"],
        "sedentary": ["sedentary"],
    }

    if lifestyle:
        for factor in lifestyle:
            factor_lower = factor.lower().strip()
            for key, values in lifestyle_map.items():
                if key in factor_lower:
                    risk_factors.extend(values)

    if dosage:
        if dosage >= 1000:
            risk_factors.append("high_dose")
        elif dosage >= 500:
            risk_factors.append("moderate_dose")

    if duration:
        if duration >= 90:
            risk_factors.extend(["long_term_use", "chronic_use"])
        elif duration >= 30:
            risk_factors.append("long_term_use")

    return sorted({_normalize_token(risk) for risk in risk_factors})


def _find_best_drug_match(df: pd.DataFrame, drug_name: str) -> Tuple[Optional[str], pd.DataFrame]:
    query = _normalize_drug_name(drug_name)
    all_drugs = sorted(df["Drug_Name"].unique().tolist())
    lower_map = {drug.lower(): drug for drug in all_drugs}

    if query in lower_map:
        matched = lower_map[query]
        return matched, df[df["Drug_Name"] == matched].copy()

    partial_matches = [drug for drug in all_drugs if query in drug.lower() or drug.lower() in query]
    if partial_matches:
        matched = partial_matches[0]
        return matched, df[df["Drug_Name"] == matched].copy()

    close = get_close_matches(query, list(lower_map.keys()), n=1, cutoff=0.75)
    if close:
        matched = lower_map[close[0]]
        return matched, df[df["Drug_Name"] == matched].copy()

    return None, df.iloc[0:0].copy()


def get_drug_side_effects(
    drug_name: str,
    age: int = None,
    gender: str = None,
    medical_conditions: List[str] = None,
    current_medications: List[str] = None,
    allergies: List[str] = None,
    lifestyle: List[str] = None,
    dosage: int = None,
    duration: int = None,
):
    """
    Get profile-aware side effect predictions for a given drug.
    The final score blends evidence-based weighting with the trained ranking model.
    """
    df = _load_dataset()
    matched_drug, drug_rows = _find_best_drug_match(df, drug_name)

    if not matched_drug:
        return {
            "drug_found": None,
            "personalized": False,
            "user_risk_factors": [],
            "effects": [{
                "side_effect": "Drug Not Found",
                "probability": 0,
                "frequency": "N/A",
                "severity": "N/A",
                "personalized": False,
                "risk_factors_matched": [],
            }],
        }

    bundle = load_model()
    model = bundle["model"]
    vectorizer = bundle["vectorizer"]
    user_risks = extract_user_risk_factors(
        age=age,
        gender=gender,
        medical_conditions=medical_conditions or [],
        current_medications=current_medications or [],
        allergies=allergies or [],
        lifestyle=lifestyle or [],
        dosage=dosage,
        duration=duration,
    )
    user_risk_set = set(user_risks)

    results = []
    for row in drug_rows.itertuples(index=False):
        effect_risks = _split_risk_factors(row.Risk_Factors)
        feature_vector = _build_feature_dict(
            drug_name=matched_drug,
            effect_name=row.Side_Effect,
            frequency=row.Frequency,
            severity=row.Severity,
            patient_risks=user_risk_set,
            effect_risks=effect_risks,
            effect_support=1,
        )
        model_probability = float(model.predict_proba(vectorizer.transform([feature_vector]))[0][1] * 100)
        evidence_probability = calculate_risk_score(
            base_probability=FREQUENCY_BASE_SCORE.get(row.Frequency, 30),
            user_risk_factors=user_risks,
            effect_risk_factors=row.Risk_Factors,
            age=age or 0,
            severity=row.Severity,
            dosage=dosage,
            duration=duration,
        )
        probability = _clamp_probability((evidence_probability * 0.6) + (model_probability * 0.4))

        results.append({
            "side_effect": row.Side_Effect,
            "probability": probability,
            "frequency": row.Frequency,
            "severity": row.Severity,
            "personalized": bool(user_risks),
            "risk_factors_matched": sorted(user_risk_set & effect_risks),
            "model_probability": round(model_probability, 1),
            "evidence_probability": evidence_probability,
        })

    severity_order = {"Severe": 0, "Moderate": 1, "Mild": 2}
    results.sort(
        key=lambda effect: (
            -effect["probability"],
            severity_order.get(effect["severity"], 3),
            effect["side_effect"],
        )
    )

    return {
        "drug_found": matched_drug,
        "personalized": bool(user_risks),
        "user_risk_factors": user_risks,
        "effects": results[:MAX_RESULTS],
    }


def check_drug_interactions(medications: List[str]) -> List[Dict]:
    """
    Check for known dangerous drug interactions.
    Returns a list of interaction warnings.
    """
    interactions = []

    dangerous_pairs = [
        (["warfarin"], ["aspirin", "ibuprofen", "naproxen"], "Increased bleeding risk - NSAIDs increase anticoagulant effect"),
        (["warfarin"], ["fluconazole"], "Warfarin levels increased - risk of bleeding"),
        (["ssri", "sertraline", "fluoxetine", "escitalopram"], ["maoi"], "Serotonin syndrome - potentially fatal"),
        (["ssri", "sertraline", "fluoxetine"], ["tramadol"], "Serotonin syndrome risk - monitor closely"),
        (["opioid", "hydrocodone", "oxycodone", "morphine", "fentanyl"], ["benzodiazepine", "alprazolam", "diazepam"], "Respiratory depression - high overdose risk"),
        (["metformin"], ["contrast dye"], "Lactic acidosis risk - hold metformin"),
        (["simvastatin", "atorvastatin"], ["clarithromycin", "erythromycin"], "Rhabdomyolysis risk - statin toxicity"),
        (["sildenafil", "tadalafil"], ["nitrate", "nitroglycerin"], "Severe hypotension - contraindicated"),
        (["lisinopril", "losartan"], ["potassium"], "Hyperkalemia risk - monitor potassium"),
        (["clopidogrel"], ["omeprazole"], "Reduced clopidogrel efficacy"),
        (["methotrexate"], ["nsaid", "ibuprofen", "naproxen"], "Methotrexate toxicity"),
        (["lithium"], ["nsaid", "ibuprofen", "naproxen"], "Lithium toxicity"),
        (["digoxin"], ["amiodarone"], "Digoxin toxicity - reduce dose"),
    ]

    if not medications:
        return []

    meds_lower = [med.lower().strip() for med in medications]

    for group1, group2, warning in dangerous_pairs:
        has_group1 = any(any(token in med for token in group1) for med in meds_lower)
        has_group2 = any(any(token in med for token in group2) for med in meds_lower)

        if has_group1 and has_group2:
            interactions.append({
                "drugs": [med for med in medications if any(token in med.lower() for token in group1 + group2)],
                "warning": warning,
                "severity": "High",
            })

    return interactions


if __name__ == "__main__":
    train_model()
