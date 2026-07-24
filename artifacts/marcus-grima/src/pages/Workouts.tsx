import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Check, Clock, Dumbbell, ChevronDown, ChevronUp, X, Info } from 'lucide-react';
import { PROGRAMS, type Program, type Workout, type Exercise } from '@/data/programs';

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
  'pull-ups':              'pull-ups.jpg', // fallback poster only
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

function ExercisePhoto({ id, name, className = '', muted = true, autoPlay = false }: { id: string; name: string; className?: string; muted?: boolean; autoPlay?: boolean }) {
  const videoFile = EXERCISE_VIDEOS[id];
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

function ProgramsView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/40 uppercase mb-1">Marcus Grima PT</p>
          <h1 className="text-2xl font-bold tracking-wider">MY PROGRAMS</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-4">
          {PROGRAMS.map(program => (
            <motion.button
              key={program.id}
              onClick={() => onSelect(program.id)}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left bg-[#111111] border border-white/6 rounded-sm overflow-hidden hover:border-primary/30 transition-colors group"
            >
              {/* Accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary to-[#A565F2]" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${DIFFICULTY_COLOUR[program.difficulty]}`}>
                      {program.difficulty}
                    </span>
                    <h2 className="text-lg font-bold tracking-wider mt-0.5">{program.name}</h2>
                    <p className="text-xs text-foreground/50 mt-1 leading-relaxed">{program.description}</p>
                  </div>
                  <ChevronRight size={18} className="text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Days/Week', value: `${program.daysPerWeek}` },
                    { label: 'Goal', value: program.goal.split(' & ')[0] },
                    { label: 'Workouts', value: `${program.workouts.length}` },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#0A0A0A] border border-white/5 p-3 rounded-sm">
                      <p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase mb-1">{stat.label}</p>
                      <p className="text-sm font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5 mt-4 flex-wrap">
                  {program.workouts.map(w => (
                    <span key={w.id} className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 bg-primary/10 text-primary/80 border border-primary/20 rounded-full">
                      {w.day}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          ))}
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
          <ChevronLeft size={16} />
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
              className="w-full text-left bg-[#111111] border border-white/6 rounded-sm overflow-hidden hover:border-primary/30 transition-colors group"
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
                      <Dumbbell size={11} />
                      {workout.exercises.length} exercises
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground/45">
                      <Clock size={11} />
                      ~{workout.estimatedMinutes} min
                    </span>
                  </div>
                </div>

                <ChevronRight size={18} className="text-primary/50 group-hover:text-primary transition-colors shrink-0" />
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
          <ChevronLeft size={16} />
          {program.name}
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-[9px] font-bold tracking-[0.22em] text-foreground/40 uppercase">{workout.day}</p>
          <h1 className="text-2xl font-bold tracking-wider mt-0.5">{workout.name.toUpperCase()}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50">
              <Dumbbell size={13} />
              {workout.exercises.length} exercises
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50">
              <Clock size={13} />
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
              className="bg-[#111111] border border-white/5 rounded-sm flex items-center gap-4 p-3 pr-4"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-sm overflow-hidden shrink-0 bg-[#0D0D0D] border border-white/5">
                <ExercisePhoto id={ex.id} name={ex.name} />
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
          className="w-full bg-primary hover:bg-primary/90 transition-colors py-4 flex items-center justify-center gap-3 text-white font-bold tracking-[0.15em] uppercase text-sm"
        >
          <Play size={16} fill="white" />
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
          <ChevronLeft size={22} />
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
            <ChevronRight size={22} />
          </button>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Exercise photo ── */}
      <div className="relative bg-[#0D0D0D] border-b border-white/5 overflow-hidden" style={{ height: 240 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <ExercisePhoto id={exercise.id} name={exercise.name} className="object-cover" />
            {/* dark gradient overlay so text above is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/10 to-transparent" />
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
          <Info size={16} />
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
                    <Check size={14} className="text-primary" />
                  </div>
                ) : (
                  <button
                    onClick={() => markSetDone(i)}
                    className="w-8 h-8 rounded-full border border-white/15 hover:border-primary/50 hover:bg-primary/10 transition-all flex items-center justify-center text-foreground/40 hover:text-primary"
                  >
                    <Check size={14} />
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
            <Clock size={15} className="text-foreground/40" />
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
          className={`w-full py-4 font-bold tracking-[0.15em] uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
            allDone
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-[#111] border border-white/8 text-foreground/50 hover:text-foreground hover:border-white/20'
          }`}
        >
          {exerciseIdx < total - 1 ? (
            <>Next Exercise <ChevronRight size={16} /></>
          ) : (
            <>Finish Workout <Check size={16} /></>
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
  const [view, setView] = useState<View>({ kind: 'programs' });

  const goPrograms = useCallback(() => setView({ kind: 'programs' }), []);

  return (
    <AnimatePresence mode="wait">
      {view.kind === 'programs' && (
        <motion.div key="programs"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.18 }}>
          <ProgramsView onSelect={id => setView({ kind: 'program', programId: id })} />
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
  );
};
