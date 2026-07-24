import React, { useState } from 'react';

// Maps workout muscle tags → SVG muscle IDs (front / back)
const MUSCLE_MAP: Record<string, { front: string[]; back: string[] }> = {
  CHEST:     { front: ['leftChest', 'rightChest'],                        back: [] },
  SHOULDERS: { front: ['leftShoulder', 'rightShoulder'],                  back: ['leftShoulder', 'rightShoulder'] },
  TRICEPS:   { front: [],                                                  back: ['leftTricep', 'rightTricep'] },
  BICEPS:    { front: ['leftBicep', 'rightBicep'],                        back: [] },
  BACK:      { front: [],                                                  back: ['traps', 'leftLat', 'rightLat', 'lowerBack'] },
  ABS:       { front: ['abs'],                                             back: [] },
  CORE:      { front: ['abs'],                                             back: ['lowerBack'] },
  LEGS:      { front: ['leftQuad', 'rightQuad', 'leftCalf', 'rightCalf'], back: ['leftHamstring', 'rightHamstring', 'leftCalf', 'rightCalf'] },
  GLUTES:    { front: [],                                                  back: ['leftGlute', 'rightGlute'] },
  NECK:      { front: [],                                                  back: ['traps'] },
};

// Front-view paths  (viewBox 0 0 200 420)
const FRONT: Record<string, string> = {
  leftShoulder:  'M54,72 C42,68 28,80 30,102 C32,116 46,120 56,112 L58,86 Z',
  rightShoulder: 'M146,72 C158,68 172,80 170,102 C168,116 154,120 144,112 L142,86 Z',
  leftChest:     'M58,76 L100,74 L100,124 C84,130 64,126 56,114 Z',
  rightChest:    'M142,76 L100,74 L100,124 C116,130 136,126 144,114 Z',
  leftBicep:     'M30,102 C26,122 25,142 28,162 L46,160 C48,140 50,120 56,106 Z',
  rightBicep:    'M170,102 C174,122 175,142 172,162 L154,160 C152,140 150,120 144,106 Z',
  leftForearm:   'M28,164 C26,182 26,200 28,216 L44,214 C46,196 46,178 46,164 Z',
  rightForearm:  'M172,164 C174,182 174,200 172,216 L156,214 C154,196 154,178 154,164 Z',
  abs:           'M58,126 L142,126 L138,198 L62,198 Z',
  leftQuad:      'M62,200 L96,200 L92,310 L58,308 Z',
  rightQuad:     'M138,200 L104,200 L108,310 L142,308 Z',
  leftCalf:      'M58,312 L90,312 L86,376 L55,374 Z',
  rightCalf:     'M142,312 L110,312 L114,376 L145,374 Z',
};

// Back-view paths
const BACK: Record<string, string> = {
  leftShoulder:  'M54,72 C42,68 28,80 30,102 C32,116 46,120 56,112 L58,86 Z',
  rightShoulder: 'M146,72 C158,68 172,80 170,102 C168,116 154,120 144,112 L142,86 Z',
  traps:         'M58,76 L100,72 L142,76 L138,120 L100,124 L62,120 Z',
  leftLat:       'M56,112 C50,132 46,156 48,180 L64,177 L66,120 Z',
  rightLat:      'M144,112 C150,132 154,156 152,180 L136,177 L134,120 Z',
  leftTricep:    'M30,102 C26,122 25,142 28,162 L46,160 C48,140 50,120 56,106 Z',
  rightTricep:   'M170,102 C174,122 175,142 172,162 L154,160 C152,140 150,120 144,106 Z',
  lowerBack:     'M62,177 L138,177 L136,200 L64,200 Z',
  leftGlute:     'M62,202 L98,202 L94,258 L58,254 Z',
  rightGlute:    'M138,202 L102,202 L106,258 L142,254 Z',
  leftHamstring: 'M58,256 L93,260 L89,312 L56,308 Z',
  rightHamstring:'M142,256 L107,260 L111,312 L144,308 Z',
  leftCalf:      'M56,314 L88,314 L84,377 L53,374 Z',
  rightCalf:     'M144,314 L112,314 L116,377 L147,374 Z',
};

// Full body silhouette (front — used for both views)
const SILHOUETTE = `
  M100,8 C122,8 124,48 120,53
  C134,57 158,68 162,90
  L174,100 L176,162 L172,220 L156,222
  C152,222 148,202 140,200
  L138,312 L145,378 L110,378 L108,312
  L92,312 L90,378 L55,378 L62,312
  L60,200 C52,202 48,222 44,222
  L28,220 L24,162 L26,100
  L38,90 C42,68 66,57 80,53
  C76,48 78,8 100,8 Z
`;

interface BodyMapProps {
  musclesWorked: string[];
  compact?: boolean;
}

export const BodyMap = ({ musclesWorked, compact = false }: BodyMapProps) => {
  const [view, setView] = useState<'front' | 'back'>('front');

  // Build the set of active muscle IDs for the current view
  const activeIds = new Set<string>();
  musclesWorked.forEach((m) => {
    const upper = m.toUpperCase();
    const mapping = MUSCLE_MAP[upper];
    if (mapping) {
      mapping[view].forEach((id) => activeIds.add(id));
    }
  });

  const paths = view === 'front' ? FRONT : BACK;

  const size = compact ? 'h-56' : 'h-72';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Front / Back toggle */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-sm">
        {(['front', 'back'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase transition-all ${
              view === v
                ? 'bg-primary text-white'
                : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            {v === 'front' ? 'Front' : 'Back'}
          </button>
        ))}
      </div>

      {/* SVG Body */}
      <div className={`w-full flex justify-center ${size}`}>
        <svg
          viewBox="0 0 200 420"
          className="h-full w-auto"
          style={{ filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.8))' }}
        >
          <defs>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Body silhouette base */}
          <path d={SILHOUETTE} fill="#161616" stroke="#2a2a2a" strokeWidth="1" />

          {/* Head */}
          <circle cx="100" cy="30" r="23" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1" />

          {/* Neck */}
          <path d="M88,52 Q100,49 112,52 L112,72 Q100,75 88,72 Z" fill="#1c1c1c" />

          {/* Hands */}
          <ellipse cx="30" cy="222" rx="10" ry="8" fill="#1c1c1c" />
          <ellipse cx="170" cy="222" rx="10" ry="8" fill="#1c1c1c" />

          {/* Feet */}
          <ellipse cx="72" cy="380" rx="18" ry="8" fill="#1c1c1c" />
          <ellipse cx="128" cy="380" rx="18" ry="8" fill="#1c1c1c" />

          {/* Inactive muscle groups */}
          {Object.entries(paths).map(([id, d]) => {
            if (activeIds.has(id)) return null;
            return (
              <path
                key={id}
                d={d}
                fill="rgba(192,192,192,0.12)"
                stroke="rgba(192,192,192,0.06)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Active muscle groups — glowing purple */}
          {Object.entries(paths).map(([id, d]) => {
            if (!activeIds.has(id)) return null;
            return (
              <path
                key={id}
                d={d}
                fill="hsl(270 60% 55% / 0.85)"
                stroke="hsl(270 60% 72%)"
                strokeWidth="0.8"
                filter="url(#glow)"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      {musclesWorked.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {musclesWorked.map((m) => (
            <span
              key={m}
              className="px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-primary/20 border border-primary/40 text-primary"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
