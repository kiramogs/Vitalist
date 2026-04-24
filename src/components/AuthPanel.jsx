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
            {user ? (
              <>
                <h2 className="text-lg font-semibold text-white">Signed in as {user.displayName || 'NIROG user'}</h2>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">Sign in</h2>
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

          {user && isSavingProfile && <p className="text-xs text-white/35">Saving profile...</p>}
        </div>
      </div>
    </motion.section>
  );
};

export default AuthPanel;
