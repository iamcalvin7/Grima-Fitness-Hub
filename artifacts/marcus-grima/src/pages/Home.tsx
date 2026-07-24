import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, Activity } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { BodyMap } from '@/components/BodyMap';
import type { Page } from '@/App';

/* ── Animated counter ──────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ── Metric card ───────────────────────────────────────────────────────── */
interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  sub: string;
  colour: string;          // tailwind text colour e.g. 'text-green-400'
  borderColour: string;    // e.g. 'border-green-500/30'
  glowColour: string;      // rgba string for box-shadow
  delay?: number;
}

const MetricCard = ({ icon, value, sub, colour, borderColour, glowColour, delay = 0 }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className={`relative bg-[#111111] border rounded-sm flex flex-col items-center justify-center text-center p-4 overflow-hidden ${borderColour}`}
    style={{ boxShadow: `0 0 24px ${glowColour}` }}
  >
    {/* Subtle colour wash at top */}
    <div className="absolute inset-x-0 top-0 h-px" style={{ background: glowColour.replace('0.18', '0.6') }} />
    <div className="absolute inset-x-0 top-0 h-6 opacity-20"
      style={{ background: `linear-gradient(to bottom, ${glowColour.replace('0.18','0.4')}, transparent)` }} />
    <div className={`mb-2 ${colour}`}>{icon}</div>
    <p className="text-lg font-bold leading-tight tabular-nums">{value}</p>
    <p className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${colour} opacity-70`}>{sub}</p>
  </motion.div>
);

const stepData = [
  { day: 'M', label: 'Monday',    steps: 6000 },
  { day: 'T', label: 'Tuesday',   steps: 8500 },
  { day: 'W', label: 'Wednesday', steps: 7200 },
  { day: 'T', label: 'Thursday',  steps: 8432 },
  { day: 'F', label: 'Friday',    steps: 4000 },
  { day: 'S', label: 'Saturday',  steps: 2000 },
  { day: 'S', label: 'Sunday',    steps: 3000 },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING,';
  if (h < 18) return 'GOOD AFTERNOON,';
  return 'GOOD EVENING,';
}

/* ── Metrics section ───────────────────────────────────────────────────── */

// Dark forest green palette
const G = {
  text:   'text-[#16a34a]',          // green-600
  border: 'border-[#14532d]/50',      // green-900/50
  glow:   'rgba(22,163,74,0.10)',     // green-600 subtle
  bar:    '#16a34a',
  barDay: '#16a34a',
};

function MetricsSection() {
  const steps    = useCountUp(8432, 1600);
  const calories = useCountUp(647,  1200);
  const bpm      = useCountUp(72,   900);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Your Metrics</h3>
        <p className="text-[10px] text-foreground/30 font-semibold tracking-wide uppercase mt-1">Connected via Apple Health</p>
      </div>

      <div className="grid grid-cols-3 gap-3">

        {/* Steps — stride walk */}
        <MetricCard delay={0} colour={G.text} borderColour={G.border} glowColour={G.glow}
          value={steps.toLocaleString()} sub="+12% today"
          icon={
            <motion.div
              animate={{ x: [0, 3, 0, -1, 0], rotate: [0, 7, 0, -3, 0] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Activity className="w-5 h-5" />
            </motion.div>
          } />

        {/* Calories — flame flicker */}
        <MetricCard delay={0.1} colour={G.text} borderColour={G.border} glowColour={G.glow}
          value={`${calories}`} sub="kcal active"
          icon={
            <motion.div
              animate={{
                scaleX:  [1, 0.88, 1.08, 0.93, 1.05, 1],
                scaleY:  [1, 1.12, 0.92, 1.08, 0.96, 1],
                rotate:  [0, -4,    3,   -3,    2,   0],
                opacity: [1, 0.85,  1,   0.9,   1,   1],
              }}
              transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '50%', originY: '100%' }}
            >
              <Flame className="w-5 h-5" />
            </motion.div>
          } />

        {/* Heart rate — lub-dub at 72 BPM (833 ms) */}
        <MetricCard delay={0.2} colour={G.text} borderColour={G.border} glowColour={G.glow}
          value={`${bpm}`} sub="bpm resting"
          icon={
            <motion.div
              animate={{ scale: [1, 1.42, 0.88, 1.22, 1, 1, 1, 1] }}
              transition={{
                duration: 0.833,
                repeat: Infinity,
                times: [0, 0.1, 0.2, 0.32, 0.45, 0.6, 0.8, 1],
                ease: 'easeInOut',
              }}
            >
              <Heart className="w-5 h-5" fill="currentColor" />
            </motion.div>
          } />

      </div>

      {/* Step bar chart — interactive */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className={`bg-[#111111] border ${G.border} rounded-sm`}
        style={{ boxShadow: `0 0 18px ${G.glow}` }}
      >
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stepData} barCategoryGap="30%" margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as typeof stepData[0];
                return (
                  <div className="bg-[#1a1a1a] border border-[#14532d]/60 px-3 py-2 rounded-sm shadow-lg"
                    style={{ boxShadow: '0 0 16px rgba(22,163,74,0.2)' }}>
                    <p className="text-[10px] font-bold tracking-widest text-[#16a34a] uppercase mb-0.5">{d.label}</p>
                    <p className="text-sm font-bold text-white tabular-nums">{d.steps.toLocaleString()} <span className="text-[10px] text-white/40 font-semibold">steps</span></p>
                  </div>
                );
              }}
            />
            <Bar dataKey="steps" radius={[2, 2, 0, 0]}>
              {stepData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={G.bar}
                  opacity={entry.steps === 8432 ? 1 : 0.18}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-[10px] font-bold text-foreground/25 px-4 pb-3">
          <span>M</span><span>T</span><span>W</span>
          <span className={G.text}>T</span>
          <span>F</span><span>S</span><span>S</span>
        </div>
      </motion.div>
    </section>
  );
}

interface HomeProps {
  setPage: (page: Page) => void;
}

export const Home = ({ setPage }: HomeProps) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">

      {/* Mobile-only top bar */}
      <header className="md:hidden px-5 py-4 flex justify-between items-center sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
          <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#C0C0C0" />
          <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#C0C0C0" />
        </svg>
        <div className="w-9 h-9 rounded-full bg-primary border border-white/10 flex items-center justify-center text-white font-bold tracking-wider text-sm">
          MG
        </div>
      </header>

      {/* Desktop top bar */}
      <header className="hidden md:flex px-8 py-5 items-center justify-between border-b border-white/5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{getGreeting()}</p>
          <h1 className="text-2xl font-bold tracking-[0.15em]">MARCUS</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage('sessions')}
            className="bg-primary hover:bg-primary/80 transition-colors px-5 py-2.5 text-xs font-bold tracking-[0.15em] uppercase text-white"
          >
            Book Session →
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-sm">
            MG
          </div>
        </div>
      </header>

      <div className="px-5 md:px-8 pt-6 pb-8">

        {/* Mobile greeting */}
        <div className="md:hidden space-y-1 mb-8">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-[0.2em] uppercase">{getGreeting()}</h2>
          <h1 className="text-4xl font-bold tracking-wider">MARCUS</h1>
          <div className="w-12 h-1 bg-primary mt-3" />
        </div>

        {/* Two-column grid on desktop, single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-8">

            {/* Next Session */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Your Next Session</h3>
              <div className="bg-[#111111] border-l-2 border-l-primary p-5 rounded-r-sm shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-primary mb-1">STRENGTH & CONDITIONING</p>
                    <h4 className="text-lg font-bold">THURSDAY, 24 JULY · 07:00 AM</h4>
                  </div>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider shrink-0 ml-3">CONFIRMED</span>
                </div>
                <div className="flex flex-col gap-2 text-sm text-foreground/70 font-semibold mb-5">
                  <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-foreground/30 rounded-full" /> 60 MIN</p>
                  <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-foreground/30 rounded-full" /> MARCUS GRIMA STUDIO, LONDON</p>
                </div>
                <button
                  onClick={() => setPage('sessions')}
                  className="text-xs font-bold tracking-[0.2em] text-foreground hover:text-primary transition-colors flex items-center gap-2 uppercase"
                >
                  View Details <span>→</span>
                </button>
              </div>
            </section>

            {/* Messages */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Messages</h3>
              <button
                onClick={() => setPage('messages')}
                className="w-full bg-[#111111] border border-white/5 p-4 rounded-sm flex gap-4 items-start text-left hover:border-primary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold shrink-0">
                  MG
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-sm">Marcus Grima</h4>
                    <span className="text-[10px] text-foreground/40 font-semibold tracking-wider">2h ago</span>
                  </div>
                  <p className="text-xs text-foreground/60 font-medium leading-relaxed">
                    Great work on yesterday's session. Make sure you're getting enough protein today — aim for at least 180g. See you Thursday 💪
                  </p>
                </div>
                <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
              </button>
            </section>

            {/* Book A Session */}
            <section className="relative overflow-hidden rounded-sm group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-[#0A0A0A] z-0" />
              <div className="relative z-10 p-6 flex flex-col items-center text-center border border-primary/20">
                <h3 className="text-xl font-bold tracking-widest mb-1">BOOK YOUR NEXT SESSION</h3>
                <p className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-6">Schedule time with Marcus</p>
                <button
                  onClick={() => setPage('sessions')}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-4 font-bold tracking-[0.2em] uppercase transition-all group-hover:shadow-[0_0_20px_rgba(100,60,160,0.4)]"
                >
                  Book Now →
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-8">

            {/* Metrics */}
            <MetricsSection />

            {/* Last Session Recap */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Last Session Recap</h3>
              <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-[10px] font-bold tracking-widest text-foreground/30 mb-1">TUESDAY, 22 JULY</p>
                  <h4 className="text-lg font-bold tracking-wider mb-1">UPPER BODY POWER</h4>
                  <div className="flex gap-4 text-xs font-semibold text-foreground/50 tracking-wider">
                    <span>55 MIN</span><span>•</span><span>7 EXERCISES</span>
                  </div>
                </div>

                {/* Body Map — full width */}
                <div className="px-5 pt-5 pb-2 border-b border-white/5">
                  <BodyMap musclesWorked={['CHEST', 'SHOULDERS', 'TRICEPS']} />
                </div>

                {/* Exercise list */}
                <div className="divide-y divide-white/5">
                  {[
                    { name: 'Bench Press',           sets: '4 × 8 @ 80kg',  muscle: 'CHEST' },
                    { name: 'Overhead Press',         sets: '3 × 10 @ 50kg', muscle: 'SHOULDERS' },
                    { name: 'Incline Dumbbell Press', sets: '3 × 12 @ 28kg', muscle: 'CHEST' },
                    { name: 'Lateral Raises',         sets: '4 × 15 @ 10kg', muscle: 'SHOULDERS' },
                    { name: 'Skull Crushers',         sets: '3 × 12 @ 30kg', muscle: 'TRICEPS' },
                    { name: 'Cable Flyes',            sets: '3 × 15 @ 15kg', muscle: 'CHEST' },
                    { name: 'Tricep Dips',            sets: '3 × failure',   muscle: 'TRICEPS' },
                  ].map((exercise, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div>
                        <p className="text-sm font-bold">{exercise.name}</p>
                        <p className="text-[10px] font-bold tracking-widest text-foreground/40 mt-0.5">{exercise.sets}</p>
                      </div>
                      <span className="text-[9px] font-bold tracking-widest text-primary/80 uppercase ml-3 shrink-0">
                        {exercise.muscle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};
