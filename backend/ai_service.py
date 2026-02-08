"""
AI-Enhanced Drug Analysis Service v2.0
Hybrid ML + LLM system with precise integration using Groq API.
Uses openai/gpt-oss-120b for maximum precision.
"""
import os
from dotenv import load_dotenv
from groq import Groq
import json
from typing import Optional, List, Dict
import re

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Model configuration - using GPT-OSS-120B for maximum precision
PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # Fast, capable model
FALLBACK_MODEL = "llama-3.3-70b-versatile"  # Fallback


def get_groq_client():
    """Get Groq client with API key."""
    api_key = GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def create_enhanced_drug_prompt(
    drug_name: str,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    weight: Optional[float] = None,
    medical_conditions: Optional[List[str]] = None,
    current_medications: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None,
    lifestyle: Optional[List[str]] = None,
    dosage: Optional[int] = None,
    duration: Optional[int] = None,
    ml_predictions: Optional[List[Dict]] = None
) -> str:
    """
    Create a highly detailed, medically precise prompt for drug analysis.
    Integrates ML predictions for validation and enhancement.
    """
    
    # Build comprehensive patient profile
    patient_profile = []
    if age:
        age_category = "pediatric" if age < 18 else "adult" if age < 65 else "geriatric"
        patient_profile.append(f"Age: {age} years ({age_category})")
    if gender:
        patient_profile.append(f"Biological sex: {gender}")
    if weight:
        bmi_note = ""
        if age and age >= 18:
            # Assume average height for rough BMI estimate
            estimated_bmi = weight / (1.7 ** 2)
            if estimated_bmi < 18.5:
                bmi_note = " (underweight range)"
            elif estimated_bmi > 30:
                bmi_note = " (obese range - affects drug distribution)"
        patient_profile.append(f"Weight: {weight} kg{bmi_note}")
    
    profile_str = "\n".join([f"  • {p}" for p in patient_profile]) if patient_profile else "  • Not specified"
    
    # Medical conditions with clinical implications
    conditions_str = "  • None reported"
    if medical_conditions:
        condition_implications = {
            "diabetes": "affects drug metabolism, hypoglycemia risk",
            "heart disease": "cardiovascular interactions, QT prolongation risk",
            "kidney disease": "reduced clearance, dose adjustment needed",
            "liver disease": "altered metabolism, toxicity risk",
            "hypertension": "BP effects, drug interactions",
            "depression": "CNS effects, serotonergic interactions",
            "asthma": "bronchospasm risk with beta-blockers",
            "copd": "respiratory depression risk with opioids/sedatives"
        }
        conditions_with_notes = []
        for cond in medical_conditions:
            cond_lower = cond.lower()
            implication = next((v for k, v in condition_implications.items() if k in cond_lower), None)
            if implication:
                conditions_with_notes.append(f"{cond} ({implication})")
            else:
                conditions_with_notes.append(cond)
        conditions_str = "\n".join([f"  • {c}" for c in conditions_with_notes])
    
    # Current medications with interaction context
    meds_str = "  • None reported"
    if current_medications:
        meds_str = "\n".join([f"  • {m}" for m in current_medications])
    
    # Allergies with cross-reactivity notes
    allergies_str = "  • No known drug allergies (NKDA)"
    if allergies:
        allergy_notes = []
        for allergy in allergies:
            allergy_lower = allergy.lower()
            if "penicillin" in allergy_lower:
                allergy_notes.append(f"{allergy} (cross-reactivity with cephalosporins possible)")
            elif "sulfa" in allergy_lower:
                allergy_notes.append(f"{allergy} (check for sulfonamide-containing drugs)")
            elif "aspirin" in allergy_lower or "nsaid" in allergy_lower:
                allergy_notes.append(f"{allergy} (cross-reactivity with other NSAIDs)")
            else:
                allergy_notes.append(allergy)
        allergies_str = "\n".join([f"  • {a}" for a in allergy_notes])
    
    # Lifestyle factors
    lifestyle_str = "  • None reported"
    if lifestyle:
        lifestyle_notes = []
        for factor in lifestyle:
            factor_lower = factor.lower()
            if "alcohol" in factor_lower:
                lifestyle_notes.append("Alcohol use (hepatotoxicity risk, CNS depression, disulfiram reactions)")
            elif "smok" in factor_lower:
                lifestyle_notes.append("Smoking (induces CYP1A2, may reduce drug levels)")
            else:
                lifestyle_notes.append(factor)
        lifestyle_str = "\n".join([f"  • {l}" for l in lifestyle_notes])
    
    # Dosage context
    dosage_context = ""
    if dosage:
        if dosage > 1000:
            dosage_context = f"{dosage} mg (HIGH DOSE - increased adverse effect risk)"
        elif dosage > 500:
            dosage_context = f"{dosage} mg (moderate-high dose)"
        else:
            dosage_context = f"{dosage} mg"
    else:
        dosage_context = "Not specified"
    
    # Duration context
    duration_context = ""
    if duration:
        if duration > 90:
            duration_context = f"{duration} days (LONG-TERM USE - monitor for cumulative effects)"
        elif duration > 30:
            duration_context = f"{duration} days (extended use)"
        elif duration > 14:
            duration_context = f"{duration} days (short-term course)"
        else:
            duration_context = f"{duration} days (acute use)"
    else:
        duration_context = "Not specified"
    
    # Format ML predictions for validation
    ml_section = ""
    if ml_predictions and len(ml_predictions) > 0:
        ml_effects = []
        for p in ml_predictions[:6]:
            effect = p.get('side_effect', 'Unknown')
            prob = p.get('probability', 0)
            severity = p.get('severity', 'Unknown')
            freq = p.get('frequency', 'Unknown')
            ml_effects.append(f"    - {effect}: {prob}% risk, {severity} severity, {freq} frequency")
        
        ml_section = f"""
═══════════════════════════════════════════════════════════════════════════════
ML MODEL PREDICTIONS (validate and refine these):
{chr(10).join(ml_effects)}

IMPORTANT: Use these ML predictions as a baseline. Validate each prediction 
against current medical literature. Adjust probabilities based on this 
specific patient's risk factors. Add any missing critical side effects.
═══════════════════════════════════════════════════════════════════════════════
"""

    prompt = f"""You are a board-certified clinical pharmacologist and drug safety expert with 20+ years of experience. Analyze the following drug for this specific patient with EXTREME PRECISION.

═══════════════════════════════════════════════════════════════════════════════
                              DRUG ANALYSIS REQUEST
═══════════════════════════════════════════════════════════════════════════════

DRUG: {drug_name.upper()}
PRESCRIBED DOSAGE: {dosage_context}
TREATMENT DURATION: {duration_context}

───────────────────────────────────────────────────────────────────────────────
                              PATIENT PROFILE
───────────────────────────────────────────────────────────────────────────────

DEMOGRAPHICS:
{profile_str}

COMORBIDITIES (consider each for drug interactions and contraindications):
{conditions_str}

CURRENT MEDICATIONS (check ALL potential interactions):
{meds_str}

DRUG ALLERGIES & SENSITIVITIES:
{allergies_str}

LIFESTYLE & SOCIAL FACTORS:
{lifestyle_str}
{ml_section}
───────────────────────────────────────────────────────────────────────────────
                           ANALYSIS REQUIREMENTS
───────────────────────────────────────────────────────────────────────────────

Provide a comprehensive, evidence-based analysis. For each side effect:
1. Calculate PRECISE probability (0-100%) based on:
   - Baseline population incidence from clinical trials
   - Patient-specific risk factor adjustments
   - Drug-drug interaction effects
   - Dose-dependent risk modifications

2. Consider pharmacokinetic factors:
   - Age-related changes in drug metabolism
   - Renal/hepatic impairment effects
   - Drug interactions affecting CYP450 enzymes
   - Protein binding displacement

3. Assess severity using FDA classification:
   - Mild: Self-limiting, no intervention needed
   - Moderate: May require intervention or drug modification
   - Severe: Potentially life-threatening, requires immediate action

OUTPUT FORMAT (respond ONLY with this JSON structure):
{{
    "drug_name": "{drug_name}",
    "drug_class": "<exact pharmacological class>",
    "mechanism_of_action": "<detailed mechanism>",
    "half_life": "<elimination half-life>",
    "metabolism": "<primary metabolic pathway (CYP enzymes involved)>",
    "side_effects": [
        {{
            "effect": "<precise medical term>",
            "probability_percent": <integer 0-100>,
            "severity": "Mild|Moderate|Severe",
            "onset_timing": "Immediate|Hours|Days|Weeks",
            "duration": "Transient|Persistent|Permanent",
            "mechanism": "<why this effect occurs>",
            "patient_specific_risk": "<how THIS patient's factors affect risk>",
            "management": "<specific management strategy>",
            "requires_discontinuation": <true|false>
        }}
    ],
    "drug_interactions": [
        {{
            "drug": "<interacting medication>",
            "type": "Pharmacokinetic|Pharmacodynamic",
            "mechanism": "<interaction mechanism>",
            "severity": "Minor|Moderate|Major|Contraindicated",
            "clinical_significance": "<clinical effect>",
            "management": "<how to manage>"
        }}
    ],
    "contraindications": {{
        "absolute": ["<absolute contraindications>"],
        "relative": ["<relative contraindications>"]
    }},
    "monitoring_parameters": [
        {{
            "parameter": "<what to monitor>",
            "frequency": "<how often>",
            "rationale": "<why>"
        }}
    ],
    "black_box_warnings": ["<FDA black box warnings if any>"],
    "overall_risk_assessment": {{
        "risk_level": "Low|Moderate|High|Very High",
        "benefit_risk_ratio": "Favorable|Balanced|Unfavorable",
        "recommendation": "<specific clinical recommendation>",
        "alternative_drugs": ["<safer alternatives if risk is high>"],
        "rationale": "<detailed clinical reasoning>"
    }}
}}

CRITICAL INSTRUCTIONS:
- Be PRECISE with probabilities - use real incidence data
- Account for ALL patient-specific risk factors
- Flag any critical drug-drug interactions
- If drug is contraindicated for this patient, state clearly
- Include BLACK BOX warnings if applicable
- Provide actionable clinical recommendations
"""
    return prompt


def analyze_drug_with_llm(
    drug_name: str,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    weight: Optional[float] = None,
    medical_conditions: Optional[List[str]] = None,
    current_medications: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None,
    lifestyle: Optional[List[str]] = None,
    dosage: Optional[int] = None,
    duration: Optional[int] = None,
    ml_predictions: Optional[List[Dict]] = None
) -> Optional[Dict]:
    """
    Analyze drug using Groq's LLM for precise, context-aware predictions.
    Integrates with ML model predictions for enhanced accuracy.
    """
    client = get_groq_client()
    if not client:
        return None
    
    prompt = create_enhanced_drug_prompt(
        drug_name=drug_name,
        age=age,
        gender=gender,
        weight=weight,
        medical_conditions=medical_conditions,
        current_medications=current_medications,
        allergies=allergies,
        lifestyle=lifestyle,
        dosage=dosage,
        duration=duration,
        ml_predictions=ml_predictions
    )
    
    try:
        # Try primary model first
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert clinical pharmacologist providing drug safety analysis. 
Your responses must be:
1. Medically accurate and evidence-based
2. Precise with probability estimates
3. Patient-specific, considering all provided risk factors
4. Formatted as valid JSON only

Never include text outside the JSON structure. Always respond with complete, valid JSON."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=PRIMARY_MODEL,
                temperature=0.05,  # Very low for maximum precision
                max_tokens=3000,
                response_format={"type": "json_object"}
            )
        except Exception as model_error:
            print(f"Primary model error, using fallback: {model_error}")
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert clinical pharmacologist. Respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=FALLBACK_MODEL,
                temperature=0.1,
                max_tokens=2500,
                response_format={"type": "json_object"}
            )
        
        response_text = chat_completion.choices[0].message.content
        
        # Parse JSON response
        try:
            analysis = json.loads(response_text)
            return analysis
        except json.JSONDecodeError:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            return None
            
    except Exception as e:
        print(f"Groq API error: {e}")
        return None


def merge_ml_and_llm_predictions(
    ml_effects: List[Dict],
    llm_analysis: Optional[Dict]
) -> List[Dict]:
    """
    Intelligently merge ML predictions with LLM analysis.
    LLM predictions refine and enhance ML predictions.
    """
    if not llm_analysis or "side_effects" not in llm_analysis:
        return ml_effects
    
    llm_effects = llm_analysis.get("side_effects", [])
    
    # Create a map of LLM effects for quick lookup
    llm_effect_map = {}
    for eff in llm_effects:
        effect_name = eff.get("effect", "").lower().strip()
        llm_effect_map[effect_name] = eff
    
    merged = []
    seen_effects = set()
    
    # First, process ML predictions and enhance with LLM data
    for ml_eff in ml_effects:
        ml_name = ml_eff.get("side_effect", "").lower().strip()
        seen_effects.add(ml_name)
        
        # Check if LLM has this effect
        llm_eff = None
        for llm_name, llm_data in llm_effect_map.items():
            # Fuzzy match
            if ml_name in llm_name or llm_name in ml_name or ml_name == llm_name:
                llm_eff = llm_data
                break
        
        if llm_eff:
            # Merge: Use LLM probability if significantly different, average otherwise
            ml_prob = ml_eff.get("probability", 50)
            llm_prob = llm_eff.get("probability_percent", 50)
            
            # Weight LLM higher for precision
            final_prob = int((ml_prob * 0.3) + (llm_prob * 0.7))
            
            merged.append({
                "side_effect": llm_eff.get("effect", ml_eff.get("side_effect")),
                "probability": final_prob,
                "severity": llm_eff.get("severity", ml_eff.get("severity", "Moderate")),
                "frequency": ml_eff.get("frequency", "Unknown"),
                "onset": llm_eff.get("onset_timing", "Unknown"),
                "mechanism": llm_eff.get("mechanism", ""),
                "patient_specific_risk": llm_eff.get("patient_specific_risk", ""),
                "management": llm_eff.get("management", ""),
                "requires_discontinuation": llm_eff.get("requires_discontinuation", False),
                "source": "ML+AI Merged",
                "risk_factors_matched": ml_eff.get("risk_factors_matched", [])
            })
        else:
            # Keep ML prediction as-is
            merged.append({
                **ml_eff,
                "source": "ML Database"
            })
    
    # Add LLM-only predictions not in ML (important ones AI caught)
    for llm_eff in llm_effects:
        effect_name = llm_eff.get("effect", "").lower().strip()
        
        # Check if already processed
        already_added = any(
            effect_name in m.get("side_effect", "").lower() or 
            m.get("side_effect", "").lower() in effect_name
            for m in merged
        )
        
        if not already_added and llm_eff.get("probability_percent", 0) >= 15:
            merged.append({
                "side_effect": llm_eff.get("effect"),
                "probability": llm_eff.get("probability_percent", 50),
                "severity": llm_eff.get("severity", "Moderate"),
                "frequency": "AI Predicted",
                "onset": llm_eff.get("onset_timing", "Unknown"),
                "mechanism": llm_eff.get("mechanism", ""),
                "patient_specific_risk": llm_eff.get("patient_specific_risk", ""),
                "management": llm_eff.get("management", ""),
                "requires_discontinuation": llm_eff.get("requires_discontinuation", False),
                "source": "AI Analysis",
                "risk_factors_matched": []
            })
    
    # Sort by probability descending, then by severity
    severity_order = {"Severe": 0, "Moderate": 1, "Mild": 2}
    merged.sort(key=lambda x: (-x.get("probability", 0), severity_order.get(x.get("severity", "Moderate"), 1)))
    
    return merged[:10]  # Top 10 effects


def check_drug_interactions_llm(medications: List[str]) -> Optional[Dict]:
    """
    Check drug interactions using LLM for comprehensive analysis.
    """
    client = get_groq_client()
    if not client or len(medications) < 2:
        return None
    
    meds_str = ", ".join(medications)
    
    prompt = f"""As a clinical pharmacologist, analyze ALL potential drug-drug interactions between these medications:

MEDICATIONS: {meds_str}

For EACH pair of interacting drugs, provide:
1. Mechanism of interaction (pharmacokinetic vs pharmacodynamic)
2. Clinical significance
3. Severity level
4. Evidence quality
5. Management recommendation

Respond in JSON format:
{{
    "medications_analyzed": {json.dumps(medications)},
    "interactions": [
        {{
            "drugs": ["<drug1>", "<drug2>"],
            "type": "Pharmacokinetic|Pharmacodynamic|Both",
            "mechanism": "<detailed mechanism>",
            "severity": "Minor|Moderate|Major|Contraindicated",
            "clinical_effect": "<what happens to patient>",
            "onset": "Immediate|Delayed",
            "evidence_level": "Established|Probable|Suspected|Theoretical",
            "management": "<specific recommendation>"
        }}
    ],
    "overall_risk": "Low|Moderate|High|Critical",
    "critical_alerts": ["<any urgent warnings>"],
    "recommendations": ["<clinical recommendations>"]
}}

Be thorough - check ALL possible drug pairs. Include CYP450 interactions, protein binding, and pharmacodynamic effects."""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a clinical pharmacist expert in drug interactions. Provide precise, evidence-based analysis in JSON format only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=FALLBACK_MODEL,
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Groq API error for interactions: {e}")
        return None


def get_drug_info_llm(drug_name: str) -> Optional[Dict]:
    """
    Get comprehensive drug information using LLM.
    """
    client = get_groq_client()
    if not client:
        return None
    
    prompt = f"""Provide comprehensive pharmaceutical information for: {drug_name}

Include:
- Pharmacological classification
- Mechanism of action
- Pharmacokinetics (absorption, distribution, metabolism, excretion)
- Standard dosing (adult, pediatric, renal/hepatic adjustment)
- All known side effects with incidence rates
- Contraindications
- Drug interactions
- Pregnancy/lactation category
- Black box warnings
- Monitoring parameters

Respond in JSON format with complete, clinically accurate information."""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a pharmaceutical information expert. Provide accurate, comprehensive drug information in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=FALLBACK_MODEL,
            temperature=0.1,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Groq API error for drug info: {e}")
        return None
