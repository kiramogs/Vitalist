import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Activity, User, Calendar, Pill, ChevronDown, ChevronUp, Heart, AlertCircle, Stethoscope, Wine } from 'lucide-react';

const MEDICAL_CONDITIONS = [
    'Diabetes', 'Heart Disease', 'Kidney Disease', 'Liver Disease',
    'Asthma', 'COPD', 'Hypertension', 'Depression', 'Anxiety',
    'Seizures', 'Bleeding Disorder', 'Stomach Ulcer', 'GERD',
    'Osteoporosis', 'Glaucoma', 'Pregnancy'
];

const LIFESTYLE_FACTORS = ['Alcohol Use', 'Smoking'];

const DrugForm = ({ onPredict, isLoading }) => {
    const [formData, setFormData] = useState({
        age: '',
        gender: 'Male',
        weight: '',
        dosage: '',
        duration: '',
        drug_name: ''
    });

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [currentMedications, setCurrentMedications] = useState('');
    const [allergies, setAllergies] = useState('');
    const [lifestyle, setLifestyle] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            drug_name: formData.drug_name,
            age: formData.age ? parseInt(formData.age) : null,
            gender: formData.gender,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            dosage: formData.dosage ? parseInt(formData.dosage) : null,
            duration: formData.duration ? parseInt(formData.duration) : null,
            medical_conditions: selectedConditions.length > 0 ? selectedConditions : null,
            current_medications: currentMedications ? currentMedications.split(',').map(m => m.trim()).filter(m => m) : null,
            allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(a => a) : null,
            lifestyle: lifestyle.length > 0 ? lifestyle : null
        };

        onPredict(payload);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleCondition = (condition) => {
        setSelectedConditions(prev =>
            prev.includes(condition)
                ? prev.filter(c => c !== condition)
                : [...prev, condition]
        );
    };

    const toggleLifestyle = (factor) => {
        setLifestyle(prev =>
            prev.includes(factor)
                ? prev.filter(f => f !== factor)
                : [...prev, factor]
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="glass-panel p-8 w-full max-w-2xl mx-auto"
        >
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold text-white tracking-tight">Drug Analysis</h2>
                    <p className="text-white/40 text-sm">Personalized risk assessment</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Drug Name */}
                <div className="group">
                    <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Drug Name *</label>
                    <div className="relative">
                        <Pill className="absolute left-4 top-4 w-5 h-5 text-white/40 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            name="drug_name"
                            placeholder="e.g. Ibuprofen, Metformin, Sertraline"
                            value={formData.drug_name}
                            onChange={handleChange}
                            required
                            className="glass-input w-full pl-12"
                        />
                    </div>
                </div>

                {/* Basic Info Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="group">
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Age</label>
                        <div className="relative">
                            <User className="absolute left-4 top-4 w-5 h-5 text-white/40" />
                            <input
                                type="number"
                                name="age"
                                placeholder="25"
                                value={formData.age}
                                onChange={handleChange}
                                className="glass-input w-full pl-12"
                            />
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Gender</label>
                        <div className="relative">
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
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
                            value={formData.weight}
                            onChange={handleChange}
                            className="glass-input w-full"
                        />
                    </div>
                </div>

                {/* Dosage & Duration */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="group">
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1">Dosage (mg)</label>
                        <input
                            type="number"
                            name="dosage"
                            placeholder="500"
                            value={formData.dosage}
                            onChange={handleChange}
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
                                value={formData.duration}
                                onChange={handleChange}
                                className="glass-input w-full pl-12"
                            />
                        </div>
                    </div>
                </div>

                {/* Advanced Options Toggle */}
                <button
                    type="button"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <Stethoscope className="w-5 h-5 text-purple-300" />
                        <span className="text-white font-medium">Health Profile</span>
                        <span className="text-white/40 text-sm">(for personalized predictions)</span>
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
                            {/* Medical Conditions */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    <Heart className="w-4 h-4" /> Medical Conditions
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {MEDICAL_CONDITIONS.map(condition => (
                                        <button
                                            key={condition}
                                            type="button"
                                            onClick={() => toggleCondition(condition)}
                                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedConditions.includes(condition)
                                                    ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                } border`}
                                        >
                                            {condition}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Medications */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    <Pill className="w-4 h-4" /> Current Medications
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Aspirin, Lisinopril, Metformin (comma separated)"
                                    value={currentMedications}
                                    onChange={(e) => setCurrentMedications(e.target.value)}
                                    className="glass-input w-full"
                                />
                                <p className="text-white/30 text-xs mt-1 ml-1">We'll check for drug interactions</p>
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Allergies
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Penicillin, Aspirin, Sulfa (comma separated)"
                                    value={allergies}
                                    onChange={(e) => setAllergies(e.target.value)}
                                    className="glass-input w-full"
                                />
                            </div>

                            {/* Lifestyle Factors */}
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    <Wine className="w-4 h-4" /> Lifestyle Factors
                                </label>
                                <div className="flex gap-3">
                                    {LIFESTYLE_FACTORS.map(factor => (
                                        <button
                                            key={factor}
                                            type="button"
                                            onClick={() => toggleLifestyle(factor)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${lifestyle.includes(factor)
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
                            Analyze Adverse Effects <Send className="w-4 h-4" />
                        </>
                    )}
                </motion.button>

                <p className="text-white/20 text-xs text-center">
                    More health info = more accurate, personalized predictions
                </p>
            </form>
        </motion.div>
    );
};

export default DrugForm;
