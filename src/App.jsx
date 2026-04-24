import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { Brain, LogOut, Loader2, UserCog } from 'lucide-react';

import DrugForm from './components/DrugForm';
import PredictionResult from './components/PredictionResult';
import LoginScreen from './components/LoginScreen';
import HealthProfileSetup from './components/HealthProfileSetup';
import HistoryPanel from './components/HistoryPanel';
import BrandLogo from './components/BrandLogo';
import { auth, googleProvider } from './lib/firebase';
import {
  ensureUserProfile,
  loadMedicalProfile,
  loadPredictionHistory,
  saveMedicalProfile,
  savePredictionHistory,
} from './lib/userStore';

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }

  return '';
}

const API_URL = resolveApiUrl();

function getReadableAuthError(error) {
  const code = error?.code || '';
  const host = typeof window !== 'undefined' ? window.location.host : 'this domain';

  if (code === 'auth/popup-closed-by-user') {
    return null;
  }
  if (code === 'auth/unauthorized-domain') {
    return `Google sign-in failed: ${host} is not authorized in Firebase Auth. Add this exact host in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in failed: Google provider is disabled. Enable it in Firebase Console under Authentication > Sign-in method.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Google sign-in failed: browser blocked the popup. NIROG now supports redirect auth, so retry sign-in and it should continue in the same tab.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Google sign-in failed due to network issues. Check internet or firewall and retry.';
  }
  if (code === 'auth/invalid-api-key') {
    return 'Google sign-in failed: Firebase API key is invalid. Verify your Firebase config in src/lib/firebase.js.';
  }
  if (code === 'auth/invalid-credential') {
    return 'Google sign-in failed: OAuth credential is invalid. Check Firebase Web App config and Google Auth setup.';
  }

  return `Google sign-in failed (${code || 'unknown_error'}). Verify Firebase Auth Google provider, authorized domains, and web app config.`;
}




function getReadableFirestoreError(error) {
  const code = error?.code || '';

  if (code === 'permission-denied') {
    return 'Prediction completed, but Firestore denied the save. Check your Firestore security rules for the signed-in user.';
  }

  if (code === 'failed-precondition') {
    return 'Prediction completed, but Firestore is not fully set up yet. Create the Firestore database in Firebase Console and try again.';
  }

  if (code === 'unavailable') {
    return 'Prediction completed, but Firestore is temporarily unavailable. Please retry in a moment.';
  }

  return 'Prediction completed, but medical history could not be saved. Verify Firestore is created and linked to the same Firebase project.';
}

function App() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [medicalProfile, setMedicalProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [profileDraft, setProfileDraft] = useState({});
  const [editingProfile, setEditingProfile] = useState(false);

  // Redirect auth was removed in favor of popup-only.
  // This effect is kept empty for any future initialization needs.
  useEffect(() => {}, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      console.log('[NIROG Auth]', nextUser ? `signed in as ${nextUser.email}` : 'signed out');
      setUser(nextUser);
      setAuthReady(true);
      setIsSigningIn(false);

      if (!nextUser) {
        setMedicalProfile(null);
        setHistory([]);
        setProfileReady(false);
        return;
      }

      // Fire-and-forget: don't let Firestore writes block auth
      ensureUserProfile(nextUser).catch((err) =>
        console.warn('ensureUserProfile failed (non-blocking):', err.message),
      );

      // Try to load existing profile and history
      try {
        setIsLoadingHistory(true);
        const [savedProfile, savedHistory] = await Promise.all([
          loadMedicalProfile(nextUser.uid).catch(() => null),
          loadPredictionHistory(nextUser.uid).catch(() => []),
        ]);
        setMedicalProfile(savedProfile);
        setHistory(savedHistory || []);
        setProfileReady(Boolean(savedProfile));
        if (savedProfile) {
          setProfileDraft(savedProfile);
        }
      } catch (loadError) {
        console.warn('Profile load failed (proceeding to setup):', loadError.message);
        // Still let the user through — they'll see the health setup form
        setProfileReady(false);
      } finally {
        setIsLoadingHistory(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[NIROG Auth] Popup sign-in succeeded:', result.user?.email);
    } catch (authError) {
      console.error('[NIROG Auth] Sign-in error:', authError.code, authError.message);
      setIsSigningIn(false);

      // User intentionally closed the popup — not an error
      if (authError?.code === 'auth/popup-closed-by-user' || authError?.code === 'auth/cancelled-popup-request') {
        return;
      }

      const readableMessage = getReadableAuthError(authError);
      setError(readableMessage);
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

  const handleProfileSetupComplete = async (profile) => {
    // Always keep the profile in memory so predictions work
    setMedicalProfile(profile);
    setProfileDraft(profile);
    setProfileReady(true);
    setEditingProfile(false);

    // Try to persist to Firestore (non-critical)
    try {
      setIsSavingProfile(true);
      await saveMedicalProfile(user.uid, profile);
    } catch (saveError) {
      console.warn('Profile save to Firestore failed:', saveError.message);
      // Don't block the user — profile is in memory for this session
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePredict = async (data) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    if (!API_URL) {
      setError('Prediction backend is not configured. Set VITE_API_URL to the deployed NIROG trained-model backend.');
      setIsLoading(false);
      return;
    }

    // Merge saved health profile into the prediction payload
    const mergedData = {
      ...data,
      age: data.age ?? medicalProfile?.age ?? null,
      gender: data.gender ?? medicalProfile?.gender ?? null,
      weight: data.weight ?? medicalProfile?.weight ?? null,
      height: data.height ?? medicalProfile?.height ?? null,
      medical_conditions: data.medical_conditions?.length
        ? data.medical_conditions
        : medicalProfile?.medical_conditions ?? null,
      current_medications: data.current_medications?.length
        ? data.current_medications
        : medicalProfile?.current_medications ?? null,
      allergies: data.allergies?.length
        ? data.allergies
        : medicalProfile?.allergies ?? null,
      lifestyle: data.lifestyle?.length
        ? data.lifestyle
        : medicalProfile?.lifestyle ?? null,
    };

    let responseData = null;

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        ...mergedData,
        use_ai_enhancement: true,
      });
      responseData = response.data;
      setResult(responseData);
    } catch (requestError) {
      console.error(requestError);
      if (requestError.response?.data?.detail) {
        setError(requestError.response.data.detail);
      } else if (requestError.code === 'ERR_NETWORK') {
        setError(`Could not reach the NIROG trained-model backend at ${API_URL}. Make sure the backend is running and accessible from this frontend.`);
      } else {
        setError('Failed to get prediction from the NIROG trained-model backend.');
      }
      return;
    } finally {
      setIsLoading(false);
    }

    if (!user?.uid || !responseData) {
      return;
    }

    try {
      setIsSavingProfile(true);
      await saveMedicalProfile(user.uid, data);
      await savePredictionHistory(user.uid, data, responseData);
      await refreshFirestoreData(user.uid);
    } catch (firestoreError) {
      console.error(firestoreError);
      setError(getReadableFirestoreError(firestoreError));
    } finally {
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

  /* --- Auth gate --------------------------------------------------------- */

  // Firebase is still checking for a persisted session
  if (!authReady) {
    return (
      <div className="min-h-screen relative overflow-hidden font-sans flex items-center justify-center">
        <div className="mesh-gradient" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-purple-300 animate-spin" />
          <p className="text-sm text-white/40 tracking-widest uppercase">Loading NIROG</p>
        </div>
      </div>
    );
  }

  // Not signed in — show the login screen
  if (!user) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        error={error}
      />
    );
  }

  // Signed in but no health profile yet — show onboarding
  if (!profileReady && !isLoadingHistory) {
    return (
      <HealthProfileSetup
        user={user}
        onComplete={handleProfileSetupComplete}
        isSaving={isSavingProfile}
      />
    );
  }

  // Still loading profile from Firestore
  if (!profileReady && isLoadingHistory) {
    return (
      <div className="min-h-screen relative overflow-hidden font-sans flex items-center justify-center">
        <div className="mesh-gradient" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-purple-300 animate-spin" />
          <p className="text-sm text-white/40 tracking-widest uppercase">Loading your profile</p>
        </div>
      </div>
    );
  }

  // Editing profile
  if (editingProfile) {
    return (
      <HealthProfileSetup
        user={user}
        onComplete={handleProfileSetupComplete}
        onCancel={() => setEditingProfile(false)}
        isSaving={isSavingProfile}
        initialProfile={medicalProfile}
      />
    );
  }

  /* --- Authenticated app ------------------------------------------------ */

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      <div className="mesh-gradient" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col items-center gap-6">
        <header className="w-full mb-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-5"
          >
            <div className="flex items-center gap-3">
              <BrandLogo size="xs" className="shrink-0" />
              <div>
                <h1 className="text-lg font-semibold text-white">NIROG</h1>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Drug Safety Intelligence
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm md:justify-end">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white/80">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="min-w-0 max-w-[13rem] truncate text-white/65">
                {user.displayName || user.email}
              </span>
              {isSavingProfile && (
                <span className="flex items-center gap-1 text-xs text-cyan-300/70">
                  <Loader2 className="h-3 w-3 animate-spin" /> Syncing
                </span>
              )}
              <button
                type="button"
                id="edit-profile-button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <UserCog className="h-3.5 w-3.5" />
                Profile
              </button>
              <button
                type="button"
                id="signout-button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        </header>

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
                      {result.analysis_engine || 'NIROG Trained Model'}
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
