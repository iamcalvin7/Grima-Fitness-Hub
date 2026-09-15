import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, CaretRight, Clock, Barbell, CalendarBlank, Target, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { useGetProgrammes, useGetProgramme, type ProgrammeTemplate, type ProgrammeRevision, type ProgrammeDay } from '@/hooks/use-programmes';
import { useGetClientExercises } from '@/hooks/use-exercises';

const DIFFICULTY_COLOUR: Record<string, string> = {
  Beginner: 'text-green-400',
  Intermediate: 'text-yellow-400',
  Advanced: 'text-red-400',
};

type View =
  | { kind: 'programs' }
  | { kind: 'program'; programId: string }
  | { kind: 'overview'; programId: string; dayNumber: number };

/* ══════════════════════════════════════════════════════════════════════════
   VIEW 1 — Programs list
══════════════════════════════════════════════════════════════════════════ */

function ProgramsView({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: programmes, isLoading, error } = useGetProgrammes();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <SpinnerGap size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-2 text-red-400">
          <WarningCircle size={32} weight="duotone" />
          <p className="text-sm">Failed to load programmes.</p>
        </div>
      </div>
    );
  }

  const renderCard = (program: ProgrammeTemplate) => {
    const rev = program.revision;
    if (!rev) return null;
    const workoutCount = rev.days.reduce((acc, day) => acc + (day.exercises.length > 0 ? 1 : 0), 0);

    return (
      <motion.button
        key={program.id}
        onClick={() => onSelect(program.id)}
        data-testid={`card-programme-${program.id}`}
        whileTap={{ scale: 0.98 }}
        className="w-full text-left rounded-2xl overflow-hidden transition-colors group relative bg-[#111111] border border-white/6 hover:border-primary/30"
      >
        <div className="relative h-44 w-full overflow-hidden bg-[#1A1A1A]">
          {/* We don't have images for DB-backed programmes, so fallback to a nice gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]" />

          <div className="absolute top-3 right-3">
            <span className={`text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded-md bg-black/60 border border-white/15 backdrop-blur-sm ${DIFFICULTY_COLOUR[rev.difficulty] || 'text-white'}`}>
              {rev.difficulty || 'All Levels'}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 px-3 py-2.5 flex items-center justify-between gap-2">
            {[
              { icon: <CalendarBlank size={13} weight="fill" />, label: 'Days', value: `${rev.days.length}` },
              { icon: <Target size={13} weight="fill" />,       label: 'Goal', value: (rev.goal || 'General').split(' & ')[0] },
              { icon: <Barbell size={13} weight="fill" />,     label: 'Workouts',  value: `${workoutCount}` },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/15 text-primary">
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

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-wider">{rev.name}</h2>
              <p className="text-xs text-white/50 mt-1.5 leading-relaxed line-clamp-2">{rev.description}</p>
            </div>
            <CaretRight size={18} weight="bold" className="text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase mb-1">Marcus Grima PT</p>
          <h1 className="text-2xl font-bold tracking-wider">PROGRAMMES</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {programmes?.map(renderCard)}
          {programmes?.length === 0 && (
            <p className="text-white/40 text-sm">No programmes available yet.</p>
          )}
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
  onSelectDay,
}: {
  programId: string;
  onBack: () => void;
  onSelectDay: (dayNumber: number) => void;
}) {
  const { data: program, isLoading, error } = useGetProgramme(programId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <SpinnerGap size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const rev = program?.revision;
  if (!program || !rev || error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <p className="text-white/40 text-sm">Programme not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <button onClick={onBack} data-testid="button-back-programmes" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <CaretLeft size={16} weight="bold" />
          Programmes
        </button>

        <div className="mb-8">
          <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${DIFFICULTY_COLOUR[rev.difficulty] || 'text-white'}`}>
            {rev.difficulty || 'All Levels'} · {rev.goal || 'General'}
          </span>
          <h1 className="text-2xl font-bold tracking-wider mt-1">{rev.name}</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-4">
          {rev.days.map((day) => (
            <motion.button
              key={day.dayNumber}
              onClick={() => onSelectDay(day.dayNumber)}
              data-testid={`card-day-${day.dayNumber}`}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left bg-[#111111] border border-white/6 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors group"
            >
              <div className="p-5 flex items-center gap-5">
                <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[8px] font-bold tracking-widest text-primary/60 uppercase">Day</span>
                  <span className="text-lg font-bold text-primary leading-none">{day.dayNumber}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold tracking-wider">{day.name || `Day ${day.dayNumber}`}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-white/45">
                      <Barbell size={11} weight="fill" />
                      {day.exercises.length} exercises
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-white/45">
                      <Clock size={11} weight="fill" />
                      {day.estimatedMinutes != null ? `~${day.estimatedMinutes} min` : 'Duration varies'}
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
  dayNumber,
  onBack,
}: {
  programId: string;
  dayNumber: number;
  onBack: () => void;
}) {
  const { data: program } = useGetProgramme(programId);
  const { data: exercises } = useGetClientExercises();
  const rev = program?.revision;
  const day = rev?.days.find(d => d.dayNumber === dayNumber);

  if (!program || !rev || !day) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col pb-32 md:pb-12">
      <div className="px-5 md:px-8 pt-6 flex-1">
        <button onClick={onBack} data-testid="button-back-programme" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <CaretLeft size={16} weight="bold" />
          {rev.name}
        </button>

        <div className="mb-6">
          <p className="text-[9px] font-bold tracking-[0.22em] text-white/40 uppercase">Day {day.dayNumber}</p>
          <h1 className="text-2xl font-bold tracking-wider mt-0.5">{(day.name || `Day ${day.dayNumber}`).toUpperCase()}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
              <Barbell size={13} weight="fill" />
              {day.exercises.length} exercises
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
              <Clock size={13} weight="fill" />
              {day.estimatedMinutes != null ? `~${day.estimatedMinutes} min` : 'Duration varies'}
            </span>
          </div>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="space-y-2">
          {day.exercises.map((ex, idx) => {
            const exerciseDef = exercises?.find(e => e.id === ex.exerciseId);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-[#111111] border border-white/5 rounded-2xl flex items-center gap-4 p-3 pr-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold tracking-widest text-white/35 uppercase mb-0.5">
                    {idx + 1} of {day.exercises.length}
                  </p>
                  <p className="text-sm font-bold leading-tight">{exerciseDef?.name || "Unknown Exercise"}</p>
                  <p className="text-[10px] font-semibold text-white/45 mt-1">
                    {ex.sets} sets × {ex.reps} {exerciseDef?.primaryMuscle ? `· ${exerciseDef.primaryMuscle}` : ''}
                  </p>
                  {ex.notes && (
                    <p className="text-[10px] text-white/30 italic mt-1">{ex.notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary leading-none">{ex.sets}</p>
                  <p className="text-[9px] font-bold tracking-widest text-white/35 uppercase">sets</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Workouts() {
  const [view, setView] = useState<View>({ kind: 'programs' });

  return (
    <>
      <AnimatePresence mode="wait">
        {view.kind === 'programs' && (
          <motion.div key="programs" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <ProgramsView onSelect={(id) => setView({ kind: 'program', programId: id })} />
          </motion.div>
        )}

        {view.kind === 'program' && (
          <motion.div key="program" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
            <ProgramView
              programId={view.programId}
              onBack={() => setView({ kind: 'programs' })}
              onSelectDay={(dayNum) => setView({ kind: 'overview', programId: view.programId, dayNumber: dayNum })}
            />
          </motion.div>
        )}

        {view.kind === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
            <WorkoutOverview
              programId={view.programId}
              dayNumber={view.dayNumber}
              onBack={() => setView({ kind: 'program', programId: view.programId })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
