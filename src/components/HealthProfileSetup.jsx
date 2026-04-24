import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Heart,
  AlertCircle,
  Pill,
  Wine,
  Ruler,
  Weight,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';

import BrandLogo from './BrandLogo';

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Heart Disease', 'Kidney Disease', 'Liver Disease',
  'Asthma', 'COPD', 'Hypertension', 'Depression', 'Anxiety',
  'Seizures', 'Bleeding Disorder', 'Stomach Ulcer', 'GERD',
  'Osteoporosis', 'Glaucoma', 'Pregnancy',
];

const LIFESTYLE_FACTORS = ['Alcohol Use', 'Smoking'];

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const HealthProfileSetup = ({ user, onComplete, onCancel, isSaving, initialProfile }) => {
  const isEditing = Boolean(initialProfile);

  const [form, setForm] = useState({
    age: initialProfile?.age ? String(initialProfile.age) : '',
    gender: initialProfile?.gender || 'Male',
    height: initialProfile?.height ? String(initialProfile.height) : '',
    weight: initialProfile?.weight ? String(initialProfile.weight) : '',
    medical_conditions: Array.isArray(initialProfile?.medical_conditions) ? initialProfile.medical_conditions : [],
    current_medications_input: Array.isArray(initialProfile?.current_medications) ? initialProfile.current_medications.join(', ') : '',
    allergies_input: Array.isArray(initialProfile?.allergies) ? initialProfile.allergies.join(', ') : '',
    lifestyle: Array.isArray(initialProfile?.lifestyle) ? initialProfile.lifestyle : [],
  });

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleCondition = (condition) => {
    setForm((current) => ({
      ...current,
      medical_conditions: current.medical_conditions.includes(condition)
        ? current.medical_conditions.filter((item) => item !== condition)
        : [...current.medical_conditions, condition],
    }));
  };

  const toggleLifestyle = (factor) => {
    setForm((current) => ({
      ...current,
      lifestyle: current.lifestyle.includes(factor)
        ? current.lifestyle.filter((item) => item !== factor)
        : [...current.lifestyle, factor],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const profile = {
      age: form.age ? parseInt(form.age, 10) : null,
      gender: form.gender || null,
      height: form.height ? parseFloat(form.height) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      medical_conditions: form.medical_conditions.length > 0 ? form.medical_conditions : [],
      current_medications: form.current_medications_input ? parseList(form.current_medications_input) : [],
      allergies: form.allergies_input ? parseList(form.allergies_input) : [],
      lifestyle: form.lifestyle.length > 0 ? form.lifestyle : [],
    };

    onComplete(profile);
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans flex items-center justify-center px-6 py-12">
      <div className="mesh-gradient" />
      <div className="fixed left-5 top-5 z-20 md:left-8 md:top-8">
        <BrandLogo size="xs" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              {isEditing ? 'Edit Your Profile' : 'Set Up Your Profile'}
            </span>
          </h1>
          <p className="mt-3 text-sm text-white/50 max-w-md mx-auto leading-relaxed">
            {isEditing
              ? 'Update your health information. Changes will apply to future analyses.'
              : `${user?.displayName ? `Hi ${user.displayName.split(' ')[0]}, tell` : 'Tell'} us about your health so NIROG can give you personalized drug safety predictions.`}
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          variants={itemVariants}
          className="glass-panel w-full p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic info row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="group">
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Age</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 w-4 h-4 text-white/40" />
                  <input
                    type="number"
                    name="age"
                    placeholder="25"
                    value={form.age}
                    onChange={handleFieldChange}
                    className="glass-input w-full pl-11 text-sm"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleFieldChange}
                  className="glass-select w-full text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Height (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-4 w-4 h-4 text-white/40" />
                  <input
                    type="number"
                    name="height"
                    placeholder="170"
                    value={form.height}
                    onChange={handleFieldChange}
                    className="glass-input w-full pl-11 text-sm"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Weight (kg)</label>
                <div className="relative">
                  <Weight className="absolute left-4 top-4 w-4 h-4 text-white/40" />
                  <input
                    type="number"
                    name="weight"
                    placeholder="70"
                    value={form.weight}
                    onChange={handleFieldChange}
                    className="glass-input w-full pl-11 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Medical conditions */}
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
                      form.medical_conditions.includes(condition)
                        ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    } border`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            {/* Current medications */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Pill className="w-4 h-4" /> Current Medications
              </label>
              <input
                type="text"
                name="current_medications_input"
                placeholder="e.g. Aspirin, Lisinopril, Metformin"
                value={form.current_medications_input}
                onChange={handleFieldChange}
                className="glass-input w-full"
              />
              <p className="text-white/30 text-xs mt-1 ml-1">Separate multiple medications with commas.</p>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Allergies
              </label>
              <input
                type="text"
                name="allergies_input"
                placeholder="e.g. Penicillin, Aspirin, Sulfa"
                value={form.allergies_input}
                onChange={handleFieldChange}
                className="glass-input w-full"
              />
              <p className="text-white/30 text-xs mt-1 ml-1">Separate multiple allergies with commas.</p>
            </div>

            {/* Lifestyle */}
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
                      form.lifestyle.includes(factor)
                        ? 'bg-amber-500/30 border-amber-400/50 text-amber-200'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    } border`}
                  >
                    {factor}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className={`flex ${isEditing ? 'gap-3' : ''}`}>
              {isEditing && onCancel && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onCancel}
                  className="glass-button flex-1 flex items-center justify-center gap-2 !bg-white/5 hover:!bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSaving}
                className="glass-button flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving profile…
                  </>
                ) : isEditing ? (
                  <>
                    Save Changes <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue to NIROG <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>

            <p className="text-white/25 text-xs text-center">
              You can update this information anytime from the app.
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HealthProfileSetup;
