import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, EnvelopeSimple, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: Props) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setError(''); setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...slide} className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full
                      blur-[100px] opacity-10 pointer-events-none bg-primary" />
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-12 pb-10">
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1 -ml-1 mb-10">
          <CaretLeft size={22} weight="bold" />
        </button>

        <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center mb-8">
          <EnvelopeSimple size={22} weight="bold" className="text-primary" />
        </div>

        <p className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mb-2">Account Recovery</p>
        <h1 className="text-4xl font-black tracking-tight text-white leading-tight mb-4">
          FORGOT<br />PASSWORD?
        </h1>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center mb-6">
                <CheckCircle size={26} weight="fill" className="text-primary" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">CHECK YOUR INBOX</h2>
              <p className="text-sm text-white/50 font-medium leading-relaxed max-w-xs mb-8">
                If an account exists for <span className="text-white/80">{email}</span>, a reset link has been sent. It expires in 30 minutes.
              </p>
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase">
                Didn't get it? Check your spam folder.
              </p>
              <button onClick={onBack}
                className="mt-10 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase hover:text-white transition-colors">
                ← Back to sign in
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} className="flex flex-col gap-4 flex-1">
              <p className="text-sm text-white/40 font-medium leading-relaxed mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Email</label>
                <input
                  type="email" value={email} autoCapitalize="none" autoComplete="email" inputMode="email"
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="Enter your email"
                  className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                             outline-none focus:border-primary/60 transition-colors placeholder:text-white/18"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                    <WarningCircle size={13} weight="fill" />{error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1" />

              <motion.button type="submit" whileTap={{ scale: 0.98 }}
                disabled={loading || !email}
                className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                           disabled:opacity-35 flex items-center justify-center gap-2">
                {loading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : 'SEND RESET LINK'}
              </motion.button>

              <p className="text-center text-[10px] text-white/18 font-semibold tracking-wide">
                For security, we never confirm whether an email exists.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
