import React from 'react';

// Maps workout muscle names → SVG path IDs for front and back views
const MUSCLE_MAP: Record<string, { front: string[]; back: string[] }> = {
  CHEST:      { front: ['lChest','rChest','lSerratus','rSerratus'],                                                              back: [] },
  SHOULDERS:  { front: ['lDeltoid','rDeltoid'],                                                                                  back: ['lDeltoid','rDeltoid'] },
  TRICEPS:    { front: [],                                                                                                        back: ['lTricep','rTricep'] },
  BICEPS:     { front: ['lBicep','rBicep'],                                                                                      back: [] },
  FOREARMS:   { front: ['lForearm','rForearm'],                                                                                  back: ['lForearm','rForearm'] },
  BACK:       { front: [],                                                                                                        back: ['traps','lInfra','rInfra','lLat','rLat'] },
  TRAPS:      { front: [],                                                                                                        back: ['traps'] },
  LATS:       { front: [],                                                                                                        back: ['lLat','rLat'] },
  ABS:        { front: ['absUL','absUR','absML','absMR','absLL','absLR'],                                                        back: ['erectorL','erectorR'] },
  CORE:       { front: ['absUL','absUR','absML','absMR','absLL','absLR','lOblique','rOblique'],                                  back: ['lowerBack','erectorL','erectorR'] },
  LEGS:       { front: ['lVL','lRF','lVM','rVL','rRF','rVM','lCalfF','rCalfF'],                                                 back: ['lHam','rHam','lGastroM','lGastroL','rGastroM','rGastroL'] },
  QUADS:      { front: ['lVL','lRF','lVM','rVL','rRF','rVM'],                                                                   back: [] },
  HAMSTRINGS: { front: [],                                                                                                        back: ['lHam','rHam'] },
  CALVES:     { front: ['lCalfF','rCalfF'],                                                                                      back: ['lGastroM','lGastroL','rGastroM','rGastroL'] },
  GLUTES:     { front: [],                                                                                                        back: ['lGlute','rGlute'] },
  NECK:       { front: [],                                                                                                        back: ['traps'] },
};

// ─── Front muscle paths (200 × 420 coordinate space, body centred x=100) ───

const FRONT: Record<string, string> = {
  lDeltoid:  'M35,93 C24,80 19,91 21,110 C23,128 37,134 50,129 L55,112 L52,97Z',
  rDeltoid:  'M165,93 C176,80 181,91 179,110 C177,128 163,134 150,129 L145,112 L148,97Z',
  lChest:    'M52,82 C62,78 84,75 100,75 L100,128 C83,135 62,130 50,117Z',
  rChest:    'M148,82 C138,78 116,75 100,75 L100,128 C117,135 138,130 150,117Z',
  lSerratus: 'M50,118 C44,125 43,134 47,142 L52,140 L47,148 L54,146 L49,155 L58,152 C60,141 62,131 61,122Z',
  rSerratus: 'M150,118 C156,125 157,134 153,142 L148,140 L153,148 L146,146 L151,155 L142,152 C140,141 138,131 139,122Z',
  lBicep:    'M21,110 C17,131 17,152 21,171 L42,169 C46,149 50,128 53,112Z',
  rBicep:    'M179,110 C183,131 183,152 179,171 L158,169 C154,149 150,128 147,112Z',
  lForearm:  'M19,173 L40,171 C42,192 40,214 36,226 L19,224 C17,210 17,190 19,173Z',
  rForearm:  'M181,173 L160,171 C158,192 160,214 164,226 L181,224 C183,210 183,190 181,173Z',
  absUL:     'M62,129 L99,129 L99,150 C84,153 64,152 62,149Z',
  absUR:     'M101,129 L138,129 L138,149 C136,152 116,153 101,150Z',
  absML:     'M62,153 L99,153 L99,171 C84,174 64,172 62,169Z',
  absMR:     'M101,153 L138,153 L138,169 C136,172 116,174 101,171Z',
  absLL:     'M65,174 L99,174 L99,190 C88,193 67,191 65,188Z',
  absLR:     'M101,174 L135,174 L135,188 C133,191 112,193 101,190Z',
  lOblique:  'M52,129 C49,131 48,157 51,194 L65,194 L64,174 C62,162 60,141 62,131Z',
  rOblique:  'M148,129 C151,131 152,157 149,194 L135,194 L136,174 C138,162 140,141 138,131Z',
  lVL:       'M61,200 C59,224 57,268 56,308 L74,308 C76,268 78,224 79,200Z',
  lRF:       'M81,200 C80,224 79,268 78,308 L98,308 C98,268 99,224 100,200Z',
  lVM:       'M79,296 C77,285 86,276 98,281 L97,308 L79,308Z',
  rVL:       'M139,200 C141,224 143,268 144,308 L126,308 C124,268 122,224 121,200Z',
  rRF:       'M119,200 C120,224 121,268 122,308 L102,308 C102,268 101,224 100,200Z',
  rVM:       'M121,296 C123,285 114,276 102,281 L103,308 L121,308Z',
  lCalfF:    'M57,310 C55,330 54,354 55,375 L88,375 C89,354 89,330 88,310Z',
  rCalfF:    'M143,310 C145,330 146,354 145,375 L112,375 C111,354 111,330 112,310Z',
};

// ─── Back muscle paths ───────────────────────────────────────────────────────

const BACK: Record<string, string> = {
  traps:     'M60,78 L100,72 L140,78 L136,124 L100,130 L64,124Z',
  lDeltoid:  'M35,93 C24,80 19,91 21,110 C23,128 37,134 50,129 L55,112 L52,97Z',
  rDeltoid:  'M165,93 C176,80 181,91 179,110 C177,128 163,134 150,129 L145,112 L148,97Z',
  lInfra:    'M62,89 L97,91 L95,126 L65,124Z',
  rInfra:    'M138,89 L103,91 L105,126 L135,124Z',
  lLat:      'M53,121 C45,142 41,167 45,190 L68,187 L67,130Z',
  rLat:      'M147,121 C155,142 159,167 155,190 L132,187 L133,130Z',
  lTricep:   'M21,110 C17,131 17,152 21,171 L42,169 C46,149 50,128 53,112Z',
  rTricep:   'M179,110 C183,131 183,152 179,171 L158,169 C154,149 150,128 147,112Z',
  lForearm:  'M19,173 L40,171 C42,192 40,214 36,226 L19,224 C17,210 17,190 19,173Z',
  rForearm:  'M181,173 L160,171 C158,192 160,214 164,226 L181,224 C183,210 183,190 181,173Z',
  erectorL:  'M90,130 L97,130 L94,197 L87,197Z',
  erectorR:  'M110,130 L103,130 L106,197 L113,197Z',
  lowerBack: 'M67,187 L133,187 L131,201 L69,201Z',
  lGlute:    'M62,201 C55,203 48,221 53,248 C58,265 76,273 93,267 L95,201Z',
  rGlute:    'M138,201 C145,203 152,221 147,248 C142,265 124,273 107,267 L105,201Z',
  lHam:      'M56,268 L94,267 L90,310 L54,308Z',
  rHam:      'M144,268 L106,267 L110,310 L146,308Z',
  lGastroM:  'M57,312 L78,312 L74,374 L55,371Z',
  lGastroL:  'M80,312 L94,312 L90,376 L79,374Z',
  rGastroM:  'M143,312 L122,312 L126,374 L145,371Z',
  rGastroL:  'M120,312 L106,312 L110,376 L121,374Z',
};

// ─── Body silhouette (shared for front + back) ───────────────────────────────

const SILHOUETTE = `
  M100,9 C122,9 122,48 118,53 L134,58 C150,63 165,75 168,94 L176,102
  C178,119 176,149 174,169 L172,224 L158,228 L147,227
  C145,221 140,201 138,198 L138,310 L142,380 L108,380 L107,310
  L100,302 L93,310 L92,380 L58,380 L62,310 L62,198
  C60,201 55,221 53,227 L42,228 L28,224
  L26,169 C24,149 22,119 24,102
  L32,94 C35,75 50,63 66,58 L82,53 C78,48 78,9 100,9Z
`;

// ─── Anatomy definition lines (visible even when muscle is inactive) ─────────

const FRONT_LINES = [
  // Pec split (sternum)
  'M100,78 L100,128',
  // Chest-ab transition
  'M52,118 Q100,125 148,118',
  // Ab horizontal divisions
  'M62,153 L138,153',
  'M65,173 L135,173',
  // Ab vertical centre
  'M99,129 L99,190 M101,129 L101,190',
  // Shoulder-pec line
  'M52,97 C60,90 80,82 100,79',
  'M148,97 C140,90 120,82 100,79',
  // Quad separation (left)
  'M79,200 L77,308',
  'M81,200 L79,308',
  // Quad separation (right)
  'M121,200 L123,308',
  'M119,200 L121,308',
];

const BACK_LINES = [
  // Spine line
  'M100,73 L100,200',
  // Trap-lat boundary
  'M65,122 L67,187 M135,122 L133,187',
  // Shoulder-trap
  'M52,97 Q66,87 100,78 Q134,87 148,97',
  // Infra division
  'M97,91 L95,126',
  'M103,91 L105,126',
  // Glute fold
  'M93,267 Q100,270 107,267',
  // Ham separation
  'M75,268 L73,310 M125,268 L127,310',
];

// ─── Component ───────────────────────────────────────────────────────────────

interface BodyMapProps {
  musclesWorked: string[];
}

const INACTIVE_FILL   = '#221d16';
const INACTIVE_STROKE = '#352e24';
const ACTIVE_FILL     = 'hsl(270 58% 52% / 0.82)';
const ACTIVE_STROKE   = 'hsl(270 70% 74%)';
const LINE_STROKE     = '#3a3228';

export const BodyMap = ({ musclesWorked }: BodyMapProps) => {
  const frontActive = new Set<string>();
  const backActive  = new Set<string>();

  musclesWorked.forEach(m => {
    const map = MUSCLE_MAP[m.toUpperCase()];
    if (map) {
      map.front.forEach(id => frontActive.add(id));
      map.back .forEach(id => backActive .add(id));
    }
  });

  const renderMuscles = (paths: Record<string, string>, active: Set<string>) =>
    Object.entries(paths).map(([id, d]) => {
      const on = active.has(id);
      return (
        <path
          key={id}
          d={d}
          fill={on ? ACTIVE_FILL   : INACTIVE_FILL}
          stroke={on ? ACTIVE_STROKE : INACTIVE_STROKE}
          strokeWidth={on ? '1.2' : '0.6'}
          filter={on ? 'url(#mglow)' : undefined}
        />
      );
    });

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 418 430"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="mglow" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── FRONT BODY ── */}
        <g transform="translate(4, 6)">
          {/* Silhouette */}
          <path d={SILHOUETTE} fill="#1b1712" stroke="#2e2820" strokeWidth="1" />
          {/* Head */}
          <circle cx="100" cy="30" r="22" fill="#1b1712" stroke="#2e2820" strokeWidth="1" />
          {/* Neck */}
          <path d="M87,51 Q100,47 113,51 L115,72 Q100,76 85,72Z" fill="#1e1a14" stroke="#2e2820" strokeWidth="0.6" />
          {/* Hands */}
          <ellipse cx="29" cy="228" rx="10" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          <ellipse cx="171" cy="228" rx="10" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          {/* Feet */}
          <ellipse cx="72"  cy="382" rx="16" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          <ellipse cx="128" cy="382" rx="16" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          {/* Muscle definition lines */}
          {FRONT_LINES.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={LINE_STROKE} strokeWidth="0.5" strokeLinecap="round" />
          ))}
          {/* Muscles */}
          {renderMuscles(FRONT, frontActive)}
          {/* Label */}
          <text x="100" y="418" textAnchor="middle" fill="#4a4035" fontSize="10" fontFamily="Rajdhani, sans-serif" fontWeight="700" letterSpacing="3">FRONT</text>
        </g>

        {/* ── DIVIDER ── */}
        <line x1="213" y1="10" x2="213" y2="418" stroke="#2a2520" strokeWidth="1" />

        {/* ── BACK BODY ── */}
        <g transform="translate(218, 6)">
          {/* Silhouette */}
          <path d={SILHOUETTE} fill="#1b1712" stroke="#2e2820" strokeWidth="1" />
          {/* Head */}
          <circle cx="100" cy="30" r="22" fill="#1b1712" stroke="#2e2820" strokeWidth="1" />
          {/* Back of neck */}
          <path d="M87,51 Q100,47 113,51 L115,72 Q100,76 85,72Z" fill="#1e1a14" stroke="#2e2820" strokeWidth="0.6" />
          {/* Hands */}
          <ellipse cx="29" cy="228" rx="10" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          <ellipse cx="171" cy="228" rx="10" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          {/* Feet */}
          <ellipse cx="72"  cy="382" rx="16" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          <ellipse cx="128" cy="382" rx="16" ry="7" fill="#1b1712" stroke="#2e2820" strokeWidth="0.6" />
          {/* Muscle definition lines */}
          {BACK_LINES.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={LINE_STROKE} strokeWidth="0.5" strokeLinecap="round" />
          ))}
          {/* Muscles */}
          {renderMuscles(BACK, backActive)}
          {/* Label */}
          <text x="100" y="418" textAnchor="middle" fill="#4a4035" fontSize="10" fontFamily="Rajdhani, sans-serif" fontWeight="700" letterSpacing="3">BACK</text>
        </g>
      </svg>

      {/* Muscle tags */}
      {musclesWorked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-3">
          {musclesWorked.map(m => (
            <span key={m} className="px-2 py-1 text-[9px] font-bold tracking-widest uppercase bg-primary/15 border border-primary/35 text-primary">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
