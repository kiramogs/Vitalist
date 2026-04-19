# NIROG

Profile-aware drug safety prediction using a curated adverse-effect dataset, a stronger ML ranking pipeline, and optional LLM enrichment through Groq.

![Version](https://img.shields.io/badge/Version-5.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- `NIROG` branding across the frontend and API
- Profile-aware side effect scoring using age, gender, conditions, medications, allergies, dosage, and duration
- Stronger ML training pipeline with synthetic patient-profile expansion from the curated dataset
- Cross-validated model selection between multiple tree-based classifiers
- Hybrid output path: curated ML predictions first, optional Groq LLM validation and enhancement second
- Drug interaction detection with deterministic rules plus optional AI review

## What Changed In The ML Pipeline

The old backend trained a classifier but did not really use it for ranking live predictions, and it also leaked target information through `Frequency` and `Severity` during training.

NIROG now:

- builds a broader training matrix by generating synthetic patient-profile variants from the local curated records
- trains a binary ranker to score whether a given drug/effect pair is relevant for a specific profile
- benchmarks multiple ensemble models with cross-validated ROC-AUC
- stores model metrics and exposes them through `/model-metrics`
- blends model probability with evidence-weighted risk scoring during inference

Important limitation:

- the dataset is still the local curated corpus in `backend/data/drug_data.csv`
- the "broader dataset" here means broader profile coverage generated from that corpus, not a newly imported external medical database
- this project remains educational software and should not be treated as clinical decision support

## Project Structure

```text
SEM 6 Project/
|-- backend/
|   |-- main.py
|   |-- model.py
|   |-- ai_service.py
|   |-- data/drug_data.csv
|   |-- requirements.txt
|   `-- run_server.py
|-- src/
|   |-- App.jsx
|   |-- index.css
|   `-- components/
|-- index.html
|-- package.json
`-- README.md
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run_server.py
```

### Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

- `POST /predict` - profile-aware ML prediction with optional AI enhancement
- `POST /predict-ai` - LLM-only analysis
- `POST /check-interactions` - interaction analysis
- `GET /drugs` - list drugs in the curated dataset
- `GET /drug/{name}` - fetch database entries for a drug
- `GET /api-status` - AI and model status
- `GET /model-metrics` - stored ML training metadata

## Environment Variables

### Backend

- `GROQ_API_KEY` - enables AI enhancement
- `PORT` - server port for deployment platforms

### Frontend

- `VITE_API_URL` - backend base URL

## License

MIT License. For educational purposes only. Always consult a qualified healthcare professional.
