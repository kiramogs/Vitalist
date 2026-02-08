# AI Medicinal Drugs Adverse Effects Predictor

An advanced AI application that predicts potential side effects of medicinal drugs based on patient demographics and dosage. Built with a premium **Apple-Style Glassmorphism UI**.

![Project Banner](https://via.placeholder.com/1200x600?text=AI+Drug+Predictor+Glass+UI)

## 🚀 Features

- **AI-Powered Analysis**: Uses a Random Forest Classifier to predict side effects.
- **Premium Design**:
  - **Glassmorphism**: Frosted glass panels with `backdrop-filter`.
  - **Mesh Gradients**: Smooth, animated background.
  - **Interactive**: Framer Motion animations for a fluid experience.
- **Real-time API**: FastAPI backend for instant results.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Python, FastAPI, Scikit-learn, Pandas
- **Model**: Random Forest Classifier (trained on synthetic data for demo)

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repo-url>
cd drug-adverse-effects-predictor
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python run_server.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Usage

1. Open `http://localhost:5173` in your browser.
2. Enter patient details (Age, Gender) and Drug Name (e.g., *Amoxicillin*, *Ibuprofen*).
3. Click **Predict** to see potential adverse effects with probability scores.

## 📝 License

MIT License.
