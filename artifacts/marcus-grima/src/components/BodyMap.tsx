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

function buildSymmetricSilhouette(isBack: boolean = false): string {
  const rightSide: (string | number)[][] = [
    ['M', 120, 16],
    ['C', 130, 16, 140, 22, 140, 34],
    ['C', 140, 46, 136, 54, 132, 62],
    ['C', 140, 63, 156, 66, 172, 76],
    ['C', 188, 88, 196, 110, 196, 132],
    ['C', 196, 152, 192, 172, 198, 190], // outer forearm to wrist
    ['C', 200, 205, 202, 210, 200, 215], // outer palm
    ['C', 202, 225, 198, 228, 196, 215], // pinky
    ['C', 198, 232, 194, 232, 192, 215], // ring
    ['C', 194, 238, 190, 238, 188, 215], // middle
    ['C', 190, 234, 186, 234, 184, 212], // index
    ['C', 176, 225, 172, 220, 176, 205], // thumb
    ['C', 178, 198, 180, 195, 182, 190], // inner palm to wrist
    ['C', 186, 170, 180, 150, 170, 134], // inner forearm to elbow
    ['C', 166, 128, 162, 126, 158, 126], // inner bicep
    ['C', 164, 156, 158, 188, 160, 222], // lat/torso
    ['C', 162, 240, 168, 256, 168, 274], // hip
    ['C', 170, 314, 180, 354, 175, 390], // outer thigh
    ['C', 170, 430, 185, 460, 180, 480], // outer calf
  ];

  if (isBack) {
    rightSide.push(
      ['C', 180, 495, 180, 510, 172, 512], // outer heel
      ['C', 168, 514, 162, 512, 160, 508], // heel bottom
      ['C', 158, 495, 157, 485, 158, 480]  // inner foot
    );
  } else {
    rightSide.push(
      ['C', 180, 495, 185, 500, 182, 504], // outer foot to pinky
      ['C', 182, 507, 179, 508, 178, 505], // pinky
      ['C', 178, 509, 175, 510, 174, 507], // 4th toe
      ['C', 174, 511, 171, 512, 170, 509], // 3rd toe
      ['C', 170, 514, 165, 515, 164, 511], // 2nd toe
      ['C', 164, 518, 154, 518, 154, 510], // big toe
      ['C', 152, 495, 156, 485, 158, 480]  // inner foot
    );
  }

  rightSide.push(
    ['C', 165, 450, 155, 420, 145, 390], // inner calf
    ['C', 135, 340, 130, 310, 120, 274]  // inner thigh
  );

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

const FRONT_BASE_SILHOUETTE = buildSymmetricSilhouette(false);
const BACK_BASE_SILHOUETTE = buildSymmetricSilhouette(true);

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
  { id: 'front_deltoids', d: 'M 150 70 C 160 72 172 76 188 88 C 192 98 194 108 190 115 C 180 110 168 105 158 100 C 160 90 155 80 150 70 Z' },
  { id: 'biceps', d: 'M 158 100 C 168 105 180 110 190 115 C 192 125 188 132 180 136 C 175 138 168 135 158 126 C 156 115 156 105 158 100 Z' },
  { id: 'triceps', d: 'M 188 88 C 196 110 196 132 196 132 C 190 134 185 136 180 136 C 188 132 192 125 190 115 C 194 108 192 98 188 88 Z' },
  { id: 'forearms', d: 'M 170 134 C 180 136 190 134 196 132 C 196 152 192 172 198 190 L 182 190 C 186 170 180 150 170 134 Z' },
  { id: 'abs', d: 'M 120 134 C 134 136 144 150 144 180 C 144 210 136 240 120 250 Z' },
  { id: 'obliques', d: 'M 158 126 C 164 156 158 188 160 222 C 162 240 168 256 168 274 C 148 260 136 250 120 250 C 136 240 144 210 144 180 C 144 150 134 136 120 134 C 132 136 146 134 158 126 Z' },
  { id: 'quadriceps', d: 'M 140 272 C 154 270 168 274 168 274 C 170 314 180 354 175 390 C 165 385 155 385 145 390 C 140 350 140 310 140 272 Z' },
  { id: 'adductors', d: 'M 120 274 C 130 310 135 340 145 390 C 140 350 140 310 140 272 C 130 272 125 273 120 274 Z' },
  { id: 'tibialis', d: 'M 155 390 C 165 385 175 390 175 390 C 170 430 185 460 180 480 L 165 480 C 160 450 155 420 155 390 Z' },
  { id: 'calves', d: 'M 145 390 C 150 388 155 390 155 390 C 155 420 160 450 165 480 L 158 480 C 165 450 155 420 145 390 Z' },
];

const BACK_MUSCLES_RIGHT: { id: MuscleId; d: string }[] = [
  { id: 'trapezius', d: 'M 120 62 C 140 63 156 66 172 76 C 154 86 138 106 120 116 Z' },
  { id: 'rear_deltoids', d: 'M 172 76 C 188 88 196 110 196 132 C 185 120 170 100 158 86 C 164 80 168 78 172 76 Z' },
  { id: 'upper_back', d: 'M 120 116 C 138 106 154 86 158 86 C 160 100 159 110 158 126 C 146 134 132 140 120 146 Z' },
  { id: 'lats', d: 'M 120 146 C 132 140 146 134 158 126 C 164 156 158 188 160 222 C 152 226 138 236 120 246 Z' },
  { id: 'lower_back', d: 'M 120 246 C 138 236 152 226 160 222 C 162 240 168 256 168 274 C 152 260 138 264 120 270 Z' },
  { id: 'glutes', d: 'M 120 270 C 138 264 152 260 168 274 C 168 294 170 304 172 314 C 150 320 135 315 120 310 Z' },
  { id: 'hamstrings', d: 'M 120 310 C 135 315 150 320 172 314 C 180 354 175 390 175 390 C 165 385 155 385 145 390 C 140 350 130 320 120 310 Z' },
  { id: 'calves', d: 'M 145 390 C 155 385 165 385 175 390 C 170 430 185 460 180 480 L 158 480 C 165 450 155 420 145 390 Z' },
  { id: 'triceps', d: 'M 158 86 C 170 100 185 120 196 132 C 190 134 180 136 170 134 C 166 128 162 126 158 126 C 160 110 158 95 158 86 Z' },
  { id: 'forearms', d: 'M 170 134 C 180 136 190 134 196 132 C 196 152 192 172 198 190 L 182 190 C 186 170 180 150 170 134 Z' },
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
  'M 154 398 C 158 402 162 402 166 398', // knee
  
  // fingers
  'M 196 215 C 195 210 195 208 194 205', // pinky/ring
  'M 192 215 C 191 210 191 208 190 203', // ring/middle
  'M 188 215 C 187 210 187 208 186 203', // middle/index
  'M 184 212 C 182 208 180 205 178 200', // index/thumb
  
  // toes
  'M 178 505 L 177 500',
  'M 174 507 L 173 500',
  'M 170 509 L 169 501',
  'M 164 511 L 163 498',
];

const BACK_DETAIL_LINES_RIGHT = [
  'M 120 62 L 120 270', // spine
  
  // fingers
  'M 196 215 C 195 210 195 208 194 205', // pinky/ring
  'M 192 215 C 191 210 191 208 190 203', // ring/middle
  'M 188 215 C 187 210 187 208 186 203', // middle/index
  'M 184 212 C 182 208 180 205 178 200', // index/thumb
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
                d={view === 'front' ? FRONT_BASE_SILHOUETTE : BACK_BASE_SILHOUETTE}
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
