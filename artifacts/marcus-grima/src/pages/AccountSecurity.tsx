import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretLeft, Eye, EyeSlash, WarningCircle, CheckCircle,
  GoogleLogo, EnvelopeSimple, ShieldCheck, ArrowRight,
} from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';

interface SecurityInfo {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  identities: { id: string; provider: string; email: string | null; createdAt: string }[];
}

type Panel = 'overview' | 'change-password' | 'set-password' | 'change-email';

const MIN_PW = 8;

interface Props {
  onBack: () => void;
  onDeleteAccount: () => void;
}

export function AccountSecurity({ onBack, onDeleteAccount }: Props) {
  const { refreshUser } = useAuth();
  const [info, setInfo]     = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel]   = useState<Panel>('overview');

  const load = async () => {
    try {
      const data = await apiRequest<SecurityInfo>('/account/security');
      setInfo(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const providerIcon = (p: string) =>
    p === 'google' ? <GoogleLogo size={16} weight="bold" className="text-white/60" />
                   : <EnvelopeSimple size={16} weight="bold" className="text-white/60" />;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 pt-12 pb-4 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={panel === 'overview' ? onBack : () => setPanel('overview')}
            className="text-white/40 hover:text-white transition-colors p-1 -ml-1">
            <CaretLeft size={22} weight="bold" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-[0.15em] uppercase text-white">
              {panel === 'overview' ? 'Security' :
               panel === 'change-password' ? 'Change Password' :
               panel === 'set-password' ? 'Set Password' :
               'Change Email'}
            </h1>
            <p className="text-[10px] text-white/30 font-semibold tracking-wider">Account settings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <AnimatePresence mode="wait">
          {panel === 'overview' && info && (
            <motion.div key="overview"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-6">

              {/* Email verification banner */}
              {!info.emailVerified && (
                <VerifyBanner email={info.email} onRefresh={load} />
              )}

              {/* Sign-in methods */}
              <section>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-3">Sign-in Methods</p>
                <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                  {/* Email/password row */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <EnvelopeSimple size={18} weight="bold" className="text-white/40" />
                      <div>
                        <p className="text-sm font-bold text-white/80 tracking-wide">Email</p>
                        <p className="text-[11px] text-white/35 font-medium">{info.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {info.emailVerified
                        ? <CheckCircle size={14} weight="fill" className="text-primary" />
                        : <WarningCircle size={14} weight="fill" className="text-amber-400" />}
                      <span className={`text-[10px] font-bold tracking-wider ${info.emailVerified ? 'text-primary' : 'text-amber-400'}`}>
                        {info.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>

                  {/* Password row */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} weight="bold" className="text-white/40" />
                      <p className="text-sm font-bold text-white/80 tracking-wide">Password</p>
                    </div>
                    <button
                      onClick={() => setPanel(info.hasPassword ? 'change-password' : 'set-password')}
                      className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase flex items-center gap-1 hover:opacity-70 transition-opacity">
                      {info.hasPassword ? 'Change' : 'Set password'}
                      <ArrowRight size={11} weight="bold" />
                    </button>
                  </div>

                  {/* Linked Google identity rows */}
                  {info.identities.map(id => (
                    <div key={id.id} className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        {providerIcon(id.provider)}
                        <div>
                          <p className="text-sm font-bold text-white/80 tracking-wide capitalize">{id.provider}</p>
                          {id.email && <p className="text-[11px] text-white/35 font-medium">{id.email}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-primary">LINKED</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Change email */}
              <section>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-3">Email Address</p>
                <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                  <button onClick={() => setPanel('change-email')}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <p className="text-sm font-bold text-white/80 tracking-wide">Change Email</p>
                    <ArrowRight size={14} weight="bold" className="text-white/30" />
                  </button>
                </div>
              </section>

              {/* Danger zone */}
              <section>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-3">Danger Zone</p>
                <div className="bg-[#111111] border border-red-500/10 rounded-sm overflow-hidden">
                  <button onClick={onDeleteAccount}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/5 transition-colors">
                    <p className="text-sm font-bold text-red-400/80 tracking-wide">Delete Account</p>
                    <ArrowRight size={14} weight="bold" className="text-red-400/40" />
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {(panel === 'change-password' || panel === 'set-password') && info && (
            <PasswordPanel
              key={panel}
              hasPassword={info.hasPassword}
              onSuccess={() => { void load(); setPanel('overview'); }}
            />
          )}

          {panel === 'change-email' && info && (
            <EmailPanel
              key="change-email"
              hasPassword={info.hasPassword}
              onSuccess={() => { void refreshUser().catch(() => {}); setPanel('overview'); void load(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Subpanels ─────────────────────────────────────────────────────────── */

function VerifyBanner({ email, onRefresh }: { email: string; onRefresh: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState('');

  const resend = async () => {
    setSending(true); setErr('');
    try {
      await apiRequest('/auth/send-verification', { method: 'POST' });
      setSent(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not resend. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/8 border border-amber-500/20 px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <WarningCircle size={14} weight="fill" className="text-amber-400 shrink-0" />
        <p className="text-xs font-bold tracking-wide text-amber-300">Email not verified</p>
      </div>
      <p className="text-[11px] text-white/40 font-medium leading-relaxed">
        A verification email was sent to <span className="text-white/60">{email}</span>. Check your inbox.
      </p>
      {err && <p className="text-[11px] text-red-400 font-semibold">{err}</p>}
      {sent
        ? <p className="text-[11px] text-primary font-bold">Resent! Check your inbox.</p>
        : (
          <button onClick={() => void resend()} disabled={sending}
            className="self-start text-[10px] font-bold tracking-[0.2em] uppercase text-primary hover:opacity-70 disabled:opacity-40 transition-opacity">
            {sending ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
    </div>
  );
}

function PasswordPanel({
  hasPassword, onSuccess,
}: { hasPassword: boolean; onSuccess: () => void }) {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [ok, setOk]             = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < MIN_PW) { setError(`Password must be at least ${MIN_PW} characters.`); return; }
    if (next !== confirm) { setError("Passwords don't match."); return; }
    setError(''); setLoading(true);
    try {
      await apiRequest('/account/password', {
        method: 'PATCH',
        body: hasPassword
          ? { currentPassword: current, newPassword: next }
          : { newPassword: next },
      });
      setOk(true);
      setTimeout(onSuccess, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
      {ok ? (
        <div className="flex flex-col items-center text-center pt-16 gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center">
            <CheckCircle size={26} weight="fill" className="text-primary" />
          </div>
          <p className="text-xl font-black text-white">PASSWORD UPDATED</p>
          <p className="text-sm text-white/40">Other devices have been signed out.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {hasPassword && (
            <Field label="Current Password" value={current} onChange={setCurrent}
              showToggle={showPw} onToggle={() => setShowPw(v => !v)} autocomplete="current-password" />
          )}
          <Field label="New Password" value={next} onChange={setNext}
            placeholder={`Min. ${MIN_PW} characters`}
            showToggle={showPw} onToggle={() => setShowPw(v => !v)} autocomplete="new-password" />
          <Field label="Confirm New Password" value={confirm} onChange={setConfirm}
            showToggle={false} onToggle={() => {}} autocomplete="new-password" />
          {confirm && next !== confirm && (
            <p className="text-[11px] text-red-400 font-semibold">Passwords don't match.</p>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <WarningCircle size={13} weight="fill" />{error}
            </div>
          )}
          <div className="pt-4">
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                         disabled:opacity-35 flex items-center justify-center">
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : hasPassword ? 'UPDATE PASSWORD' : 'SET PASSWORD'}
            </motion.button>
          </div>
          {hasPassword && (
            <p className="text-center text-[10px] text-white/20 tracking-wide font-semibold">
              All other active sessions will be signed out.
            </p>
          )}
        </form>
      )}
    </motion.div>
  );
}

function EmailPanel({ hasPassword, onSuccess }: { hasPassword: boolean; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOk) { setError('Enter a valid email address.'); return; }
    setError(''); setLoading(true);
    try {
      await apiRequest('/account/email', {
        method: 'POST',
        body: hasPassword ? { password, newEmail: newEmail.trim() } : { newEmail: newEmail.trim() },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
      {done ? (
        <div className="flex flex-col items-center text-center pt-16 gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center">
            <CheckCircle size={26} weight="fill" className="text-primary" />
          </div>
          <p className="text-xl font-black text-white">CHECK YOUR INBOX</p>
          <p className="text-sm text-white/40 font-medium leading-relaxed max-w-xs">
            If that address is available, a confirmation link has been sent to it. Your email only changes after you confirm.
          </p>
          <button onClick={onSuccess}
            className="mt-6 text-[10px] font-bold tracking-[0.2em] text-primary uppercase hover:opacity-70">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-white/40 font-medium leading-relaxed mb-2">
            Enter your new email address. A confirmation link will be sent to it — your email only changes after you click that link.
          </p>
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">New Email</label>
            <input type="email" value={newEmail} autoCapitalize="none" inputMode="email"
              onChange={e => { setNewEmail(e.target.value); setError(''); }}
              placeholder="new@example.com"
              className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                         outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
          </div>
          {hasPassword && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Current Password</label>
              <input type="password" value={password} autoComplete="current-password"
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Confirm with your password"
                className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                           outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <WarningCircle size={13} weight="fill" />{error}
            </div>
          )}
          <div className="pt-4">
            <motion.button type="submit" disabled={loading || !emailOk} whileTap={{ scale: 0.98 }}
              className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                         disabled:opacity-35 flex items-center justify-center">
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : 'SEND CONFIRMATION'}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

function Field({
  label, value, onChange, placeholder, showToggle, onToggle, autocomplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; showToggle: boolean; onToggle: () => void; autocomplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">{label}</label>
      <div className="relative">
        <input type={showToggle ? 'text' : 'password'} value={value}
          autoComplete={autocomplete}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? ''}
          className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 pr-12
                     outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
          {showToggle ? <EyeSlash size={16} weight="fill" /> : <Eye size={16} weight="fill" />}
        </button>
      </div>
    </div>
  );
}
