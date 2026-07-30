import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, WarningCircle, Eye, EyeSlash } from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';

interface Props {
  /** When undefined the component fetches it. Pass explicitly from AccountSecurity for instant rendering. */
  hasPassword?: boolean;
  onBack: () => void;
  onDeleted: () => void;
}

export function DeleteAccount({ hasPassword: hasPasswordProp, onBack, onDeleted }: Props) {
  const { signOut } = useAuth();
  const [hasPassword, setHasPassword] = useState<boolean | null>(hasPasswordProp ?? null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Self-fetch if hasPassword not provided by parent.
  useEffect(() => {
    if (hasPasswordProp !== undefined) return;
    apiRequest<{ hasPassword: boolean }>('/account/security')
      .then(d => setHasPassword(d.hasPassword))
      .catch(() => setHasPassword(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (hasPassword === null) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full" />
      </div>
    );
  }

  /* Password account: must type password.
     OAuth-only: must type DELETE.                                          */
  const canSubmit = hasPassword
    ? password.length > 0 && !loading
    : confirm === 'DELETE' && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(''); setLoading(true);
    try {
      await apiRequest('/account', {
        method: 'DELETE',
        body: hasPassword ? { password } : { confirm: 'DELETE' },
      });
      // Session cookie cleared by server — drop client state & redirect.
      await signOut().catch(() => {});
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 pt-12 pb-4 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1 -ml-1">
            <CaretLeft size={22} weight="bold" />
          </button>
          <h1 className="text-base font-bold tracking-[0.15em] uppercase text-red-400">Delete Account</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Warning block */}
        <div className="bg-red-500/8 border border-red-500/20 px-5 py-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <WarningCircle size={16} weight="fill" className="text-red-400 shrink-0" />
            <p className="text-sm font-bold text-red-300 tracking-wide">This cannot be undone</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {[
              'Your account and profile will be permanently deleted',
              'All active sessions will be signed out immediately',
              'You will lose access to all your data',
              'This action is irreversible',
            ].map(line => (
              <li key={line} className="text-[12px] text-white/40 font-medium flex items-start gap-2">
                <span className="text-red-400/60 mt-0.5">•</span>{line}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {hasPassword ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">
                Confirm with your password
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 pr-12
                             outline-none focus:border-red-500/40 transition-colors placeholder:text-white/18" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeSlash size={16} weight="fill" /> : <Eye size={16} weight="fill" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-white/50 font-medium leading-relaxed">
                Type <span className="font-bold text-white">DELETE</span> to confirm you want to permanently delete your account.
              </p>
              <input type="text" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="Type DELETE"
                className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                           outline-none focus:border-red-500/40 transition-colors placeholder:text-white/18" />
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                <WarningCircle size={13} weight="fill" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={!canSubmit} whileTap={{ scale: 0.98 }}
            className="mx-auto mt-4 w-56 py-3 rounded-full border border-red-500/40 text-red-400 font-bold tracking-[0.15em]
                       uppercase text-xs disabled:opacity-30 flex items-center justify-center hover:bg-red-500/10 transition-colors">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full" />
              : 'DELETE MY ACCOUNT'}
          </motion.button>

          <button type="button" onClick={onBack}
            className="text-center text-[10px] text-white/25 font-bold tracking-[0.2em] uppercase hover:text-white/50 transition-colors">
            Cancel — keep my account
          </button>
        </form>
      </div>
    </div>
  );
}
