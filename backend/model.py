import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import os
import numpy as np

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "drug_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "medicine_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoders.pkl")


def train_model():
    """Train the drug adverse effects prediction model using real data."""
    df = pd.read_csv(DATA_PATH)
    print(f"Data loaded. Shape: {df.shape}")
    print(f"Unique drugs: {df['Drug_Name'].nunique()}")
    print(f"Unique side effects: {df['Side_Effect'].nunique()}")
    
    # Encode categorical features
    le_drug = LabelEncoder()
    le_freq = LabelEncoder()
    le_effect = LabelEncoder()
    le_severity = LabelEncoder()
    
    df['Drug_Encoded'] = le_drug.fit_transform(df['Drug_Name'])
    df['Freq_Encoded'] = le_freq.fit_transform(df['Frequency'])
    df['Effect_Encoded'] = le_effect.fit_transform(df['Side_Effect'])
    df['Severity_Encoded'] = le_severity.fit_transform(df['Severity'])
    
    # Features
    X = df[['Drug_Encoded', 'Freq_Encoded', 'Severity_Encoded']]
    y = df['Effect_Encoded']
    
    # Train model
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=150, random_state=42, max_depth=10)
    clf.fit(X_train, y_train)
    
    accuracy = clf.score(X_test, y_test)
    print(f"Model accuracy: {accuracy:.2%}")
    
    # Save model and encoders
    joblib.dump(clf, MODEL_PATH)
    joblib.dump({
        'drug': le_drug,
        'frequency': le_freq,
        'effect': le_effect,
        'severity': le_severity
    }, ENCODER_PATH)
    
    print(f"Model saved to {MODEL_PATH}")
    print(f"Encoders saved to {ENCODER_PATH}")
    
    return clf


def load_model():
    """Load the trained model and encoders."""
    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODER_PATH)
    return model, encoders


def calculate_risk_score(base_probability: int, user_risk_factors: list, effect_risk_factors: str, age: int, severity: str) -> int:
    """
    Calculate personalized risk score based on user profile and known risk factors.
    """
    score = base_probability
    
    # Parse effect risk factors
    effect_risks = set(effect_risk_factors.split(';')) if pd.notna(effect_risk_factors) and effect_risk_factors else set()
    
    # Check matches between user risk factors and effect risk factors
    if user_risk_factors:
        matching_risks = len(set(user_risk_factors) & effect_risks)
        score += matching_risks * 12  # Each matching risk factor adds 12%
    
    # Age-based risk adjustment
    if age:
        if age >= 65:
            if 'elderly' in effect_risks:
                score += 15
            else:
                score += 5  # General elderly risk
        elif age <= 25:
            if 'young_adult' in effect_risks:
                score += 10
    
    # Severity adjustment - severe effects are weighted higher for awareness
    severity_multiplier = {'Mild': 1.0, 'Moderate': 1.15, 'Severe': 1.3}
    score = int(score * severity_multiplier.get(severity, 1.0))
    
    # Cap at 100
    return min(score, 99)


def extract_user_risk_factors(
    age: int = None,
    gender: str = None,
    medical_conditions: list = None,
    current_medications: list = None,
    allergies: list = None,
    lifestyle: list = None
) -> list:
    """
    Extract risk factors from user profile.
    """
    risk_factors = []
    
    # Age-based risks
    if age:
        if age >= 65:
            risk_factors.append('elderly')
        elif age <= 18:
            risk_factors.append('child')
        elif age <= 25:
            risk_factors.append('young_adult')
    
    # Gender-based risks
    if gender:
        if gender.lower() == 'male':
            risk_factors.append('male')
        elif gender.lower() == 'female':
            risk_factors.append('female')
    
    # Medical conditions mapping
    condition_map = {
        'diabetes': ['diabetes', 'prediabetes'],
        'heart disease': ['heart_disease', 'cardiovascular'],
        'kidney disease': ['kidney_disease'],
        'liver disease': ['liver_disease'],
        'asthma': ['asthma'],
        'copd': ['copd'],
        'hypertension': ['hypertension'],
        'depression': ['depression_history', 'psychiatric_disorder'],
        'anxiety': ['psychiatric_disorder'],
        'seizures': ['seizure_history'],
        'epilepsy': ['seizure_history'],
        'bleeding disorder': ['bleeding_disorder'],
        'stomach ulcer': ['stomach_ulcer', 'gerd'],
        'gerd': ['gerd'],
        'osteoporosis': ['osteoporosis'],
        'glaucoma': ['glaucoma_history'],
        'prostate enlargement': ['prostate_enlargement'],
        'substance abuse': ['substance_abuse_history'],
        'pregnancy': ['pregnant'],
    }
    
    if medical_conditions:
        for condition in medical_conditions:
            cond_lower = condition.lower().strip()
            for key, values in condition_map.items():
                if key in cond_lower:
                    risk_factors.extend(values)
    
    # Current medications mapping (for drug interactions)
    medication_map = {
        'warfarin': ['anticoagulant_use'],
        'aspirin': ['nsaid_use', 'antiplatelet_use'],
        'ibuprofen': ['nsaid_use'],
        'naproxen': ['nsaid_use'],
        'prednisone': ['steroid_use'],
        'opioid': ['opioid_use'],
        'hydrocodone': ['opioid_use'],
        'oxycodone': ['opioid_use'],
        'morphine': ['opioid_use'],
        'fentanyl': ['opioid_use'],
        'tramadol': ['opioid_use', 'tramadol_use'],
        'ssri': ['ssri_use'],
        'sertraline': ['ssri_use'],
        'fluoxetine': ['ssri_use'],
        'escitalopram': ['ssri_use'],
        'maoi': ['maoi_use'],
        'benzodiazepine': ['benzodiazepine_use'],
        'alprazolam': ['benzodiazepine_use'],
        'diazepam': ['benzodiazepine_use'],
        'lorazepam': ['benzodiazepine_use'],
        'clonazepam': ['benzodiazepine_use'],
        'diuretic': ['diuretic_use'],
        'ace inhibitor': ['ace_inhibitor_use'],
        'lisinopril': ['ace_inhibitor_use'],
        'valproic acid': ['valproic_acid_use'],
        'ppi': ['ppi_use'],
        'omeprazole': ['ppi_use'],
        'potassium': ['potassium_supplements'],
    }
    
    if current_medications:
        for med in current_medications:
            med_lower = med.lower().strip()
            for key, values in medication_map.items():
                if key in med_lower:
                    risk_factors.extend(values)
    
    # Allergy mapping
    if allergies:
        for allergy in allergies:
            allergy_lower = allergy.lower().strip()
            if 'penicillin' in allergy_lower:
                risk_factors.append('penicillin_allergy')
            if 'aspirin' in allergy_lower:
                risk_factors.append('aspirin_allergy')
            risk_factors.append('allergy_history')
    
    # Lifestyle factors
    lifestyle_map = {
        'alcohol': ['alcohol_use'],
        'smoking': ['smoking'],
        'sedentary': ['sedentary'],
    }
    
    if lifestyle:
        for factor in lifestyle:
            factor_lower = factor.lower().strip()
            for key, values in lifestyle_map.items():
                if key in factor_lower:
                    risk_factors.extend(values)
    
    return list(set(risk_factors))


def get_drug_side_effects(
    drug_name: str,
    age: int = None,
    gender: str = None,
    medical_conditions: list = None,
    current_medications: list = None,
    allergies: list = None,
    lifestyle: list = None,
    dosage: int = None,
    duration: int = None
):
    """
    Get predicted side effects for a given drug name with personalized risk scoring.
    Returns a list of side effects with their probabilities adjusted for user profile.
    """
    df = pd.read_csv(DATA_PATH)
    
    # Normalize input
    drug_name_normalized = drug_name.strip().title()
    known_drugs = df['Drug_Name'].unique()
    
    # Find matching drug
    matching_drugs = [d for d in known_drugs if drug_name_normalized.lower() in d.lower() or d.lower() in drug_name_normalized.lower()]
    
    if not matching_drugs:
        # Try partial match
        for d in known_drugs:
            if any(word in d.lower() for word in drug_name_normalized.lower().split()):
                matching_drugs.append(d)
    
    if matching_drugs:
        matched_drug = matching_drugs[0]
        drug_effects = df[df['Drug_Name'] == matched_drug]
        
        # Base probability mapping
        freq_map = {'Common': 75, 'Uncommon': 35, 'Rare': 8}
        
        # Extract user risk factors
        user_risks = extract_user_risk_factors(
            age=age,
            gender=gender,
            medical_conditions=medical_conditions or [],
            current_medications=current_medications or [],
            allergies=allergies or [],
            lifestyle=lifestyle or []
        )
        
        # Adjust for dosage (if high dosage, increase risks)
        dosage_modifier = 0
        if dosage:
            if dosage > 1000:  # High dose
                dosage_modifier = 10
            elif dosage > 500:
                dosage_modifier = 5
        
        # Adjust for duration (long-term use increases certain risks)
        if duration and duration > 30:
            user_risks.append('long_term_use')
        
        results = []
        for _, row in drug_effects.iterrows():
            base_prob = freq_map.get(row['Frequency'], 50) + dosage_modifier
            
            risk_score = calculate_risk_score(
                base_probability=base_prob,
                user_risk_factors=user_risks,
                effect_risk_factors=row.get('Risk_Factors', ''),
                age=age or 0,
                severity=row['Severity']
            )
            
            results.append({
                "side_effect": row['Side_Effect'],
                "probability": risk_score,
                "frequency": row['Frequency'],
                "severity": row['Severity'],
                "personalized": len(user_risks) > 0,
                "risk_factors_matched": [rf for rf in user_risks if rf in str(row.get('Risk_Factors', ''))]
            })
        
        # Sort by probability (descending) then by severity
        severity_order = {'Severe': 0, 'Moderate': 1, 'Mild': 2}
        results.sort(key=lambda x: (-x['probability'], severity_order.get(x['severity'], 2)))
        
        return {
            "drug_found": matched_drug,
            "personalized": len(user_risks) > 0,
            "user_risk_factors": user_risks,
            "effects": results[:8]  # Top 8 effects
        }
    
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
            "risk_factors_matched": []
        }]
    }


def check_drug_interactions(medications: list) -> list:
    """
    Check for known dangerous drug interactions.
    Returns a list of interaction warnings.
    """
    interactions = []
    
    # Known dangerous interactions
    dangerous_pairs = [
        (['warfarin'], ['aspirin', 'ibuprofen', 'naproxen'], 'Increased bleeding risk - NSAIDs increase anticoagulant effect'),
        (['warfarin'], ['fluconazole'], 'Warfarin levels increased - risk of bleeding'),
        (['ssri', 'sertraline', 'fluoxetine', 'escitalopram'], ['maoi'], 'Serotonin syndrome - potentially fatal'),
        (['ssri', 'sertraline', 'fluoxetine'], ['tramadol'], 'Serotonin syndrome risk - monitor closely'),
        (['opioid', 'hydrocodone', 'oxycodone', 'morphine', 'fentanyl'], ['benzodiazepine', 'alprazolam', 'diazepam'], 'Respiratory depression - high overdose risk'),
        (['metformin'], ['contrast dye'], 'Lactic acidosis risk - hold metformin'),
        (['simvastatin', 'atorvastatin'], ['clarithromycin', 'erythromycin'], 'Rhabdomyolysis risk - statin toxicity'),
        (['sildenafil', 'tadalafil'], ['nitrate', 'nitroglycerin'], 'Severe hypotension - contraindicated'),
        (['lisinopril', 'losartan'], ['potassium'], 'Hyperkalemia risk - monitor potassium'),
        (['clopidogrel'], ['omeprazole'], 'Reduced clopidogrel efficacy'),
        (['methotrexate'], ['nsaid', 'ibuprofen', 'naproxen'], 'Methotrexate toxicity'),
        (['lithium'], ['nsaid', 'ibuprofen', 'naproxen'], 'Lithium toxicity'),
        (['digoxin'], ['amiodarone'], 'Digoxin toxicity - reduce dose'),
    ]
    
    if not medications:
        return []
    
    meds_lower = [m.lower().strip() for m in medications]
    
    for group1, group2, warning in dangerous_pairs:
        has_group1 = any(any(g in m for g in group1) for m in meds_lower)
        has_group2 = any(any(g in m for g in group2) for m in meds_lower)
        
        if has_group1 and has_group2:
            interactions.append({
                "drugs": [m for m in medications if any(g in m.lower() for g in group1 + group2)],
                "warning": warning,
                "severity": "High"
            })
    
    return interactions


if __name__ == "__main__":
    train_model()
