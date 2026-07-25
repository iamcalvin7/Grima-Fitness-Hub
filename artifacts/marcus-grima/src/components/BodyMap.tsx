import { useState, useMemo, useCallback } from 'react';
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

const MUSCLE_CONFIG: Record<MuscleId, { label: string }> = {
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

/* ── Highlight regions (image coordinates, 1024×1024) ─────────────────────
   Each region is an ellipse aligned over the rendered figure. Regions only
   need to glow & catch taps — the image itself supplies the anatomy.       */

interface Region {
  id: MuscleId;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
}

const FRONT_REGIONS: Region[] = [
  // shoulders
  { id: 'front_deltoids', cx: 392, cy: 228, rx: 46, ry: 46 },
  { id: 'front_deltoids', cx: 634, cy: 228, rx: 46, ry: 46 },
  // chest
  { id: 'chest', cx: 462, cy: 258, rx: 52, ry: 46 },
  { id: 'chest', cx: 563, cy: 258, rx: 52, ry: 46 },
  // biceps (inner upper arm)
  { id: 'biceps', cx: 378, cy: 330, rx: 28, ry: 52, rotate: 8 },
  { id: 'biceps', cx: 648, cy: 330, rx: 28, ry: 52, rotate: -8 },
  // triceps (outer upper arm, visible edge in front view)
  { id: 'triceps', cx: 342, cy: 340, rx: 20, ry: 52, rotate: 10 },
  { id: 'triceps', cx: 684, cy: 340, rx: 20, ry: 52, rotate: -10 },
  // forearms
  { id: 'forearms', cx: 346, cy: 450, rx: 28, ry: 68, rotate: 8 },
  { id: 'forearms', cx: 682, cy: 450, rx: 28, ry: 68, rotate: -8 },
  // abs
  { id: 'abs', cx: 513, cy: 365, rx: 48, ry: 82 },
  // obliques
  { id: 'obliques', cx: 448, cy: 380, rx: 24, ry: 66, rotate: -6 },
  { id: 'obliques', cx: 578, cy: 380, rx: 24, ry: 66, rotate: 6 },
  // adductors (inner thigh)
  { id: 'adductors', cx: 483, cy: 530, rx: 24, ry: 58, rotate: 6 },
  { id: 'adductors', cx: 543, cy: 530, rx: 24, ry: 58, rotate: -6 },
  // quadriceps
  { id: 'quadriceps', cx: 448, cy: 590, rx: 48, ry: 96, rotate: 4 },
  { id: 'quadriceps', cx: 580, cy: 590, rx: 48, ry: 96, rotate: -4 },
  // tibialis (front shin)
  { id: 'tibialis', cx: 435, cy: 800, rx: 22, ry: 78, rotate: 3 },
  { id: 'tibialis', cx: 597, cy: 800, rx: 22, ry: 78, rotate: -3 },
  // calves (outer lower leg, front view)
  { id: 'calves', cx: 408, cy: 762, rx: 14, ry: 58, rotate: 5 },
  { id: 'calves', cx: 623, cy: 762, rx: 14, ry: 58, rotate: -5 },
];

const BACK_REGIONS: Region[] = [
  // traps
  { id: 'trapezius', cx: 512, cy: 210, rx: 78, ry: 52 },
  // rear delts
  { id: 'rear_deltoids', cx: 392, cy: 265, rx: 42, ry: 46 },
  { id: 'rear_deltoids', cx: 632, cy: 265, rx: 42, ry: 46 },
  // upper back
  { id: 'upper_back', cx: 512, cy: 300, rx: 80, ry: 55 },
  // lats
  { id: 'lats', cx: 452, cy: 390, rx: 44, ry: 76, rotate: -4 },
  { id: 'lats', cx: 572, cy: 390, rx: 44, ry: 76, rotate: 4 },
  // triceps
  { id: 'triceps', cx: 366, cy: 340, rx: 34, ry: 58, rotate: 8 },
  { id: 'triceps', cx: 660, cy: 340, rx: 34, ry: 58, rotate: -8 },
  // forearms
  { id: 'forearms', cx: 352, cy: 460, rx: 28, ry: 66, rotate: 8 },
  { id: 'forearms', cx: 674, cy: 460, rx: 28, ry: 66, rotate: -8 },
  // lower back
  { id: 'lower_back', cx: 512, cy: 445, rx: 42, ry: 48 },
  // glutes
  { id: 'glutes', cx: 466, cy: 512, rx: 48, ry: 52 },
  { id: 'glutes', cx: 560, cy: 512, rx: 48, ry: 52 },
  // hamstrings
  { id: 'hamstrings', cx: 452, cy: 645, rx: 46, ry: 88, rotate: 3 },
  { id: 'hamstrings', cx: 578, cy: 645, rx: 46, ry: 88, rotate: -3 },
  // calves
  { id: 'calves', cx: 440, cy: 810, rx: 30, ry: 74, rotate: 3 },
  { id: 'calves', cx: 592, cy: 810, rx: 30, ry: 74, rotate: -3 },
];

/* ── Chips ────────────────────────────────────────────────────────────────── */

const FRONT_MUSCLE_ORDER: MuscleId[] = [
  'chest', 'front_deltoids', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quadriceps', 'adductors', 'tibialis', 'calves',
];
const BACK_MUSCLE_ORDER: MuscleId[] = [
  'trapezius', 'rear_deltoids', 'upper_back', 'lats', 'triceps', 'forearms',
  'lower_back', 'glutes', 'hamstrings', 'calves',
];

const IMG_BASE = `${import.meta.env.BASE_URL}bodymap`;

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

  const selectedSet = useMemo<Set<MuscleId>>(() => {
    if (controlledSelected) return new Set(controlledSelected);
    return internalSelected;
  }, [controlledSelected, internalSelected]);

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

  const isMuscleActive = useCallback((id: MuscleId): boolean => activeIds.has(id), [activeIds]);

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const chipMuscles = (view === 'front' ? FRONT_MUSCLE_ORDER : BACK_MUSCLE_ORDER)
    .filter(id => activeIds.has(id));

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

      {/* ── Figure + highlight overlay ───────────────────────────────── */}
      <div className="w-full max-w-[300px] relative">
          <div className="relative">
            <svg
              viewBox="120 20 784 990"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`Interactive body map — ${view} view`}
              style={{ display: 'block', margin: '0 auto' }}
            >
              <defs>
                <radialGradient id="bm-glow-grad">
                  <stop offset="0%" stopColor="rgba(74,222,128,0.85)" />
                  <stop offset="55%" stopColor="rgba(34,197,94,0.45)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                </radialGradient>
                <radialGradient id="bm-hover-grad">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <filter id="bm-soft-blur" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="10" />
                </filter>
              </defs>

              {/* Rendered anatomy images — both stay mounted so switching views is instant */}
              <image
                href={`${IMG_BASE}/front.png`}
                x="0" y="0" width="1024" height="1024"
                preserveAspectRatio="xMidYMid meet"
                opacity={view === 'front' ? 1 : 0}
                style={{ transition: 'opacity 0.18s ease-out' }}
              />
              <image
                href={`${IMG_BASE}/back.png`}
                x="0" y="0" width="1024" height="1024"
                preserveAspectRatio="xMidYMid meet"
                opacity={view === 'back' ? 1 : 0}
                style={{ transition: 'opacity 0.18s ease-out' }}
              />

              {/* Highlight glows */}
              {regions.map((r, i) => {
                const active = isMuscleActive(r.id);
                const hovered = interactive && hoveredMuscleId === r.id;
                if (!active && !hovered) return null;
                return (
                  <ellipse
                    key={`glow-${r.id}-${i}`}
                    cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
                    transform={r.rotate ? `rotate(${r.rotate} ${r.cx} ${r.cy})` : undefined}
                    fill={active ? 'url(#bm-glow-grad)' : 'url(#bm-hover-grad)'}
                    filter="url(#bm-soft-blur)"
                    style={{ mixBlendMode: 'screen', pointerEvents: 'none', transition: 'opacity 0.2s ease-out' }}
                  />
                );
              })}

              {/* Tap targets (invisible, slightly enlarged) */}
              {regions.map((r, i) => (
                <ellipse
                  key={`hit-${r.id}-${i}`}
                  cx={r.cx} cy={r.cy} rx={r.rx + 8} ry={r.ry + 8}
                  transform={r.rotate ? `rotate(${r.rotate} ${r.cx} ${r.cy})` : undefined}
                  fill="transparent"
                  onMouseEnter={() => interactive && setHoveredMuscleId(r.id)}
                  onMouseLeave={() => interactive && setHoveredMuscleId(null)}
                  onClick={() => toggleMuscle(r.id)}
                  onKeyDown={(e) => {
                    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      toggleMuscle(r.id);
                    }
                  }}
                  onFocus={() => interactive && setHoveredMuscleId(r.id)}
                  onBlur={() => interactive && setHoveredMuscleId(null)}
                  tabIndex={interactive ? 0 : undefined}
                  style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
                  role={interactive ? 'button' : 'presentation'}
                  aria-label={interactive ? `Toggle ${MUSCLE_CONFIG[r.id].label}` : undefined}
                  aria-pressed={interactive ? isMuscleActive(r.id) : undefined}
                />
              ))}
            </svg>
          </div>
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
                disabled={!interactive}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-colors duration-150 ${
                  active
                    ? 'bg-green-400/15 text-green-300 border-green-400/40'
                    : hovered
                      ? 'bg-white/10 text-white/80 border-white/20'
                      : 'bg-white/[0.03] text-white/40 border-white/10'
                } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
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

export default BodyMap;
