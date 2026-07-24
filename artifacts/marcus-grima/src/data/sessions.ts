/* ── Session data (shared by Home & Sessions) ─────────────────────────────── */

export interface ExerciseRow { name: string; sets: string; muscle: string; }

export interface UpcomingSession {
  id: number; date: string; time: string; duration: string;
  location: string; status: string;
  focus: string;
  plannedExercises: ExerciseRow[];
}

export interface PastSession {
  id: number; date: string; time: string; duration: string;
  location: string; status: string; exercises: number;
  name: string;
  musclesWorked: string[];
  exerciseList: ExerciseRow[];
}

export const upcoming: UpcomingSession[] = [
  {
    id: 1, date: 'THURSDAY, 24 JULY', time: '07:00 AM', duration: '60 MIN',
    location: 'Fort Fitness Mriehel', status: 'CONFIRMED',
    focus: 'STRENGTH & CONDITIONING',
    plannedExercises: [
      { name: 'Deadlifts',             sets: '4 × 5 @ 120kg',  muscle: 'BACK'      },
      { name: 'Barbell Row',           sets: '4 × 8 @ 80kg',   muscle: 'BACK'      },
      { name: 'Pull-Ups',              sets: '3 × max',        muscle: 'BACK'      },
      { name: 'Romanian Deadlift',     sets: '3 × 10 @ 90kg',  muscle: 'HAMSTRINGS'},
      { name: 'Seated Cable Row',      sets: '3 × 12 @ 60kg',  muscle: 'BACK'      },
      { name: 'Face Pulls',            sets: '3 × 15 @ 25kg',  muscle: 'SHOULDERS' },
      { name: 'Barbell Curl',          sets: '3 × 10 @ 35kg',  muscle: 'BICEPS'    },
    ],
  },
  {
    id: 2, date: 'SATURDAY, 26 JULY', time: '08:30 AM', duration: '60 MIN',
    location: 'Fort Fitness Sliema', status: 'CONFIRMED',
    focus: 'LOWER BODY POWER',
    plannedExercises: [
      { name: 'Back Squat',            sets: '5 × 5 @ 100kg',  muscle: 'QUADS'     },
      { name: 'Bulgarian Split Squat', sets: '3 × 10 each',    muscle: 'QUADS'     },
      { name: 'Hip Thrust',            sets: '4 × 12 @ 80kg',  muscle: 'GLUTES'    },
      { name: 'Leg Press',             sets: '3 × 15 @ 120kg', muscle: 'QUADS'     },
      { name: 'Lying Leg Curl',        sets: '3 × 12 @ 40kg',  muscle: 'HAMSTRINGS'},
      { name: 'Standing Calf Raise',   sets: '4 × 20',         muscle: 'CALVES'    },
    ],
  },
  {
    id: 3, date: 'TUESDAY, 29 JULY', time: '07:00 AM', duration: '60 MIN',
    location: 'Fort Fitness Mriehel', status: 'PENDING',
    focus: 'UPPER BODY HYPERTROPHY',
    plannedExercises: [
      { name: 'Incline Bench Press',   sets: '4 × 8 @ 70kg',   muscle: 'CHEST'     },
      { name: 'Seated Shoulder Press', sets: '4 × 10 @ 50kg',  muscle: 'SHOULDERS' },
      { name: 'Lateral Raises',        sets: '4 × 15 @ 12kg',  muscle: 'SHOULDERS' },
      { name: 'Cable Flyes',           sets: '3 × 15 @ 15kg',  muscle: 'CHEST'     },
      { name: 'Skull Crushers',        sets: '3 × 12 @ 30kg',  muscle: 'TRICEPS'   },
      { name: 'Tricep Rope Pushdown',  sets: '3 × 15 @ 25kg',  muscle: 'TRICEPS'   },
    ],
  },
];

export const past: PastSession[] = [
  {
    id: 4, date: 'TUESDAY, 22 JULY', time: '07:00 AM', duration: '55 MIN',
    location: 'Fort Fitness Mriehel', status: 'COMPLETED', exercises: 7,
    name: 'UPPER BODY POWER',
    musclesWorked: ['CHEST', 'SHOULDERS', 'TRICEPS'],
    exerciseList: [
      { name: 'Bench Press',           sets: '4 × 8 @ 80kg',  muscle: 'CHEST'     },
      { name: 'Overhead Press',        sets: '3 × 10 @ 50kg', muscle: 'SHOULDERS' },
      { name: 'Incline Dumbbell Press',sets: '3 × 12 @ 28kg', muscle: 'CHEST'     },
      { name: 'Lateral Raises',        sets: '4 × 15 @ 10kg', muscle: 'SHOULDERS' },
      { name: 'Skull Crushers',        sets: '3 × 12 @ 30kg', muscle: 'TRICEPS'   },
      { name: 'Cable Flyes',           sets: '3 × 15 @ 15kg', muscle: 'CHEST'     },
      { name: 'Tricep Dips',           sets: '3 × failure',   muscle: 'TRICEPS'   },
    ],
  },
  {
    id: 5, date: 'SATURDAY, 19 JULY', time: '09:00 AM', duration: '60 MIN',
    location: 'Fort Fitness Sliema', status: 'COMPLETED', exercises: 9,
    name: 'BACK & BICEPS',
    musclesWorked: ['BACK', 'BICEPS', 'LATS'],
    exerciseList: [
      { name: 'Deadlifts',             sets: '4 × 5 @ 120kg', muscle: 'BACK'   },
      { name: 'Pull-Ups',              sets: '4 × 8',         muscle: 'LATS'   },
      { name: 'Barbell Row',           sets: '3 × 10 @ 80kg', muscle: 'BACK'   },
      { name: 'Seated Cable Row',      sets: '3 × 12 @ 60kg', muscle: 'BACK'   },
      { name: 'Lat Pull-Down',         sets: '3 × 12 @ 65kg', muscle: 'LATS'   },
      { name: 'Barbell Curl',          sets: '3 × 10 @ 35kg', muscle: 'BICEPS' },
      { name: 'Hammer Curls',          sets: '3 × 12 @ 16kg', muscle: 'BICEPS' },
      { name: 'Face Pulls',            sets: '3 × 15 @ 25kg', muscle: 'BACK'   },
      { name: 'Hyperextension',        sets: '3 × 15',        muscle: 'BACK'   },
    ],
  },
  {
    id: 6, date: 'THURSDAY, 17 JULY', time: '07:00 AM', duration: '60 MIN',
    location: 'Fort Fitness Mriehel', status: 'COMPLETED', exercises: 8,
    name: 'LEGS & GLUTES',
    musclesWorked: ['QUADS', 'HAMSTRINGS', 'GLUTES'],
    exerciseList: [
      { name: 'Back Squat',            sets: '5 × 5 @ 100kg',  muscle: 'QUADS'     },
      { name: 'Romanian Deadlift',     sets: '3 × 10 @ 90kg',  muscle: 'HAMSTRINGS'},
      { name: 'Leg Press',             sets: '4 × 12 @ 140kg', muscle: 'QUADS'     },
      { name: 'Hip Thrust',            sets: '3 × 12 @ 80kg',  muscle: 'GLUTES'    },
      { name: 'Walking Lunges',        sets: '3 × 12 each',    muscle: 'QUADS'     },
      { name: 'Leg Curl',              sets: '3 × 12 @ 40kg',  muscle: 'HAMSTRINGS'},
      { name: 'Abductor Machine',      sets: '3 × 15 @ 45kg',  muscle: 'GLUTES'    },
      { name: 'Calf Raises',           sets: '4 × 20',         muscle: 'CALVES'    },
    ],
  },
  {
    id: 7, date: 'TUESDAY, 15 JULY', time: '07:00 AM', duration: '45 MIN',
    location: 'Fort Fitness Mriehel', status: 'CANCELLED', exercises: 0,
    name: 'CANCELLED', musclesWorked: [], exerciseList: [],
  },
  {
    id: 8, date: 'SATURDAY, 12 JULY', time: '09:00 AM', duration: '60 MIN',
    location: 'Fort Fitness Sliema', status: 'COMPLETED', exercises: 6,
    name: 'FULL BODY STRENGTH',
    musclesWorked: ['CHEST', 'BACK', 'LEGS'],
    exerciseList: [
      { name: 'Bench Press',           sets: '4 × 6 @ 82.5kg', muscle: 'CHEST'     },
      { name: 'Deadlifts',             sets: '3 × 5 @ 120kg',  muscle: 'BACK'      },
      { name: 'Back Squat',            sets: '3 × 6 @ 95kg',   muscle: 'QUADS'     },
      { name: 'Pull-Ups',              sets: '3 × 8',          muscle: 'BACK'      },
      { name: 'Overhead Press',        sets: '3 × 8 @ 52.5kg', muscle: 'SHOULDERS' },
      { name: 'Romanian Deadlift',     sets: '3 × 10 @ 80kg',  muscle: 'HAMSTRINGS'},
    ],
  },
  {
    id: 9, date: 'THURSDAY, 10 JULY', time: '07:00 AM', duration: '55 MIN',
    location: 'Fort Fitness Mriehel', status: 'COMPLETED', exercises: 7,
    name: 'PUSH DAY',
    musclesWorked: ['CHEST', 'SHOULDERS', 'TRICEPS'],
    exerciseList: [
      { name: 'Flat Bench Press',      sets: '4 × 8 @ 80kg',  muscle: 'CHEST'     },
      { name: 'Incline DB Press',      sets: '3 × 10 @ 30kg', muscle: 'CHEST'     },
      { name: 'Seated Shoulder Press', sets: '3 × 10 @ 50kg', muscle: 'SHOULDERS' },
      { name: 'Lateral Raises',        sets: '4 × 15 @ 10kg', muscle: 'SHOULDERS' },
      { name: 'Tricep Dips',           sets: '3 × 12',        muscle: 'TRICEPS'   },
      { name: 'Rope Pushdown',         sets: '3 × 15 @ 25kg', muscle: 'TRICEPS'   },
      { name: 'Cable Flyes',           sets: '3 × 15 @ 12kg', muscle: 'CHEST'     },
    ],
  },
];
