import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '@/auth/AuthContext';

interface Props {
  outcome: 'success' | 'error';
  onSuccess: () => void; // enter app
  onError: () => void;   // back to choice screen
}

export function OAuthCallback({ outcome, onSuccess, onError }: Props) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(outcome === 'success');

  useEffect(() => {
    if (outcome !== 'success') return;
    let cancelled = false;
    // Refresh AuthContext from the newly-set session cookie.
    refreshUser()
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; }; // eslint-disable-line react-hooks/exhaustive-deps
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (outcome !== 'success' || loading) return;
    // Short delay so the success state is visible.
    const t = setTimeout(onSuccess, 900);
    return () => clearTimeout(t);
  }, [outcome, loading, onSuccess]);

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center px-8 text-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full
                      blur-[120px] opacity-10 pointer-events-none bg-primary" />

      <div className="relative z-10 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6">
              <motion.div animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-2 border-white/10 border-t-primary rounded-full" />
              <p className="text-sm text-white/40 font-medium tracking-wider">Signing you in…</p>
            </motion.div>
          )}

          {!loading && outcome === 'success' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center">
                <CheckCircle size={26} weight="fill" className="text-primary" />
              </div>
              <p className="text-xl font-black text-white tracking-tight">SIGNED IN</p>
            </motion.div>
          )}

          {outcome === 'error' && (
            <motion.div key="error"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-red-500/40 flex items-center justify-center">
                <WarningCircle size={26} weight="fill" className="text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">SIGN-IN FAILED</h1>
              <p className="text-sm text-white/40 font-medium max-w-xs leading-relaxed">
                Something went wrong with Google sign-in. Please try again or use email.
              </p>
              <button onClick={onError} className="mt-4 mx-auto w-48 py-3 rounded-full bg-primary text-primary-foreground
                                                    font-bold tracking-[0.15em] uppercase text-xs">
                TRY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
