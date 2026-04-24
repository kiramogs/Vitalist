import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Pill,
  Calendar,
} from 'lucide-react';

import BrandLogo from './BrandLogo';

function buildUiState(profile = {}) {
  return {
    drug_name: profile.drug_name ?? '',
    dosage: profile.dosage ? String(profile.dosage) : '',
    duration: profile.duration ? String(profile.duration) : '',
  };
}

function buildPayload(state) {
  return {
    drug_name: state.drug_name.trim(),
    dosage: state.dosage ? parseInt(state.dosage, 10) : null,
    duration: state.duration ? parseInt(state.duration, 10) : null,
  };
}

const DrugForm = ({ onPredict, isLoading, initialProfile, onProfileDraftChange }) => {
  const [formState, setFormState] = useState(() => buildUiState(initialProfile));

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="glass-panel p-6 md:p-8 w-full max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-4 mb-8">
        <BrandLogo size="xs" className="shrink-0" />
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              Run NIROG Analysis <Send className="w-4 h-4" />
            </>
          )}
        </motion.button>

        <p className="text-white/20 text-xs text-center">
          Your saved health profile is automatically included in every analysis.
        </p>
      </form>
    </motion.div>
  );
};

export default DrugForm;
