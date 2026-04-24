import React from 'react';
import { motion } from 'framer-motion';
import { Clock3, Database, FileClock, RefreshCw, Shield } from 'lucide-react';

function formatDateLabel(value) {
  if (!value) {
    return 'Not synced yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function joinValue(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None recorded';
}

const HistoryPanel = ({
  user,
  medicalProfile,
  history,
  isLoadingHistory,
  onLoadProfile,
  onLoadHistoryEntry,
}) => {
  if (!user) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="w-full max-w-4xl space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass-panel p-5 text-left">
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-300" />
            <div>
              <h3 className="text-lg font-semibold text-white">Medical Profile</h3>
            </div>
          </div>

          {medicalProfile ? (
            <div className="space-y-3 text-sm text-white/75">
              <p><span className="text-white/45">Age:</span> {medicalProfile.age || 'Not provided'}</p>
              <p><span className="text-white/45">Gender:</span> {medicalProfile.gender || 'Not provided'}</p>
              <p><span className="text-white/45">Conditions:</span> {joinValue(medicalProfile.medical_conditions)}</p>
              <p><span className="text-white/45">Current medications:</span> {joinValue(medicalProfile.current_medications)}</p>
              <p><span className="text-white/45">Allergies:</span> {joinValue(medicalProfile.allergies)}</p>
              <p><span className="text-white/45">Lifestyle:</span> {joinValue(medicalProfile.lifestyle)}</p>
              <p className="pt-1 text-xs text-white/35">Last synced: {formatDateLabel(medicalProfile.updatedAt)}</p>
              <button type="button" onClick={onLoadProfile} className="glass-button inline-flex items-center gap-2 px-4 py-3 text-sm">
                <RefreshCw className="h-4 w-4" />
                Load profile into form
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              No profile saved yet.
            </p>
          )}
        </div>

        <div className="glass-panel p-5 text-left">
          <div className="mb-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-lg font-semibold text-white">Prediction Ledger</h3>
            </div>
          </div>

          {isLoadingHistory ? (
            <p className="text-sm text-white/50">Loading saved sessions...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-white/50">No saved analyses yet.</p>
          ) : (
            <div className="ledger-scroll max-h-[13rem] snap-y snap-mandatory space-y-3 overflow-y-auto overscroll-contain py-3 pr-2">
              {history.map((entry) => (
                <div key={entry.id} className="min-h-[10.75rem] snap-center rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{entry.request?.drug_name || 'Unnamed analysis'}</p>
                      <p className="text-xs text-white/35">{formatDateLabel(entry.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-3 text-xs text-white/45">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {entry.request?.duration ? `${entry.request.duration} days` : 'Duration not set'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileClock className="h-3.5 w-3.5" />
                      {entry.response?.predictions?.length || 0} predictions
                    </span>
                  </div>

                  <button type="button" onClick={() => onLoadHistoryEntry(entry)} className="glass-button w-full px-4 py-3 text-sm">
                    Restore this analysis
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

export default HistoryPanel;
