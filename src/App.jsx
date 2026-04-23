import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { Brain, Database, ShieldCheck } from 'lucide-react';

import DrugForm from './components/DrugForm';
import PredictionResult from './components/PredictionResult';
import AuthPanel from './components/AuthPanel';
import HistoryPanel from './components/HistoryPanel';
import { auth, googleProvider } from './lib/firebase';
import {
  ensureUserProfile,
  loadMedicalProfile,
  loadPredictionHistory,
  saveMedicalProfile,
  savePredictionHistory,
} from './lib/userStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [medicalProfile, setMedicalProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [profileDraft, setProfileDraft] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setMedicalProfile(null);
        setHistory([]);
        return;
      }

      try {
        setIsLoadingHistory(true);
        await ensureUserProfile(nextUser);
        const [savedProfile, savedHistory] = await Promise.all([
          loadMedicalProfile(nextUser.uid),
          loadPredictionHistory(nextUser.uid),
        ]);
        setMedicalProfile(savedProfile);
        setHistory(savedHistory);
        if (savedProfile) {
          setProfileDraft(savedProfile);
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setIsLoadingHistory(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (authError) {
      if (authError?.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error(authError);
      setError('Google sign-in failed. Please verify the Firebase Auth Google provider is enabled.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setResult(null);
    } catch (authError) {
      console.error(authError);
      setError('Could not sign out right now.');
    }
  };

  const refreshFirestoreData = async (uid) => {
    const [savedProfile, savedHistory] = await Promise.all([
      loadMedicalProfile(uid),
      loadPredictionHistory(uid),
    ]);
    setMedicalProfile(savedProfile);
    setHistory(savedHistory);
  };

  const handlePredict = async (data) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        ...data,
        use_ai_enhancement: true,
      });

      setResult(response.data);

      if (user?.uid) {
        setIsSavingProfile(true);
        await saveMedicalProfile(user.uid, data);
        await savePredictionHistory(user.uid, data, response.data);
        await refreshFirestoreData(user.uid);
      }
    } catch (requestError) {
      console.error(requestError);
      if (requestError.response?.data?.detail) {
        setError(requestError.response.data.detail);
      } else {
        setError('Failed to get prediction. Ensure backend is running and Firebase is configured correctly.');
      }
    } finally {
      setIsLoading(false);
      setIsSavingProfile(false);
    }
  };

  const handleLoadProfile = () => {
    if (medicalProfile) {
      setProfileDraft(medicalProfile);
    }
  };

  const handleLoadHistoryEntry = (entry) => {
    if (entry?.request) {
      setProfileDraft(entry.request);
    }
    if (entry?.response) {
      setResult(entry.response);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      <div className="mesh-gradient" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col items-center gap-6">
        <header className="text-center mb-2">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-5xl md:text-6xl font-bold text-white tracking-tight"
          >
            <span className="bg-gradient-to-r from-purple-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              NIROG
            </span>
          </motion.h1>
          <p className="mt-4 text-sm md:text-base text-white/55 tracking-[0.2em] uppercase">
            Profile-Aware Drug Safety Intelligence
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-white/55">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-200" />
              Firebase Auth + Firestore memory
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-1.5">
              <Database className="h-3.5 w-3.5 text-purple-200" />
              Hosted profile ranker
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5">
              <Brain className="h-3.5 w-3.5 text-emerald-200" />
              Groq `gpt-oss-120b` as NIROG NLP layer
            </span>
          </div>
        </header>

        <AuthPanel
          user={user}
          authReady={authReady}
          isSavingProfile={isSavingProfile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        <HistoryPanel
          user={user}
          medicalProfile={medicalProfile}
          history={history}
          isLoadingHistory={isLoadingHistory}
          onLoadProfile={handleLoadProfile}
          onLoadHistoryEntry={handleLoadHistoryEntry}
        />

        <main className="w-full flex flex-col items-center gap-6">
          <DrugForm
            onPredict={handlePredict}
            isLoading={isLoading}
            initialProfile={profileDraft}
            onProfileDraftChange={setProfileDraft}
            isAuthenticated={Boolean(user)}
          />

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
                    className="flex flex-wrap items-center justify-center gap-3 text-white/60 text-sm"
                  >
                    <span>
                      Results for: <span className="text-purple-300 font-medium">{result.drug_found}</span>
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Brain className="w-4 h-4" />
                      {result.analysis_engine || (result.ai_enhanced ? 'NIROG Hosted ML-NLP' : 'NIROG Profile Ranker')}
                    </span>
                  </motion.div>
                )}
                <PredictionResult
                  results={result.predictions}
                  interactions={result.interactions}
                  personalized={result.personalized}
                  userRiskFactors={result.user_risk_factors}
                  aiAnalysis={result.ai_analysis}
                  aiEnhanced={result.ai_enhanced}
                  analysisEngine={result.analysis_engine}
                />
              </>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
