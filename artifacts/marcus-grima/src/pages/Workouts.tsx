import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, CaretRight, Play, Check, Clock, Barbell, X, Info, Lock, CheckCircle, CreditCard, CalendarBlank, Target } from '@phosphor-icons/react';
import { PROGRAMS, type Program, type Workout, type Exercise } from '@/data/programs';

/* ── Unlock helpers ───────────────────────────────────────────────────────── */
function getUnlocked(): string[] {
  try { return JSON.parse(localStorage.getItem('mg_unlocked') || '[]'); } catch { return []; }
}
function unlock(id: string) {
  const list = getUnlocked();
  if (!list.includes(id)) localStorage.setItem('mg_unlocked', JSON.stringify([...list, id]));
}
function isUnlocked(id: string) { return getUnlocked().includes(id); }

/* ── PaywallSheet ─────────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  {
    id: 'apple',
    label: 'Apple Pay',
    bg: '#000000',
    textColour: '#FFFFFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    id: 'revolut',
    label: 'Revolut Pay',
    bg: '#191C1F',
    textColour: '#FFFFFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M5 3h8.5C16 3 18 5 18 7.25c0 1.5-.75 2.75-2 3.5L18.5 21H15l-2.5-9.5H8.5V21H5V3zm3.5 6h4.75c.97 0 1.75-.78 1.75-1.75S14.22 5.5 13.25 5.5H8.5V9z"/>
      </svg>
    ),
  },
  {
    id: 'card',
    label: 'Pay by Card',
    bg: '#1A1A2E',
    textColour: '#FFFFFF',
    icon: <CreditCard size={18} weight="fill" />,
  },
];

function PaywallSheet({
  program,
  onClose,
  onUnlocked,
}: {
  program: Program;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [paying, setPaying]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePay = (methodId: string) => {
    setPaying(methodId);
    // Simulate payment processing
    setTimeout(() => {
      unlock(program.id);
      setSuccess(true);
      setTimeout(onUnlocked, 1200);
    }, 1400);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className="fixed bottom-0 inset-x-0 z-50 bg-[#0F0F0F] rounded-t-2xl overflow-hidden max-w-lg mx-auto"
      >
        {/* Gold accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400" />

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-10 pt-3">
          {success ? (
            /* Success state */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-8 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center"
              >
                <CheckCircle size={32} weight="fill" className="text-slate-200" />
              </motion.div>
              <h3 className="text-2xl font-black text-white">UNLOCKED!</h3>
              <p className="text-white/50 text-sm">{program.name} is ready to go.</p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-sm bg-white/5 border border-white/15 flex items-center justify-center">
                      <Barbell size={15} weight="fill" className="text-white/70" />
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.25em] text-slate-200 uppercase bg-slate-300/10 border border-slate-300/30 px-2 py-0.5">
                      PREMIUM
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">{program.name}</h2>
                  <p className="text-sm text-white/45 mt-1 leading-relaxed">{program.description}</p>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors ml-4 mt-1">
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Price */}
              <div className="bg-slate-300/8 border border-slate-300/20 rounded-sm p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-slate-300/70 uppercase">One-time unlock</p>
                  <p className="text-3xl font-black text-white mt-0.5">{program.price}</p>
                </div>
              </div>

              {/* What's included */}
              <div className="mb-6">
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-3">What's included</p>
                <div className="flex flex-col gap-2">
                  {program.highlights?.map((h, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-slate-300/20 border border-slate-300/40 flex items-center justify-center shrink-0">
                        <Check size={10} weight="bold" className="text-slate-200" />
                      </div>
                      <span className="text-sm text-white/70 font-medium">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment buttons */}
              <div className="flex flex-col gap-3">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handlePay(m.id)}
                    disabled={!!paying}
                    style={{ background: m.bg, color: m.textColour }}
                    className="w-full py-3.5 rounded-full flex items-center justify-center gap-3 font-bold text-sm tracking-wider disabled:opacity-50 transition-opacity"
                  >
                    {paying === m.id ? (
                      <motion.div
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <span className="opacity-90">{m.icon}</span>
                        {m.label}
                      </>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center text-[10px] text-white/20 font-semibold tracking-wide mt-4">
                Secure payment · Instant access · No subscription
              </p>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ── View state machine ──────────────────────────────────────────────────── */

type View =
  | { kind: 'programs' }
  | { kind: 'program'; programId: string }
  | { kind: 'overview'; programId: string; workoutId: string }
  | { kind: 'active'; programId: string; workoutId: string; exerciseIdx: number };

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function findProgram(id: string) {
  return PROGRAMS.find(p => p.id === id)!;
}
function findWorkout(program: Program, id: string) {
  return program.workouts.find(w => w.id === id)!;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function fmtTime(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

const DIFFICULTY_COLOUR: Record<string, string> = {
  Beginner: 'text-green-400',
  Intermediate: 'text-yellow-400',
  Advanced: 'text-red-400',
};

/* ── Exercise photo map ─────────────────────────────────────────────────── */

/* ── Exercise video map (overrides photo when present) ───────────────────── */

const EXERCISE_VIDEOS: Record<string, string> = {
  'pull-ups': 'pull-ups.mp4',
};

const EXERCISE_IMAGES: Record<string, string> = {
  'pull-ups':              'pull-ups.png',
  'seated-rows':           'seated-rows.jpg',
  'lat-pull-downs':        'lat-pull-downs.jpg',
  'narrow-grip-pull-down': 'narrow-grip-pull-down.jpg',
  'hyper-extension':       'hyper-extension.jpg',
  'seated-hammer-curl':    'seated-hammer-curl.webp',
  'concentration-curl':    'concentration-curl.jpg',
  'twentyone-curl':        'twentyone-curl.webp',
  'flat-bench-press':      'flat-bench-press.jpg',
  'incline-dumbbell-press':'incline-dumbbell-press.jpg',
  'cable-flies-mid':       'cable-flies-mid.jpg',
  'weighted-push-ups':     'weighted-push-ups.jpg',
  'tricep-rope-extensions':'tricep-rope-extensions.jpg',
  'skull-crushers':        'skull-crushers.png',
  'weighted-dips':         'weighted-dips.jpg',
  'seated-shoulder-press': 'seated-shoulder-press.jpg',
  'lateral-raises':        'lateral-raises.jpg',
  'forward-raises':        'forward-raises.jpg',
  'face-pulls':            'face-pulls.jpg',
  'rear-delt-fly':         'rear-delt-fly.jpg',
  'shrugs':                'shrugs.png',
};

function exerciseImg(id: string) {
  const file = EXERCISE_IMAGES[id];
  return file ? `${import.meta.env.BASE_URL}exercises/${file}` : null;
}

function ExercisePhoto({ id, name, className = '', muted = true, autoPlay = false, video = false }: { id: string; name: string; className?: string; muted?: boolean; autoPlay?: boolean; video?: boolean }) {
  const videoFile = video ? EXERCISE_VIDEOS[id] : undefined;
  if (videoFile) {
    return (
      <video
        src={`${import.meta.env.BASE_URL}exercises/${videoFile}`}
        autoPlay={autoPlay}
        loop
        muted={muted}
        playsInline
        poster={exerciseImg(id) ?? undefined}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }
  const src = exerciseImg(id);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  // Fallback: dark placeholder with initials
  return (
    <div className={`w-full h-full flex items-center justify-center bg-[#161616] ${className}`}>
      <span className="text-xs font-bold text-white/20 tracking-widest uppercase text-center px-2 leading-tight">
        {name.split(' ').map(w => w[0]).join('').slice(0, 3)}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW 1 — Programs list
══════════════════════════════════════════════════════════════════════════ */

function ProgramsView({ onSelect, onPaywall }: { onSelect: (id: string) => void; onPaywall: (id: string) => void }) {
  const [unlocked, setUnlocked] = useState<string[]>(getUnlocked());

  // Refresh after purchase
  useEffect(() => { setUnlocked(getUnlocked()); }, []);

  const free    = PROGRAMS.filter(p => !p.premium);
  const premium = PROGRAMS.filter(p => p.premium);

  const renderCard = (program: Program) => {
    const isPremium  = !!program.premium;
    const isOwned    = isUnlocked(program.id);
    const locked     = isPremium && !isOwned;

    const handleClick = () => locked ? onPaywall(program.id) : onSelect(program.id);

    return (
      <motion.button
        key={program.id}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className={`w-full text-left rounded-2xl overflow-hidden transition-colors group relative
          ${locked
            ? 'bg-[#0F0D08] border border-slate-400/25 hover:border-slate-400/50'
            : 'bg-[#111111] border border-white/6 hover:border-primary/30'}`}
      >
        {/* Photo header — clean visual, floating stat chips */}
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}programs/${program.id}.png`}
            alt={program.name}
            className="w-full h-full object-cover object-[center_20%] group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />

          {/* Premium / difficulty tag — top right of visual */}
          <div className="absolute top-3 right-3">
            {isPremium ? (
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded-md text-slate-200 bg-black/60 border border-slate-300/30 backdrop-blur-sm">
                {isOwned ? '✓ OWNED' : 'PREMIUM'}
              </span>
            ) : (
              <span className={`text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded-md bg-black/60 border border-white/15 backdrop-blur-sm ${DIFFICULTY_COLOUR[program.difficulty]}`}>
                {program.difficulty}
              </span>
            )}
          </div>

          {/* Floating stat chips */}
          <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 px-3 py-2.5 flex items-center justify-between gap-2">
            {[
              { icon: <CalendarBlank size={13} weight="fill" />, label: 'Days/Week', value: `${program.daysPerWeek}` },
              { icon: <Target size={13} weight="fill" />,       label: 'Goal',      value: program.goal.split(' & ')[0] },
              { icon: <Barbell size={13} weight="fill" />,     label: 'Workouts',  value: `${program.workouts.length}` },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 min-w-0">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                  ${locked ? 'bg-slate-300/15 text-slate-200' : 'bg-primary/15 text-primary'}`}>
                  {stat.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold tracking-widest text-white/50 uppercase leading-none">{stat.label}</p>
                  <p className="text-xs font-black text-white leading-none mt-1 truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title + description under the image */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-wider">{program.name}</h2>
              <p className="text-xs text-foreground/50 mt-1.5 leading-relaxed">{program.description}</p>
            </div>

            {locked ? (
              <Lock size={18} weight="fill" className="text-slate-300/60 shrink-0 mt-1" />
            ) : (
              <CaretRight size={18} weight="bold" className="text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-1" />
            )}
          </div>

          {/* Lock CTA overlay strip */}
          {locked && (
            <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-full border border-slate-300/30 bg-slate-300/5">
              <span className="text-[11px] font-bold tracking-[0.2em] text-slate-200 uppercase">Unlock for {program.price}</span>
            </div>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/40 uppercase mb-1">Marcus Grima PT</p>
          <h1 className="text-2xl font-bold tracking-wider">MY PROGRAMS</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        {/* Free programs */}
        <div className="flex flex-col gap-4 mb-8">
          {free.map(renderCard)}
        </div>

        {/* Premium section */}
        <div className="mb-3 flex items-center gap-3">
          <p className="text-[10px] font-bold tracking-[0.22em] text-slate-300 uppercase">Premium Add-Ons</p>
          <div className="flex-1 h-px bg-slate-300/20" />
        </div>
        <div className="flex flex-col gap-4">
          {premium.map(renderCard)}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW 2 — Program detail (workout day cards)
══════════════════════════════════════════════════════════════════════════ */

function ProgramView({
  programId,
  onBack,
  onSelectWorkout,
}: {
  programId: string;
  onBack: () => void;
  onSelectWorkout: (workoutId: string) => void;
}) {
  const program = findProgram(programId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <CaretLeft size={16} weight="bold" />
          Programs
        </button>

        <div className="mb-8">
          <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${DIFFICULTY_COLOUR[program.difficulty]}`}>
            {program.difficulty} · {program.goal}
          </span>
          <h1 className="text-2xl font-bold tracking-wider mt-1">{program.name}</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-4">
          {program.workouts.map((workout, i) => (
            <motion.button
              key={workout.id}
              onClick={() => onSelectWorkout(workout.id)}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left bg-[#111111] border border-white/6 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors group"
            >
              <div className="p-5 flex items-center gap-5">
                {/* Day badge */}
                <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[8px] font-bold tracking-widest text-primary/60 uppercase">Day</span>
                  <span className="text-lg font-bold text-primary leading-none">{i + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-0.5">{workout.day}</p>
                  <h3 className="text-base font-bold tracking-wider">{workout.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground/45">
                      <Barbell size={11} weight="fill" />
                      {workout.exercises.length} exercises
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground/45">
                      <Clock size={11} weight="fill" />
                      ~{workout.estimatedMinutes} min
                    </span>
                  </div>
                </div>

                <CaretRight size={18} weight="bold" className="text-primary/50 group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW 3 — Workout overview (exercise list before starting)
══════════════════════════════════════════════════════════════════════════ */

function WorkoutOverview({
  programId,
  workoutId,
  onBack,
  onStart,
}: {
  programId: string;
  workoutId: string;
  onBack: () => void;
  onStart: () => void;
}) {
  const program = findProgram(programId);
  const workout = findWorkout(program, workoutId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground flex flex-col pb-32 md:pb-12">
      <div className="px-5 md:px-8 pt-6 flex-1">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <CaretLeft size={16} weight="bold" />
          {program.name}
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-[9px] font-bold tracking-[0.22em] text-foreground/40 uppercase">{workout.day}</p>
          <h1 className="text-2xl font-bold tracking-wider mt-0.5">{workout.name.toUpperCase()}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50">
              <Barbell size={13} weight="fill" />
              {workout.exercises.length} exercises
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50">
              <Clock size={13} weight="fill" />
              ~{workout.estimatedMinutes} min
            </span>
          </div>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        {/* Exercise list */}
        <div className="space-y-2">
          {workout.exercises.map((ex, idx) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-[#111111] border border-white/5 rounded-2xl flex items-center gap-4 p-3 pr-4"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-sm overflow-hidden shrink-0 bg-[#0D0D0D] border border-white/5">
                <ExercisePhoto id={ex.id} name={ex.name} autoPlay muted />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase mb-0.5">
                  {idx + 1} of {workout.exercises.length}
                </p>
                <p className="text-sm font-bold leading-tight">{ex.name}</p>
                <p className="text-[10px] font-semibold text-foreground/45 mt-1">
                  {ex.sets} sets × {ex.reps} · {ex.primaryMuscle}
                </p>
              </div>

              {/* Sets badge */}
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary leading-none">{ex.sets}</p>
                <p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase">sets</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sticky Start button */}
      <div className="sticky bottom-0 px-5 md:px-8 py-5 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent pt-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="w-full bg-primary hover:bg-primary/90 transition-colors py-4 rounded-full flex items-center justify-center gap-3 text-white font-bold tracking-[0.15em] uppercase text-sm"
        >
          <Play size={16} weight="fill" className="text-white" />
          Start Workout
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEW 4 — Active workout (exercise by exercise)
══════════════════════════════════════════════════════════════════════════ */

interface SetState {
  reps: string;
  weight: string;
  done: boolean;
}

function ActiveWorkout({
  programId,
  workoutId,
  exerciseIdx,
  onNavigate,
  onClose,
}: {
  programId: string;
  workoutId: string;
  exerciseIdx: number;
  onNavigate: (idx: number) => void;
  onClose: () => void;
}) {
  const program = findProgram(programId);
  const workout = findWorkout(program, workoutId);
  const exercise = workout.exercises[exerciseIdx];
  const total = workout.exercises.length;

  // Per-set tracking (re-init when exercise changes)
  const [sets, setSets] = useState<SetState[]>(() =>
    Array.from({ length: exercise.sets }, () => ({ reps: '', weight: '', done: false }))
  );
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(exercise.restSeconds);
  const [showCues, setShowCues] = useState(false);

  // Reset state when exercise changes
  useEffect(() => {
    setSets(Array.from({ length: exercise.sets }, () => ({ reps: '', weight: '', done: false })));
    setRestActive(false);
    setRestRemaining(exercise.restSeconds);
    setShowCues(false);
  }, [exerciseIdx, exercise]);

  // Rest timer countdown
  useEffect(() => {
    if (!restActive) return;
    if (restRemaining <= 0) { setRestActive(false); return; }
    const t = setTimeout(() => setRestRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [restActive, restRemaining]);

  const allDone = sets.every(s => s.done);

  const markSetDone = (idx: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, done: true } : s));
    setRestActive(true);
    setRestRemaining(exercise.restSeconds);
  };

  const updateSet = (idx: number, field: 'reps' | 'weight', value: string) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <button onClick={() => exerciseIdx > 0 ? onNavigate(exerciseIdx - 1) : onClose()}
          className="text-foreground/50 hover:text-foreground transition-colors">
          <CaretLeft size={22} weight="bold" />
        </button>

        <div className="text-center">
          <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase">{workout.name}</p>
          <p className="text-sm font-bold tracking-wider">
            {exerciseIdx + 1} <span className="text-foreground/35">of</span> {total}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exerciseIdx < total - 1 ? onNavigate(exerciseIdx + 1) : onClose()}
            className="text-foreground/50 hover:text-foreground transition-colors">
            <CaretRight size={22} weight="bold" />
          </button>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Exercise photo / video ── */}
      <div className="relative bg-[#0D0D0D] border-b border-white/5">
        <AnimatePresence mode="wait">
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <ExercisePhoto id={exercise.id} name={exercise.name} className="w-full h-auto block" autoPlay muted video />
            {/* dark gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: `${(exerciseIdx / total) * 100}%` }}
            animate={{ width: `${((exerciseIdx + 1) / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* ── Exercise name + info ── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold tracking-[0.2em] text-primary/70 uppercase">{exercise.primaryMuscle}</p>
          <h2 className="text-xl font-bold tracking-wider leading-tight">{exercise.name}</h2>
          <p className="text-xs text-foreground/40 mt-1">{exercise.equipment}</p>
        </div>
        <button
          onClick={() => setShowCues(v => !v)}
          className={`mt-1 p-2 rounded-full border transition-colors ${showCues ? 'border-primary/50 text-primary' : 'border-white/10 text-foreground/40 hover:text-foreground/60'}`}
        >
          <Info size={16} weight="fill" />
        </button>
      </div>

      {/* ── Coaching cues (collapsible) ── */}
      <AnimatePresence>
        {showCues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-5 mb-3 bg-[#111] border border-primary/15 rounded-sm p-4">
              <p className="text-[9px] font-bold tracking-[0.2em] text-primary/60 uppercase mb-3">Coaching Cues</p>
              <ul className="space-y-2">
                {exercise.cues.map((cue, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-foreground/65 leading-relaxed">
                    <span className="text-primary/60 font-bold shrink-0">{i + 1}.</span>
                    {cue}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sets table ── */}
      <div className="px-5 flex-1">
        <p className="text-[10px] font-bold tracking-[0.18em] text-foreground/40 uppercase mb-3">Sets</p>

        {/* Column headers */}
        <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 mb-2 px-1">
          <span className="text-[9px] font-bold tracking-widest text-foreground/30 uppercase text-center">#</span>
          <span className="text-[9px] font-bold tracking-widest text-foreground/30 uppercase text-center">Reps</span>
          <span className="text-[9px] font-bold tracking-widest text-foreground/30 uppercase text-center">Weight (kg)</span>
          <span />
        </div>

        <div className="space-y-2">
          {sets.map((s, i) => (
            <motion.div
              key={i}
              layout
              className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center p-2.5 rounded-sm border transition-all ${
                s.done
                  ? 'bg-primary/8 border-primary/20'
                  : 'bg-[#111111] border-white/5'
              }`}
            >
              {/* Set number */}
              <span className={`text-sm font-bold text-center ${s.done ? 'text-primary' : 'text-foreground/40'}`}>
                {i + 1}
              </span>

              {/* Reps input */}
              <div className="flex justify-center">
                <input
                  type="number"
                  placeholder={exercise.reps === 'AMRAP' ? 'Max' : exercise.reps.split('–')[0]}
                  value={s.reps}
                  onChange={e => updateSet(i, 'reps', e.target.value)}
                  disabled={s.done}
                  className={`w-14 text-center text-sm font-bold rounded-sm border py-2 bg-transparent outline-none focus:border-primary/50 transition-colors ${
                    s.done ? 'border-white/5 text-foreground/40' : 'border-white/15 text-foreground'
                  }`}
                />
              </div>

              {/* Weight input */}
              <div className="flex justify-center">
                <input
                  type="number"
                  placeholder="—"
                  value={s.weight}
                  onChange={e => updateSet(i, 'weight', e.target.value)}
                  disabled={s.done}
                  className={`w-14 text-center text-sm font-bold rounded-sm border py-2 bg-transparent outline-none focus:border-primary/50 transition-colors ${
                    s.done ? 'border-white/5 text-foreground/40' : 'border-white/15 text-foreground'
                  }`}
                />
              </div>

              {/* Complete button */}
              <div className="flex justify-center">
                {s.done ? (
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Check size={14} weight="bold" className="text-primary" />
                  </div>
                ) : (
                  <button
                    onClick={() => markSetDone(i)}
                    className="w-8 h-8 rounded-full border border-white/15 hover:border-primary/50 hover:bg-primary/10 transition-all flex items-center justify-center text-foreground/40 hover:text-primary"
                  >
                    <Check size={14} weight="bold" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Rest timer + Next ── */}
      <div className="px-5 py-5 border-t border-white/6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock size={15} weight="fill" className="text-foreground/40" />
            <span className="text-[10px] font-bold tracking-widest text-foreground/40 uppercase">Rest</span>
            <span className={`text-lg font-bold tabular-nums ${restActive ? 'text-primary' : 'text-foreground/50'}`}>
              {fmtTime(restRemaining)}
            </span>
          </div>
          <button
            onClick={() => { setRestActive(false); setRestRemaining(exercise.restSeconds); }}
            className="text-[9px] font-bold tracking-widest text-foreground/30 uppercase hover:text-foreground/50 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Next exercise button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (exerciseIdx < total - 1) onNavigate(exerciseIdx + 1);
            else onClose();
          }}
          className={`w-full py-4 rounded-full font-bold tracking-[0.15em] uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
            allDone
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-[#111] border border-white/8 text-foreground/50 hover:text-foreground hover:border-white/20'
          }`}
        >
          {exerciseIdx < total - 1 ? (
            <>Next Exercise <CaretRight size={16} weight="bold" /></>
          ) : (
            <>Finish Workout <Check size={16} weight="bold" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Root Workouts component
══════════════════════════════════════════════════════════════════════════ */

export const Workouts = () => {
  const [view, setView]         = useState<View>({ kind: 'programs' });
  const [paywallId, setPaywall] = useState<string | null>(null);

  const goPrograms   = useCallback(() => setView({ kind: 'programs' }), []);
  const paywallProg  = paywallId ? PROGRAMS.find(p => p.id === paywallId) ?? null : null;

  return (
    <>
    <AnimatePresence mode="wait">
      {view.kind === 'programs' && (
        <motion.div key="programs"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.18 }}>
          <ProgramsView
            onSelect={id => setView({ kind: 'program', programId: id })}
            onPaywall={id => setPaywall(id)}
          />
        </motion.div>
      )}

      {view.kind === 'program' && (
        <motion.div key="program"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}>
          <ProgramView
            programId={view.programId}
            onBack={goPrograms}
            onSelectWorkout={wId => setView({ kind: 'overview', programId: view.programId, workoutId: wId })}
          />
        </motion.div>
      )}

      {view.kind === 'overview' && (
        <motion.div key="overview"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}>
          <WorkoutOverview
            programId={view.programId}
            workoutId={view.workoutId}
            onBack={() => setView({ kind: 'program', programId: view.programId })}
            onStart={() => setView({ kind: 'active', programId: view.programId, workoutId: view.workoutId, exerciseIdx: 0 })}
          />
        </motion.div>
      )}

      {view.kind === 'active' && (
        <motion.div key={`active-${view.exerciseIdx}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}>
          <ActiveWorkout
            programId={view.programId}
            workoutId={view.workoutId}
            exerciseIdx={view.exerciseIdx}
            onNavigate={idx => setView({ ...view, kind: 'active', exerciseIdx: idx })}
            onClose={() => setView({ kind: 'overview', programId: view.programId, workoutId: view.workoutId })}
          />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Paywall sheet */}
    <AnimatePresence>
      {paywallProg && (
        <PaywallSheet
          program={paywallProg}
          onClose={() => setPaywall(null)}
          onUnlocked={() => {
            setPaywall(null);
            setView({ kind: 'program', programId: paywallProg.id });
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
};
