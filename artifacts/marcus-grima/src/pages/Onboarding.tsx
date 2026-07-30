import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ForgotPassword } from '@/pages/ForgotPassword';
import {
  CaretRight, CaretLeft, Eye, EyeSlash, WarningCircle,
  Target, Fire, Heart, Lightning, Pulse, CheckCircle,
  GoogleLogo, AppleLogo, EnvelopeSimple,
} from '@phosphor-icons/react';
import { ScrollPicker } from '@/components/ScrollPicker';
import { useAuth } from '@/auth/AuthContext';
import { ApiError, apiRequest } from '@/lib/api';

/** Sign-in providers reported by the API (config-driven). */
export interface AuthProviders {
  email: boolean;
  google: boolean;
  apple: { enabled: boolean; reason?: string };
  emailDelivery: 'resend' | 'console';
}

export function useAuthProviders(): AuthProviders | null {
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest<AuthProviders>('/auth/providers')
      .then(p => { if (!cancelled) setProviders(p); })
      .catch(() => { if (!cancelled) setProviders({ email: true, google: false, apple: { enabled: false }, emailDelivery: 'console' }); });
    return () => { cancelled = true; };
  }, []);
  return providers;
}

/** Start the Google OAuth flow (full-page redirect through the API). */
export function startGoogleSignIn() {
  window.location.href = `${import.meta.env.BASE_URL}api/auth/google`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Auth error helper
───────────────────────────────────────────────────────────────────────── */
function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}

/* ─────────────────────────────────────────────────────────────────────────
   Slide data
───────────────────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0, eyebrow: 'MARCUS GRIMA PT',
    headline: ['TRAIN', 'HARDER.'],
    body: 'Elite personal training designed around your goals, your schedule, and your potential.',
    accent: '#E5E5E5', bg: 'from-[#0A0A0A] via-[#101010] to-[#0A0A0A]',
  },
  {
    id: 1, eyebrow: 'TRACK EVERYTHING',
    headline: ['RESULTS', 'FOLLOW.'],
    body: 'Log every set, monitor your nutrition, and watch your metrics move in real time.',
    accent: '#E5E5E5', bg: 'from-[#0A0A0A] via-[#101010] to-[#0A0A0A]',
  },
  {
    id: 2, eyebrow: 'BUILT FOR YOU',
    headline: ['YOUR PT,', 'YOUR WAY.'],
    body: 'Book sessions, get coaching cues, and stay connected with Marcus wherever you are.',
    accent: '#E5E5E5', bg: 'from-[#0A0A0A] via-[#101010] to-[#0A0A0A]',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Step type
───────────────────────────────────────────────────────────────────────── */
type Step =
  | { kind: 'slide'; idx: number }
  | { kind: 'choice' }
  | { kind: 'name' }
  | { kind: 'gender' }
  | { kind: 'age' }
  | { kind: 'weight' }
  | { kind: 'height' }
  | { kind: 'goal' }
  | { kind: 'activity' }
  | { kind: 'login' }
  | { kind: 'welcome' }
  | { kind: 'signin' }
  | { kind: 'forgot' };

const SIGNUP_ORDER: Step['kind'][] = ['name','gender','age','weight','height','goal','activity','login'];
const SIGNUP_STEP_NUM = (k: Step['kind']) => SIGNUP_ORDER.indexOf(k) + 1;
const SIGNUP_TOTAL = SIGNUP_ORDER.length;

/* ─────────────────────────────────────────────────────────────────────────
   Picker value arrays
───────────────────────────────────────────────────────────────────────── */
const AGES    = Array.from({ length: 55 }, (_, i) => String(i + 16));       // 16-70
const WEIGHTS = Array.from({ length: 111 }, (_, i) => `${i + 40} kg`);     // 40-150
const HEIGHTS = Array.from({ length: 81 }, (_, i) => `${i + 140} cm`);     // 140-220

/* ─────────────────────────────────────────────────────────────────────────
   Reusable UI pieces
───────────────────────────────────────────────────────────────────────── */

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

function MGLogo() {
  return (
    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Marcus Grima logo"
      className="w-7 object-contain" />
  );
}

/* Progress bar + back for signup steps */
function StepShell({
  stepNum, total = SIGNUP_TOTAL, onBack, onContinue,
  continueLabel = 'CONTINUE', continueDisabled = false, children,
}: {
  stepNum: number; total?: number; onBack: () => void; onContinue: () => void;
  continueLabel?: string; continueDisabled?: boolean; children: React.ReactNode;
}) {
  const pct = (stepNum / total) * 100;
  return (
    <motion.div {...slide} className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 px-5 pt-12 pb-3">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1 -ml-1">
            <CaretLeft size={22} weight="bold" />
          </button>
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">{stepNum} of {total}</span>
        </div>
        <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: `${((stepNum - 1) / total) * 100}%` }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">{children}</div>

      {/* Continue button */}
      <div className="shrink-0 px-6 pb-10 pt-4">
        <motion.button
          onClick={onContinue}
          disabled={continueDisabled}
          whileTap={{ scale: 0.98 }}
          className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                     flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>{continueLabel}</span>
          <CaretRight size={18} weight="bold" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-4xl font-black tracking-tight text-white leading-tight mb-2">{title}</h2>
      {subtitle && <p className="text-sm text-white/40 font-medium leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function SelectCard({
  label, sub, icon, selected, onClick,
}: { label: string; sub?: string; icon?: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 border text-left transition-all ${
        selected
          ? 'border-primary bg-primary/10 text-white'
          : 'border-white/8 bg-[#111111] text-white/60 hover:border-white/20'
      }`}
    >
      {icon && <div className={`text-xl ${selected ? 'text-primary' : 'text-white/30'}`}>{icon}</div>}
      <div className="flex-1">
        <p className={`text-sm font-bold tracking-wider ${selected ? 'text-white' : 'text-white/60'}`}>{label}</p>
        {sub && <p className={`text-[11px] font-medium mt-0.5 ${selected ? 'text-white/50' : 'text-white/25'}`}>{sub}</p>}
      </div>
      {selected && <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Welcome slide component
───────────────────────────────────────────────────────────────────────── */
function SlideScreen({ s, onNext, isLast, onSkip }: {
  s: typeof SLIDES[0]; onNext: () => void; isLast: boolean; onSkip: () => void;
}) {
  return (
    <motion.div
      key={`slide-${s.id}`}
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.32, ease: 'easeOut' }}
      className={`fixed inset-0 bg-gradient-to-br ${s.bg} flex flex-col`}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96
                      rounded-full blur-[130px] opacity-20 pointer-events-none"
        style={{ background: s.accent }} />

      {/* Background grid lines */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.035] pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="absolute h-px w-full bg-white" style={{ top: `${(i + 1) * 9}%` }} />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <div className="flex items-center gap-2"><MGLogo />
          <span className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase">Marcus Grima</span>
        </div>
        <button onClick={onSkip}
          className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase hover:text-white/50 transition-colors">
          Skip
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-14">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-[10px] font-bold tracking-[0.3em] mb-5 uppercase" style={{ color: s.accent }}>
          {s.eyebrow}
        </motion.p>
        <h1 className="text-[60px] font-black leading-[0.88] tracking-[-0.02em] text-white mb-6">
          {s.headline.map((line, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45, ease: [0.22,1,0.36,1] }}
              className="block">{line}</motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="text-sm text-white/45 leading-relaxed font-medium mb-10 max-w-xs">{s.body}</motion.p>

        <div className="flex items-center gap-2 mb-8">
          {SLIDES.map((sl) => (
            <motion.div key={sl.id}
              animate={{ width: sl.id === s.id ? 24 : 6, opacity: sl.id === s.id ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
              className="h-1.5 rounded-full" style={{ background: s.accent }} />
          ))}
        </div>

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          onClick={onNext}
          className="flex items-center justify-between w-full px-6 py-4 text-white font-bold tracking-[0.15em] uppercase text-sm"
          style={{ background: s.accent }}>
          <span>{isLast ? 'GET STARTED' : 'NEXT'}</span>
          <CaretRight size={18} weight="bold" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Choice screen
───────────────────────────────────────────────────────────────────────── */
function ChoiceScreen({ onNew, onReturning, providers }: {
  onNew: () => void; onReturning: () => void; providers: AuthProviders | null;
}) {
  return (
    <motion.div {...slide} className="fixed inset-0 bg-[#060606] flex flex-col">
      {/* Full-bleed hero photo */}
      <img src={`${import.meta.env.BASE_URL}hero.png`} alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 20%' }} />
      {/* Legibility gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.4) 100%)' }} />

      {/* Top brand row */}
      <div className="relative z-10 flex items-center gap-2 px-6 pt-14">
        <MGLogo />
        <span className="text-[10px] font-bold tracking-[0.25em] text-white/50 uppercase">Marcus Grima</span>
      </div>

      {/* Bottom content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12">
        <h1 className="text-[44px] font-black leading-[0.92] tracking-[-0.02em] text-white mb-5">
          {['STRONGER', 'STARTS HERE.'].map((line, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45, ease: [0.22,1,0.36,1] }}
              className="block">{line}</motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-base text-white/90 leading-relaxed font-medium mb-8 max-w-xs">
          Elite personal training designed around your potential, by Marcus Grima.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="flex flex-col gap-3">
          {providers?.google && (
            <button onClick={startGoogleSignIn}
              className="w-full py-3 rounded-full bg-white text-black font-bold tracking-[0.15em] uppercase text-xs
                         flex items-center justify-center gap-2">
              <GoogleLogo size={16} weight="bold" />
              <span>Continue with Google</span>
            </button>
          )}
          <button onClick={onNew}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                       flex items-center justify-center gap-2">
            <EnvelopeSimple size={16} weight="bold" />
            <span>Continue with Email</span>
          </button>
          <button disabled title={providers?.apple?.reason ?? 'Coming soon'}
            className="w-full py-3 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm text-white/30 font-bold tracking-[0.15em] uppercase text-xs
                       flex items-center justify-center gap-2 cursor-not-allowed">
            <AppleLogo size={16} weight="fill" />
            <span>Apple — Coming Soon</span>
          </button>
        </motion.div>
        <button onClick={onReturning}
          className="text-center text-[11px] text-white/50 font-bold tracking-[0.15em] uppercase mt-6 hover:text-white transition-colors">
          Already a member? Sign in
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sign-in screen
───────────────────────────────────────────────────────────────────────── */
function SignInScreen({ onAuth, onBack, onForgot, providers }: {
  onAuth: () => void; onBack: () => void; onForgot: () => void; providers: AuthProviders | null;
}) {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await signIn(email.trim(), password);
      onAuth();
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <motion.div {...slide} className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full
                      blur-[100px] opacity-12 pointer-events-none bg-primary" />
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-12 pb-10">
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1 -ml-1 mb-10">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center mb-8">
          <svg viewBox="0 0 100 100" fill="none" className="w-7 h-7">
            <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#E5E5E5"/>
            <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#E5E5E5"/>
          </svg>
        </div>
        <p className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mb-2">Welcome back</p>
        <h1 className="text-4xl font-black tracking-tight text-white leading-tight mb-10">
          SIGN IN TO<br />YOUR APP
        </h1>

        <form onSubmit={submit} className="flex flex-col gap-4 flex-1">
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Email</label>
            <input type="email" value={email} autoCapitalize="none" autoComplete="email" inputMode="email"
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="Enter your email"
              className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                         outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password"
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 pr-12
                           outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPw ? <EyeSlash size={16} weight="fill" /> : <Eye size={16} weight="fill" />}
              </button>
            </div>
          </div>

          <button type="button" onClick={onForgot}
            className="self-end text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase hover:text-primary transition-colors">
            Forgot password?
          </button>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                <WarningCircle size={13} weight="fill" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          {providers?.google && (
            <button type="button" onClick={startGoogleSignIn}
              className="w-full py-3 rounded-full border border-white/15 bg-white/5 text-white font-bold tracking-[0.15em] uppercase text-xs
                         flex items-center justify-center gap-2 hover:border-white/40 transition-colors">
              <GoogleLogo size={15} weight="bold" />
              <span>Continue with Google</span>
            </button>
          )}

          <div className="flex-1" />

          <motion.button type="submit" disabled={loading || !email || !password} whileTap={{ scale: 0.98 }}
            className="mx-auto w-56 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                       disabled:opacity-35 flex items-center justify-center gap-2">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : 'SIGN IN'}
          </motion.button>
          <p className="text-center text-[10px] text-white/18 font-semibold tracking-wide">
            Login details are set up with Marcus or created during sign-up
          </p>
        </form>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sign-up steps
───────────────────────────────────────────────────────────────────────── */

// Step: Name
function NameStep({ draft, setDraft, onBack, onNext }: any) {
  return (
    <StepShell stepNum={1} onBack={onBack} onContinue={onNext}
      continueDisabled={!draft.firstName.trim() || !draft.lastName.trim()}>
      <StepTitle title="WHAT'S YOUR NAME?" subtitle="This is how Marcus will greet you in the app." />
      <div className="flex flex-col gap-4">
        {[
          { label: 'First Name', key: 'firstName', placeholder: 'e.g. Alex' },
          { label: 'Last Name',  key: 'lastName',  placeholder: 'e.g. Johnson' },
        ].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">{f.label}</label>
            <input
              type="text"
              value={draft[f.key]}
              onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                         outline-none focus:border-primary/60 transition-colors placeholder:text-white/18"
            />
          </div>
        ))}
      </div>
    </StepShell>
  );
}

// Step: Gender
function GenderStep({ draft, setDraft, onBack, onNext }: any) {
  const opts = ['Male', 'Female', 'Other'];
  return (
    <StepShell stepNum={2} onBack={onBack} onContinue={onNext} continueDisabled={!draft.gender}>
      <StepTitle title="YOUR GENDER" subtitle="Helps Marcus tailor your programme and nutrition." />
      <div className="flex flex-col gap-3">
        {opts.map(g => (
          <SelectCard key={g} label={g} selected={draft.gender === g}
            onClick={() => setDraft({ ...draft, gender: g })} />
        ))}
      </div>
    </StepShell>
  );
}

// Step: Age
function AgeStep({ draft, setDraft, onBack, onNext }: any) {
  const idx = AGES.indexOf(String(draft.age));
  return (
    <StepShell stepNum={3} onBack={onBack} onContinue={onNext}>
      <StepTitle title="HOW OLD ARE YOU?" />
      <div className="mt-4">
        <ScrollPicker
          values={AGES}
          selectedIndex={idx >= 0 ? idx : 12}
          onChange={i => setDraft({ ...draft, age: parseInt(AGES[i]) })}
        />
        <p className="text-center text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase mt-4">years old</p>
      </div>
    </StepShell>
  );
}

// Step: Weight
function WeightStep({ draft, setDraft, onBack, onNext }: any) {
  const idx = WEIGHTS.findIndex(w => w === `${draft.weightKg} kg`);
  return (
    <StepShell stepNum={4} onBack={onBack} onContinue={onNext}>
      <StepTitle title="CURRENT WEIGHT" subtitle="You can always update this in your profile." />
      <div className="mt-4">
        <ScrollPicker
          values={WEIGHTS}
          selectedIndex={idx >= 0 ? idx : 40}
          onChange={i => setDraft({ ...draft, weightKg: i + 40 })}
        />
      </div>
    </StepShell>
  );
}

// Step: Height
function HeightStep({ draft, setDraft, onBack, onNext }: any) {
  const idx = HEIGHTS.findIndex(h => h === `${draft.heightCm} cm`);
  return (
    <StepShell stepNum={5} onBack={onBack} onContinue={onNext}>
      <StepTitle title="YOUR HEIGHT" />
      <div className="mt-4">
        <ScrollPicker
          values={HEIGHTS}
          selectedIndex={idx >= 0 ? idx : 40}
          onChange={i => setDraft({ ...draft, heightCm: i + 140 })}
        />
      </div>
    </StepShell>
  );
}

// Step: Goal
const GOALS = [
  { label: 'Build Muscle',       sub: 'Increase size and strength',           icon: <Lightning size={20} weight="fill" /> },
  { label: 'Lose Weight',        sub: 'Reduce body fat and get lean',         icon: <Fire size={20} weight="fill" /> },
  { label: 'Get Fit',            sub: 'Improve overall health and fitness',   icon: <Heart size={20} weight="fill" /> },
  { label: 'Increase Strength',  sub: 'Get stronger in compound movements',   icon: <Target size={20} weight="fill" /> },
  { label: 'Improve Endurance',  sub: 'Build cardiovascular capacity',        icon: <Pulse size={20} weight="fill" /> },
];

function GoalStep({ draft, setDraft, onBack, onNext }: any) {
  return (
    <StepShell stepNum={6} onBack={onBack} onContinue={onNext} continueDisabled={!draft.goal}>
      <StepTitle title="WHAT'S YOUR GOAL?" subtitle="Marcus will build your programme around this." />
      <div className="flex flex-col gap-3">
        {GOALS.map(g => (
          <SelectCard key={g.label} label={g.label} sub={g.sub} icon={g.icon}
            selected={draft.goal === g.label}
            onClick={() => setDraft({ ...draft, goal: g.label })} />
        ))}
      </div>
    </StepShell>
  );
}

// Step: Activity Level
const ACTIVITY = [
  { label: 'Beginner',     sub: 'New to training or returning after a break' },
  { label: 'Intermediate', sub: 'Training regularly for 6+ months' },
  { label: 'Advanced',     sub: 'Experienced athlete, 2+ years consistent training' },
];

function ActivityStep({ draft, setDraft, onBack, onNext }: any) {
  return (
    <StepShell stepNum={7} onBack={onBack} onContinue={onNext} continueDisabled={!draft.activityLevel}>
      <StepTitle title="ACTIVITY LEVEL" subtitle="Be honest — Marcus will adjust as you progress." />
      <div className="flex flex-col gap-3">
        {ACTIVITY.map(a => (
          <SelectCard key={a.label} label={a.label} sub={a.sub}
            selected={draft.activityLevel === a.label}
            onClick={() => setDraft({ ...draft, activityLevel: a.label })} />
        ))}
      </div>
    </StepShell>
  );
}

// Step: Create Login
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginStep({ draft, setDraft, onBack, onNext }: any) {
  const [showPw, setShowPw]   = useState(false);
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk    = EMAIL_RE.test(draft.email?.trim() ?? '');
  const passwordOk = draft.newPassword?.length >= 8;
  const matchOk    = draft.newPassword === confirm;

  const canContinue = emailOk && passwordOk && matchOk && !loading;

  const handleNext = async () => {
    if (!canContinue) { setError('Please fix the errors above.'); return; }
    setError('');
    setLoading(true);
    const err: string | null = await onNext();
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <StepShell stepNum={8} onBack={onBack} onContinue={handleNext}
      continueLabel={loading ? 'CREATING…' : 'CREATE ACCOUNT'} continueDisabled={!canContinue}>
      <StepTitle title="CREATE YOUR LOGIN" subtitle="You'll use these to sign in next time." />
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Email</label>
          <input type="email" value={draft.email ?? ''} autoCapitalize="none" autoComplete="email" inputMode="email"
            onChange={e => { setDraft({ ...draft, email: e.target.value }); setError(''); }}
            placeholder="Enter your email"
            className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                       outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
          {(draft.email?.length ?? 0) > 3 && !emailOk && (
            <p className="text-[11px] text-red-400 font-semibold">Enter a valid email address.</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={draft.newPassword || ''} autoComplete="new-password"
              onChange={e => setDraft({ ...draft, newPassword: e.target.value })}
              placeholder="Min. 8 characters"
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
          <input type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5
                       outline-none focus:border-primary/60 transition-colors placeholder:text-white/18" />
          {confirm.length > 0 && !matchOk && (
            <p className="text-[11px] text-red-400 font-semibold">Passwords don't match.</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
            <WarningCircle size={13} weight="fill" />{error}
          </div>
        )}
      </div>
    </StepShell>
  );
}

// Step: Welcome
function WelcomeScreen({ firstName, onComplete }: { firstName: string; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-[#060606] flex flex-col"
    >
      {/* Full-bleed welcome photo */}
      <img src={`${import.meta.env.BASE_URL}welcome.png`} alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 15%' }} />
      {/* Legibility gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.35) 100%)' }} />

      <div className="relative z-10 flex-1 flex flex-col justify-end items-center text-center px-6 pb-12">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center mb-6">
          <CheckCircle size={26} weight="fill" className="text-white" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="text-[44px] font-black tracking-[-0.02em] text-white leading-[0.92] mb-4">
          YOU'RE ALL SET,<br />{firstName.toUpperCase()}.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="text-base text-white/90 font-medium mb-8 max-w-xs">
          Your profile is set up. Marcus is ready when you are.
        </motion.p>

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          onClick={onComplete} whileTap={{ scale: 0.98 }}
          className="mx-auto w-64 py-3 rounded-full bg-primary text-primary-foreground font-bold tracking-[0.15em] uppercase text-xs
                     flex items-center justify-center gap-2">
          <span>START YOUR JOURNEY</span>
          <CaretRight size={15} weight="bold" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Default draft values
───────────────────────────────────────────────────────────────────────── */
const DEFAULT_DRAFT = {
  firstName: '', lastName: '', gender: '', age: 25,
  weightKg: 80, heightCm: 175, goal: '', activityLevel: '',
  email: '', newPassword: '',
};

/* ─────────────────────────────────────────────────────────────────────────
   Root Onboarding component
───────────────────────────────────────────────────────────────────────── */

interface OnboardingProps {
  onComplete: () => void;
  /**
   * profileOnly=true: the user is already authenticated (Google OAuth)
   * but has no profile yet. Skip slides, choice, name, and login steps.
   * Only collect gender → age → weight → height → goal → activity, then
   * createProfile directly and show the welcome screen.
   */
  profileOnly?: boolean;
}

export function Onboarding({ onComplete, profileOnly = false }: OnboardingProps) {
  const { signUp, createProfile, user } = useAuth();
  const providers = useAuthProviders();

  // Profile-only flow starts at 'gender' (name comes from the OAuth provider).
  const initialStep: Step = profileOnly
    ? { kind: 'gender' }
    : { kind: 'choice' };

  const [step, setStep]   = useState<Step>(initialStep);
  const [draft, setDraft] = useState({
    ...DEFAULT_DRAFT,
    // Pre-fill name from Google user object when available.
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
  });

  const go = (s: Step) => setStep(s);

  // Full sign-up flow steps.
  const signupSteps: Step['kind'][] = ['name','gender','age','weight','height','goal','activity','login'];
  // Profile-only steps skip name and login (already authed via OAuth).
  const profileSteps: Step['kind'][] = ['gender','age','weight','height','goal','activity'];

  const steps = profileOnly ? profileSteps : signupSteps;

  const signupBack = (current: Step['kind']) => {
    const idx = steps.indexOf(current);
    if (idx <= 0) go(profileOnly ? { kind: 'gender' } : { kind: 'choice' });
    else go({ kind: steps[idx - 1] } as Step);
  };
  const signupNext = (current: Step['kind']) => {
    const idx = steps.indexOf(current);
    if (idx < steps.length - 1) go({ kind: steps[idx + 1] } as Step);
  };

  /**
   * Called at the end of the sign-up (login) step.
   * Returns null on success, or an error string for the step to display.
   */
  const createAccount = async (): Promise<string | null> => {
    try {
      await signUp({
        email: draft.email.trim(),
        password: draft.newPassword,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
      });
    } catch (err) {
      return authErrorMessage(err);
    }
    await saveProfile();
    go({ kind: 'welcome' });
    return null;
  };

  /**
   * Called at the end of the profile-only flow (OAuth users).
   */
  const finishProfileOnly = async () => {
    await saveProfile();
    go({ kind: 'welcome' });
  };

  const saveProfile = async () => {
    try {
      await createProfile({
        firstName: draft.firstName.trim() || user?.firstName || undefined,
        lastName:  draft.lastName.trim()  || user?.lastName  || undefined,
        gender:    draft.gender || null,
        dateOfBirth: `${new Date().getFullYear() - draft.age}-01-01`,
        weightKg:  draft.weightKg,
        heightCm:  draft.heightCm,
        goal:      draft.goal || null,
        experienceLevel: draft.activityLevel || null,
        onboardingCompleted: true,
      });
    } catch {
      // Profile save blip — the app still works, profile page lets them retry.
    }
  };

  const props = { draft, setDraft };

  const displayFirstName = draft.firstName || user?.firstName || 'Member';

  return (
    <AnimatePresence mode="wait">
      {/* ── Full flow (email signup) ────────────────────────────────── */}
      {!profileOnly && step.kind === 'choice' && (
        <ChoiceScreen key="choice" providers={providers}
          onNew={() => go({ kind: 'name' })}
          onReturning={() => go({ kind: 'signin' })} />
      )}
      {!profileOnly && step.kind === 'signin' && (
        <SignInScreen key="signin" providers={providers}
          onAuth={onComplete}
          onBack={() => go({ kind: 'choice' })}
          onForgot={() => go({ kind: 'forgot' })} />
      )}
      {!profileOnly && step.kind === 'forgot' && (
        <ForgotPassword key="forgot" onBack={() => go({ kind: 'signin' })} />
      )}
      {!profileOnly && step.kind === 'name' && (
        <NameStep key="name" {...props}
          onBack={() => go({ kind: 'choice' })} onNext={() => signupNext('name')} />
      )}

      {/* ── Shared steps (both flows) ──────────────────────────────── */}
      {step.kind === 'gender'   && <GenderStep   key="gender"   {...props} onBack={() => signupBack('gender')}   onNext={() => signupNext('gender')} />}
      {step.kind === 'age'      && <AgeStep      key="age"      {...props} onBack={() => signupBack('age')}      onNext={() => signupNext('age')} />}
      {step.kind === 'weight'   && <WeightStep   key="weight"   {...props} onBack={() => signupBack('weight')}   onNext={() => signupNext('weight')} />}
      {step.kind === 'height'   && <HeightStep   key="height"   {...props} onBack={() => signupBack('height')}   onNext={() => signupNext('height')} />}
      {step.kind === 'goal'     && <GoalStep     key="goal"     {...props} onBack={() => signupBack('goal')}     onNext={() => signupNext('goal')} />}
      {step.kind === 'activity' && <ActivityStep key="activity" {...props}
        onBack={() => signupBack('activity')}
        onNext={profileOnly
          ? () => { void finishProfileOnly(); }
          : () => signupNext('activity')} />}

      {/* ── Email signup only ──────────────────────────────────────── */}
      {!profileOnly && step.kind === 'login' && (
        <LoginStep key="login" {...props}
          onBack={() => signupBack('login')} onNext={createAccount} />
      )}

      {/* ── Welcome ───────────────────────────────────────────────── */}
      {step.kind === 'welcome' && (
        <WelcomeScreen key="welcome" firstName={displayFirstName} onComplete={onComplete} />
      )}
    </AnimatePresence>
  );
}
