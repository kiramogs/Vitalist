import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';

import BrandLogo from './BrandLogo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const LoginScreen = ({ onSignIn, isSigningIn, error }) => {
  return (
    <div className="min-h-screen relative overflow-hidden font-sans flex items-center justify-center px-6 py-12">
      <div className="mesh-gradient" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md flex flex-col items-center gap-8"
      >
        {/* Brand */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center">
          <BrandLogo size="lg" />
          <p className="mt-4 text-sm md:text-base text-white/50 tracking-[0.25em] uppercase">
            Drug Safety Intelligence
          </p>
        </motion.div>

        {/* Sign-in card */}
        <motion.div
          variants={itemVariants}
          className="glass-panel w-full p-8 flex flex-col items-center gap-6"
        >
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Welcome</h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Sign in to get started with personalized drug safety predictions.
            </p>
          </div>

          <button
            type="button"
            id="login-google-button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="w-full glass-button inline-flex items-center justify-center gap-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting to Google…
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-300/90 text-center leading-relaxed bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 w-full"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-xs text-white/25 text-center max-w-xs">
          For educational purposes only. Always consult a qualified healthcare professional.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
