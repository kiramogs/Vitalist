from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from model import load_model, get_drug_side_effects, train_model, check_drug_interactions
from ai_service import (
    analyze_drug_with_llm, 
    check_drug_interactions_llm, 
    get_drug_info_llm,
    merge_ml_and_llm_predictions
)
import os
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI(
    title="Drug Adverse Effects Predictor API",
    description="Precision drug safety prediction with hybrid ML + LLM integration",
    version="5.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize model on startup."""
    model_path = os.path.join(os.path.dirname(__file__), "medicine_model.pkl")
    if not os.path.exists(model_path):
        print("Model not found. Training now...")
        train_model()
    else:
        print("Model loaded successfully.")
    
    # Check for Groq API key
    if os.getenv("GROQ_API_KEY"):
        print("✓ Groq API key found - LLM enhancement ENABLED")
        print("  Using: Llama 4 Scout / Llama 3.3 70B")
    else:
        print("⚠ GROQ_API_KEY not set. ML-only mode active.")


class DrugQuery(BaseModel):
    drug_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
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
    Precision drug adverse effect prediction with integrated ML + LLM analysis.
    
    The system:
    1. Queries the ML model for baseline predictions from our curated database
    2. Sends patient profile + ML predictions to LLM for validation and enhancement
    3. Merges both sources with weighted averaging for maximum accuracy
    4. Adds LLM-only predictions that ML may have missed
    """
    try:
        # Step 1: Get ML model predictions
        ml_result = get_drug_side_effects(
            drug_name=data.drug_name,
            age=data.age,
            gender=data.gender,
            medical_conditions=data.medical_conditions,
            current_medications=data.current_medications,
            allergies=data.allergies,
            lifestyle=data.lifestyle,
            dosage=data.dosage,
            duration=data.duration
        )
        
        ml_effects = ml_result.get("effects", [])
        
        # Step 2: Get ML-based drug interactions
        ml_interactions = []
        if data.current_medications:
            all_meds = data.current_medications + [data.drug_name]
            ml_interactions = check_drug_interactions(all_meds)
        
        # Step 3: Get LLM analysis with ML predictions for validation
        llm_analysis = None
        if data.use_ai_enhancement and os.getenv("GROQ_API_KEY"):
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
                ml_predictions=ml_effects  # Pass ML predictions for LLM to validate
            )
        
        # Step 4: Merge ML and LLM predictions precisely
        if llm_analysis:
            merged_effects = merge_ml_and_llm_predictions(ml_effects, llm_analysis)
        else:
            merged_effects = [{
                **eff,
                "source": "ML Database",
                "onset": "Unknown",
                "mechanism": "",
                "patient_specific_risk": "",
                "management": "",
                "requires_discontinuation": False
            } for eff in ml_effects]
        
        # Step 5: Get LLM interaction analysis
        llm_interactions = None
        if data.current_medications and data.use_ai_enhancement and os.getenv("GROQ_API_KEY"):
            all_meds = data.current_medications + [data.drug_name]
            llm_interactions = check_drug_interactions_llm(all_meds)
        
        # Merge interactions
        all_interactions = []
        seen_pairs = set()
        
        # Add ML interactions
        for inter in ml_interactions:
            drugs_key = tuple(sorted([d.lower() for d in inter.get("drugs", [])]))
            if drugs_key not in seen_pairs:
                seen_pairs.add(drugs_key)
                all_interactions.append({
                    **inter,
                    "source": "ML Database"
                })
        
        # Add LLM interactions
        if llm_interactions and "interactions" in llm_interactions:
            for inter in llm_interactions.get("interactions", []):
                drugs = inter.get("drugs", [])
                drugs_key = tuple(sorted([d.lower() for d in drugs]))
                if drugs_key not in seen_pairs:
                    seen_pairs.add(drugs_key)
                    all_interactions.append({
                        "drugs": drugs,
                        "warning": f"{inter.get('clinical_effect', '')}",
                        "mechanism": inter.get("mechanism", ""),
                        "severity": inter.get("severity", "Moderate"),
                        "management": inter.get("management", ""),
                        "evidence_level": inter.get("evidence_level", ""),
                        "source": "AI Analysis"
                    })
        
        # Sort interactions by severity
        severity_order = {"Contraindicated": 0, "Major": 1, "High": 1, "Moderate": 2, "Minor": 3, "Low": 4}
        all_interactions.sort(key=lambda x: severity_order.get(x.get("severity", "Moderate"), 2))
        
        # Build response
        response = {
            "drug_queried": data.drug_name,
            "drug_found": ml_result.get("drug_found"),
            "personalized": ml_result.get("personalized", False),
            "user_risk_factors": ml_result.get("user_risk_factors", []),
            "predictions": merged_effects,
            "interactions": all_interactions,
            "ai_enhanced": llm_analysis is not None,
            "disclaimer": "For educational purposes only. Consult a healthcare provider."
        }
        
        # Add comprehensive AI analysis details
        if llm_analysis:
            response["ai_analysis"] = {
                "drug_class": llm_analysis.get("drug_class", ""),
                "mechanism_of_action": llm_analysis.get("mechanism_of_action", llm_analysis.get("mechanism", "")),
                "half_life": llm_analysis.get("half_life", ""),
                "metabolism": llm_analysis.get("metabolism", ""),
                "contraindications": llm_analysis.get("contraindications", {}),
                "black_box_warnings": llm_analysis.get("black_box_warnings", []),
                "monitoring_parameters": llm_analysis.get("monitoring_parameters", []),
                "overall_risk_assessment": llm_analysis.get("overall_risk_assessment", {})
            }
            
            # Add critical alerts if present
            if llm_interactions and "critical_alerts" in llm_interactions:
                response["critical_alerts"] = llm_interactions.get("critical_alerts", [])
        
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-ai")
def predict_ai_only(data: DrugQuery):
    """Get pure LLM-based drug analysis (requires GROQ_API_KEY)."""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set")
    
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
            duration=data.duration
        )
        
        if not llm_analysis:
            raise HTTPException(status_code=500, detail="Failed to get AI analysis")
        
        return {
            "drug_queried": data.drug_name,
            "analysis": llm_analysis,
            "source": "Groq LLM (Llama 4 Scout / Llama 3.3 70B)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/check-interactions")
def check_interactions(data: InteractionCheckRequest):
    """Check drug interactions with hybrid analysis."""
    try:
        ml_interactions = check_drug_interactions(data.medications)
        
        llm_result = None
        if data.use_ai and os.getenv("GROQ_API_KEY"):
            llm_result = check_drug_interactions_llm(data.medications)
        
        return {
            "medications": data.medications,
            "interactions": ml_interactions,
            "ai_analysis": llm_result,
            "ai_enhanced": llm_result is not None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/drug-info/{name}")
def get_drug_info_ai(name: str):
    """Get comprehensive drug information using AI."""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not set")
    
    try:
        info = get_drug_info_llm(name)
        if not info:
            raise HTTPException(status_code=404, detail=f"Could not get info for '{name}'")
        return {"drug_name": name, "info": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def read_root():
    """API health check."""
    groq_enabled = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "running",
        "version": "5.0.0",
        "name": "Drug Adverse Effects Predictor",
        "ai_enhancement": "enabled" if groq_enabled else "disabled",
        "model": "Llama 4 Scout + Llama 3.3 70B" if groq_enabled else "ML Only"
    }


@app.get("/drugs")
def list_drugs():
    """List all drugs in the database."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "drug_data.csv")
    df = pd.read_csv(data_path)
    drugs = sorted(df['Drug_Name'].unique().tolist())
    return {"drugs": drugs, "count": len(drugs)}


@app.get("/drug/{name}")
def get_drug_info(name: str):
    """Get drug info from database."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "drug_data.csv")
    df = pd.read_csv(data_path)
    
    drug_name = name.strip().title()
    matching = df[df['Drug_Name'].str.lower() == drug_name.lower()]
    
    if matching.empty:
        matching = df[df['Drug_Name'].str.lower().str.contains(drug_name.lower())]
    
    if matching.empty:
        raise HTTPException(status_code=404, detail=f"Drug '{name}' not found")
    
    return {
        "drug_name": matching['Drug_Name'].iloc[0],
        "total_effects": len(matching),
        "effects": matching.to_dict('records')
    }


@app.get("/conditions")
def list_conditions():
    """List supported conditions."""
    return {
        "medical_conditions": [
            "Diabetes", "Heart Disease", "Kidney Disease", "Liver Disease",
            "Asthma", "COPD", "Hypertension", "Depression", "Anxiety",
            "Seizures", "Bleeding Disorder", "Stomach Ulcer", "GERD",
            "Osteoporosis", "Glaucoma", "Pregnancy"
        ],
        "lifestyle_factors": ["Alcohol Use", "Smoking"]
    }


@app.get("/api-status")
def api_status():
    """Check API status."""
    return {
        "groq_api_key_set": bool(os.getenv("GROQ_API_KEY")),
        "ai_features_available": bool(os.getenv("GROQ_API_KEY")),
        "models": ["Llama 4 Scout 17B", "Llama 3.3 70B (fallback)"]
    }
