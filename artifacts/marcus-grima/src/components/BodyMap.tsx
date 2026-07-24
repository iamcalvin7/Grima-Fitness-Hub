import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface MuscleGroup {
  id: string;
  label: string;
  frontPaths: string[];
  backPaths: string[];
}

interface BodyMapProps {
  /** Auto-highlight these muscles (display mode) */
  musclesWorked?: string[];
  /** Allow clicking muscles to toggle selection */
  interactive?: boolean;
  /** Callback when selection changes (interactive mode) */
  onSelectionChange?: (selected: string[]) => void;
}

/* ── Muscle definitions — 200 × 490 coordinate space ─────────────────────── */

const MUSCLES: MuscleGroup[] = [
  {
    id: 'chest',
    label: 'Chest',
    frontPaths: [
      'M57,90 C57,84 100,82 100,82 L100,150 C80,158 58,152 51,135 C47,122 51,101 57,90Z',
      'M143,90 C143,84 100,82 100,82 L100,150 C120,158 142,152 149,135 C153,122 149,101 143,90Z',
    ],
    backPaths: [],
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    frontPaths: [
      'M28,92 C16,108 10,136 10,166 L32,168 C32,142 38,118 44,104Z',
      'M172,92 C184,108 190,136 190,166 L168,168 C168,142 162,118 156,104Z',
    ],
    backPaths: [
      'M28,92 C16,108 10,136 10,166 L32,168 C32,142 38,118 44,104Z',
      'M172,92 C184,108 190,136 190,166 L168,168 C168,142 162,118 156,104Z',
    ],
  },
  {
    id: 'biceps',
    label: 'Biceps',
    frontPaths: [
      'M10,168 C8,192 8,220 10,244 L34,240 C32,218 32,190 32,170Z',
      'M190,168 C192,192 192,220 190,244 L166,240 C168,218 168,190 168,170Z',
    ],
    backPaths: [],
  },
  {
    id: 'triceps',
    label: 'Triceps',
    frontPaths: [],
    backPaths: [
      'M10,168 C8,192 8,220 10,244 L34,240 C32,218 32,190 32,170Z',
      'M190,168 C192,192 192,220 190,244 L166,240 C168,218 168,190 168,170Z',
    ],
  },
  {
    id: 'forearms',
    label: 'Forearms',
    frontPaths: [
      'M8,246 C8,264 10,278 16,286 L34,284 C30,276 30,262 30,246Z',
      'M192,246 C192,264 190,278 184,286 L166,284 C170,276 170,262 170,246Z',
    ],
    backPaths: [
      'M8,246 C8,264 10,278 16,286 L34,284 C30,276 30,262 30,246Z',
      'M192,246 C192,264 190,278 184,286 L166,284 C170,276 170,262 170,246Z',
    ],
  },
  {
    id: 'abs',
    label: 'Abs',
    frontPaths: [
      // Row 1
      'M62,152 L99,152 L99,172 C84,176 64,174 62,170Z',
      'M101,152 L138,152 L138,170 C136,174 116,176 101,172Z',
      // Row 2
      'M62,175 L99,175 L99,194 C84,198 64,196 62,192Z',
      'M101,175 L138,175 L138,192 C136,196 116,198 101,194Z',
      // Row 3
      'M65,197 L99,197 L99,215 C90,219 67,217 65,213Z',
      'M101,197 L135,197 L135,213 C132,217 110,219 101,215Z',
    ],
    backPaths: [
      // Erector spinae columns
      'M91,134 L97,134 L95,204 L89,204Z',
      'M109,134 L103,134 L105,204 L111,204Z',
    ],
  },
  {
    id: 'obliques',
    label: 'Obliques',
    frontPaths: [
      'M52,138 C49,140 47,164 50,206 L66,202 L64,174 C62,158 59,146 57,138Z',
      'M148,138 C151,140 153,164 150,206 L134,202 L136,174 C138,158 141,146 143,138Z',
    ],
    backPaths: [],
  },
  {
    id: 'traps',
    label: 'Traps',
    frontPaths: [],
    backPaths: [
      'M63,84 L100,78 L137,84 L132,132 L100,138 L68,132Z',
    ],
  },
  {
    id: 'lats',
    label: 'Lats',
    frontPaths: [],
    backPaths: [
      'M54,124 C44,148 40,178 44,208 L64,204 L66,134Z',
      'M146,124 C156,148 160,178 156,208 L136,204 L134,134Z',
    ],
  },
  {
    id: 'rhomboids',
    label: 'Upper Back',
    frontPaths: [],
    backPaths: [
      'M68,84 L97,86 L95,130 L68,128Z',
      'M132,84 L103,86 L105,130 L132,128Z',
    ],
  },
  {
    id: 'lower-back',
    label: 'Lower Back',
    frontPaths: [],
    backPaths: ['M66,204 L134,204 L132,232 L68,232Z'],
  },
  {
    id: 'glutes',
    label: 'Glutes',
    frontPaths: [],
    backPaths: [
      'M52,234 C47,248 43,270 47,298 C52,318 72,328 90,320 L94,236Z',
      'M148,234 C153,248 157,270 153,298 C148,318 128,328 110,320 L106,236Z',
    ],
  },
  {
    id: 'quads',
    label: 'Quads',
    frontPaths: [
      // Left: vastus lateralis
      'M51,240 C49,268 47,314 47,358 L68,360 C68,316 68,270 70,242Z',
      // Left: rectus femoris
      'M72,240 C70,268 70,314 70,358 L90,358 C90,314 90,268 88,242Z',
      // Left: vastus medialis (teardrop)
      'M70,352 C68,338 79,326 93,331 L90,358 L70,358Z',
      // Right: vastus lateralis
      'M149,240 C151,268 153,314 153,358 L132,360 C132,316 132,270 130,242Z',
      // Right: rectus femoris
      'M128,240 C130,268 130,314 130,358 L110,358 C110,314 110,268 112,242Z',
      // Right: vastus medialis
      'M130,352 C132,338 121,326 107,331 L110,358 L130,358Z',
    ],
    backPaths: [],
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    frontPaths: [],
    backPaths: [
      'M49,322 L91,320 L89,364 L47,362Z',
      'M151,322 L109,320 L111,364 L153,362Z',
    ],
  },
  {
    id: 'calves',
    label: 'Calves',
    frontPaths: [
      // Tibialis anterior
      'M49,364 C47,390 46,422 49,454 L63,452 C63,420 62,390 64,366Z',
      'M151,364 C153,390 154,422 151,454 L137,452 C137,420 138,390 136,366Z',
    ],
    backPaths: [
      // Left gastroc medial
      'M51,368 L72,368 L68,452 L49,449Z',
      // Left gastroc lateral
      'M74,368 L91,368 L89,454 L72,452Z',
      // Right gastroc medial
      'M149,368 L128,368 L132,452 L151,449Z',
      // Right gastroc lateral
      'M126,368 L109,368 L111,454 L128,452Z',
    ],
  },
];

/* ── Workout term → muscle IDs ───────────────────────────────────────────── */

const WORKOUT_MAP: Record<string, string[]> = {
  CHEST:       ['chest'],
  SHOULDERS:   ['shoulders'],
  DELTS:       ['shoulders'],
  TRICEPS:     ['triceps'],
  BICEPS:      ['biceps'],
  FOREARMS:    ['forearms'],
  BACK:        ['lats', 'rhomboids', 'traps'],
  TRAPS:       ['traps'],
  LATS:        ['lats'],
  ABS:         ['abs'],
  CORE:        ['abs', 'obliques', 'lower-back'],
  OBLIQUES:    ['obliques'],
  LEGS:        ['quads', 'hamstrings', 'calves', 'glutes'],
  QUADS:       ['quads'],
  HAMSTRINGS:  ['hamstrings'],
  CALVES:      ['calves'],
  GLUTES:      ['glutes'],
  'LOWER BACK':['lower-back'],
  'UPPER BACK':['rhomboids', 'traps'],
  NECK:        ['traps'],
};

/* ── Anatomy outlines (thin lines visible on base body) ─────────────────── */

const FRONT_DEFINITION_LINES = [
  // Sternum (chest split)
  'M100,84 L100,152',
  // Chest → ab boundary
  'M52,136 Q100,146 148,136',
  // Ab grid horizontals
  'M62,175 L138,175',
  'M65,197 L135,197',
  // Ab vertical centre
  'M99,152 L99,215  M101,152 L101,215',
  // Shoulder-pec groove
  'M44,104 C52,96 74,88 100,86',
  'M156,104 C148,96 126,88 100,86',
  // Quad separation
  'M70,240 L68,358  M72,240 L70,358',
  'M130,240 L132,358  M128,240 L130,358',
  // Calf split (front)
  'M56,370 L56,454',
  'M144,370 L144,454',
];

const BACK_DEFINITION_LINES = [
  // Spine
  'M100,78 L100,234',
  // Trap boundary
  'M44,106 Q66,88 100,84 Q134,88 156,106',
  // Scapula lines
  'M97,86 L95,130  M103,86 L105,130',
  // Lat-trap boundary
  'M66,132 L64,204  M134,132 L136,204',
  // Glute fold
  'M90,320 Q100,324 110,320',
  // Ham separation
  'M70,322 L69,362  M130,322 L131,362',
  // Calf separation back
  'M72,370 L70,452  M128,370 L130,452',
];

/* ── SVG body silhouette ─────────────────────────────────────────────────── */

// Shared outline for both front and back (same external shape)
const BODY_SILHOUETTE = `
  M88,48
  C68,53 34,70 26,94
  L14,106
  C8,122 8,152 8,176
  C8,208 8,230 8,248
  C8,264 12,280 18,288
  L36,286
  C40,276 40,260 40,244
  C40,218 42,194 46,170
  C48,158 52,146 56,136
  C56,158 56,182 54,208
  C52,224 49,236 49,244
  L49,360
  C47,376 46,408 48,455
  C50,470 54,482 62,488
  L86,490 L86,474
  C82,458 80,440 80,425
  L80,370
  C82,358 84,346 88,338
  L88,250
  C90,240 94,232 100,230
  C106,232 110,240 112,250
  L112,338
  C116,346 118,358 120,370
  L120,425
  C120,440 118,458 114,474
  L114,490 L138,490
  C146,482 150,470 152,455
  C154,408 153,376 151,360
  L151,244
  C151,236 148,224 146,208
  C144,182 144,158 144,136
  C148,146 152,158 154,170
  C158,194 160,218 160,244
  C160,260 160,276 164,286
  L182,288
  C188,280 192,264 192,248
  C192,230 192,208 192,176
  C192,152 192,122 186,106
  L174,94
  C166,70 132,53 112,48
  C108,46 104,44 100,44
  C96,44 92,46 88,48Z
`;

/* ── Component ───────────────────────────────────────────────────────────── */

export const BodyMap = ({ musclesWorked = [], interactive = false, onSelectionChange }: BodyMapProps) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());

  // Resolve workout terms → muscle IDs
  const propActiveIds = useMemo(() => {
    const ids = new Set<string>();
    musclesWorked.forEach(term => {
      (WORKOUT_MAP[term.toUpperCase()] ?? []).forEach(id => ids.add(id));
    });
    return ids;
  }, [musclesWorked]);

  // Combined active set
  const activeIds = useMemo(() => new Set([...propActiveIds, ...manualSelected]), [propActiveIds, manualSelected]);

  const toggleMuscle = (id: string) => {
    if (!interactive) return;
    setManualSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (onSelectionChange) onSelectionChange([...next]);
      return next;
    });
  };

  // Which muscles have paths for current view
  const visibleMuscles = MUSCLES.filter(m => view === 'front' ? m.frontPaths.length > 0 : m.backPaths.length > 0);

  const definitionLines = view === 'front' ? FRONT_DEFINITION_LINES : BACK_DEFINITION_LINES;

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">

      {/* ── Segmented control ── */}
      <div className="relative flex rounded-full p-0.5 bg-white/6 border border-white/8">
        <motion.div
          layout
          className="absolute top-0.5 bottom-0.5 rounded-full bg-primary"
          style={{ left: view === 'front' ? '2px' : '50%', width: 'calc(50% - 2px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`relative z-10 px-6 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-200 ${
              view === v ? 'text-white' : 'text-foreground/45 hover:text-foreground/70'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── SVG body ── */}
      <div className="w-full max-w-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <svg
              viewBox="0 0 200 496"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              aria-label={`Body map — ${view} view`}
            >
              <defs>
                <filter id="bm-glow" x="-40%" y="-20%" width="180%" height="140%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="bm-glow-sm" x="-25%" y="-15%" width="150%" height="130%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="bm-active-grad" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="hsl(270 65% 68%)" />
                  <stop offset="100%" stopColor="hsl(270 60% 45%)" />
                </radialGradient>
              </defs>

              {/* Base body silhouette */}
              <path d={BODY_SILHOUETTE} fill="#111111" stroke="#3a3a3a" strokeWidth="1" />

              {/* Head */}
              <circle cx="100" cy="27" r="22" fill="#111111" stroke="#3a3a3a" strokeWidth="1" />

              {/* Neck */}
              <path d="M87,48 Q100,44 113,48 L115,74 Q100,78 85,74Z" fill="#141414" stroke="#3a3a3a" strokeWidth="0.8" />

              {/* Hands */}
              <ellipse cx="14"  cy="290" rx="10" ry="7" fill="#111111" stroke="#333" strokeWidth="0.8" />
              <ellipse cx="186" cy="290" rx="10" ry="7" fill="#111111" stroke="#333" strokeWidth="0.8" />

              {/* Feet */}
              <ellipse cx="74"  cy="491" rx="16" ry="6" fill="#111111" stroke="#333" strokeWidth="0.8" />
              <ellipse cx="126" cy="491" rx="16" ry="6" fill="#111111" stroke="#333" strokeWidth="0.8" />

              {/* Anatomy definition lines */}
              {definitionLines.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#2e2e2e" strokeWidth="0.7" strokeLinecap="round" />
              ))}

              {/* Inactive muscles */}
              {visibleMuscles.map(muscle => {
                const isActive = activeIds.has(muscle.id);
                if (isActive) return null;
                const paths = view === 'front' ? muscle.frontPaths : muscle.backPaths;
                return paths.map((d, i) => (
                  <path
                    key={`${muscle.id}-${i}`}
                    d={d}
                    fill="#1b1b1b"
                    stroke="#505050"
                    strokeWidth="0.7"
                    onClick={() => toggleMuscle(muscle.id)}
                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                  />
                ));
              })}

              {/* Active muscles (rendered on top so glow doesn't bleed under inactive) */}
              {visibleMuscles.map(muscle => {
                const isActive = activeIds.has(muscle.id);
                if (!isActive) return null;
                const paths = view === 'front' ? muscle.frontPaths : muscle.backPaths;
                return paths.map((d, i) => (
                  <motion.path
                    key={`${muscle.id}-${i}-active`}
                    d={d}
                    fill="url(#bm-active-grad)"
                    stroke="hsl(270 65% 72%)"
                    strokeWidth="0.9"
                    filter="url(#bm-glow)"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => toggleMuscle(muscle.id)}
                    style={{
                      cursor: interactive ? 'pointer' : 'default',
                      transformOrigin: 'center',
                    }}
                  />
                ));
              })}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Muscle chips ── */}
      {(musclesWorked.length > 0 || manualSelected.size > 0) && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {Array.from(activeIds).map(id => {
            const muscle = MUSCLES.find(m => m.id === id);
            if (!muscle) return null;
            return (
              <motion.span
                key={id}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                onClick={() => interactive && toggleMuscle(id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                  interactive ? 'cursor-pointer hover:bg-primary/90' : ''
                } bg-primary text-white`}
              >
                {muscle.label}
              </motion.span>
            );
          })}
        </div>
      )}
    </div>
  );
};
