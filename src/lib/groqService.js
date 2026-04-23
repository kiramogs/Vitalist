/**
 * NIROG frontend Groq service.
 * Calls the Groq API directly from the browser so the app works
 * without a separate Python backend deployment.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'llama-3.3-70b-versatile';

export function isGroqConfigured() {
  return Boolean(GROQ_API_KEY);
}

// ── prompt builder ──────────────────────────────────────────────────────────

function buildPatientProfile({ age, gender, height, weight }) {
  const parts = [];
  if (age) {
    const cat = age < 18 ? 'pediatric' : age < 65 ? 'adult' : 'geriatric';
    parts.push(`Age: ${age} years (${cat})`);
  }
  if (gender) parts.push(`Biological sex: ${gender}`);
  if (height) parts.push(`Height: ${height} cm`);
  if (weight) {
    let bmi = '';
    if (height && height > 0) {
      const h = height / 100;
      const val = weight / (h * h);
      if (val < 18.5) bmi = ' (underweight range)';
      else if (val > 30) bmi = ' (obese range - affects drug distribution)';
    }
    parts.push(`Weight: ${weight} kg${bmi}`);
  }
  return parts.length ? parts.map((p) => `  • ${p}`).join('\n') : '  • Not specified';
}

const CONDITION_NOTES = {
  diabetes: 'affects drug metabolism, hypoglycemia risk',
  'heart disease': 'cardiovascular interactions, QT prolongation risk',
  'kidney disease': 'reduced clearance, dose adjustment needed',
  'liver disease': 'altered metabolism, toxicity risk',
  hypertension: 'BP effects, drug interactions',
  depression: 'CNS effects, serotonergic interactions',
  asthma: 'bronchospasm risk with beta-blockers',
  copd: 'respiratory depression risk with opioids/sedatives',
};

function buildConditions(conditions) {
  if (!conditions?.length) return '  • None reported';
  return conditions
    .map((c) => {
      const note = Object.entries(CONDITION_NOTES).find(([k]) => c.toLowerCase().includes(k));
      return `  • ${note ? `${c} (${note[1]})` : c}`;
    })
    .join('\n');
}

function buildAllergies(allergies) {
  if (!allergies?.length) return '  • No known drug allergies (NKDA)';
  return allergies
    .map((a) => {
      const l = a.toLowerCase();
      if (l.includes('penicillin')) return `  • ${a} (cross-reactivity with cephalosporins possible)`;
      if (l.includes('sulfa')) return `  • ${a} (check for sulfonamide-containing drugs)`;
      if (l.includes('aspirin') || l.includes('nsaid')) return `  • ${a} (cross-reactivity with other NSAIDs)`;
      return `  • ${a}`;
    })
    .join('\n');
}

function buildLifestyle(lifestyle) {
  if (!lifestyle?.length) return '  • None reported';
  return lifestyle
    .map((f) => {
      const l = f.toLowerCase();
      if (l.includes('alcohol')) return '  • Alcohol use (hepatotoxicity risk, CNS depression, disulfiram reactions)';
      if (l.includes('smok')) return '  • Smoking (induces CYP1A2, may reduce drug levels)';
      return `  • ${f}`;
    })
    .join('\n');
}

function dosageLabel(dosage) {
  if (!dosage) return 'Not specified';
  if (dosage > 1000) return `${dosage} mg (HIGH DOSE - increased adverse effect risk)`;
  if (dosage > 500) return `${dosage} mg (moderate-high dose)`;
  return `${dosage} mg`;
}

function durationLabel(duration) {
  if (!duration) return 'Not specified';
  if (duration > 90) return `${duration} days (LONG-TERM USE - monitor for cumulative effects)`;
  if (duration > 30) return `${duration} days (extended use)`;
  if (duration > 14) return `${duration} days (short-term course)`;
  return `${duration} days (acute use)`;
}

function buildPrompt(data) {
  const drug = data.drug_name;
  const profile = buildPatientProfile(data);
  const conditions = buildConditions(data.medical_conditions);
  const meds = data.current_medications?.length
    ? data.current_medications.map((m) => `  • ${m}`).join('\n')
    : '  • None reported';
  const allergies = buildAllergies(data.allergies);
  const lifestyle = buildLifestyle(data.lifestyle);

  return `You are the clinical NLP reasoning layer inside NIROG's hosted drug safety platform. Analyze the following drug for this specific patient with EXTREME PRECISION.

═══════════════════════════════════════════════════════════════════════════════
                              DRUG ANALYSIS REQUEST
═══════════════════════════════════════════════════════════════════════════════

DRUG: ${drug.toUpperCase()}
PRESCRIBED DOSAGE: ${dosageLabel(data.dosage)}
TREATMENT DURATION: ${durationLabel(data.duration)}

───────────────────────────────────────────────────────────────────────────────
                              PATIENT PROFILE
───────────────────────────────────────────────────────────────────────────────

DEMOGRAPHICS:
${profile}

COMORBIDITIES (consider each for drug interactions and contraindications):
${conditions}

CURRENT MEDICATIONS (check ALL potential interactions):
${meds}

DRUG ALLERGIES & SENSITIVITIES:
${allergies}

LIFESTYLE & SOCIAL FACTORS:
${lifestyle}

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
{
    "drug_name": "${drug}",
    "drug_class": "<exact pharmacological class>",
    "mechanism_of_action": "<detailed mechanism>",
    "half_life": "<elimination half-life>",
    "metabolism": "<primary metabolic pathway (CYP enzymes involved)>",
    "side_effects": [
        {
            "effect": "<precise medical term>",
            "probability_percent": <integer 0-100>,
            "severity": "Mild|Moderate|Severe",
            "onset_timing": "Immediate|Hours|Days|Weeks",
            "duration": "Transient|Persistent|Permanent",
            "mechanism": "<why this effect occurs>",
            "patient_specific_risk": "<how THIS patient's factors affect risk>",
            "management": "<specific management strategy>",
            "requires_discontinuation": <true|false>
        }
    ],
    "drug_interactions": [
        {
            "drug": "<interacting medication>",
            "type": "Pharmacokinetic|Pharmacodynamic",
            "mechanism": "<interaction mechanism>",
            "severity": "Minor|Moderate|Major|Contraindicated",
            "clinical_significance": "<clinical effect>",
            "management": "<how to manage>"
        }
    ],
    "contraindications": {
        "absolute": ["<absolute contraindications>"],
        "relative": ["<relative contraindications>"]
    },
    "monitoring_parameters": [
        {
            "parameter": "<what to monitor>",
            "frequency": "<how often>",
            "rationale": "<why>"
        }
    ],
    "black_box_warnings": ["<FDA black box warnings if any>"],
    "overall_risk_assessment": {
        "risk_level": "Low|Moderate|High|Very High",
        "benefit_risk_ratio": "Favorable|Balanced|Unfavorable",
        "recommendation": "<specific clinical recommendation>",
        "alternative_drugs": ["<safer alternatives if risk is high>"],
        "rationale": "<detailed clinical reasoning>"
    }
}

CRITICAL INSTRUCTIONS:
- Be PRECISE with probabilities - use real incidence data
- Account for ALL patient-specific risk factors
- Flag any critical drug-drug interactions
- If drug is contraindicated for this patient, state clearly
- Include BLACK BOX warnings if applicable
- Provide actionable clinical recommendations
- Never refer to Groq, OpenAI, GPT, LLMs, chatbots, or external providers
- Frame all reasoning as NIROG hosted ML-NLP output`;
}

// ── Groq API caller ─────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userPrompt, model) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.05,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// ── public API ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are NIROG's hosted clinical NLP inference layer.
Your responses must be:
1. Medically accurate and evidence-based
2. Precise with probability estimates
3. Patient-specific, considering all provided risk factors
4. Formatted as valid JSON only
5. Never mention external model vendors or that you are a chatbot

Never include text outside the JSON structure. Always respond with complete, valid JSON.`;

/**
 * Run a full drug analysis via the Groq API.
 * Returns a structured response matching the backend format.
 */
export async function predictWithGroq(data) {
  const prompt = buildPrompt(data);

  let responseText;
  try {
    responseText = await callGroq(SYSTEM_PROMPT, prompt, PRIMARY_MODEL);
  } catch {
    responseText = await callGroq(SYSTEM_PROMPT, prompt, FALLBACK_MODEL);
  }

  const analysis = parseJsonResponse(responseText);
  if (!analysis) {
    throw new Error('Could not parse the analysis response.');
  }

  // Transform into the same shape the rest of the app expects
  const predictions = (analysis.side_effects || []).map((eff) => ({
    side_effect: eff.effect || 'Unknown',
    probability: eff.probability_percent ?? 50,
    severity: eff.severity || 'Moderate',
    frequency: 'AI Predicted',
    onset: eff.onset_timing || 'Unknown',
    mechanism: eff.mechanism || '',
    patient_specific_risk: eff.patient_specific_risk || '',
    management: eff.management || '',
    requires_discontinuation: eff.requires_discontinuation || false,
    source: 'NIROG Analysis',
    risk_factors_matched: [],
  }));

  const severityOrder = { Severe: 0, Moderate: 1, Mild: 2 };
  predictions.sort(
    (a, b) => b.probability - a.probability || (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1),
  );

  const interactions = (analysis.drug_interactions || []).map((ix) => ({
    drugs: [ix.drug, data.drug_name],
    warning: ix.clinical_significance || '',
    mechanism: ix.mechanism || '',
    severity: ix.severity || 'Moderate',
    management: ix.management || '',
    evidence_level: ix.evidence_level || '',
    source: 'NIROG Analysis',
  }));

  return {
    drug_queried: data.drug_name,
    drug_found: analysis.drug_name || data.drug_name,
    personalized: Boolean(data.age || data.medical_conditions?.length || data.allergies?.length),
    user_risk_factors: [],
    predictions: predictions.slice(0, 10),
    interactions,
    ai_enhanced: true,
    analysis_engine: 'NIROG Analysis',
    ai_analysis: {
      drug_class: analysis.drug_class || '',
      mechanism_of_action: analysis.mechanism_of_action || analysis.mechanism || '',
      half_life: analysis.half_life || '',
      metabolism: analysis.metabolism || '',
      contraindications: analysis.contraindications || {},
      black_box_warnings: analysis.black_box_warnings || [],
      monitoring_parameters: analysis.monitoring_parameters || [],
      overall_risk_assessment: analysis.overall_risk_assessment || {},
    },
    disclaimer: 'For educational purposes only. Consult a healthcare provider.',
  };
}
