import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

/* ── Credentials (app-level, no backend) ─────────────────────────────────── */
const USERS: Record<string, string> = {
  marcus: 'grima2024',
  client: 'mgpt2024',
};

/* ── Slide data ───────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0,
    eyebrow: 'MARCUS GRIMA PT',
    headline: ['TRAIN', 'HARDER.'],
    body: 'Elite personal training designed around your goals, your schedule, and your potential.',
    accent: '#8B45D9',
    bg: 'from-[#0A0A0A] via-[#0D0A14] to-[#0A0A0A]',
    dot: '#8B45D9',
  },
  {
    id: 1,
    eyebrow: 'TRACK EVERYTHING',
    headline: ['RESULTS', 'FOLLOW.'],
    body: 'Log every set, monitor your nutrition, and watch your metrics move in real time.',
    accent: '#16a34a',
    bg: 'from-[#0A0A0A] via-[#0A110D] to-[#0A0A0A]',
    dot: '#16a34a',
  },
  {
    id: 2,
    eyebrow: 'BUILT FOR YOU',
    headline: ['YOUR PT,', 'YOUR WAY.'],
    body: 'Book sessions, get coaching cues, and stay connected with Marcus wherever you are.',
    accent: '#8B45D9',
    bg: 'from-[#0A0A0A] via-[#0D0A14] to-[#0A0A0A]',
    dot: '#8B45D9',
  },
];

/* ── Animated headline word ───────────────────────────────────────────────── */
function Word({ text, delay, colour }: { text: string; delay: number; colour: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 30, skewY: 4 }}
      animate={{ opacity: 1, y: 0, skewY: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="block"
      style={{ color: colour }}
    >
      {text}
    </motion.span>
  );
}

/* ── Single slide ─────────────────────────────────────────────────────────── */
function Slide({ slide, onNext, isLast }: { slide: typeof SLIDES[0]; onNext: () => void; isLast: boolean }) {
  return (
    <motion.div
      key={slide.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`fixed inset-0 bg-gradient-to-br ${slide.bg} flex flex-col`}
    >
      {/* Background texture lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute h-px w-full bg-white" style={{ top: `${(i + 1) * 8}%` }} />
        ))}
      </div>

      {/* Accent glow blob */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ background: slide.accent }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 100 100" fill="none" className="w-7 h-7">
            <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#C0C0C0" />
            <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#C0C0C0" />
          </svg>
          <span className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">Marcus Grima</span>
        </div>
        <button
          onClick={onNext}
          className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase hover:text-white/60 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-16">
        <motion.p
          key={`eyebrow-${slide.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[10px] font-bold tracking-[0.3em] mb-6 uppercase"
          style={{ color: slide.accent }}
        >
          {slide.eyebrow}
        </motion.p>

        <h1 className="text-[58px] font-black leading-[0.9] tracking-[-0.02em] text-white mb-6">
          {slide.headline.map((line, i) => (
            <Word key={`${slide.id}-${i}`} text={line} delay={0.15 + i * 0.1} colour="#FFFFFF" />
          ))}
        </h1>

        <motion.p
          key={`body-${slide.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-white/50 leading-relaxed font-medium mb-12 max-w-xs"
        >
          {slide.body}
        </motion.p>

        {/* Dot indicators */}
        <div className="flex items-center gap-2 mb-8">
          {SLIDES.map((s) => (
            <motion.div
              key={s.id}
              animate={{ width: s.id === slide.id ? 24 : 6, opacity: s.id === slide.id ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
              className="h-1.5 rounded-full"
              style={{ background: slide.dot }}
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onNext}
          className="flex items-center justify-between w-full px-6 py-4 text-white font-bold tracking-[0.15em] uppercase text-sm"
          style={{ background: slide.accent }}
        >
          <span>{isLast ? 'GET STARTED' : 'NEXT'}</span>
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Sign In screen ───────────────────────────────────────────────────────── */
function SignIn({ onAuth }: { onAuth: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const expected = USERS[username.toLowerCase().trim()];
      if (expected && expected === password) {
        localStorage.setItem('mg_auth', JSON.stringify({ user: username.toLowerCase().trim(), ts: Date.now() }));
        onAuth();
      } else {
        setError('Incorrect username or password.');
        setLoading(false);
      }
    }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 bg-[#0A0A0A] flex flex-col"
    >
      {/* Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{ background: '#8B45D9' }} />

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-10">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-14 h-14 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
            <svg viewBox="0 0 100 100" fill="none" className="w-8 h-8">
              <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#8B45D9" />
              <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#8B45D9" />
            </svg>
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mb-2">Welcome back</p>
          <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
            SIGN IN TO<br />YOUR APP
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoComplete="username"
              className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 outline-none focus:border-primary/60 transition-colors placeholder:text-white/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full bg-[#111111] border border-white/10 text-white text-sm font-medium px-4 py-3.5 pr-12 outline-none focus:border-primary/60 transition-colors placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs font-semibold"
              >
                <AlertCircle size={13} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1" />

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !username || !password}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-primary text-white font-bold tracking-[0.15em] uppercase text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : 'SIGN IN'}
          </motion.button>

          <p className="text-center text-[10px] text-white/20 font-semibold tracking-wide">
            Your login details are provided by Marcus
          </p>
        </form>
      </div>
    </motion.div>
  );
}

/* ── Main Onboarding component ────────────────────────────────────────────── */
type Step = { kind: 'slide'; idx: number } | { kind: 'signin' };

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'slide', idx: 0 });

  const next = () => {
    if (step.kind === 'slide') {
      if (step.idx < SLIDES.length - 1) {
        setStep({ kind: 'slide', idx: step.idx + 1 });
      } else {
        setStep({ kind: 'signin' });
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step.kind === 'slide' ? (
        <Slide
          key={`slide-${step.idx}`}
          slide={SLIDES[step.idx]}
          onNext={next}
          isLast={step.idx === SLIDES.length - 1}
        />
      ) : (
        <SignIn key="signin" onAuth={onComplete} />
      )}
    </AnimatePresence>
  );
}
