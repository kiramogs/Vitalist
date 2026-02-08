# Vitalist - Drug Adverse Effects Predictor

AI-powered drug safety analysis using hybrid ML + LLM system.

![Vitalist](https://img.shields.io/badge/Version-5.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

- **Hybrid ML + LLM**: Combines curated database with Groq's Llama models
- **Personalized Risk Scoring**: Age, medical conditions, current medications
- **Drug Interaction Detection**: 13+ dangerous interaction patterns
- **FDA Black Box Warnings**: Critical safety alerts
- **Premium Glass UI**: Apple-inspired design with Framer Motion

## 🏗️ Project Structure

```
Vitalist/
├── backend/                 # FastAPI Backend
│   ├── main.py             # API endpoints
│   ├── model.py            # ML prediction model
│   ├── ai_service.py       # Groq LLM integration
│   ├── data/drug_data.csv  # Drug database (437 entries)
│   ├── requirements.txt    # Python dependencies
│   └── Procfile            # Deployment config
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   ├── vercel.json         # Vercel deployment config
│   └── package.json
│
└── README.md
```

## 🖥️ Local Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python run_server.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## ☁️ Deployment

### Backend (Railway / Render)

1. **Railway**:
   - Connect your GitHub repo
   - Set root directory to `backend`
   - Add env variable: `GROQ_API_KEY=your_key`
   - Deploy automatically

2. **Render**:
   - Create new Web Service
   - Set root directory to `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add env variable: `GROQ_API_KEY`

### Frontend (Vercel)

1. Import your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add env variable: `VITE_API_URL=https://your-backend-url.railway.app`
4. Deploy

## 🔑 Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |
| `PORT` | Server port (auto-set by platforms) |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., https://api.example.com) |

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | ML + LLM drug analysis |
| `/predict-ai` | POST | Pure LLM analysis |
| `/check-interactions` | POST | Drug interaction check |
| `/drugs` | GET | List all 85+ drugs |
| `/drug/{name}` | GET | Get specific drug info |
| `/api-status` | GET | Check AI availability |

## 🧪 Example Request

```bash
curl -X POST https://your-api.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "drug_name": "Warfarin",
    "age": 70,
    "current_medications": ["Aspirin"],
    "medical_conditions": ["Heart Disease"]
  }'
```

## 📄 License

MIT License - For educational purposes only. Always consult healthcare providers.

## 🙏 Credits

- Groq API for LLM inference
- SIDER database for drug side effect data
