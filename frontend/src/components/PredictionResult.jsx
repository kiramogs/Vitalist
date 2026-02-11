import React from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, Info, Sparkles, AlertOctagon, ShieldAlert, User, Brain,
    Stethoscope, Clock, Shield, Activity, Pill, FileWarning, Zap, Database
} from 'lucide-react';

const PredictionResult = ({ results, interactions, personalized, userRiskFactors, aiAnalysis, aiEnhanced }) => {
    if (!results || results.length === 0) return null;

    const getSeverityColor = (severity) => {
        const severityLower = String(severity || '').toLowerCase();
        if (severityLower === 'severe' || severityLower === 'major' || severityLower === 'contraindicated') {
            return 'text-red-300 bg-red-500/20 border-red-500/30';
        }
        if (severityLower === 'moderate') {
            return 'text-amber-300 bg-amber-500/20 border-amber-500/30';
        }
        return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
    };

    const getSeverityIcon = (severity, probability) => {
        const severityLower = String(severity || '').toLowerCase();
        if (severityLower === 'severe' && probability > 20) {
            return <AlertOctagon className="w-5 h-5 text-red-300" />;
        } else if (severityLower === 'moderate' || probability > 50) {
            return <AlertTriangle className="w-5 h-5 text-amber-300" />;
        }
        return <Info className="w-5 h-5 text-white/60" />;
    };

    const getSourceBadge = (source) => {
        if (source === 'ML+AI Merged') {
            return (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-200 border border-purple-500/30">
                    <Database className="w-3 h-3" /><Zap className="w-3 h-3" />Merged
                </span>
            );
        }
        if (source === 'AI Analysis') {
            return (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Brain className="w-3 h-3" />AI
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Database className="w-3 h-3" />DB
            </span>
        );
    };

    const getRiskLevelColor = (level) => {
        const levelLower = String(level || '').toLowerCase();
        if (levelLower === 'very high' || levelLower === 'critical') return 'text-red-300 bg-red-500/30 border-red-500/40';
        if (levelLower === 'high') return 'text-red-300 bg-red-500/20 border-red-500/30';
        if (levelLower === 'moderate') return 'text-amber-300 bg-amber-500/20 border-amber-500/30';
        return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto mt-8 space-y-6"
        >
            {/* Main Results Panel */}
            <div className="glass-panel p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-300" />
                        <h3 className="text-xl font-semibold text-white">Prediction Results</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {personalized && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                                <User className="w-3.5 h-3.5" />Personalized
                            </span>
                        )}
                        {aiEnhanced && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
                                <Brain className="w-3.5 h-3.5" />AI Enhanced
                            </span>
                        )}
                    </div>
                </div>

                {/* Black Box Warnings */}
                {aiAnalysis?.black_box_warnings && aiAnalysis.black_box_warnings.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 p-4 rounded-xl bg-black/40 border-2 border-red-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <FileWarning className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 font-bold uppercase text-sm tracking-wider">⚠️ FDA Black Box Warning</span>
                        </div>
                        {aiAnalysis.black_box_warnings.map((warning, idx) => (
                            <p key={idx} className="text-red-200 text-sm">{warning}</p>
                        ))}
                    </motion.div>
                )}

                {/* Drug Interactions */}
                {interactions && interactions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <ShieldAlert className="w-5 h-5 text-red-300" />
                            <h4 className="text-red-200 font-semibold">Drug Interactions ({interactions.length})</h4>
                        </div>
                        <div className="space-y-3">
                            {interactions.slice(0, 5).map((inter, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-red-100">{inter.drugs?.join(' + ')}</span>
                                            {inter.source === 'AI Analysis' && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">AI</span>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getSeverityColor(inter.severity)}`}>
                                            {inter.severity}
                                        </span>
                                    </div>
                                    <p className="text-red-200/80 text-sm">{inter.warning}</p>
                                    {inter.mechanism && (
                                        <p className="text-red-200/60 text-xs mt-1">Mechanism: {inter.mechanism}</p>
                                    )}
                                    {inter.management && (
                                        <p className="text-emerald-300/80 text-xs mt-1">→ {inter.management}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Risk Factors */}
                {userRiskFactors && userRiskFactors.length > 0 && (
                    <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Detected Risk Factors</p>
                        <div className="flex flex-wrap gap-2">
                            {userRiskFactors.map((factor, idx) => (
                                <span key={idx} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-200 text-xs">
                                    {factor.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Side Effects */}
                <div className="space-y-3">
                    {results.map((item, index) => {
                        const isHighRisk = (item.severity === 'Severe' && item.probability > 20) || item.probability > 70;
                        const isMediumRisk = item.probability > 40 || item.severity === 'Moderate';

                        return (
                            <motion.div
                                key={index}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 + (index * 0.05) }}
                                className={`p-4 rounded-2xl border transition-all ${isHighRisk
                                    ? 'bg-red-500/15 border-red-500/30'
                                    : isMediumRisk
                                        ? 'bg-amber-500/10 border-amber-500/20'
                                        : 'bg-white/5 border-white/10'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isHighRisk ? 'bg-red-500/20' : isMediumRisk ? 'bg-amber-500/20' : 'bg-white/10'
                                            }`}>
                                            {getSeverityIcon(item.severity, item.probability)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="font-semibold text-white">{item.side_effect}</p>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(item.severity)}`}>
                                                    {item.severity}
                                                </span>
                                                {getSourceBadge(item.source)}
                                                {item.requires_discontinuation && (
                                                    <span className="px-2 py-0.5 rounded text-xs bg-red-600/30 text-red-200 font-medium">
                                                        May require stop
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-white/50 mb-2">
                                                {item.onset && item.onset !== 'Unknown' && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />Onset: {item.onset}
                                                    </span>
                                                )}
                                                {item.frequency && item.frequency !== 'AI Predicted' && (
                                                    <span>Freq: {item.frequency}</span>
                                                )}
                                            </div>

                                            {item.patient_specific_risk && (
                                                <p className="text-purple-200/80 text-sm mb-1">
                                                    <span className="text-purple-300">Your risk:</span> {item.patient_specific_risk}
                                                </p>
                                            )}

                                            {item.mechanism && (
                                                <p className="text-white/50 text-xs mb-1">
                                                    <span className="text-white/70">Why:</span> {item.mechanism}
                                                </p>
                                            )}

                                            {item.management && (
                                                <p className="text-emerald-300/80 text-xs">
                                                    <span className="text-emerald-400">Manage:</span> {item.management}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right ml-4 flex-shrink-0">
                                        <span className={`text-2xl font-bold ${isHighRisk ? 'text-red-300' : isMediumRisk ? 'text-amber-300' : 'text-white'
                                            }`}>
                                            {item.probability}%
                                        </span>
                                        <p className="text-xs text-white/40">Risk</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* AI Analysis Panel */}
            {aiAnalysis && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel p-6"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <Brain className="w-5 h-5 text-cyan-300" />
                        <h3 className="text-lg font-semibold text-white">AI Clinical Analysis</h3>
                    </div>

                    {/* Drug Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {aiAnalysis.drug_class && (
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-cyan-300/60 text-xs uppercase mb-1">Drug Class</p>
                                <p className="text-cyan-100 text-sm font-medium">{aiAnalysis.drug_class}</p>
                            </div>
                        )}
                        {aiAnalysis.half_life && (
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-cyan-300/60 text-xs uppercase mb-1">Half-Life</p>
                                <p className="text-cyan-100 text-sm font-medium">{aiAnalysis.half_life}</p>
                            </div>
                        )}
                    </div>

                    {(aiAnalysis.mechanism_of_action || aiAnalysis.metabolism) && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-5">
                            {aiAnalysis.mechanism_of_action && (
                                <div className="mb-2">
                                    <p className="text-white/40 text-xs uppercase mb-1">Mechanism</p>
                                    <p className="text-white/80 text-sm">{aiAnalysis.mechanism_of_action}</p>
                                </div>
                            )}
                            {aiAnalysis.metabolism && (
                                <div>
                                    <p className="text-white/40 text-xs uppercase mb-1">Metabolism</p>
                                    <p className="text-white/80 text-sm">{aiAnalysis.metabolism}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Risk Assessment */}
                    {aiAnalysis.overall_risk_assessment && (
                        <div className={`p-4 rounded-xl border ${getRiskLevelColor(aiAnalysis.overall_risk_assessment.risk_level)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    <span className="font-semibold">Overall Assessment</span>
                                </div>
                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-current/20">
                                    {aiAnalysis.overall_risk_assessment.risk_level}
                                </span>
                            </div>
                            {aiAnalysis.overall_risk_assessment.benefit_risk_ratio && (
                                <p className="text-sm opacity-80 mb-1">
                                    Benefit-Risk: <strong>{aiAnalysis.overall_risk_assessment.benefit_risk_ratio}</strong>
                                </p>
                            )}
                            {aiAnalysis.overall_risk_assessment.recommendation && (
                                <p className="text-sm opacity-80 mb-1">{aiAnalysis.overall_risk_assessment.recommendation}</p>
                            )}
                            {aiAnalysis.overall_risk_assessment.rationale && (
                                <p className="text-xs opacity-60 mt-2">{aiAnalysis.overall_risk_assessment.rationale}</p>
                            )}
                        </div>
                    )}

                    {/* Contraindications & Monitoring */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {aiAnalysis.contraindications && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <p className="text-red-300 text-xs font-medium uppercase mb-2 flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3" />Contraindications
                                </p>
                                <ul className="text-red-200 text-xs space-y-1">
                                    {(aiAnalysis.contraindications.absolute || []).slice(0, 3).map((c, i) => (
                                        <li key={i}>• {c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {aiAnalysis.monitoring_parameters && aiAnalysis.monitoring_parameters.length > 0 && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-300 text-xs font-medium uppercase mb-2 flex items-center gap-1">
                                    <Activity className="w-3 h-3" />Monitoring
                                </p>
                                <ul className="text-amber-200 text-xs space-y-1">
                                    {aiAnalysis.monitoring_parameters.slice(0, 3).map((m, i) => (
                                        <li key={i}>• {m.parameter || m}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}


        </motion.div>
    );
};

export default PredictionResult;
