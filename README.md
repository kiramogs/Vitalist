# NIROG

Profile-aware drug safety prediction using a curated adverse-effect dataset, a stronger ML ranking pipeline, Firebase-backed patient memory, and a hosted NLP layer powered through Groq.

![Version](https://img.shields.io/badge/Version-5.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- `NIROG` branding across the frontend and API
- Profile-aware side effect scoring using age, gender, conditions, medications, allergies, dosage, and duration
- Stronger ML training pipeline with synthetic patient-profile expansion from the curated dataset
- Cross-validated model selection between multiple tree-based classifiers
- Hybrid output path: curated ML predictions first, hosted NLP validation and enhancement second
- Drug interaction detection with deterministic rules plus optional AI review
- Firebase Google sign-in plus Firestore storage for medical history and prediction history
- Hosted ML-NLP presentation layer for Groq `openai/gpt-oss-120b` inference

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

## Firebase Setup

The frontend is already wired to this Firebase project:

- `nirog-5b804`

To make sign-in and Firestore work end-to-end, enable the following in Firebase Console:

1. Google Authentication in `Authentication > Sign-in method`
2. Firestore Database in production or test mode
3. Authorized domains for your deployed frontend URL
4. Add local development hosts (`localhost`, `127.0.0.1`) in `Authentication > Settings > Authorized domains`

### Google Sign-In Troubleshooting

If you see `Google sign-in failed`, verify these in order:

1. Firebase Console > `Authentication > Sign-in method` > Google = **Enabled**
2. Firebase Console > `Authentication > Settings > Authorized domains` includes:
   - `localhost`
   - `127.0.0.1`
   - your deployed domain (for example Vercel domain)
3. Firebase project matches the config in `src/lib/firebase.js`
4. Browser allows popups for the app URL

Recommended Firestore structure used by the app:

- `users/{uid}` - public profile metadata
- `users/{uid}/private/medicalProfile` - saved medical history and latest profile context
- `users/{uid}/predictionHistory/{docId}` - prior NIROG analyses

Recommended starter Firestore rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## API Endpoints

- `POST /predict` - profile-aware ML prediction with hosted NLP enhancement
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
