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
}

/* ── Peter's 3-Day Split ─────────────────────────────────────────────────── */

export const PROGRAMS: Program[] = [
  {
    id: 'peters-split',
    name: "Peter's 3-Day Split",
    clientName: 'Peter',
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
];
