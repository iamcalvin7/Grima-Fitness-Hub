import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ────────────────────────────────────────────────────────────────── */

export type BodyView = 'front' | 'back';

export type MuscleId =
  | 'chest'
  | 'front_deltoids'
  | 'rear_deltoids'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'trapezius'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'quadriceps'
  | 'adductors'
  | 'hamstrings'
  | 'tibialis'
  | 'calves';

export interface BodyMapProps {
  /** Muscle names from workout data that are auto-highlighted (display mode). */
  musclesWorked?: string[];
  /** Allow tapping muscles to toggle selection interactively. */
  interactive?: boolean;
  /** Controlled selected muscles (interactive mode). */
  selectedMuscles?: MuscleId[];
  /** Called when a muscle is toggled (interactive mode). */
  onMuscleToggle?: (id: MuscleId) => void;
  /** Called when the view changes. */
  onViewChange?: (view: BodyView) => void;
}

/* ── Muscle configuration ─────────────────────────────────────────────────── */

interface MuscleConfig {
  label: string;
}

const MUSCLE_CONFIG: Record<MuscleId, MuscleConfig> = {
  chest:         { label: 'Chest' },
  front_deltoids:{ label: 'Shoulders' },
  rear_deltoids: { label: 'Rear Delts' },
  biceps:        { label: 'Biceps' },
  triceps:       { label: 'Triceps' },
  forearms:      { label: 'Forearms' },
  abs:           { label: 'Abs' },
  obliques:      { label: 'Obliques' },
  trapezius:     { label: 'Traps' },
  upper_back:    { label: 'Upper Back' },
  lats:          { label: 'Lats' },
  lower_back:    { label: 'Lower Back' },
  glutes:        { label: 'Glutes' },
  quadriceps:    { label: 'Quads' },
  adductors:     { label: 'Adductors' },
  hamstrings:    { label: 'Hamstrings' },
  tibialis:      { label: 'Tibialis' },
  calves:        { label: 'Calves' },
};

/* ── Workout term → MuscleId mapping ─────────────────────────────────────── */

const WORKOUT_MAP: Record<string, MuscleId[]> = {
  'CHEST':       ['chest'],
  'PECS':        ['chest'],
  'SHOULDERS':   ['front_deltoids', 'rear_deltoids'],
  'DELTS':       ['front_deltoids', 'rear_deltoids'],
  'FRONT DELTS': ['front_deltoids'],
  'REAR DELTS':  ['rear_deltoids'],
  'BICEPS':      ['biceps'],
  'TRICEPS':     ['triceps'],
  'FOREARMS':    ['forearms'],
  'BACK':        ['upper_back', 'lats', 'trapezius'],
  'TRAPS':       ['trapezius'],
  'LATS':        ['lats'],
  'UPPER BACK':  ['upper_back', 'trapezius'],
  'LOWER BACK':  ['lower_back'],
  'ABS':         ['abs'],
  'CORE':        ['abs', 'obliques', 'lower_back'],
  'OBLIQUES':    ['obliques'],
  'LEGS':        ['quadriceps', 'hamstrings', 'calves', 'glutes'],
  'QUADS':       ['quadriceps'],
  'QUADRICEPS':  ['quadriceps'],
  'HAMSTRINGS':  ['hamstrings'],
  'GLUTES':      ['glutes'],
  'CALVES':      ['calves'],
  'TIBIALIS':    ['tibialis'],
  'ADDUCTORS':   ['adductors'],
};

/* ── SVG Anatomy System ─────────────────────────────────────────────────── */

function buildSymmetricSilhouette(): string {
  const rightSide = [
    ['M', 120, 16],
    ['C', 130, 16, 140, 22, 140, 34],
    ['C', 140, 46, 136, 54, 132, 62],
    ['C', 140, 63, 156, 66, 172, 76],
    ['C', 188, 88, 196, 110, 196, 132],
    ['C', 196, 152, 192, 172, 198, 190],
    ['C', 206, 220, 210, 248, 202, 274],
    ['C', 200, 288, 194, 310, 188, 310],
    ['C', 182, 310, 180, 290, 184, 274],
    ['C', 178, 252, 178, 222, 182, 190],
    ['C', 186, 170, 180, 150, 170, 134],
    ['C', 166, 128, 162, 126, 158, 126],
    ['C', 164, 156, 158, 188, 160, 222],
    ['C', 162, 240, 168, 256, 168, 274],
    ['C', 168, 314, 162, 354, 154, 390],
    ['C', 146, 430, 150, 464, 140, 490],
    ['C', 142, 508, 138, 516, 128, 516],
    ['C', 118, 516, 120, 506, 122, 490],
    ['C', 116, 464, 124, 430, 118, 390],
    ['C', 112, 354, 116, 314, 120, 274],
  ];

  let d = '';
  for (const cmd of rightSide) {
    if (cmd[0] === 'M') d += `M ${cmd[1]} ${cmd[2]} `;
    else if (cmd[0] === 'C') d += `C ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]} ${cmd[5]} ${cmd[6]} `;
  }

  const rev = [...rightSide].reverse();
  for (let i = 0; i < rev.length - 1; i++) {
    const curr = rev[i];
    const next = rev[i + 1];
    if (curr[0] === 'C') {
      const endX = next[0] === 'M' ? (next[1] as number) : (next[next.length - 2] as number);
      const endY = next[0] === 'M' ? (next[2] as number) : (next[next.length - 1] as number);
      d += `C ${240 - (curr[3] as number)} ${curr[4]} ${240 - (curr[1] as number)} ${curr[2]} ${240 - endX} ${endY} `;
    }
  }
  return d + 'Z';
}

const BASE_SILHOUETTE = buildSymmetricSilhouette();

function mirrorPath(d: string): string {
  return d
    .split(/(?=[MCLZ])/)
    .filter(cmd => cmd.trim().length > 0)
    .map(cmd => {
      const type = cmd[0];
      if (type === 'Z') return 'Z';
      const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
      if (type === 'M' || type === 'L') {
        return `${type} ${240 - nums[0]} ${nums[1]}`;
      } else if (type === 'C') {
        return `C ${240 - nums[0]} ${nums[1]} ${240 - nums[2]} ${nums[3]} ${240 - nums[4]} ${nums[5]}`;
      }
      return cmd;
    })
    .join(' ');
}

interface MusclePath {
  id: MuscleId;
  side: 'left' | 'right' | 'center';
  d: string;
}

const FRONT_MUSCLES_RIGHT: { id: MuscleId; d: string }[] = [
  { id: 'chest', d: 'M 120 84 C 136 82 144 76 150 70 C 158 88 160 110 158 126 C 146 134 132 136 120 134 Z' },
  { id: 'front_deltoids', d: 'M 150 70 C 160 72 172 76 188 88 C 196 110 194 122 188 134 C 178 134 168 132 158 126 C 160 110 158 88 150 70 Z' },
  { id: 'biceps', d: 'M 158 126 C 168 132 178 134 188 134 C 192 144 190 168 186 186 C 182 188 176 188 172 186 C 164 160 160 140 158 126 Z' },
  { id: 'triceps', d: 'M 188 134 C 194 150 192 172 198 190 C 194 190 188 188 186 186 C 190 168 192 144 188 134 Z' },
  { id: 'forearms', d: 'M 198 190 C 206 220 210 248 202 274 L 184 274 C 180 252 180 222 182 190 Z' },
  { id: 'abs', d: 'M 120 134 C 134 136 144 150 144 180 C 144 210 136 230 120 240 Z' },
  { id: 'obliques', d: 'M 158 126 C 164 156 158 188 160 222 C 162 240 168 256 168 274 C 148 260 136 244 120 240 C 136 230 144 210 144 180 C 144 150 134 136 120 134 C 132 136 146 134 158 126 Z' },
  { id: 'quadriceps', d: 'M 120 274 C 138 270 154 270 168 274 C 168 314 162 354 154 390 C 146 384 134 384 118 390 C 124 350 128 310 120 274 Z' },
  { id: 'adductors', d: 'M 120 274 C 128 310 124 350 118 390 C 114 350 110 314 120 274 Z' },
  { id: 'tibialis', d: 'M 126 396 C 138 420 142 460 132 490 L 124 490 C 130 460 128 420 126 396 Z' },
  { id: 'calves', d: 'M 118 390 C 124 430 116 464 122 490 C 128 460 126 420 126 396 Z' }, // inner
  { id: 'calves', d: 'M 154 390 C 146 430 150 464 140 490 C 144 460 140 420 148 396 Z' }, // outer
];

const BACK_MUSCLES_RIGHT: { id: MuscleId; d: string }[] = [
  { id: 'trapezius', d: 'M 120 62 C 140 63 156 66 172 76 C 154 86 138 106 120 116 Z' },
  { id: 'rear_deltoids', d: 'M 172 76 C 188 88 196 110 192 134 C 180 120 168 100 158 86 C 164 80 168 78 172 76 Z' },
  { id: 'upper_back', d: 'M 120 116 C 138 106 154 86 158 86 C 168 100 180 120 186 130 C 164 136 142 140 120 146 Z' },
  { id: 'lats', d: 'M 120 146 C 142 140 164 136 186 130 C 170 156 160 188 160 222 C 152 226 138 236 120 246 Z' },
  { id: 'lower_back', d: 'M 120 246 C 138 236 152 226 160 222 C 162 240 168 256 168 274 C 152 260 138 264 120 270 Z' },
  { id: 'glutes', d: 'M 120 270 C 138 264 152 260 168 274 C 168 294 164 304 162 320 C 146 324 132 320 120 310 Z' },
  { id: 'hamstrings', d: 'M 120 310 C 132 320 146 324 162 320 C 160 350 156 370 154 390 C 142 386 130 386 122 390 C 124 350 126 330 120 310 Z' },
  { id: 'calves', d: 'M 154 390 C 142 386 130 386 118 390 C 124 430 116 464 122 490 L 140 490 C 150 464 146 430 154 390 Z' },
  { id: 'triceps', d: 'M 192 134 C 196 152 192 172 198 190 C 190 192 184 192 182 190 C 178 170 180 150 186 130 C 188 132 190 134 192 134 Z' },
  { id: 'forearms', d: 'M 198 190 C 206 220 210 248 202 274 L 184 274 C 180 252 180 222 182 190 Z' },
];

const FRONT_MUSCLE_PATHS: MusclePath[] = [];
FRONT_MUSCLES_RIGHT.forEach(m => {
  FRONT_MUSCLE_PATHS.push({ id: m.id, side: 'right', d: m.d });
  FRONT_MUSCLE_PATHS.push({ id: m.id, side: 'left', d: mirrorPath(m.d) });
});

const BACK_MUSCLE_PATHS: MusclePath[] = [];
BACK_MUSCLES_RIGHT.forEach(m => {
  BACK_MUSCLE_PATHS.push({ id: m.id, side: 'right', d: m.d });
  BACK_MUSCLE_PATHS.push({ id: m.id, side: 'left', d: mirrorPath(m.d) });
});

const FRONT_DETAIL_LINES_RIGHT = [
  'M 120 160 C 128 160 134 158 138 154', // abs horiz
  'M 120 188 C 128 188 134 186 138 182', // abs horiz
  'M 120 216 C 128 216 134 214 136 210', // abs horiz
  'M 120 84 C 130 84 140 84 146 80',     // pec lower
];
const BACK_DETAIL_LINES_RIGHT = [
  'M 120 62 L 120 270' // spine
];

const FRONT_DETAILS = Array.from(new Set([
  ...FRONT_DETAIL_LINES_RIGHT,
  ...FRONT_DETAIL_LINES_RIGHT.map(mirrorPath)
]));
const BACK_DETAILS = Array.from(new Set([
  ...BACK_DETAIL_LINES_RIGHT,
  ...BACK_DETAIL_LINES_RIGHT.map(mirrorPath)
]));

/* ── Chips ────────────────────────────────────────────────────────────────── */

const FRONT_MUSCLE_ORDER: MuscleId[] = [
  'chest', 'front_deltoids', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quadriceps', 'adductors', 'tibialis', 'calves',
];
const BACK_MUSCLE_ORDER: MuscleId[] = [
  'trapezius', 'rear_deltoids', 'upper_back', 'lats', 'triceps', 'forearms',
  'lower_back', 'glutes', 'hamstrings', 'calves',
];

/* ── Component ───────────────────────────────────────────────────────────── */

export const BodyMap = ({
  musclesWorked = [],
  interactive = false,
  selectedMuscles: controlledSelected,
  onMuscleToggle,
  onViewChange,
}: BodyMapProps) => {
  const [view, setView] = useState<BodyView>('front');
  const [internalSelected, setInternalSelected] = useState<Set<MuscleId>>(new Set());
  const [hoveredMuscleId, setHoveredMuscleId] = useState<MuscleId | null>(null);

  // Resolve musclesWorked prop → MuscleIds
  const propActiveIds = useMemo<Set<MuscleId>>(() => {
    const ids = new Set<MuscleId>();
    musclesWorked.forEach(term => {
      (WORKOUT_MAP[term.toUpperCase()] ?? []).forEach(id => ids.add(id));
    });
    return ids;
  }, [musclesWorked]);

  // Effective selected set (controlled or internal)
  const selectedSet = useMemo<Set<MuscleId>>(() => {
    if (controlledSelected) return new Set(controlledSelected);
    return internalSelected;
  }, [controlledSelected, internalSelected]);

  // All active (display + interactive)
  const activeIds = useMemo<Set<MuscleId>>(
    () => new Set([...propActiveIds, ...selectedSet]),
    [propActiveIds, selectedSet]
  );

  const handleViewChange = useCallback((v: BodyView) => {
    setView(v);
    onViewChange?.(v);
  }, [onViewChange]);

  const toggleMuscle = useCallback((muscleId: MuscleId) => {
    if (!interactive) return;
    if (onMuscleToggle) {
      onMuscleToggle(muscleId);
    } else {
      setInternalSelected(prev => {
        const next = new Set(prev);
        next.has(muscleId) ? next.delete(muscleId) : next.add(muscleId);
        return next;
      });
    }
  }, [interactive, onMuscleToggle]);

  const isMuscleActive = useCallback((id: MuscleId): boolean => {
    return activeIds.has(id);
  }, [activeIds]);

  const basePaths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;
  const detailLines = view === 'front' ? FRONT_DETAILS : BACK_DETAILS;
  const chipMuscles = view === 'front' ? FRONT_MUSCLE_ORDER : BACK_MUSCLE_ORDER;

  // Render active/hovered paths last so they overlap inactive ones gracefully
  const sortedPaths = useMemo(() => {
    return [...basePaths].sort((a, b) => {
      const aActive = isMuscleActive(a.id) || hoveredMuscleId === a.id;
      const bActive = isMuscleActive(b.id) || hoveredMuscleId === b.id;
      if (aActive === bActive) return 0;
      return aActive ? 1 : -1;
    });
  }, [basePaths, isMuscleActive, hoveredMuscleId]);

  return (
    <div className="flex flex-col items-center gap-5 w-full select-none">
      {/* ── Segmented control ─────────────────────────────────────────── */}
      <div className="relative flex rounded-full p-[3px] bg-white/5 border border-white/8">
        <motion.div
          layout
          className="absolute inset-[3px] rounded-full bg-white/90"
          style={{
            left: view === 'front' ? '3px' : '50%',
            right: view === 'front' ? '50%' : '3px',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
        {(['front', 'back'] as BodyView[]).map(v => (
          <button
            key={v}
            aria-pressed={view === v}
            aria-label={`${v} view`}
            onClick={() => handleViewChange(v)}
            className={`relative z-10 px-7 py-1.5 text-[10px] font-extrabold tracking-[0.22em] uppercase rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              view === v ? 'text-black' : 'text-white/38 hover:text-white/60'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── SVG body map ─────────────────────────────────────────────── */}
      <div className="w-full max-w-[260px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              viewBox="0 0 240 520"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`Interactive body map — ${view} view`}
              style={{ display: 'block', margin: '0 auto' }}
            >
              <defs>
                {/* Glow filter for selected muscles */}
                <filter id="bm-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(255,255,255,0.25)" />
                </filter>
                {/* Gradient for selected muscles */}
                <linearGradient id="bm-active-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F2F2F2" />
                  <stop offset="100%" stopColor="#C8C8C8" />
                </linearGradient>
                {/* Hover gradient */}
                <linearGradient id="bm-hover-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2A2A2A" />
                  <stop offset="100%" stopColor="#222222" />
                </linearGradient>
              </defs>

              {/* ── Base body silhouette (layer 1) — always visible ── */}
              <path
                d={BASE_SILHOUETTE}
                fill="#171717"
                stroke="#555555"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* ── Muscle polygons (layer 2 & 3) — selectable ── */}
              {sortedPaths.map((muscle, idx) => {
                const active = isMuscleActive(muscle.id);
                const hovered = hoveredMuscleId === muscle.id;
                const canInteract = interactive;

                let fill = '#1D1D1D';
                let stroke = '#3A3A3A';
                let strokeWidth = 0.5;
                let filterAttr = undefined;

                if (active) {
                  fill = 'url(#bm-active-grad)';
                  stroke = '#E8E8E8';
                  strokeWidth = 1.2;
                  filterAttr = 'url(#bm-glow)';
                } else if (hovered && canInteract) {
                  fill = 'url(#bm-hover-grad)';
                  stroke = '#555555';
                  strokeWidth = 1;
                }

                return (
                  <path
                    key={`${muscle.id}-${muscle.side}-${idx}`}
                    d={muscle.d}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    filter={filterAttr}
                    onMouseEnter={() => canInteract && setHoveredMuscleId(muscle.id)}
                    onMouseLeave={() => canInteract && setHoveredMuscleId(null)}
                    onClick={() => toggleMuscle(muscle.id)}
                    style={{
                      cursor: canInteract ? 'pointer' : 'default',
                      transition: 'all 0.2s ease-out'
                    }}
                    role={canInteract ? 'button' : 'presentation'}
                    aria-label={canInteract ? `Toggle ${MUSCLE_CONFIG[muscle.id].label}` : undefined}
                    aria-pressed={canInteract ? active : undefined}
                  />
                );
              })}

              {/* ── Detail Lines (layer 4) ── */}
              {detailLines.map((d, i) => (
                <path
                  key={`detail-${i}`}
                  d={d}
                  fill="none"
                  stroke="#3A3A3A"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Chips ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[280px]">
        <AnimatePresence mode="popLayout">
          {chipMuscles.map(id => {
            const active = isMuscleActive(id);
            const hovered = hoveredMuscleId === id;
            return (
              <motion.button
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => toggleMuscle(id)}
                onMouseEnter={() => interactive && setHoveredMuscleId(id)}
                onMouseLeave={() => interactive && setHoveredMuscleId(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border
                  ${
                    active
                      ? 'bg-white/10 border-white/20 text-white'
                      : hovered && interactive
                      ? 'bg-white/5 border-white/10 text-white/90'
                      : 'bg-transparent border-white/5 text-white/50'
                  }
                `}
                style={{
                  cursor: interactive ? 'pointer' : 'default',
                }}
                disabled={!interactive}
                aria-pressed={active}
              >
                {MUSCLE_CONFIG[id].label}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
