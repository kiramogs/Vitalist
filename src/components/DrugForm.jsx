import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Activity,
  User,
  Calendar,
  Pill,
  ChevronDown,
  ChevronUp,
  Heart,
  AlertCircle,
  Stethoscope,
  Wine,
} from 'lucide-react';

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Heart Disease', 'Kidney Disease', 'Liver Disease',
  'Asthma', 'COPD', 'Hypertension', 'Depression', 'Anxiety',
  'Seizures', 'Bleeding Disorder', 'Stomach Ulcer', 'GERD',
  'Osteoporosis', 'Glaucoma', 'Pregnancy',
];

const LIFESTYLE_FACTORS = ['Alcohol Use', 'Smoking'];

function buildUiState(profile = {}) {
  return {
    drug_name: profile.drug_name ?? '',
    age: profile.age ? String(profile.age) : '',
    gender: profile.gender ?? 'Male',
    weight: profile.weight ? String(profile.weight) : '',
    dosage: profile.dosage ? String(profile.dosage) : '',
    duration: profile.duration ? String(profile.duration) : '',
    medical_conditions: Array.isArray(profile.medical_conditions) ? profile.medical_conditions : [],
    current_medications_input: Array.isArray(profile.current_medications) ? profile.current_medications.join(', ') : '',
    allergies_input: Array.isArray(profile.allergies) ? profile.allergies.join(', ') : '',
    lifestyle: Array.isArray(profile.lifestyle) ? profile.lifestyle : [],
  };
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayload(state) {
  return {
    drug_name: state.drug_name.trim(),
    age: state.age ? parseInt(state.age, 10) : null,
    gender: state.gender || null,
    weight: state.weight ? parseFloat(state.weight) : null,
    dosage: state.dosage ? parseInt(state.dosage, 10) : null,
    duration: state.duration ? parseInt(state.duration, 10) : null,
    medical_conditions: state.medical_conditions.length > 0 ? state.medical_conditions : null,
    current_medications: state.current_medications_input ? parseList(state.current_medications_input) : null,
    allergies: state.allergies_input ? parseList(state.allergies_input) : null,
    lifestyle: state.lifestyle.length > 0 ? state.lifestyle : null,
  };
}

const DrugForm = ({ onPredict, isLoading, initialProfile, onProfileDraftChange }) => {
  const [formState, setFormState] = useState(() => buildUiState(initialProfile));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setFormState(buildUiState(initialProfile));
  }, [initialProfile]);

  const payload = buildPayload(formState);

  const updateFormState = (updater) => {
    setFormState((current) => {
      const nextState = typeof updater === 'function' ? updater(current) : updater;
      onProfileDraftChange?.(buildPayload(nextState));
      return nextState;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onPredict(payload);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    updateFormState((current) => ({ ...current, [name]: value }));
  };

  const toggleCondition = (condition) => {
    updateFormState((current) => ({
      ...current,
      medical_conditions: current.medical_conditions.includes(condition)
        ? current.medical_conditions.filter((item) => item !== condition)
        : [...current.medical_conditions, condition],
    }));
  };

  const toggleLifestyle = (factor) => {
    updateFormState((current) => ({
      ...current,
      lifestyle: current.lifestyle.includes(factor)
        ? current.lifestyle.filter((item) => item !== factor)
        : [...current.lifestyle, factor],
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="glass-panel p-8 w-full max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">NIROG Analysis</h2>
          <p className="text-white/40 text-sm">Profile-aware safety analysis with patient memory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group">
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Drug Name *</label>
          <div className="relative">
            <Pill className="absolute left-4 top-4 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              name="drug_name"
              placeholder="e.g. Ibuprofen, Metformin, Sertraline"
              value={formState.drug_name}
              onChange={handleFieldChange}
              required
              className="glass-input w-full pl-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="group">
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Age</label>
            <div className="relative">
              <User className="absolute left-4 top-4 w-5 h-5 text-white/40" />
              <input
                type="number"
                name="age"
                placeholder="25"
                value={formState.age}
                onChange={handleFieldChange}
                className="glass-input w-full pl-12"
              />
            </div>
          </div>

          <div className="group relative">
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Gender</label>
            <div className="relative">
              <select
                name="gender"
                value={formState.gender}
                onChange={handleFieldChange}
                className="glass-select w-full pr-10"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <ChevronDown className="absolute right-4 top-4 w-5 h-5 text-white/40 pointer-events-none" />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Weight (kg)</label>
            <input
              type="number"
              name="weight"
              placeholder="70"
              value={formState.weight}
              onChange={handleFieldChange}
              className="glass-input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="group">
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Dosage (mg)</label>
            <input
              type="number"
              name="dosage"
              placeholder="500"
              value={formState.dosage}
              onChange={handleFieldChange}
              className="glass-input w-full"
            />
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Duration (days)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-4 w-5 h-5 text-white/40" />
              <input
                type="number"
                name="duration"
                placeholder="7"
                value={formState.duration}
                onChange={handleFieldChange}
                className="glass-input w-full pl-12"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="w-5 h-5 text-purple-300" />
            <span className="text-white font-medium">Health Profile</span>
            <span className="text-white/40 text-sm">(medical history, meds, allergies, lifestyle)</span>
          </div>
          {advancedOpen ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-6"
            >
              <div>
                <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Medical Conditions
                </label>
                <div className="flex flex-wrap gap-2">
                  {MEDICAL_CONDITIONS.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleCondition(condition)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        formState.medical_conditions.includes(condition)
                          ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      } border`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Pill className="w-4 h-4" /> Current Medications
                </label>
                <input
                  type="text"
                  name="current_medications_input"
                  placeholder="e.g. Aspirin, Lisinopril, Metformin"
                  value={formState.current_medications_input}
                  onChange={handleFieldChange}
                  className="glass-input w-full"
                />
                <p className="text-white/30 text-xs mt-1 ml-1">Stored in Firestore after sign-in and checked for interaction risk.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Allergies
                </label>
                <input
                  type="text"
                  name="allergies_input"
                  placeholder="e.g. Penicillin, Aspirin, Sulfa"
                  value={formState.allergies_input}
                  onChange={handleFieldChange}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Wine className="w-4 h-4" /> Lifestyle Factors
                </label>
                <div className="flex flex-wrap gap-3">
                  {LIFESTYLE_FACTORS.map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => toggleLifestyle(factor)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        formState.lifestyle.includes(factor)
                          ? 'bg-amber-500/30 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      } border`}
                    >
                      {factor}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="glass-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Run NIROG Hosted Inference <Send className="w-4 h-4" />
            </>
          )}
        </motion.button>

        <p className="text-white/20 text-xs text-center">
          More clinical context improves personalization. Signed-in users also get Firestore-backed profile and history sync.
        </p>
      </form>
    </motion.div>
  );
};

export default DrugForm;
