import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import DrugForm from './components/DrugForm';
import PredictionResult from './components/PredictionResult';
import { Brain } from 'lucide-react';

function App() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async (data) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/predict', {
        ...data,
        use_ai_enhancement: true  // Enable AI by default
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to get prediction. Ensure backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Background Mesh */}
      <div className="mesh-gradient" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        <header className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Brain className="w-10 h-10 text-cyan-300" />
            <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
              AI-Powered
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            Drug Adverse Effects{' '}
            <span className="bg-gradient-to-r from-purple-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Predictor
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-white/50 text-lg font-light tracking-wide max-w-xl mx-auto"
          >
            Hybrid ML + LLM system using Groq's Llama 3.3 70B for extreme precision
          </motion.p>
        </header>

        <main className="w-full flex flex-col items-center gap-6">
          <DrugForm onPredict={handlePredict} isLoading={isLoading} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel bg-red-500/10 border-red-500/20 text-red-200 p-4 text-center w-full max-w-2xl"
              >
                {error}
              </motion.div>
            )}

            {result && (
              <>
                {result.drug_found && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-white/60 text-sm"
                  >
                    <span>Results for: <span className="text-purple-300 font-medium">{result.drug_found}</span></span>
                    {result.ai_enhanced && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Brain className="w-4 h-4" /> AI Enhanced
                      </span>
                    )}
                  </motion.div>
                )}
                <PredictionResult
                  results={result.predictions}
                  interactions={result.interactions}
                  personalized={result.personalized}
                  userRiskFactors={result.user_risk_factors}
                  aiAnalysis={result.ai_analysis}
                  aiEnhanced={result.ai_enhanced}
                />
              </>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-16 text-center">
          <p className="text-white/20 text-sm font-medium tracking-widest uppercase">
            © 2026 AI Medicinal Predictor • For Educational Use Only
          </p>
          <p className="text-white/10 text-xs mt-2">
            Powered by Groq Llama 3.3 70B + Custom ML Model
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
