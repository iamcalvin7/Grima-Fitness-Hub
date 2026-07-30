import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, WarningCircle, Spinner } from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';

interface Props {
  token: string;
  onDone: (emailChanged: boolean) => void;
}

type Status = 'pending' | 'success' | 'changed' | 'error';

export function VerifyEmailHandler({ token, onDone }: Props) {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>('pending');
  const [error, setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ message: string; emailChanged: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    })
      .then(async res => {
        if (cancelled) return;
        // Refresh so AuthContext picks up updated emailVerifiedAt or new email.
        await refreshUser().catch(() => {});
        setStatus(res.emailChanged ? 'changed' : 'success');
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Verification failed. The link may have expired.');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSuccess = status === 'success' || status === 'changed';

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center px-8 text-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full
                      blur-[120px] opacity-10 pointer-events-none bg-primary" />

      <motion.div className="relative z-10 flex flex-col items-center">
        {status === 'pending' && (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-2 border-white/10 border-t-primary rounded-full mb-6" />
            <p className="text-sm text-white/40 font-medium tracking-wider">Verifying…</p>
          </>
        )}

        {isSuccess && (
          <>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-6">
              <CheckCircle size={30} weight="fill" className="text-primary" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-3xl font-black text-white tracking-tight mb-3">
              {status === 'changed' ? 'EMAIL UPDATED' : 'EMAIL VERIFIED'}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="text-sm text-white/50 font-medium leading-relaxed max-w-xs mb-8">
              {status === 'changed'
                ? 'Your email address has been updated. Please sign in again with your new address.'
                : 'Your email has been verified. You\'re all set.'}
            </motion.p>
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              onClick={() => onDone(status === 'changed')} whileTap={{ scale: 0.98 }}
              className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs">
              {status === 'changed' ? 'SIGN IN' : 'CONTINUE'}
            </motion.button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-red-500/40 flex items-center justify-center mb-6">
              <WarningCircle size={30} weight="fill" className="text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">LINK EXPIRED</h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed max-w-xs mb-8">
              {error}
            </p>
            <button onClick={() => onDone(false)}
              className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase hover:text-white transition-colors">
              Back to the app
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
