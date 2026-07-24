import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Timer, MapPin, ChevronRight, Plus, CheckCircle2, XCircle } from 'lucide-react';
import type { Page } from '@/App';

interface SessionsProps {
  setPage: (page: Page) => void;
}

const upcoming = [
  {
    id: 1,
    type: 'STRENGTH & CONDITIONING',
    date: 'THURSDAY, 24 JULY',
    time: '07:00 AM',
    duration: '60 MIN',
    location: 'Marcus Grima Studio, London',
    status: 'CONFIRMED',
  },
  {
    id: 2,
    type: 'HIIT & METABOLIC',
    date: 'SATURDAY, 26 JULY',
    time: '08:30 AM',
    duration: '45 MIN',
    location: 'Marcus Grima Studio, London',
    status: 'CONFIRMED',
  },
  {
    id: 3,
    type: 'LOWER BODY FOCUS',
    date: 'TUESDAY, 29 JULY',
    time: '07:00 AM',
    duration: '60 MIN',
    location: 'Marcus Grima Studio, London',
    status: 'PENDING',
  },
];

const past = [
  { id: 4, type: 'UPPER BODY POWER', date: 'TUESDAY, 22 JULY', time: '07:00 AM', duration: '55 MIN', location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 7 },
  { id: 5, type: 'FULL BODY CIRCUIT', date: 'SATURDAY, 19 JULY', time: '09:00 AM', duration: '60 MIN', location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 9 },
  { id: 6, type: 'STRENGTH & CONDITIONING', date: 'THURSDAY, 17 JULY', time: '07:00 AM', duration: '60 MIN', location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 8 },
  { id: 7, type: 'HIIT & METABOLIC', date: 'TUESDAY, 15 JULY', time: '07:00 AM', duration: '45 MIN', location: 'Marcus Grima Studio, London', status: 'CANCELLED', exercises: 0 },
  { id: 8, type: 'LOWER BODY FOCUS', date: 'SATURDAY, 12 JULY', time: '09:00 AM', duration: '60 MIN', location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 6 },
  { id: 9, type: 'UPPER BODY POWER', date: 'THURSDAY, 10 JULY', time: '07:00 AM', duration: '55 MIN', location: 'Marcus Grima Studio, London', status: 'COMPLETED', exercises: 7 },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } } };

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'CONFIRMED') return <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider whitespace-nowrap">CONFIRMED</span>;
  if (status === 'PENDING') return <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-1 font-bold tracking-wider whitespace-nowrap">PENDING</span>;
  if (status === 'COMPLETED') return <span className="flex items-center gap-1 text-[10px] text-foreground/40 font-bold tracking-wider"><CheckCircle2 size={10} /> DONE</span>;
  if (status === 'CANCELLED') return <span className="flex items-center gap-1 text-[10px] text-red-500/60 font-bold tracking-wider"><XCircle size={10} /> CANCELLED</span>;
  return null;
};

export const Sessions = ({ setPage }: SessionsProps) => {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">
      {/* Header */}
      <header className="px-5 md:px-8 py-5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Sessions</h1>
            <p className="text-xs text-foreground/40 font-semibold tracking-wider mt-0.5 hidden md:block">Manage your training schedule</p>
          </div>
          <button
            onClick={() => setShowBooking(true)}
            className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase text-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus size={13} />
            Book Session
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border border-white/10 w-fit">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                tab === t ? 'bg-primary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 md:px-8 pt-6">
        <AnimatePresence mode="wait">
          {tab === 'upcoming' ? (
            <motion.div
              key="upcoming"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {upcoming.map((s) => (
                <motion.div key={s.id} variants={itemVariants}>
                  <div className="bg-[#111111] border-l-2 border-l-primary rounded-r-sm p-5 h-full">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold tracking-widest text-primary">{s.type}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <h4 className="text-base font-bold tracking-wider mb-4">{s.date}<br />{s.time}</h4>
                    <div className="flex flex-col gap-1.5 text-xs text-foreground/60 font-semibold mb-5">
                      <div className="flex items-center gap-2"><Timer size={12} /><span>{s.duration}</span></div>
                      <div className="flex items-center gap-2"><MapPin size={12} /><span>{s.location}</span></div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button className="flex-1 border border-white/10 py-2 text-[10px] font-bold tracking-widest uppercase text-foreground/60 hover:text-foreground hover:border-white/30 transition-colors">
                        Reschedule
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
            <motion.div
              key="past"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {past.map((s) => (
                <motion.div key={s.id} variants={itemVariants}>
                  <div className={`bg-[#111111] border border-white/5 p-5 rounded-sm h-full ${s.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-bold tracking-widest text-foreground/40">{s.type}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <h4 className="text-sm font-bold tracking-wider mb-3 text-foreground/80">{s.date} · {s.time}</h4>
                    <div className="flex items-center gap-4 text-xs text-foreground/40 font-semibold">
                      <span className="flex items-center gap-1"><Timer size={11} /> {s.duration}</span>
                      {s.exercises > 0 && <span>{s.exercises} exercises</span>}
                    </div>
                    {s.status === 'COMPLETED' && (
                      <button className="mt-4 flex items-center gap-1 text-[10px] font-bold tracking-widest text-primary uppercase">
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

      {/* Book Session Sheet */}
      <AnimatePresence>
        {showBooking && (
          <>
            <motion.div className="fixed inset-0 bg-black/70 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBooking(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-8 md:bottom-8 md:w-80 bg-[#111111] border border-white/10 z-50 p-6 pb-8 md:rounded-sm"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />
              <h2 className="text-lg font-bold tracking-[0.15em] uppercase mb-1">Book a Session</h2>
              <p className="text-xs text-foreground/40 font-semibold tracking-wider mb-6 uppercase">Choose a session type</p>
              {['Strength & Conditioning', 'HIIT & Metabolic', 'Lower Body Focus', 'Upper Body Power', 'Full Body Circuit'].map((type) => (
                <button
                  key={type}
                  className="w-full flex justify-between items-center py-4 border-b border-white/5 text-sm font-bold tracking-wider hover:text-primary transition-colors"
                  onClick={() => setShowBooking(false)}
                >
                  {type.toUpperCase()}
                  <ChevronRight size={16} className="text-foreground/30" />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
