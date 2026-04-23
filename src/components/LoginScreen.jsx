import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, ShieldCheck, Brain, Database, Activity, Loader2 } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Profile-Aware Safety',
    description: 'Personalized risk scoring based on your age, conditions, medications, and allergies.',
    color: 'cyan',
  },
  {
    icon: Brain,
    title: 'AI-Enhanced Analysis',
    description: 'Hybrid ML model blended with hosted NLP inference for deeper drug insights.',
    color: 'purple',
  },
  {
    icon: Database,
    title: 'Persistent Memory',
    description: 'Your medical profile and prediction history stay synced across sessions.',
    color: 'emerald',
  },
  {
    icon: Activity,
    title: 'Interaction Detection',
    description: 'Flags dangerous drug combinations with severity-ranked alerts.',
    color: 'pink',
  },
];

const colorMap = {
  cyan: {
    iconBg: 'bg-cyan-400/15 border-cyan-300/20',
    iconText: 'text-cyan-300',
    glow: 'group-hover:shadow-cyan-500/10',
  },
  purple: {
    iconBg: 'bg-purple-400/15 border-purple-300/20',
    iconText: 'text-purple-300',
    glow: 'group-hover:shadow-purple-500/10',
  },
  emerald: {
    iconBg: 'bg-emerald-400/15 border-emerald-300/20',
    iconText: 'text-emerald-300',
    glow: 'group-hover:shadow-emerald-500/10',
  },
  pink: {
    iconBg: 'bg-pink-400/15 border-pink-300/20',
    iconText: 'text-pink-300',
    glow: 'group-hover:shadow-pink-500/10',
  },
};

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
        className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8"
      >
        {/* Brand */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              NIROG
            </span>
          </h1>
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
            <h2 className="text-xl font-semibold text-white">Welcome to NIROG</h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Sign in to access profile-aware drug safety predictions, save your medical history, and track past analyses.
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

          <p className="text-xs text-white/30 text-center">
            Uses Google sign-in via Firebase. Your data stays in your private Firestore space.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={itemVariants}
          className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`group glass-panel p-4 flex items-start gap-3 transition-shadow duration-300 ${colors.glow} hover:shadow-lg`}
                style={{ borderRadius: '20px' }}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${colors.iconText}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{feature.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed mt-0.5">{feature.description}</p>
                </div>
              </div>
            );
          })}
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
