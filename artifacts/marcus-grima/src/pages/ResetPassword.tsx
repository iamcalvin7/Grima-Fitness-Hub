import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeSlash, WarningCircle, CheckCircle, LockKey } from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

const MIN_PW = 8;

interface Props {
  token: string;
  onDone: () => void; // navigate to sign-in
}

export function ResetPassword({ token, onDone }: Props) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  const passwordOk = password.length >= MIN_PW;
  const matchOk    = password === confirm;
  const canSubmit  = passwordOk && matchOk && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(''); setLoading(true);
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
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

        <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center mb-8 mt-10">
          <LockKey size={22} weight="bold" className="text-primary" />
        </div>

        <p className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mb-2">Set New Password</p>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center mb-6">
                <CheckCircle size={26} weight="fill" className="text-primary" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">PASSWORD UPDATED</h2>
              <p className="text-sm text-white/50 font-medium leading-relaxed max-w-xs mb-8">
                Your password has been changed and all other devices have been signed out for security.
              </p>
              <motion.button onClick={onDone} whileTap={{ scale: 0.98 }}
                className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs">
                SIGN IN
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="form">
              <h1 className="text-4xl font-black tracking-tight text-white leading-tight mb-4">
                CHOOSE A<br />NEW PASSWORD
              </h1>
              <p className="text-sm text-white/40 font-medium leading-relaxed mb-8">
                Pick something strong — at least {MIN_PW} characters.
              </p>

              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">New Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      autoComplete="new-password"
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={`Min. ${MIN_PW} characters`}
                      className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 pr-12
                                 outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeSlash size={16} weight="fill" /> : <Eye size={16} weight="fill" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Confirm Password</label>
                  <input type="password" value={confirm} autoComplete="new-password"
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Repeat your password"
                    className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                               outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
                  {confirm.length > 0 && !matchOk && (
                    <p className="text-[11px] text-red-400 font-semibold">Passwords don't match.</p>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                      <WarningCircle size={13} weight="fill" />{error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4">
                  <motion.button type="submit" disabled={!canSubmit} whileTap={{ scale: 0.98 }}
                    className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                               disabled:opacity-35 flex items-center justify-center gap-2">
                    {loading
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : 'SET PASSWORD'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
