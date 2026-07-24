import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Heart, Activity, ChevronRight,
  Clock, MapPin, CheckCircle2, Dumbbell, Quote, Star, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, Cell, Tooltip,
  AreaChart, Area, YAxis, ReferenceLine, XAxis,
} from 'recharts';
import {
  getTodayChallenges, isChallengeDone, completeChallengeByName,
} from '@/data/challenges';
import type { Page } from '@/App';

/* ── Animated counter ─────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ── Greeting ─────────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

/* ── Quotes ───────────────────────────────────────────────────────────────── */
const QUOTES = [
  {
    text:   'The pain you feel today will be the strength you feel tomorrow.',
    author: 'Arnold Schwarzenegger',
    // Dark moody gym — barbell rack, dramatic side-lighting
    img:    'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&q=85',
  },
  {
    text:   'If something stands between you and your success, move it. Never be denied.',
    author: 'Dwayne Johnson',
    // Climber silhouette on cliff edge against golden sky
    img:    'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=85',
  },
  {
    text:   'Excellence is not a destination but a continuous journey that never ends.',
    author: 'Brian Tracy',
    // Long empty road stretching to the horizon at dusk
    img:    'https://images.unsplash.com/photo-1528543606781-2f6e8539f8a3?w=600&q=85',
  },
  {
    text:   'Push yourself because no one else is going to do it for you.',
    author: '',
    // Lone runner silhouette on misty bridge at sunrise
    img:    'https://images.unsplash.com/photo-1502224562085-639556652f33?w=600&q=85',
  },
  {
    text:   "You don't have to be extreme, just consistent.",
    author: '',
    // Calm mountain lake reflection — muted dawn colours
    img:    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=85',
  },
  {
    text:   "Your body can stand almost anything. It's your mind you have to convince.",
    author: '',
    // Fighter wrapping hands — dark gym, dramatic shadow
    img:    'https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=85',
  },
  {
    text:   'Wake up with determination. Go to bed with satisfaction.',
    author: '',
    // Sunrise over jagged mountain peaks — deep orange sky
    img:    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=85',
  },
];
function getDailyQuote() {
  return QUOTES[new Date().getDay() % QUOTES.length];
}

/* ── Countdown to midnight ────────────────────────────────────────────────── */
function useCountdown() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now      = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h    = Math.floor(diff / 3_600_000);
      const m    = Math.floor((diff % 3_600_000) / 60_000);
      const s    = Math.floor((diff % 60_000) / 1_000);
      setTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ── Daily challenge — single photo card ──────────────────────────────────── */
function DailyChallengeCard({ onComplete }: { onComplete?: () => void }) {
  const challenge  = getTodayChallenges()[0];
  const countdown  = useCountdown();
  const today      = new Date().toDateString();
  const [state, setState] = useState(() => ({ day: today, done: isChallengeDone(challenge.name) }));

  // Re-sync when the day rolls over (countdown re-renders every second)
  if (state.day !== today) setState({ day: today, done: isChallengeDone(challenge.name) });
  const done = state.done;

  const handleComplete = () => {
    completeChallengeByName(challenge.name);
    setState(s => ({ ...s, done: true }));
    onComplete?.();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/70">Daily Challenge</h3>
        {done && (
          <span className="text-[10px] font-bold text-white/30 tabular-nums">
            Next in <span className="text-white/50">{countdown}</span>
          </span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          height: 165,
          border: done ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(200,200,200,0.1)',
        }}
      >
        {/* Full-bleed photo */}
        <img src={challenge.img} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={done ? { filter: 'grayscale(0.7) brightness(0.55)' } : undefined} />
        {/* Dark gradient */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.25) 100%)' }} />

        {/* Challenge pill */}
        <div className="absolute top-3 left-3">
          {done ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-green-500/30">
              <CheckCircle2 size={11} /> Done · +{challenge.pts} pts
            </span>
          ) : (
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/15">
              Challenge
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-2xl font-black text-white leading-none tracking-tight truncate">{challenge.name}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold text-white/60">
              {challenge.kcal > 0 && <span className="flex items-center gap-1"><Flame size={11} className="text-orange-400" /> {challenge.kcal} Kcal</span>}
              {challenge.mins > 0 && <span className="flex items-center gap-1"><Clock size={11} /> {challenge.mins} min</span>}
              {challenge.kcal === 0 && challenge.mins === 0 && <span>{challenge.desc}</span>}
            </div>
          </div>
          {!done && (
            <motion.button
              onClick={handleComplete}
              whileTap={{ scale: 0.93 }}
              className="shrink-0 font-black text-[11px] px-4 py-2 rounded-full tracking-wide bg-white text-black shadow-lg"
            >
              START
            </motion.button>
          )}
        </div>
      </motion.div>
    </section>
  );
}

/* ── Metrics data ─────────────────────────────────────────────────────────── */
const STEP_DATA = [
  { day: 'M', label: 'Monday',    steps: 6000 },
  { day: 'T', label: 'Tuesday',   steps: 8500 },
  { day: 'W', label: 'Wednesday', steps: 7200 },
  { day: 'T', label: 'Thursday',  steps: 8432 },
  { day: 'F', label: 'Friday',    steps: 4000 },
  { day: 'S', label: 'Saturday',  steps: 2000 },
  { day: 'S', label: 'Sunday',    steps: 3000 },
];
const TODAY_IDX = 3;
const GOAL_STEPS = 7500;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SPARKLINES = {
  steps:    [5200, 6800, 7100, 6200, 8500, 7200, 8432].map((v, i) => ({ day: DAYS[i], v })),
  calories: [510,  580,  620,  490,  700,  580,  647 ].map((v, i) => ({ day: DAYS[i], v })),
};

/* ── Metrics section ──────────────────────────────────────────────────────── */
function MetricsSection() {
  const stepsVal = useCountUp(8432, 1500);
  const calsVal  = useCountUp(647,  1100);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <section className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/70">Your Metrics</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/25">
          via Apple Health
          <Heart size={11} className="text-white/25" fill="currentColor" />
        </span>
      </div>

      {/* ── Two always-visible cards ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Steps — green */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl p-4"
          style={{ background: '#0d1a0f', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 24px rgba(34,197,94,0.1)' }}
        >
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.6), transparent)' }} />
          <span className="text-green-400 mb-2 block"><Activity className="w-5 h-5" /></span>
          <p className="text-3xl font-black text-white tabular-nums leading-none">{stepsVal.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mt-1">Steps</p>
          <span className="mt-2 inline-block text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-lg">+12% today</span>
          <div className="mt-3 -mx-1">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={SPARKLINES.steps} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg-steps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Tooltip cursor={{ stroke: 'rgba(34,197,94,0.3)', strokeWidth: 1, strokeDasharray: '3 2' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { day: string; v: number };
                    return (
                      <div className="bg-[#0d1a0f] border border-green-500/50 px-2 py-1 rounded-lg text-[10px] font-bold text-white">
                        {d.day} · {d.v.toLocaleString()}
                      </div>
                    );
                  }} />
                <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2}
                  fill="url(#sg-steps)" isAnimationActive
                  activeDot={{ r: 4, fill: '#22c55e', stroke: '#ffffff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Calories — orange */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl p-4"
          style={{ background: '#1a100a', border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 0 24px rgba(249,115,22,0.1)' }}
        >
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)' }} />
          <span className="text-orange-400 mb-2 block"><Flame className="w-5 h-5" /></span>
          <p className="text-3xl font-black text-white tabular-nums leading-none">{calsVal}</p>
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mt-1">Kcal Active</p>
          <span className="mt-2 inline-block text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-lg">↑ 8% vs yesterday</span>
          <div className="mt-3 -mx-1">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={SPARKLINES.calories} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg-cals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Tooltip cursor={{ stroke: 'rgba(249,115,22,0.3)', strokeWidth: 1, strokeDasharray: '3 2' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { day: string; v: number };
                    return (
                      <div className="bg-[#1a100a] border border-orange-500/50 px-2 py-1 rounded-lg text-[10px] font-bold text-white">
                        {d.day} · {d.v} kcal
                      </div>
                    );
                  }} />
                <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={2}
                  fill="url(#sg-cals)" isAnimationActive
                  activeDot={{ r: 4, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

      {/* ── Weekly Activity chart ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/70">Weekly Activity</h3>
        <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
          {([['#22c55e','Goal'],['#f97316','Close'],['#ef4444','Low']] as const).map(([col, label]) => (
            <span key={label} className="flex items-center gap-1.5" style={{ color: `${col}99` }}>
              <span className="w-2 h-2 rounded-full inline-block"
                style={{ background: col, opacity: 0.7, boxShadow: `0 0 4px ${col}55` }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ background: '#111111', border: '1px solid rgba(200,200,200,0.08)' }}
        className="rounded-2xl overflow-hidden"
      >

        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={STEP_DATA}
            barCategoryGap="35%"
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            onMouseMove={s => {
              if (s.isTooltipActive && s.activeTooltipIndex !== undefined)
                setHoveredBar(s.activeTooltipIndex);
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <YAxis
              tickCount={5}
              tickFormatter={v => v >= 1000 ? `${v / 1000}K` : String(v)}
              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontWeight: 600 }}
              axisLine={false} tickLine={false}
              width={28}
              domain={[0, 10000]}
            />
            <ReferenceLine
              y={GOAL_STEPS}
              stroke="rgba(200,200,200,0.2)"
              strokeDasharray="4 3"
              label={{ value: '7.5K', position: 'right', fontSize: 9, fill: 'rgba(200,200,200,0.4)', fontWeight: 700 }}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as typeof STEP_DATA[0];
                const isToday = payload[0].payload === STEP_DATA[TODAY_IDX];
                const col = d.steps >= GOAL_STEPS ? '#22c55e' : d.steps >= 5000 ? '#f97316' : '#ef4444';
                return (
                  <div className="bg-[#1a1a1a] border border-white/15 px-3 py-2 rounded-xl"
                    style={{ boxShadow: `0 0 16px ${col}33` }}>
                    {isToday && <p className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color: col }}>Today</p>}
                    <p className="text-xs font-black text-white tabular-nums">
                      {d.steps.toLocaleString()} <span className="text-[10px] text-white/40 font-medium">steps</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="steps" radius={[5,5,0,0]}>
              {STEP_DATA.map((entry, i) => {
                const isHov   = hoveredBar === i;
                const isToday = i === TODAY_IDX;
                const base = entry.steps >= GOAL_STEPS ? '#22c55e' : entry.steps >= 5000 ? '#f97316' : '#ef4444';
                return (
                  <Cell
                    key={i}
                    fill={base}
                    opacity={isHov ? 0.9 : hoveredBar !== null ? 0.12 : isToday ? 0.85 : 0.28}
                    style={(isHov || isToday) ? { filter: `drop-shadow(0 0 6px ${base}66)` } : undefined}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Day labels */}
        <div className="flex justify-between text-[10px] font-semibold px-5 pb-3" style={{ paddingLeft: 44 }}>
          {STEP_DATA.map((d, i) => {
            const col = d.steps >= GOAL_STEPS ? '#22c55e' : d.steps >= 5000 ? '#f97316' : '#ef4444';
            return (
              <span key={i} style={{ color: hoveredBar === i || i === TODAY_IDX ? col : undefined }}
                className={hoveredBar !== i && i !== TODAY_IDX ? 'text-white/25' : 'font-black'}>
                {d.day}
              </span>
            );
          })}
        </div>
      </motion.div>

    </section>
  );
}

/* ── Sessions block ───────────────────────────────────────────────────────── */
function SessionsBlock({ goToSession }: { goToSession: (id: number) => void }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-white/70">Sessions</h3>

      {/* Unified card container */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(200,200,200,0.09)' }}>

        {/* Next session row */}
        <motion.button
          onClick={() => goToSession(1)}
          whileTap={{ scale: 0.99 }}
          className="w-full text-left flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          {/* Date badge — metallic */}
          <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,200,200,0.14)' }}>
            <span className="text-[8px] font-bold text-white/35 uppercase leading-none tracking-wider">Jul</span>
            <span className="text-xl font-black text-white leading-none mt-0.5">24</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold tracking-wider text-white/40 bg-white/6 px-1.5 py-0.5 rounded">
                NEXT
              </span>
              <span className="text-[9px] font-bold tracking-wider text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                CONFIRMED
              </span>
            </div>
            <p className="text-sm font-bold text-white">Strength & Conditioning</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-white/35 font-medium">
                <Clock size={10} /> Thu 24 Jul · 07:00 · 60 min
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-white/15 group-hover:text-white/50 transition-colors shrink-0" />
        </motion.button>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'rgba(200,200,200,0.06)' }} />

        {/* Last session row */}
        <motion.button
          onClick={() => goToSession(4)}
          whileTap={{ scale: 0.99 }}
          className="w-full text-left flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          {/* Done badge */}
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,200,200,0.08)' }}>
            <CheckCircle2 size={22} className="text-white/20" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold tracking-wider text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                LAST
              </span>
            </div>
            <p className="text-sm font-bold text-white/60">Upper Body Power</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-white/30 font-medium">
                <Dumbbell size={10} /> Tue 22 Jul · 7 exercises · 55 min
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-white/10 group-hover:text-white/35 transition-colors shrink-0" />
        </motion.button>
      </div>
    </section>
  );
}

/* ── Quote of the day ─────────────────────────────────────────────────────── */
function QuoteCard() {
  const q = getDailyQuote();
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-white/70">Today's Focus</h3>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ height: 170, border: '1px solid rgba(200,200,200,0.08)' }}
      >
        {/* Full-bleed background photo */}
        <img
          src={q.img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center top' }}
        />

        {/* Dark gradient — heavy at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.3) 100%)',
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-base font-bold text-white leading-snug drop-shadow-lg">
            {q.text}
          </p>
          {q.author && (
            <p className="text-[10px] text-white/45 font-medium mt-1.5">
              — {q.author}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
interface HomeProps {
  setPage:     (page: Page) => void;
  goToSession: (id: number) => void;
}

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('mg_profile') || 'null'); } catch { return null; }
}

export const Home = ({ setPage, goToSession }: HomeProps) => {
  const profile   = loadProfile();
  const firstName = profile?.firstName
    ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1).toLowerCase()
    : 'Marcus';
  const initials  = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || 'MG'
    : 'MG';

  const [avatar] = useState<string | null>(() => localStorage.getItem('mg_avatar'));

  return (
    <div className="min-h-screen bg-transparent text-foreground pb-28 md:pb-8">

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0e0e0e 0%, #1a1a1a 60%, #111111 100%)' }}>

        {/* Chrome sheen top-right */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(220,220,220,0.07) 0%, transparent 60%)' }} />

        {/* Content row */}
        <div className="relative px-5 md:px-8 pt-12 pb-8 flex items-center justify-between gap-4">

          {/* Left — greeting + name */}
          <div className="flex flex-col">
            <motion.p
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="text-base font-medium text-white/60 mb-1"
            >
              {getGreeting()}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="text-5xl font-black text-white leading-none tracking-tight"
            >
              {firstName}
            </motion.h1>
          </div>

          {/* Right — profile photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
            className="relative shrink-0"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/30 flex items-center justify-center"
              style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.3)' }}>
              {avatar
                ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-2xl font-black text-white/80">{initials}</span>
              }
            </div>
          </motion.div>
        </div>

        {/* Soft fade into page — no hard edge */}
        <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(8,8,8,0) 0%, hsl(0 0% 3%) 100%)' }} />
      </div>

      {/* ── Daily challenge — full width banner ──────────────────────────── */}
      <div className="px-5 md:px-8 mt-5 mb-7">
        <DailyChallengeCard />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 flex flex-col gap-7 md:grid md:grid-cols-2 md:gap-8">

        {/* Col 1 */}
        <div className="flex flex-col gap-7">
          <MetricsSection />
          <QuoteCard />
        </div>

        {/* Col 2 */}
        <div className="flex flex-col gap-7">
          <SessionsBlock goToSession={goToSession} />

          {/* Desktop: Book session CTA */}
          <div className="hidden md:block">
            <button
              onClick={() => setPage('sessions')}
              className="w-full bg-primary hover:bg-primary/90 transition-colors py-3.5 rounded-full text-sm font-bold tracking-wide text-white"
            >
              Book a Session →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
