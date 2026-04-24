const MODEL_API_KEY = import.meta.env.VITE_MODEL_ACCESS_KEY || import.meta.env.VITE_GROQ_API_KEY || '';
const MODEL_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'llama-3.3-70b-versatile';

export function isTrainedModelConfigured() {
  return Boolean(MODEL_API_KEY);
}

function listValue(value, fallback = 'None reported') {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  return value.join(', ');
}

function buildPrompt(data) {
  return `You are NIROG's trained clinical inference model.

Analyze this drug request with high precision using patient-specific pharmacology, adverse-effect risk stratification, contraindication screening, interaction analysis, dosage sensitivity, and clinical monitoring logic.

DRUG REQUEST
Drug: ${data.drug_name}
Dosage: ${data.dosage || 'Not specified'} mg
Duration: ${data.duration || 'Not specified'} days

PATIENT PROFILE
Age: ${data.age || 'Not specified'}
Gender: ${data.gender || 'Not specified'}
Height: ${data.height || 'Not specified'} cm
Weight: ${data.weight || 'Not specified'} kg
Medical conditions: ${listValue(data.medical_conditions)}
Current medications: ${listValue(data.current_medications)}
Allergies: ${listValue(data.allergies, 'No known allergies reported')}
Lifestyle factors: ${listValue(data.lifestyle)}

ANALYSIS REQUIREMENTS
1. Produce patient-specific side-effect probabilities from 0 to 100.
2. Consider comorbidities, age, sex, dosage, treatment duration, allergies, and concurrent medications.
3. Identify drug-drug interactions and classify severity.
4. Include contraindications, monitoring parameters, black-box warnings if relevant, and a benefit-risk assessment.
5. Do not mention external vendors, chatbots, APIs, or provider model names.
6. Present the output as NIROG trained-model analysis.

Return only valid JSON in this exact shape:
{
  "drug_name": "${data.drug_name}",
  "drug_class": "",
  "mechanism_of_action": "",
  "half_life": "",
  "metabolism": "",
  "side_effects": [
    {
      "effect": "",
      "probability_percent": 0,
      "severity": "Mild|Moderate|Severe",
      "onset_timing": "",
      "duration": "",
      "mechanism": "",
      "patient_specific_risk": "",
      "management": "",
      "requires_discontinuation": false
    }
  ],
  "drug_interactions": [
    {
      "drug": "",
      "type": "Pharmacokinetic|Pharmacodynamic",
      "mechanism": "",
      "severity": "Minor|Moderate|Major|Contraindicated",
      "clinical_significance": "",
      "management": ""
    }
  ],
  "contraindications": {
    "absolute": [],
    "relative": []
  },
  "monitoring_parameters": [
    {
      "parameter": "",
      "frequency": "",
      "rationale": ""
    }
  ],
  "black_box_warnings": [],
  "overall_risk_assessment": {
    "risk_level": "Low|Moderate|High|Very High",
    "benefit_risk_ratio": "Favorable|Balanced|Unfavorable",
    "recommendation": "",
    "alternative_drugs": [],
    "rationale": ""
  }
}`;
}

async function callModel(prompt, model) {
  const response = await fetch(MODEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MODEL_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are NIROG Trained Model. Return complete, medically cautious, valid JSON only. Never mention external vendors or provider model names.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.05,
      max_tokens: 3500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Model request failed with status ${response.status}. ${errorText}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content || '';
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeProbability(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export async function predictWithTrainedModel(data) {
  if (!isTrainedModelConfigured()) {
    throw new Error('NIROG trained-model access is not configured. Set VITE_GROQ_API_KEY or VITE_MODEL_ACCESS_KEY.');
  }

  const prompt = buildPrompt(data);
  let responseText = '';

  try {
    responseText = await callModel(prompt, PRIMARY_MODEL);
  } catch {
    responseText = await callModel(prompt, FALLBACK_MODEL);
  }

  const analysis = parseModelJson(responseText);
  if (!analysis) {
    throw new Error('NIROG could not parse the trained-model response.');
  }

  const predictions = (analysis.side_effects || []).map((effect) => ({
    side_effect: effect.effect || 'Unspecified adverse effect',
    probability: normalizeProbability(effect.probability_percent),
    severity: effect.severity || 'Moderate',
    frequency: 'Patient-specific estimate',
    onset: effect.onset_timing || 'Unknown',
    mechanism: effect.mechanism || '',
    patient_specific_risk: effect.patient_specific_risk || '',
    management: effect.management || '',
    requires_discontinuation: Boolean(effect.requires_discontinuation),
    source: 'NIROG Model Insight',
    risk_factors_matched: [],
  }));

  const severityRank = { Severe: 0, Moderate: 1, Mild: 2 };
  predictions.sort(
    (first, second) =>
      second.probability - first.probability ||
      (severityRank[first.severity] ?? 1) - (severityRank[second.severity] ?? 1),
  );

  const interactions = (analysis.drug_interactions || [])
    .filter((interaction) => interaction.drug || interaction.clinical_significance)
    .map((interaction) => ({
      drugs: [interaction.drug, data.drug_name].filter(Boolean),
      warning: interaction.clinical_significance || '',
      mechanism: interaction.mechanism || '',
      severity: interaction.severity || 'Moderate',
      management: interaction.management || '',
      evidence_level: interaction.type || '',
      source: 'NIROG Model Insight',
    }));

  return {
    drug_queried: data.drug_name,
    drug_found: analysis.drug_name || data.drug_name,
    personalized: true,
    user_risk_factors: [
      ...(data.medical_conditions || []),
      ...(data.allergies || []).map((item) => `allergy: ${item}`),
      ...(data.current_medications || []).map((item) => `current medication: ${item}`),
    ],
    predictions: predictions.slice(0, 10),
    interactions,
    ai_enhanced: true,
    analysis_engine: 'NIROG Trained Model',
    ai_analysis: {
      drug_class: analysis.drug_class || '',
      mechanism_of_action: analysis.mechanism_of_action || '',
      half_life: analysis.half_life || '',
      metabolism: analysis.metabolism || '',
      contraindications: analysis.contraindications || {},
      black_box_warnings: analysis.black_box_warnings || [],
      monitoring_parameters: analysis.monitoring_parameters || [],
      overall_risk_assessment: analysis.overall_risk_assessment || {},
    },
    disclaimer: 'For educational purposes only. Consult a qualified healthcare professional.',
  };
}
