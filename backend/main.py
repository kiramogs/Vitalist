import os
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_service import (
    analyze_drug_with_llm,
    check_drug_interactions_llm,
    get_drug_info_llm,
    is_groq_available,
    merge_ml_and_llm_predictions,
)
from model import (
    MODEL_PATH,
    check_drug_interactions,
    get_drug_side_effects,
    get_model_metadata,
    train_model,
)


app = FastAPI(
    title="NIROG API",
    description="Profile-aware drug safety prediction with hybrid ML + LLM integration",
    version="5.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize the trained model on startup."""
    if not os.path.exists(MODEL_PATH):
        print("Model not found. Training now...")
        train_model()
    else:
        metadata = get_model_metadata()
        print("Model loaded successfully.")
        print(f"  Strategy: {metadata.get('training_strategy', 'unknown')}")
        print(
            f"  Samples: {metadata.get('generated_samples', 'n/a')}, "
            f"CV ROC-AUC: {metadata.get('cv_roc_auc', 0):.4f}"
        )

    if is_groq_available():
        print("Trained-model enhancement ENABLED")
    else:
        print("Trained-model enhancement unavailable. ML-only mode active.")


class DrugQuery(BaseModel):
    drug_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    dosage: Optional[int] = None
    duration: Optional[int] = None
    medical_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    lifestyle: Optional[List[str]] = None
    use_ai_enhancement: Optional[bool] = True


class InteractionCheckRequest(BaseModel):
    medications: List[str]
    use_ai: Optional[bool] = True


@app.post("/predict")
def predict(data: DrugQuery):
    """
    NIROG drug adverse effect prediction with integrated ML + LLM analysis.

    The system:
    1. Queries the profile-aware ML model for baseline predictions from our curated database
    2. Sends patient profile + ML predictions to the LLM for validation and enhancement
    3. Merges both sources with weighted averaging
    4. Adds LLM-only predictions that the database-driven model may have missed
    """
    try:
        ml_result = get_drug_side_effects(
            drug_name=data.drug_name,
            age=data.age,
            gender=data.gender,
            medical_conditions=data.medical_conditions,
            current_medications=data.current_medications,
            allergies=data.allergies,
            lifestyle=data.lifestyle,
            dosage=data.dosage,
            duration=data.duration,
        )

        ml_effects = ml_result.get("effects", [])

        ml_interactions = []
        if data.current_medications:
            all_meds = data.current_medications + [data.drug_name]
            ml_interactions = check_drug_interactions(all_meds)

        llm_analysis = None
        if data.use_ai_enhancement and is_groq_available():
            llm_analysis = analyze_drug_with_llm(
                drug_name=data.drug_name,
                age=data.age,
                gender=data.gender,
                weight=data.weight,
                medical_conditions=data.medical_conditions,
                current_medications=data.current_medications,
                allergies=data.allergies,
                lifestyle=data.lifestyle,
                dosage=data.dosage,
                duration=data.duration,
                ml_predictions=ml_effects,
            )

        if llm_analysis:
            merged_effects = merge_ml_and_llm_predictions(ml_effects, llm_analysis)
        else:
            merged_effects = [{
                **effect,
                "source": "ML Database",
                "onset": "Unknown",
                "mechanism": "",
                "patient_specific_risk": "",
                "management": "",
                "requires_discontinuation": False,
            } for effect in ml_effects]

        llm_interactions = None
        if data.current_medications and data.use_ai_enhancement and is_groq_available():
            all_meds = data.current_medications + [data.drug_name]
            llm_interactions = check_drug_interactions_llm(all_meds)

        all_interactions = []
        seen_pairs = set()

        for interaction in ml_interactions:
            drugs_key = tuple(sorted([drug.lower() for drug in interaction.get("drugs", [])]))
            if drugs_key not in seen_pairs:
                seen_pairs.add(drugs_key)
                all_interactions.append({
                    **interaction,
                    "source": "ML Database",
                })

        if llm_interactions and "interactions" in llm_interactions:
            for interaction in llm_interactions.get("interactions", []):
                drugs = interaction.get("drugs", [])
                drugs_key = tuple(sorted([drug.lower() for drug in drugs]))
                if drugs_key not in seen_pairs:
                    seen_pairs.add(drugs_key)
                    all_interactions.append({
                        "drugs": drugs,
                        "warning": interaction.get("clinical_effect", ""),
                        "mechanism": interaction.get("mechanism", ""),
                        "severity": interaction.get("severity", "Moderate"),
                        "management": interaction.get("management", ""),
                        "evidence_level": interaction.get("evidence_level", ""),
                        "source": "NIROG Model Insight",
                    })

        severity_order = {"Contraindicated": 0, "Major": 1, "High": 1, "Moderate": 2, "Minor": 3, "Low": 4}
        all_interactions.sort(key=lambda item: severity_order.get(item.get("severity", "Moderate"), 2))

        response = {
            "drug_queried": data.drug_name,
            "drug_found": ml_result.get("drug_found"),
            "personalized": ml_result.get("personalized", False),
            "user_risk_factors": ml_result.get("user_risk_factors", []),
            "predictions": merged_effects,
            "interactions": all_interactions,
            "ai_enhanced": llm_analysis is not None,
            "analysis_engine": "NIROG Trained Model",
            "disclaimer": "For educational purposes only. Consult a healthcare provider.",
        }

        if llm_analysis:
            response["ai_analysis"] = {
                "drug_class": llm_analysis.get("drug_class", ""),
                "mechanism_of_action": llm_analysis.get("mechanism_of_action", llm_analysis.get("mechanism", "")),
                "half_life": llm_analysis.get("half_life", ""),
                "metabolism": llm_analysis.get("metabolism", ""),
                "contraindications": llm_analysis.get("contraindications", {}),
                "black_box_warnings": llm_analysis.get("black_box_warnings", []),
                "monitoring_parameters": llm_analysis.get("monitoring_parameters", []),
                "overall_risk_assessment": llm_analysis.get("overall_risk_assessment", {}),
            }

            if llm_interactions and "critical_alerts" in llm_interactions:
                response["critical_alerts"] = llm_interactions.get("critical_alerts", [])

        return response

    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/predict-ai")
def predict_ai_only(data: DrugQuery):
    """Get trained-model drug analysis."""
    if not is_groq_available():
        raise HTTPException(status_code=400, detail="Trained-model enhancement is not configured")

    try:
        llm_analysis = analyze_drug_with_llm(
            drug_name=data.drug_name,
            age=data.age,
            gender=data.gender,
            weight=data.weight,
            medical_conditions=data.medical_conditions,
            current_medications=data.current_medications,
            allergies=data.allergies,
            lifestyle=data.lifestyle,
            dosage=data.dosage,
            duration=data.duration,
        )

        if not llm_analysis:
            raise HTTPException(status_code=500, detail="Failed to get AI analysis")

        return {
            "drug_queried": data.drug_name,
            "analysis": llm_analysis,
            "source": "NIROG Trained Model",
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/check-interactions")
def check_interactions(data: InteractionCheckRequest):
    """Check drug interactions with hybrid analysis."""
    try:
        ml_interactions = check_drug_interactions(data.medications)

        llm_result = None
        if data.use_ai and is_groq_available():
            llm_result = check_drug_interactions_llm(data.medications)

        return {
            "medications": data.medications,
            "interactions": ml_interactions,
            "ai_analysis": llm_result,
            "ai_enhanced": llm_result is not None,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/drug-info/{name}")
def get_drug_info_ai(name: str):
    """Get comprehensive drug information using the trained model."""
    if not is_groq_available():
        raise HTTPException(status_code=400, detail="Trained-model enhancement is not configured")

    try:
        info = get_drug_info_llm(name)
        if not info:
            raise HTTPException(status_code=404, detail=f"Could not get info for '{name}'")
        return {"drug_name": name, "info": info}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/")
def read_root():
    """API health check."""
    trained_model_enabled = is_groq_available()
    metadata = get_model_metadata()
    return {
        "status": "running",
        "version": "5.0.0",
        "name": "NIROG",
        "trained_model_enhancement": "enabled" if trained_model_enabled else "disabled",
        "model": "NIROG Trained Model" if trained_model_enabled else "NIROG Profile Ranker",
        "ml_training": {
            "strategy": metadata.get("training_strategy"),
            "samples": metadata.get("generated_samples"),
            "cv_roc_auc": metadata.get("cv_roc_auc"),
            "holdout_metrics": metadata.get("holdout_metrics"),
        },
    }


@app.get("/drugs")
def list_drugs():
    """List all drugs in the database."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "drug_data.csv")
    df = pd.read_csv(data_path)
    drugs = sorted(df["Drug_Name"].unique().tolist())
    return {"drugs": drugs, "count": len(drugs)}


@app.get("/drug/{name}")
def get_drug_info(name: str):
    """Get drug info from database."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "drug_data.csv")
    df = pd.read_csv(data_path)

    drug_name = name.strip().title()
    matching = df[df["Drug_Name"].str.lower() == drug_name.lower()]

    if matching.empty:
        matching = df[df["Drug_Name"].str.lower().str.contains(drug_name.lower())]

    if matching.empty:
        raise HTTPException(status_code=404, detail=f"Drug '{name}' not found")

    return {
        "drug_name": matching["Drug_Name"].iloc[0],
        "total_effects": len(matching),
        "effects": matching.to_dict("records"),
    }


@app.get("/conditions")
def list_conditions():
    """List supported conditions."""
    return {
        "medical_conditions": [
            "Diabetes", "Heart Disease", "Kidney Disease", "Liver Disease",
            "Asthma", "COPD", "Hypertension", "Depression", "Anxiety",
            "Seizures", "Bleeding Disorder", "Stomach Ulcer", "GERD",
            "Osteoporosis", "Glaucoma", "Pregnancy",
        ],
        "lifestyle_factors": ["Alcohol Use", "Smoking"],
    }


@app.get("/api-status")
def api_status():
    """Check API status."""
    metadata = get_model_metadata()
    return {
        "trained_model_key_set": bool(os.getenv("GROQ_API_KEY")),
        "trained_model_features_available": is_groq_available(),
        "models": ["NIROG Profile Ranker", "NIROG Trained Model"],
        "training_samples": metadata.get("generated_samples"),
        "cv_roc_auc": metadata.get("cv_roc_auc"),
    }


@app.get("/model-metrics")
def model_metrics():
    """Return stored NIROG model training metadata."""
    return get_model_metadata()
