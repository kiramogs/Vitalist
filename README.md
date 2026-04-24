# NIROG

Profile-aware drug safety prediction using a curated adverse-effect dataset, a stronger trained-model ranking pipeline, Firebase-backed patient memory, and patient-specific clinical risk analysis.

![Version](https://img.shields.io/badge/Version-5.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- `NIROG` branding across the frontend and API
- Profile-aware side effect scoring using age, gender, conditions, medications, allergies, dosage, and duration
- Stronger ML training pipeline with synthetic patient-profile expansion from the curated dataset
- Cross-validated model selection between multiple tree-based classifiers
- Hybrid output path: curated ML predictions first, trained-model clinical validation and enhancement second
- Drug interaction detection with deterministic rules plus optional AI review
- Firebase Google sign-in plus Firestore storage for medical history and prediction history
- Trained-model presentation layer for patient-specific drug safety inference

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
5. Add your live deployment host `nirog-app.vercel.app` in `Authentication > Settings > Authorized domains`
6. Create the Firestore database itself in `Firestore Database` before expecting medical history writes to work

### Google Sign-In Troubleshooting

If you see `Google sign-in failed`, verify these in order:

1. Firebase Console > `Authentication > Sign-in method` > Google = **Enabled**
2. Firebase Console > `Authentication > Settings > Authorized domains` includes:
   - `localhost`
   - `127.0.0.1`
   - `nirog-app.vercel.app`
3. Firebase project matches the config in `src/lib/firebase.js`
4. If popup-based auth was previously cached, retry sign-in after reload. The app now uses redirect-based Google auth to avoid popup blockers.

### Firestore Troubleshooting

If NIROG shows the prediction but says medical history could not be saved:

1. Open `Firebase Console > Firestore Database` and make sure the database has actually been created
2. Confirm the project is still `nirog-5b804`
3. Add Firestore rules that allow the signed-in user to access only their own `users/{uid}` documents
4. Check the browser console for Firestore errors such as `permission-denied` or `failed-precondition`

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
- `VITE_GROQ_API_KEY` or `VITE_MODEL_ACCESS_KEY` - enables in-app trained-model analysis when the backend is not reachable

For Vercel, set `VITE_API_URL` in Project Settings to your deployed backend, for example:

```text
https://your-backend-service.example.com
```

If `VITE_API_URL` is missing on Vercel, NIROG can still run analysis from the app itself when the frontend model access key is configured.

## License

MIT License. For educational purposes only. Always consult a qualified healthcare professional.
