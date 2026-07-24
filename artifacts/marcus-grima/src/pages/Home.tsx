import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, Activity, ChevronRight, Clock, MapPin, CheckCircle2, Dumbbell } from 'lucide-react';
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

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('mg_profile') || 'null'); } catch { return null; }
}

export const Home = ({ setPage }: HomeProps) => {
  const profile   = loadProfile();
  const firstName = profile?.firstName ? profile.firstName.toUpperCase() : 'MARCUS';
  const initials  = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || 'MG'
    : 'MG';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">

      {/* Mobile-only top bar */}
      <header className="md:hidden px-5 py-4 flex justify-between items-center sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
          <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#C0C0C0" />
          <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#C0C0C0" />
        </svg>
        <div className="w-9 h-9 rounded-full bg-primary border border-white/10 flex items-center justify-center text-white font-bold tracking-wider text-sm">
          {initials}
        </div>
      </header>

      {/* Desktop top bar */}
      <header className="hidden md:flex px-8 py-5 items-center justify-between border-b border-white/5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{getGreeting()}</p>
          <h1 className="text-2xl font-bold tracking-[0.15em]">{firstName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage('sessions')}
            className="bg-primary hover:bg-primary/80 transition-colors px-5 py-2.5 text-xs font-bold tracking-[0.15em] uppercase text-white"
          >
            Book Session →
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
        </div>
      </header>

      <div className="px-5 md:px-8 pt-6 pb-8">

        {/* Mobile greeting */}
        <div className="md:hidden space-y-1 mb-8">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-[0.2em] uppercase">{getGreeting()}</h2>
          <h1 className="text-4xl font-bold tracking-wider">{firstName}</h1>
          <div className="w-12 h-1 bg-primary mt-3" />
        </div>

        {/* Two-column grid on desktop, single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* Next Session — compact tap card */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Next Session</h3>
              <motion.button
                onClick={() => setPage('sessions')}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left bg-[#111111] border-l-2 border-l-primary border-y border-r border-white/5 hover:border-primary/30 transition-colors group flex items-center gap-4 px-4 py-4"
              >
                {/* Date block */}
                <div className="w-11 h-11 bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold tracking-widest text-primary/60 uppercase leading-none">Jul</span>
                  <span className="text-lg font-black text-primary leading-none mt-0.5">24</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black tracking-[0.12em] text-foreground truncate">STRENGTH & CONDITIONING</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground/45">
                      <Clock size={10} /> 07:00 AM · 60 MIN
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-foreground/35">
                    <MapPin size={10} /> Marcus Grima Studio
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[8px] font-bold tracking-widest text-primary bg-primary/10 px-1.5 py-0.5">CONFIRMED</span>
                  <ChevronRight size={14} className="text-foreground/25 group-hover:text-primary transition-colors" />
                </div>
              </motion.button>
            </section>

            {/* Last Session — compact tap card */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Last Session</h3>
              <motion.button
                onClick={() => setPage('sessions')}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left bg-[#111111] border border-white/5 hover:border-white/15 transition-colors group flex items-center gap-4 px-4 py-4"
              >
                {/* Check icon block */}
                <div className="w-11 h-11 bg-green-500/8 border border-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-green-500/60" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black tracking-[0.12em] text-foreground truncate">UPPER BODY POWER</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground/45">
                      <Clock size={10} /> TUE 22 JUL · 55 MIN
                    </span>
                  </div>
                  {/* Exercise chips — top 3 */}
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {['Bench Press', 'OHP', '+5 more'].map(e => (
                      <span key={e} className="text-[8px] font-bold tracking-wide text-foreground/35 bg-white/4 border border-white/8 px-1.5 py-0.5">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-foreground/30">
                    <Dumbbell size={10} /> 7
                  </span>
                  <ChevronRight size={14} className="text-foreground/25 group-hover:text-foreground/60 transition-colors" />
                </div>
              </motion.button>
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

          </div>
        </div>
      </div>
    </div>
  );
};
