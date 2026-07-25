/* ── Program / Workout data ────────────────────────────────────────────────
 * Sourced from "Peter's Program" PDF provided by Marcus Grima PT.
 * Each exercise includes coaching cues, muscle targets, and set/rep schemes.
 * ───────────────────────────────────────────────────────────────────────── */

export interface SetLog {
  reps: number | '';
  weight: number | '';
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;          // display string e.g. "8–12" or "AMRAP"
  restSeconds: number;
  primaryMuscle: string; // for chip display
  musclesWorked: string[]; // matches WORKOUT_MAP keys in BodyMap
  equipment: string;
  cues: string[];
}

export interface Workout {
  id: string;
  name: string;          // "Back & Biceps"
  tag: string;           // "BACK & BICEPS"
  day: string;           // "Monday"
  estimatedMinutes: number;
  colour: string;        // accent colour for card
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  clientName: string;
  description: string;
  daysPerWeek: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: string;
  workouts: Workout[];
  premium?: boolean;
  price?: string;          // display price e.g. "£9.99"
  priceLabel?: string;     // e.g. "one-time"
  emoji?: string;
  highlights?: string[];   // bullet points on paywall
}

/* ── Free program — personalized "<Client>'s 3-Day Split" ────────────────── */

/** First name of the logged-in client (from onboarding profile), fallback "Peter". */
function clientFirstName(): string {
  try {
    const p = JSON.parse(localStorage.getItem('mg_profile') || 'null');
    const n = p?.firstName;
    if (typeof n === 'string' && n.trim()) {
      return n.trim().charAt(0).toUpperCase() + n.trim().slice(1).toLowerCase();
    }
  } catch { /* ignore */ }
  return 'Peter';
}

export const PROGRAMS: Program[] = [
  {
    id: 'peters-split',
    // Getters so the name always reflects the current client, even right after onboarding
    get name() { return `${clientFirstName()}'s 3-Day Split`; },
    get clientName() { return clientFirstName(); },
    description: 'A classic push/pull/shoulders hypertrophy split designed by Marcus. Three focused sessions per week targeting every major muscle group.',
    daysPerWeek: 3,
    difficulty: 'Intermediate',
    goal: 'Muscle & Strength',
    workouts: [

      /* ── Monday: Back & Biceps ─────────────────────────────────────────── */
      {
        id: 'back-biceps',
        name: 'Back & Biceps',
        tag: 'BACK & BICEPS',
        day: 'Monday',
        estimatedMinutes: 55,
        colour: '#7C3AED',
        exercises: [
          {
            id: 'pull-ups',
            name: 'Pull Ups',
            sets: 3,
            reps: 'AMRAP',
            restSeconds: 90,
            primaryMuscle: 'Lats',
            musclesWorked: ['LATS', 'BICEPS'],
            equipment: 'Pull-up bar',
            cues: [
              'Grip just outside shoulder width, palms facing away',
              'Initiate by depressing the scapula before pulling',
              'Drive elbows down and back — think "elbows to hips"',
              'Chin clears the bar on each rep; control the descent',
            ],
          },
          {
            id: 'seated-rows',
            name: 'Seated Rows',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Back',
            musclesWorked: ['BACK', 'BICEPS'],
            equipment: 'Cable machine',
            cues: [
              'Sit tall — no rounding of the lower back',
              'Row the handle to your lower sternum, not your belly',
              'Squeeze shoulder blades together at the peak',
              'Slow 3-second eccentric on every rep',
            ],
          },
          {
            id: 'lat-pull-downs',
            name: 'Lat Pull Downs',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Lats',
            musclesWorked: ['LATS', 'BICEPS'],
            equipment: 'Cable machine',
            cues: [
              'Slight lean back (≈ 15°), chest tall',
              'Pull bar to upper chest — not behind the neck',
              'Lead with your elbows; forearms are just hooks',
              'Fully extend arms on the way up for a full stretch',
            ],
          },
          {
            id: 'narrow-grip-pull-down',
            name: 'Narrow Grip Pull Down',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Lats',
            musclesWorked: ['LATS'],
            equipment: 'Cable machine / V-bar',
            cues: [
              'V-bar or neutral-grip attachment',
              'Keep elbows close to your sides throughout the movement',
              'Touch the bar to your upper chest on each rep',
              'Feel the inner lat stretch at full arm extension',
            ],
          },
          {
            id: 'hyper-extension',
            name: 'Hyper Extension',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Lower Back',
            musclesWorked: ['LOWER BACK', 'GLUTES', 'HAMSTRINGS'],
            equipment: 'Hyperextension bench',
            cues: [
              'Cross arms on chest or hold a plate for added resistance',
              'Hinge at the hips — keep a neutral spine throughout',
              'Rise until your body forms a straight line; do not hyperextend',
              'Squeeze glutes hard at the top of each rep',
            ],
          },
          {
            id: 'seated-hammer-curl',
            name: 'Seated Hammer Curl',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Biceps',
            musclesWorked: ['BICEPS', 'FOREARMS'],
            equipment: 'Dumbbells',
            cues: [
              'Neutral grip (thumbs up) throughout the entire rep',
              'Keep upper arms pinned to your sides',
              'Curl to shoulder height; squeeze brachialis at the top',
              'Lower slowly — 2–3 seconds on the way down',
            ],
          },
          {
            id: 'concentration-curl',
            name: 'Concentration Curl',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Biceps',
            musclesWorked: ['BICEPS'],
            equipment: 'Dumbbell',
            cues: [
              'Rest your elbow on the inside of your thigh',
              'Fully supinate the forearm (pinky up) at the top',
              'Pause for 1 second at peak contraction',
              'Complete all reps on one arm before switching',
            ],
          },
          {
            id: 'twentyone-curl',
            name: "21's with Dumbbell",
            sets: 3,
            reps: '21',
            restSeconds: 90,
            primaryMuscle: 'Biceps',
            musclesWorked: ['BICEPS'],
            equipment: 'Dumbbells / Barbell',
            cues: [
              '7 reps lower half (bottom to 90°)',
              '7 reps upper half (90° to full contraction)',
              '7 reps full range — that is one set',
              'Control each segment; do not use momentum',
            ],
          },
        ],
      },

      /* ── Wednesday: Chest & Triceps ──────────────────────────────────── */
      {
        id: 'chest-triceps',
        name: 'Chest & Triceps',
        tag: 'CHEST & TRICEPS',
        day: 'Wednesday',
        estimatedMinutes: 50,
        colour: '#9333EA',
        exercises: [
          {
            id: 'flat-bench-press',
            name: 'Flat Bench Press',
            sets: 3,
            reps: '8–12',
            restSeconds: 90,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST', 'TRICEPS', 'SHOULDERS'],
            equipment: 'Barbell & bench',
            cues: [
              'Arch your upper back, retract your shoulder blades',
              'Bar path: touch your lower chest, press back toward your face',
              'Keep your elbows at 45–75° — not flared wide',
              'Drive your feet into the floor for a full-body press',
            ],
          },
          {
            id: 'incline-dumbbell-press',
            name: 'Incline Dumbbell Press',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Upper Chest',
            musclesWorked: ['CHEST', 'SHOULDERS', 'TRICEPS'],
            equipment: 'Dumbbells & incline bench',
            cues: [
              'Set bench to 30–45° — higher than that is mostly shoulder',
              'Lower dumbbells to the sides of your chest with control',
              'Press up and slightly inward — do not touch the dumbbells at the top',
              'Full stretch at the bottom; full lockout at the top',
            ],
          },
          {
            id: 'cable-flies-mid',
            name: 'Cable Flyes Mid Grip',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST'],
            equipment: 'Cable machine',
            cues: [
              'Set cables at mid-chest height for full pec stretch',
              'Slight bend in elbows — maintain this throughout',
              'Think "hugging a tree" — arc inward, not pulling down',
              'Pause and squeeze in the middle for 1 second',
            ],
          },
          {
            id: 'weighted-push-ups',
            name: 'Weighted Push Ups',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST', 'TRICEPS'],
            equipment: 'Weight plate',
            cues: [
              'Have a partner place a plate on your upper back',
              'Hands slightly wider than shoulders, fingers forward',
              'Maintain a rigid plank — do not let hips drop',
              'Chest touches the floor on every rep',
            ],
          },
          {
            id: 'tricep-rope-extensions',
            name: 'Tricep Rope Extensions',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Triceps',
            musclesWorked: ['TRICEPS'],
            equipment: 'Cable machine / rope',
            cues: [
              'Set cable to overhead height; face away from the machine',
              'Hinge forward at the hips slightly, arms by your ears',
              'Extend fully and splay the rope apart at the bottom',
              'Keep upper arms still — only your forearms move',
            ],
          },
          {
            id: 'skull-crushers',
            name: 'Skull Crushers',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Triceps',
            musclesWorked: ['TRICEPS'],
            equipment: 'EZ-bar or dumbbells & bench',
            cues: [
              'Lower the bar toward your forehead (or just behind the head)',
              'Keep elbows pointing straight up — do not let them flare',
              'Pause at the bottom before pressing back up',
              'Can be done on a flat or slight incline for extra stretch',
            ],
          },
          {
            id: 'weighted-dips',
            name: 'Weighted Dips',
            sets: 3,
            reps: '8–12',
            restSeconds: 90,
            primaryMuscle: 'Triceps',
            musclesWorked: ['TRICEPS', 'CHEST'],
            equipment: 'Dip bars & weight belt',
            cues: [
              'Lean forward slightly for more chest; stay upright for more tricep',
              'Lower until elbows are at 90° or just past',
              'Do not lock out completely at the top — keep tension on the tricep',
              'Add weight via a dip belt once bodyweight is easy',
            ],
          },
        ],
      },

      /* ── Friday: Shoulders ───────────────────────────────────────────── */
      {
        id: 'shoulders',
        name: 'Shoulders',
        tag: 'SHOULDERS',
        day: 'Friday',
        estimatedMinutes: 45,
        colour: '#6D28D9',
        exercises: [
          {
            id: 'seated-shoulder-press',
            name: 'Seated Shoulder Press',
            sets: 3,
            reps: '8–12',
            restSeconds: 90,
            primaryMuscle: 'Shoulders',
            musclesWorked: ['SHOULDERS', 'TRICEPS'],
            equipment: 'Dumbbells / Barbell',
            cues: [
              'Sit upright with lower back supported',
              'Start with elbows at 90°, dumbbells at ear height',
              'Press directly overhead — do not press forward',
              'Avoid locking out fully to maintain shoulder tension',
            ],
          },
          {
            id: 'lateral-raises',
            name: 'Dumbbell Lateral Raises',
            sets: 3,
            reps: '8–12',
            restSeconds: 45,
            primaryMuscle: 'Lateral Delts',
            musclesWorked: ['SHOULDERS'],
            equipment: 'Dumbbells',
            cues: [
              'Slight bend in elbows; lead with the elbow not the wrist',
              'Raise to shoulder height — no higher',
              'Tilt pinky up slightly (like pouring a jug of water)',
              'Control the descent; fight gravity on the way down',
            ],
          },
          {
            id: 'forward-raises',
            name: 'Dumbbell Forward Raises',
            sets: 3,
            reps: '8–12',
            restSeconds: 45,
            primaryMuscle: 'Front Delts',
            musclesWorked: ['SHOULDERS'],
            equipment: 'Dumbbells',
            cues: [
              'Alternate arms or do both together',
              'Raise to shoulder height — not above',
              'Slight bend in the elbow; keep core braced',
              'Do not swing — use strict, controlled movement',
            ],
          },
          {
            id: 'face-pulls',
            name: 'Face Pulls',
            sets: 3,
            reps: '8–12',
            restSeconds: 45,
            primaryMuscle: 'Rear Delts',
            musclesWorked: ['SHOULDERS', 'TRAPS'],
            equipment: 'Cable machine / rope',
            cues: [
              'Set cable at face height or slightly above',
              'Pull the rope toward your face, flaring elbows out and back',
              'External rotate at the top — thumbs point behind you',
              'Essential for shoulder health — do not skip this one',
            ],
          },
          {
            id: 'rear-delt-fly',
            name: 'Rear Delt Fly',
            sets: 3,
            reps: '8–12',
            restSeconds: 45,
            primaryMuscle: 'Rear Delts',
            musclesWorked: ['SHOULDERS', 'UPPER BACK'],
            equipment: 'Dumbbells',
            cues: [
              'Hinge forward to 45° or lie chest-down on an incline bench',
              'Arms arc out to the sides with a soft elbow bend',
              'Lead with the elbow; squeeze rhomboids at the top',
              'Keep the movement slow — momentum kills the stimulus',
            ],
          },
          {
            id: 'shrugs',
            name: 'Shrugs',
            sets: 3,
            reps: '8–12',
            restSeconds: 60,
            primaryMuscle: 'Traps',
            musclesWorked: ['TRAPS'],
            equipment: 'Dumbbells / Barbell',
            cues: [
              'Elevate straight up — do not roll your shoulders',
              'Pause at the top for 1–2 seconds',
              'Lower slowly and fully for a complete stretch',
              'Use straps if grip is the limiting factor',
            ],
          },
        ],
      },
    ],
  },

  /* ── Hotel Room Workout ──────────────────────────────────────────────── */
  {
    id: 'hotel-room',
    name: 'Hotel Room Workout',
    clientName: 'All Clients',
    description: 'No gym, no excuses. Four full-body circuits built for a 5-star hotel room — zero equipment, maximum output.',
    daysPerWeek: 4,
    difficulty: 'Intermediate',
    goal: 'Maintain & Burn',
    premium: true,
    price: '£9.99',
    priceLabel: 'one-time unlock',
    emoji: '🏨',
    highlights: [
      '4 full-body circuits',
      'Zero equipment needed',
      'Fits in any hotel room',
      'Coaching cues for every exercise',
      '30–40 min per session',
    ],
    workouts: [
      {
        id: 'hotel-circuit-a',
        name: 'Full Body HIIT',
        tag: 'CIRCUIT A',
        day: 'Day 1',
        estimatedMinutes: 35,
        colour: '#F59E0B',
        exercises: [
          {
            id: 'burpees',
            name: 'Burpees',
            sets: 4, reps: '10', restSeconds: 60,
            primaryMuscle: 'Full Body',
            musclesWorked: ['CHEST', 'SHOULDERS', 'QUADS', 'HAMSTRINGS'],
            equipment: 'None',
            cues: ['Chest to floor on the way down', 'Explode up and jump at the top', 'Land softly with soft knees', 'Keep core braced throughout'],
          },
          {
            id: 'push-up-variations',
            name: 'Push-Up Variations',
            sets: 3, reps: '12–15', restSeconds: 45,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST', 'SHOULDERS', 'TRICEPS'],
            equipment: 'None',
            cues: ['Wide grip = more chest', 'Narrow grip = more triceps', 'Lower for 3 seconds, explode up', 'Keep hips level — no sagging'],
          },
          {
            id: 'jump-squats',
            name: 'Jump Squats',
            sets: 4, reps: '15', restSeconds: 45,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'HAMSTRINGS', 'GLUTES'],
            equipment: 'None',
            cues: ['Squat to parallel before jumping', 'Swing arms for momentum', 'Land heel-to-toe, absorb the impact', 'Immediately load into next rep'],
          },
          {
            id: 'mountain-climbers',
            name: 'Mountain Climbers',
            sets: 3, reps: '20 each', restSeconds: 30,
            primaryMuscle: 'Core',
            musclesWorked: ['ABS', 'OBLIQUES'],
            equipment: 'None',
            cues: ['Hips stay level — do not bounce', 'Drive the knee toward the opposite elbow', 'Keep arms fully locked out', 'Breathe in rhythm with the movement'],
          },
          {
            id: 'plank-hold',
            name: 'Plank Hold',
            sets: 3, reps: '45 sec', restSeconds: 30,
            primaryMuscle: 'Core',
            musclesWorked: ['ABS', 'OBLIQUES'],
            equipment: 'None',
            cues: ['Shoulders directly over wrists', 'Squeeze glutes and quads', 'Eyes to the floor — neutral spine', 'Breathe slowly and steadily'],
          },
        ],
      },
      {
        id: 'hotel-circuit-b',
        name: 'Push & Core Burn',
        tag: 'CIRCUIT B',
        day: 'Day 2',
        estimatedMinutes: 30,
        colour: '#F59E0B',
        exercises: [
          {
            id: 'pike-push-ups',
            name: 'Pike Push-Ups',
            sets: 4, reps: '10–12', restSeconds: 60,
            primaryMuscle: 'Shoulders',
            musclesWorked: ['SHOULDERS', 'TRICEPS'],
            equipment: 'None',
            cues: ['Form an inverted V with your body', 'Lower your head toward the floor', 'Push through your palms to return', 'The steeper the angle, the harder it gets'],
          },
          {
            id: 'tricep-chair-dips',
            name: 'Tricep Chair Dips',
            sets: 3, reps: '15', restSeconds: 45,
            primaryMuscle: 'Triceps',
            musclesWorked: ['TRICEPS', 'CHEST'],
            equipment: 'Chair',
            cues: ['Hands shoulder-width on the chair edge', 'Keep elbows pointing back — not flared', 'Lower until elbows hit 90°', 'Drive through the heel of the palm to lock out'],
          },
          {
            id: 'wide-push-ups',
            name: 'Wide Push-Ups',
            sets: 3, reps: 'Max', restSeconds: 60,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST', 'SHOULDERS'],
            equipment: 'None',
            cues: ['Hands 1.5× shoulder width', 'Elbows flare to ~45°', 'Touch chest to floor each rep', 'No half reps — full range only'],
          },
          {
            id: 'leg-raises',
            name: 'Leg Raises',
            sets: 3, reps: '15', restSeconds: 30,
            primaryMuscle: 'Core',
            musclesWorked: ['ABS'],
            equipment: 'None',
            cues: ['Lie flat, hands under lower back', 'Keep legs straight throughout', 'Lower slowly — do not let feet touch', 'Exhale as you raise, inhale as you lower'],
          },
        ],
      },
      {
        id: 'hotel-circuit-c',
        name: 'Legs & Glutes',
        tag: 'CIRCUIT C',
        day: 'Day 3',
        estimatedMinutes: 38,
        colour: '#F59E0B',
        exercises: [
          {
            id: 'bulgarian-split-squats',
            name: 'Bulgarian Split Squats',
            sets: 3, reps: '12 each', restSeconds: 60,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'GLUTES', 'HAMSTRINGS'],
            equipment: 'Chair/Bed',
            cues: ['Rear foot elevated on the bed or chair', 'Front foot far enough forward so knee stays behind toe', 'Sink straight down — do not lean forward', 'Drive through the heel to stand'],
          },
          {
            id: 'glute-bridge-hold',
            name: 'Glute Bridge Hold',
            sets: 4, reps: '20 + 5 sec hold', restSeconds: 45,
            primaryMuscle: 'Glutes',
            musclesWorked: ['GLUTES', 'HAMSTRINGS'],
            equipment: 'None',
            cues: ['Feet hip-width, toes slightly out', 'Drive hips to full extension', 'Squeeze hard at the top for 5 seconds', 'Lower slowly — 3 second descent'],
          },
          {
            id: 'reverse-lunges',
            name: 'Reverse Lunges',
            sets: 3, reps: '12 each leg', restSeconds: 45,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'GLUTES'],
            equipment: 'None',
            cues: ['Step directly back — not to the side', 'Back knee hovers 1 inch from the floor', 'Front knee stays stacked over ankle', 'Push through front heel to return'],
          },
          {
            id: 'wall-sit',
            name: 'Wall Sit',
            sets: 3, reps: '45–60 sec', restSeconds: 60,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'GLUTES'],
            equipment: 'Wall',
            cues: ['Thighs parallel to the floor', 'Back flat against the wall', 'Knees at 90° — directly above ankles', 'Breathe steadily — do not hold your breath'],
          },
        ],
      },
      {
        id: 'hotel-circuit-d',
        name: 'Mobility & Finisher',
        tag: 'CIRCUIT D',
        day: 'Day 4',
        estimatedMinutes: 28,
        colour: '#F59E0B',
        exercises: [
          {
            id: 'inchworms',
            name: 'Inchworms',
            sets: 3, reps: '8', restSeconds: 45,
            primaryMuscle: 'Full Body',
            musclesWorked: ['ABS', 'SHOULDERS', 'HAMSTRINGS'],
            equipment: 'None',
            cues: ['Stand tall, hinge forward and walk hands out to plank', 'Hold for 1 second in plank', 'Walk hands back to feet', 'Keep legs as straight as possible throughout'],
          },
          {
            id: 'spiderman-push-ups',
            name: 'Spiderman Push-Ups',
            sets: 3, reps: '10 each', restSeconds: 45,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST', 'OBLIQUES', 'SHOULDERS'],
            equipment: 'None',
            cues: ['As you lower, bring one knee to the same-side elbow', 'Alternate sides each rep', 'Keep hips level — no rotation', 'Full push-up depth on every rep'],
          },
          {
            id: 'squat-pulses',
            name: 'Squat Pulses',
            sets: 3, reps: '30', restSeconds: 30,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'GLUTES'],
            equipment: 'None',
            cues: ['Hold parallel squat position throughout', 'Pulse 3–4 inches up and down', 'Do not fully stand between reps', 'Embrace the burn — stay in the pocket'],
          },
        ],
      },
    ],
  },

  /* ── Pre-Beach Pump ──────────────────────────────────────────────────── */
  {
    id: 'pre-beach-pump',
    name: 'Pre-Beach Pump',
    clientName: 'All Clients',
    description: 'Two targeted sessions designed to fill out your muscles and look your absolute best within 48 hours. Science-backed pump protocol.',
    daysPerWeek: 2,
    difficulty: 'Intermediate',
    goal: 'Aesthetics & Pump',
    premium: true,
    price: '£14.99',
    priceLabel: 'one-time unlock',
    emoji: '🏖️',
    highlights: [
      '2 targeted pump sessions',
      'Upper & lower body split',
      'High-volume, isolation focus',
      'Timed correctly for 48hrs out',
      'Includes Marcus\' exact beach-day protocol',
    ],
    workouts: [
      {
        id: 'beach-upper',
        name: 'Upper Body Pump',
        tag: 'DAY 1',
        day: 'Day 1',
        estimatedMinutes: 50,
        colour: '#06B6D4',
        exercises: [
          {
            id: 'cable-chest-fly-low',
            name: 'Cable Chest Fly (Low)',
            sets: 4, reps: '15', restSeconds: 45,
            primaryMuscle: 'Chest',
            musclesWorked: ['CHEST'],
            equipment: 'Cable machine',
            cues: ['Slight forward lean at the hips', 'Arms arc upward — imagine hugging a barrel', 'Squeeze hard at the top for 1–2 seconds', 'Lower with control — feel the stretch'],
          },
          {
            id: 'db-lateral-raise-pump',
            name: 'Lateral Raises (Pump Set)',
            sets: 5, reps: '20', restSeconds: 30,
            primaryMuscle: 'Shoulders',
            musclesWorked: ['SHOULDERS'],
            equipment: 'Dumbbells',
            cues: ['Light weight, high reps — chase the burn', 'Lead with the elbows, not the wrists', 'Stop at shoulder height — no higher', 'Slow on the way down, 2 second descent'],
          },
          {
            id: 'incline-curl',
            name: 'Incline Dumbbell Curl',
            sets: 4, reps: '12', restSeconds: 45,
            primaryMuscle: 'Biceps',
            musclesWorked: ['BICEPS'],
            equipment: 'Incline bench + dumbbells',
            cues: ['Shoulder blades pinned to the pad', 'Full hang at the bottom for maximum stretch', 'Curl and supinate at the top', 'Do not swing — pure isolation'],
          },
          {
            id: 'rope-pushdown-pump',
            name: 'Rope Pushdown (High Rep)',
            sets: 4, reps: '20', restSeconds: 30,
            primaryMuscle: 'Triceps',
            musclesWorked: ['TRICEPS'],
            equipment: 'Cable machine + rope',
            cues: ['Flare the rope out at the bottom', 'Lock out fully on every rep', 'Elbows glued to your sides', 'Slow the negative — 2 seconds down'],
          },
          {
            id: 'face-pull-pump',
            name: 'Face Pulls',
            sets: 3, reps: '20', restSeconds: 30,
            primaryMuscle: 'Rear Delts',
            musclesWorked: ['SHOULDERS'],
            equipment: 'Cable machine + rope',
            cues: ['Pull to the nose, not the neck', 'Elbows stay higher than wrists', 'External rotate at the end — hands back', 'Slow and controlled — no jerking'],
          },
          {
            id: 'hammer-curl-beach',
            name: 'Hammer Curls',
            sets: 3, reps: '15', restSeconds: 30,
            primaryMuscle: 'Biceps',
            musclesWorked: ['BICEPS'],
            equipment: 'Dumbbells',
            cues: ['Neutral grip — thumb up throughout', 'Targets the brachialis for arm thickness', 'Full extension at the bottom', 'No body swing — strict form'],
          },
        ],
      },
      {
        id: 'beach-lower',
        name: 'Lower Body Pump',
        tag: 'DAY 2',
        day: 'Day 2',
        estimatedMinutes: 45,
        colour: '#06B6D4',
        exercises: [
          {
            id: 'leg-press-pump',
            name: 'Leg Press (High Rep)',
            sets: 4, reps: '20', restSeconds: 60,
            primaryMuscle: 'Quads',
            musclesWorked: ['QUADS', 'GLUTES'],
            equipment: 'Leg press machine',
            cues: ['Feet shoulder-width, toes slightly out', 'Lower until knees hit 90° — no lower back rounding', 'Drive through the entire foot, not just the toes', 'Do not lock out fully at the top — keep tension'],
          },
          {
            id: 'hip-thrust-pump',
            name: 'Hip Thrusts',
            sets: 4, reps: '15', restSeconds: 60,
            primaryMuscle: 'Glutes',
            musclesWorked: ['GLUTES', 'HAMSTRINGS'],
            equipment: 'Bench + barbell',
            cues: ['Upper back rests on the bench edge', 'Drive hips to full extension — squeeze hard', 'Chin tucked — do not hyperextend the neck', 'Pause 1–2 seconds at the top'],
          },
          {
            id: 'leg-curl-pump',
            name: 'Lying Leg Curl',
            sets: 4, reps: '15', restSeconds: 45,
            primaryMuscle: 'Hamstrings',
            musclesWorked: ['HAMSTRINGS'],
            equipment: 'Leg curl machine',
            cues: ['Hips stay flat on the pad', 'Full range — from straight to full curl', 'Squeeze hard at full contraction', '3-second negative on every rep'],
          },
          {
            id: 'calf-raise-pump',
            name: 'Standing Calf Raises',
            sets: 4, reps: '25', restSeconds: 30,
            primaryMuscle: 'Calves',
            musclesWorked: ['CALVES'],
            equipment: 'Calf raise machine or step',
            cues: ['Full range — deep stretch at the bottom', 'Rise to full tip-toe at the top', 'Pause 1 second at peak contraction', 'Go slow — calves respond to time under tension'],
          },
        ],
      },
    ],
  },
];
