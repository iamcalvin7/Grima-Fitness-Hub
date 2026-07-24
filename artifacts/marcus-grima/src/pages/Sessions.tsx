import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Timer, MapPin, ChevronRight, Plus,
  CheckCircle2, XCircle, ChevronLeft, X, Check, Dumbbell,
} from 'lucide-react';
import { BodyMap } from '@/components/BodyMap';
import type { Page } from '@/App';

interface SessionsProps {
  setPage:       (page: Page) => void;
  openSessionId?: number;
}

/* ── Session data ──────────────────────────────────────────────────────────── */

interface ExerciseRow { name: string; sets: string; muscle: string; }

interface UpcomingSession {
  id: number; date: string; time: string; duration: string;
  location: string; status: string;
  focus: string;
  plannedExercises: ExerciseRow[];
}

interface PastSession {
  id: number; date: string; time: string; duration: string;
  location: string; status: string; exercises: number;
  name: string;
  musclesWorked: string[];
  exerciseList: ExerciseRow[];
}

const upcoming: UpcomingSession[] = [
  {
    id: 1, date: 'THURSDAY, 24 JULY', time: '07:00 AM', duration: '60 MIN',
    location: 'Marcus Grima Studio, London', status: 'CONFIRMED',
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
    location: 'Marcus Grima Studio, London', status: 'CONFIRMED',
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
    location: 'Marcus Grima Studio, London', status: 'PENDING',
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

const past: PastSession[] = [
  {
    id: 4, date: 'TUESDAY, 22 JULY', time: '07:00 AM', duration: '55 MIN',
    location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 7,
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
    location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 9,
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
    location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 8,
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
    location: 'Marcus Grima Studio, London', status: 'CANCELLED', exercises: 0,
    name: 'CANCELLED', musclesWorked: [], exerciseList: [],
  },
  {
    id: 8, date: 'SATURDAY, 12 JULY', time: '09:00 AM', duration: '60 MIN',
    location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 6,
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
    location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 7,
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

/* ── Availability data ─────────────────────────────────────────────────────── */
const TODAY = new Date(2026, 6, 24);
type SlotStatus = 'available' | 'booked' | 'off';
interface DaySlots { slots: { time: string; status: SlotStatus }[]; }

function buildAvailability(): Map<string, DaySlots> {
  const map = new Map<string, DaySlots>();
  const weekdaySlots = ['06:00','07:00','08:00','12:00','13:00','17:00','18:00','19:00'];
  const satSlots     = ['08:00','09:00','10:00','11:00'];
  const bookedMap: Record<string, string[]> = {
    '2026-07-24': ['07:00','08:00'], '2026-07-25': ['06:00','17:00','19:00'],
    '2026-07-26': ['09:00'],         '2026-07-28': ['07:00','12:00','18:00'],
    '2026-07-29': ['07:00'],         '2026-07-30': ['06:00','08:00','13:00'],
    '2026-07-31': ['07:00','17:00','19:00'], '2026-08-01': ['08:00','11:00'],
    '2026-08-04': ['06:00','12:00'], '2026-08-05': ['17:00'],
    '2026-08-06': ['09:00','10:00'], '2026-08-11': ['07:00','08:00','18:00'],
  };
  for (let i = 0; i < 28; i++) {
    const d = new Date(TODAY); d.setDate(TODAY.getDate() + i);
    const dow = d.getDay(); const key = d.toISOString().slice(0, 10);
    if (dow === 0) { map.set(key, { slots: [] }); continue; }
    const rawSlots = dow === 6 ? satSlots : weekdaySlots;
    const booked = bookedMap[key] ?? [];
    map.set(key, { slots: rawSlots.map(t => ({ time: t, status: booked.includes(t) ? 'booked' : 'available' })) });
  }
  return map;
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dateKey(d: Date) { return d.toISOString().slice(0, 10); }
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Mo','Tu','We','Th','Fr','Sa','Su'];

/* ── Status badge ──────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'CONFIRMED') return <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider whitespace-nowrap">CONFIRMED</span>;
  if (status === 'PENDING')   return <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-1 font-bold tracking-wider whitespace-nowrap">PENDING</span>;
  if (status === 'COMPLETED') return <span className="flex items-center gap-1 text-[10px] text-foreground/40 font-bold tracking-wider"><CheckCircle2 size={10} /> DONE</span>;
  if (status === 'CANCELLED') return <span className="flex items-center gap-1 text-[10px] text-red-500/60 font-bold tracking-wider"><XCircle size={10} /> CANCELLED</span>;
  return null;
};

/* ── Session Detail Panel ──────────────────────────────────────────────────── */

function UpcomingDetail({ session, onBack }: { session: UpcomingSession; onBack: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-y-auto pb-28 md:pb-12"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-5 md:px-8 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors text-sm font-bold tracking-wider uppercase mb-4"
        >
          <ChevronLeft size={16} /> Sessions
        </button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/35 uppercase">{session.date} · {session.time}</p>
            <h1 className="text-xl font-black tracking-wider mt-1">{session.focus}</h1>
          </div>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-foreground/45">
          <span className="flex items-center gap-1.5"><Timer size={12} />{session.duration}</span>
          <span className="flex items-center gap-1.5"><MapPin size={12} />Marcus Grima Studio</span>
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6 space-y-6">
        {/* Plan label */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary/60 uppercase">Planned Workout</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Exercise list */}
        <div className="bg-[#111111] border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {session.plannedExercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-primary/30 w-5 text-right shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-bold">{ex.name}</p>
                    <p className="text-[10px] font-bold tracking-widest text-foreground/35 mt-0.5">{ex.sets}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-primary/70 uppercase shrink-0 ml-3">
                  {ex.muscle}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <p className="text-[11px] text-foreground/30 font-semibold text-center tracking-wide">
          Exercises may be adjusted by Marcus on the day
        </p>
      </div>
    </motion.div>
  );
}

function PastDetail({ session, onBack }: { session: PastSession; onBack: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-y-auto pb-28 md:pb-12"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-5 md:px-8 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors text-sm font-bold tracking-wider uppercase mb-4"
        >
          <ChevronLeft size={16} /> Sessions
        </button>
        <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/35 uppercase">{session.date} · {session.time}</p>
        <h1 className="text-xl font-black tracking-wider mt-1">{session.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-foreground/45">
          <span className="flex items-center gap-1.5"><Timer size={12} />{session.duration}</span>
          <span className="flex items-center gap-1.5"><Dumbbell size={12} />{session.exercises} exercises</span>
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6 space-y-6">
        {/* Body map */}
        {session.musclesWorked.length > 0 && (
          <div className="bg-[#111111] border border-white/5 p-5">
            <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/35 uppercase mb-4">Muscles Worked</p>
            <BodyMap musclesWorked={session.musclesWorked} />
          </div>
        )}

        {/* Exercise list */}
        {session.exerciseList.length > 0 && (
          <div className="bg-[#111111] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/35 uppercase">Exercise Log</p>
            </div>
            <div className="divide-y divide-white/5">
              {session.exerciseList.map((ex, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={14} className="text-green-500/50 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{ex.name}</p>
                      <p className="text-[10px] font-bold tracking-widest text-foreground/35 mt-0.5">{ex.sets}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold tracking-widest text-primary/70 uppercase shrink-0 ml-3">
                    {ex.muscle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Booking sheet ─────────────────────────────────────────────────────────── */
type BookingStep = 'date' | 'time' | 'confirm' | 'done';

function BookingSheet({ onClose }: { onClose: () => void }) {
  const availability = useMemo(() => buildAvailability(), []);
  const [step, setStep]                 = useState<BookingStep>('date');
  const [calMonth, setCalMonth]         = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const calDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDow = (calMonth.getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) days.push(null);
    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    return days;
  }, [calMonth]);

  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const canPrevMonth = calMonth > new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

  const dayInfo = (d: Date) => {
    const key = dateKey(d);
    const info = availability.get(key);
    const isPast = d < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    const availableCount = info?.slots.filter(s => s.status === 'available').length ?? 0;
    return { hasSlots: availableCount > 0, isPast, isOff: !info || info.slots.length === 0 };
  };

  const selectedSlots  = selectedDate ? availability.get(dateKey(selectedDate))?.slots ?? [] : [];
  const availableSlots = selectedSlots.filter(s => s.status === 'available');
  const selectedDateStr = selectedDate
    ? selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <motion.div
      className="fixed inset-0 md:inset-auto md:bottom-0 md:right-0 md:top-0 md:w-[400px] bg-[#111111] border-l border-white/8 z-50 flex flex-col overflow-hidden"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          {step !== 'date' && step !== 'done' && (
            <button onClick={() => { if (step === 'time') setStep('date'); if (step === 'confirm') setStep('time'); }} className="text-foreground/50 hover:text-foreground transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold tracking-[0.12em] uppercase">
              {step === 'date' && 'Select a Date'}{step === 'time' && 'Choose a Time'}
              {step === 'confirm' && 'Confirm Booking'}{step === 'done' && 'Booking Confirmed'}
            </h2>
            {step === 'date' && <p className="text-[10px] text-foreground/40 font-semibold tracking-wider mt-0.5">Marcus's availability</p>}
            {step === 'time' && <p className="text-[10px] text-foreground/40 font-semibold tracking-wider mt-0.5">{selectedDateStr}</p>}
          </div>
        </div>
        <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors"><X size={18} /></button>
      </div>

      {step !== 'done' && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 shrink-0">
          {(['date','time','confirm'] as BookingStep[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                s === step ? 'bg-primary text-white' :
                ['date','time','confirm'].indexOf(s) < ['date','time','confirm'].indexOf(step)
                  ? 'bg-primary/30 text-primary' : 'bg-white/8 text-foreground/30'
              }`}>{i+1}</div>
              {i < 2 && <div className={`flex-1 h-px ${['date','time','confirm'].indexOf(s) < ['date','time','confirm'].indexOf(step) ? 'bg-primary/30' : 'bg-white/8'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'date' && (
            <motion.div key="date" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} disabled={!canPrevMonth} className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold tracking-[0.12em]">{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"><ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => <div key={d} className="text-center text-[9px] font-bold tracking-widest text-foreground/25 uppercase py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((d, i) => {
                  if (!d) return <div key={`e-${i}`} />;
                  const { hasSlots, isPast, isOff } = dayInfo(d);
                  const isSelected = selectedDate ? dateKey(d) === dateKey(selectedDate) : false;
                  const isToday    = dateKey(d) === dateKey(TODAY);
                  const disabled   = isPast || isOff || !hasSlots;
                  return (
                    <button key={dateKey(d)} disabled={disabled} onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                      className={`relative aspect-square rounded-sm flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-primary text-white' : disabled ? 'text-foreground/15 cursor-default' : 'hover:bg-white/8 text-foreground'} ${isToday && !isSelected ? 'ring-1 ring-primary/40' : ''}`}>
                      <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                      {!disabled && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-5 text-[9px] font-bold tracking-widest text-foreground/35 uppercase">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/60 inline-block" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Unavailable</span>
              </div>
              {selectedDate && (
                <motion.button initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} onClick={() => setStep('time')}
                  className="w-full mt-6 bg-primary hover:bg-primary/90 py-4 text-white font-bold tracking-[0.15em] uppercase text-sm transition-colors">
                  See Available Times
                </motion.button>
              )}
            </motion.div>
          )}

          {step === 'time' && (
            <motion.div key="time" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="px-6 py-5">
              <div className="mb-5">
                <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-1">Available slots</p>
                <p className="text-sm font-bold">{availableSlots.length} times open with Marcus</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {selectedSlots.map(({ time, status }) => {
                  const isAvail = status === 'available'; const isSel = selectedTime === time;
                  return (
                    <button key={time} disabled={!isAvail} onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-sm border text-xs font-bold tracking-wider transition-all ${isSel ? 'bg-primary border-primary text-white' : isAvail ? 'border-white/12 text-foreground hover:border-primary/50 hover:bg-primary/8' : 'border-white/4 text-foreground/15 cursor-default line-through'}`}>
                      {fmt12(time)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-foreground/30 mt-4 font-medium">All sessions are 60 minutes · Marcus Grima Studio, London</p>
              {selectedTime && (
                <motion.button initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} onClick={() => setStep('confirm')}
                  className="w-full mt-6 bg-primary hover:bg-primary/90 py-4 text-white font-bold tracking-[0.15em] uppercase text-sm transition-colors">
                  Continue
                </motion.button>
              )}
            </motion.div>
          )}

          {step === 'confirm' && selectedDate && selectedTime && (
            <motion.div key="confirm" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="px-6 py-5">
              <div className="bg-[#0D0D0D] border border-white/8 rounded-sm p-5 mb-6">
                <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-4">Booking Summary</p>
                <div className="space-y-4">
                  {[
                    { icon: <Calendar size={15} className="text-primary mt-0.5 shrink-0" />, label: 'Date', value: selectedDateStr },
                    { icon: <Timer    size={15} className="text-primary mt-0.5 shrink-0" />, label: 'Time', value: `${fmt12(selectedTime)} · 60 min` },
                    { icon: <MapPin   size={15} className="text-primary mt-0.5 shrink-0" />, label: 'Location', value: 'Marcus Grima Studio, London' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">{icon}<div><p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase">{label}</p><p className="text-sm font-bold mt-0.5">{value}</p></div></div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-foreground/40 leading-relaxed mb-6">Marcus will receive your request and confirm shortly. You'll be notified once confirmed.</p>
              <button onClick={() => setStep('done')} className="w-full bg-primary hover:bg-primary/90 py-4 text-white font-bold tracking-[0.15em] uppercase text-sm transition-colors">Confirm Booking</button>
            </motion.div>
          )}

          {step === 'done' && selectedDate && selectedTime && (
            <motion.div key="done" initial={{ opacity:0,scale:0.96 }} animate={{ opacity:1,scale:1 }} className="px-6 py-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
                <Check size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold tracking-wider mb-2">Request Sent!</h3>
              <p className="text-sm text-foreground/50 leading-relaxed mb-1">{selectedDateStr}</p>
              <p className="text-sm font-bold text-primary mb-6">{fmt12(selectedTime)}</p>
              <p className="text-xs text-foreground/35 leading-relaxed max-w-[260px]">Marcus will confirm your session within a few hours. You'll get a notification once it's locked in.</p>
              <button onClick={onClose} className="mt-10 w-full border border-white/12 hover:border-white/25 py-4 text-sm font-bold tracking-[0.15em] uppercase text-foreground/60 hover:text-foreground transition-colors">Done</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Animations ────────────────────────────────────────────────────────────── */
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } } };

/* ── Main page ─────────────────────────────────────────────────────────────── */
export const Sessions = ({ setPage, openSessionId }: SessionsProps) => {
  const [tab, setTab]               = useState<'upcoming' | 'past'>('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const [detailUpcoming, setDetailUpcoming] = useState<UpcomingSession | null>(null);
  const [detailPast,     setDetailPast]     = useState<PastSession | null>(null);

  // Deep-link: open a specific session on mount
  useEffect(() => {
    if (!openSessionId) return;
    const u = upcoming.find(s => s.id === openSessionId);
    if (u) { setTab('upcoming'); setDetailUpcoming(u); return; }
    const p = past.find(s => s.id === openSessionId);
    if (p) { setTab('past'); setDetailPast(p); }
  }, [openSessionId]);

  const closeDetail = () => { setDetailUpcoming(null); setDetailPast(null); };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">
      {/* Header */}
      <header className="px-5 md:px-8 py-5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Sessions</h1>
            <p className="text-xs text-foreground/40 font-semibold tracking-wider mt-0.5 hidden md:block">Manage your training schedule</p>
          </div>
          <button onClick={() => setShowBooking(true)}
            className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase text-foreground hover:bg-primary/80 transition-colors">
            <Plus size={13} /> Book Session
          </button>
        </div>
        <div className="flex gap-0 border border-white/10 w-fit">
          {(['upcoming','past'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors ${tab === t ? 'bg-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 md:px-8 pt-6">
        <AnimatePresence mode="wait">
          {tab === 'upcoming' ? (
            <motion.div key="upcoming" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              {upcoming.map((s) => (
                <motion.div key={s.id} variants={itemVariants}>
                  <div className="bg-[#111111] border-l-2 border-l-primary rounded-r-sm p-5 h-full">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold tracking-widest text-foreground/40 uppercase">{s.focus}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <h4 className="text-base font-bold tracking-wider mb-4">{s.date}<br />{s.time}</h4>
                    <div className="flex flex-col gap-1.5 text-xs text-foreground/60 font-semibold mb-5">
                      <div className="flex items-center gap-2"><Timer size={12} /><span>{s.duration}</span></div>
                      <div className="flex items-center gap-2"><MapPin size={12} /><span>{s.location}</span></div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => setDetailUpcoming(s)}
                        className="flex-1 bg-primary/10 border border-primary/25 py-2 text-[10px] font-bold tracking-widest uppercase text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1">
                        View Plan <ChevronRight size={11} />
                      </button>
                      <button className="flex-1 border border-white/10 py-2 text-[10px] font-bold tracking-widest uppercase text-red-500/60 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="past" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              {past.map((s) => (
                <motion.div key={s.id} variants={itemVariants}>
                  <div className={`bg-[#111111] border border-white/5 p-5 rounded-sm h-full ${s.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-bold tracking-widest text-foreground/40 uppercase">{s.name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <h4 className="text-sm font-bold tracking-wider mb-3 text-foreground/80">{s.date} · {s.time}</h4>
                    <div className="flex items-center gap-4 text-xs text-foreground/40 font-semibold">
                      <span className="flex items-center gap-1"><Timer size={11} /> {s.duration}</span>
                      {s.exercises > 0 && <span>{s.exercises} exercises</span>}
                    </div>
                    {s.status === 'COMPLETED' && (
                      <button
                        onClick={() => setDetailPast(s)}
                        className="mt-4 flex items-center gap-1 text-[10px] font-bold tracking-widest text-primary uppercase">
                        View Recap <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail panels */}
      <AnimatePresence>
        {detailUpcoming && <UpcomingDetail session={detailUpcoming} onBack={closeDetail} />}
        {detailPast     && <PastDetail     session={detailPast}     onBack={closeDetail} />}
      </AnimatePresence>

      {/* Booking panel */}
      <AnimatePresence>
        {showBooking && (
          <>
            <motion.div className="fixed inset-0 bg-black/70 z-50" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowBooking(false)} />
            <BookingSheet onClose={() => setShowBooking(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
