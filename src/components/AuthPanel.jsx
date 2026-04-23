import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, ShieldCheck, User } from 'lucide-react';

const AuthPanel = ({ user, isSigningIn, isSavingProfile, onSignIn, onSignOut }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-panel w-full max-w-4xl p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 border border-cyan-300/20">
            {user ? <ShieldCheck className="h-6 w-6 text-cyan-200" /> : <User className="h-6 w-6 text-white/80" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Identity Layer</p>
            {user ? (
              <>
                <h2 className="text-lg font-semibold text-white">Signed in as {user.displayName || 'NIROG user'}</h2>
                <p className="text-sm text-white/55">
                  Google sign-in is active. Firestore now stores profile data, medical history, and past NIROG analyses for this account.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">Secure profile sync is available</h2>
                <p className="text-sm text-white/55">
                  Sign in with Google to persist medical history, medication lists, and NIROG prediction history in your Firebase project.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {user ? (
            <button type="button" onClick={onSignOut} className="glass-button inline-flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="glass-button inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isSigningIn ? 'Connecting to Google' : 'Continue with Google'}
            </button>
          )}

          <p className="text-xs text-white/35">
            {user
              ? isSavingProfile
                ? 'Syncing profile to Firestore...'
                : 'Medical profile sync is active.'
              : 'Firestore sync begins after sign-in.'}
          </p>
        </div>
      </div>
    </motion.section>
  );
};

export default AuthPanel;
