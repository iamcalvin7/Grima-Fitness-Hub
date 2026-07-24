import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Heart, Activity, ChevronRight,
  Clock, MapPin, CheckCircle2, Dumbbell, Quote, Star, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, Cell, Tooltip,
  AreaChart, Area, YAxis, ReferenceLine, XAxis,
} from 'recharts';
import {
  getTodayChallenge, isChallengeComplete, completeChallenge,
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

/* ── Daily challenge card ─────────────────────────────────────────────────── */
function DailyChallengeCard({ onComplete }: { onComplete?: () => void }) {
  const [done, setDone]     = useState(isChallengeComplete);
  const challenge            = getTodayChallenge();
  const countdown            = useCountdown();
  const [flash, setFlash]   = useState(false);

  const handleComplete = () => {
    completeChallenge();
    setFlash(true);
    setTimeout(() => { setDone(true); onComplete?.(); }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-xl border"
      style={done
        ? { background: '#111111', borderColor: 'rgba(255,255,255,0.07)' }
        : { background: 'linear-gradient(135deg,rgba(139,69,217,0.18) 0%,rgba(139,69,217,0.06) 100%)', borderColor: 'rgba(139,69,217,0.35)', boxShadow: '0 0 28px rgba(139,69,217,0.14)' }
      }
    >
      {/* Top accent line */}
      {!done && <div className="absolute inset-x-0 top-0 h-px bg-primary/60" />}

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-4 flex items-center gap-4">
            {/* Emoji bubble */}
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-2xl shrink-0">
              {challenge.emoji}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black tracking-widest text-primary/70 uppercase">Daily Challenge</span>
                <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  <Star size={8} /> +{challenge.pts} pts
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-tight">{challenge.name}</p>
              <p className="text-[10px] text-white/45 font-medium mt-0.5">{challenge.desc}</p>
            </div>

            <motion.button
              onClick={handleComplete}
              whileTap={{ scale: 0.94 }}
              animate={flash ? { scale: [1, 1.15, 1], backgroundColor: ['#8B45D9','#A565F2','#8B45D9'] } : {}}
              className="shrink-0 bg-primary hover:bg-primary/90 transition-colors rounded-lg px-3 py-2 flex items-center gap-1.5 text-[10px] font-black text-white uppercase tracking-wide"
            >
              <Zap size={11} /> Done
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="px-4 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-primary/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black tracking-widest text-primary/50 uppercase">Challenge Complete</span>
                <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">+50 pts earned</span>
              </div>
              <p className="text-sm font-bold text-white/60">{challenge.name}</p>
              <p className="text-[10px] text-white/30 font-medium mt-0.5">
                Next challenge in <span className="text-white/50 tabular-nums font-bold">{countdown}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

const SPARKLINES = {
  steps:    [5200, 6800, 7100, 6200, 8500, 7200, 8432].map((v, i) => ({ i, v })),
  calories: [510,  580,  620,  490,  700,  580,  647 ].map((v, i) => ({ i, v })),
  bpm:      [68,   71,   69,   73,   70,   74,   72  ].map((v, i) => ({ i, v })),
};

/* ── Metrics section ──────────────────────────────────────────────────────── */
function MetricsSection() {
  const stepsVal = useCountUp(8432, 1500);
  const calsVal  = useCountUp(647,  1100);
  const bpmVal   = useCountUp(72,    800);
  const [active, setActive]       = useState(0);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const CARDS = [
    {
      key: 'steps',
      icon: (
        <motion.div animate={{ x:[0,3,0,-1,0], rotate:[0,7,0,-3,0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}>
          <Activity className="w-6 h-6" />
        </motion.div>
      ),
      value: stepsVal.toLocaleString(),
      sub:   'Steps',
      delta: '+12% today',
      up:    true,
      spark: SPARKLINES.steps,
    },
    {
      key: 'calories',
      icon: (
        <motion.div
          animate={{ scaleX:[1,.88,1.08,.93,1.05,1], scaleY:[1,1.12,.92,1.08,.96,1], rotate:[0,-4,3,-3,2,0] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX:'50%', originY:'100%' }}>
          <Flame className="w-6 h-6" />
        </motion.div>
      ),
      value: String(calsVal),
      sub:   'Kcal Active',
      delta: '↑ 8% vs yesterday',
      up:    true,
      spark: SPARKLINES.calories,
    },
    {
      key: 'bpm',
      icon: (
        <motion.div animate={{ scale:[1,1.42,.88,1.22,1,1,1,1] }}
          transition={{ duration: 0.833, repeat: Infinity, times:[0,.1,.2,.32,.45,.6,.8,1], ease:'easeInOut' }}>
          <Heart className="w-6 h-6" fill="currentColor" />
        </motion.div>
      ),
      value: String(bpmVal),
      sub:   'Bpm Resting',
      delta: '↓ 3 vs yesterday',
      up:    false,
      spark: SPARKLINES.bpm,
    },
  ];

  return (
    <section className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/50">Your Metrics</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/30">
          via Apple Health
          <Heart size={11} className="text-primary/60" fill="currentColor" />
        </span>
      </div>

      {/* ── Carousel ── */}
      <div className="flex items-stretch gap-2.5">
        {CARDS.map((card, i) => {
          const isFeatured = i === active;
          return (
            <motion.button
              key={card.key}
              onClick={() => setActive(i)}
              animate={{ flex: isFeatured ? 2.2 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`relative overflow-hidden rounded-2xl text-left border transition-colors
                ${isFeatured
                  ? 'bg-[#130d1f] border-primary/40'
                  : 'bg-[#111111] border-white/6'}`}
              style={isFeatured
                ? { boxShadow: '0 0 32px rgba(139,69,217,0.22)' }
                : undefined}
            >
              {/* Top accent */}
              {isFeatured && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}

              <div className={`flex flex-col ${isFeatured ? 'p-4' : 'p-3'}`}>
                <span className={`text-primary mb-2 ${isFeatured ? '' : 'opacity-60'}`}>
                  {card.icon}
                </span>
                <p className={`font-black tabular-nums leading-none
                  ${isFeatured ? 'text-3xl text-white' : 'text-xl text-white/70'}`}>
                  {card.value}
                </p>
                <p className={`font-bold uppercase tracking-wider mt-1
                  ${isFeatured ? 'text-[10px] text-primary' : 'text-[9px] text-white/35'}`}>
                  {card.sub}
                </p>

                {/* Delta — featured only */}
                {isFeatured && (
                  <span className={`mt-2 self-start flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg
                    ${card.up
                      ? 'bg-primary/15 text-primary'
                      : 'bg-white/8 text-white/50'}`}>
                    {card.delta}
                  </span>
                )}

                {/* Sparkline — featured only */}
                {isFeatured && (
                  <div className="mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height={40}>
                      <AreaChart data={card.spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`sg-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#8B45D9" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#8B45D9" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone" dataKey="v"
                          stroke="#8B45D9" strokeWidth={1.5}
                          fill={`url(#sg-${card.key})`}
                          dot={false} isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5">
        {CARDS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`rounded-full transition-all ${i === active ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/20'}`}
          />
        ))}
      </div>

      {/* ── Weekly Activity chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-white/8 rounded-2xl overflow-hidden"
      >
        {/* Chart header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary/60" />
            <span className="text-xs font-bold text-white/60">Weekly Activity</span>
          </div>
          <span className="text-[10px] font-bold text-white/30 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1">
            This Week
          </span>
        </div>

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
              stroke="rgba(139,69,217,0.4)"
              strokeDasharray="4 3"
              label={{ value: '7.5K', position: 'right', fontSize: 9, fill: 'rgba(139,69,217,0.7)', fontWeight: 700 }}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as typeof STEP_DATA[0];
                const isToday = payload[0].payload === STEP_DATA[TODAY_IDX];
                return (
                  <div
                    className="bg-[#1a1225] border border-primary/50 px-3 py-2 rounded-xl"
                    style={{ boxShadow: '0 0 20px rgba(139,69,217,0.3)' }}
                  >
                    {isToday && (
                      <p className="text-[9px] font-black tracking-widest text-primary uppercase mb-0.5">Today</p>
                    )}
                    <p className="text-xs font-black text-white tabular-nums">
                      {d.steps.toLocaleString()} <span className="text-[10px] text-white/40 font-medium">steps</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="steps" radius={[4,4,0,0]}>
              {STEP_DATA.map((_, i) => {
                const isHov   = hoveredBar === i;
                const isToday = i === TODAY_IDX;
                return (
                  <Cell
                    key={i}
                    fill={isHov || isToday ? '#A565F2' : '#8B45D9'}
                    opacity={isHov ? 1 : hoveredBar !== null ? 0.1 : isToday ? 1 : 0.22}
                    style={isHov || isToday
                      ? { filter: 'drop-shadow(0 0 8px rgba(165,101,242,0.6))' }
                      : undefined}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Day labels */}
        <div className="flex justify-between text-[10px] font-semibold px-5 pb-3" style={{ paddingLeft: 44 }}>
          {STEP_DATA.map((d, i) => (
            <span key={i} className={
              hoveredBar === i          ? 'text-primary font-black' :
              i === TODAY_IDX           ? 'text-primary' :
              'text-white/25'
            }>{d.day}</span>
          ))}
        </div>
      </motion.div>

    </section>
  );
}

/* ── Sessions block ───────────────────────────────────────────────────────── */
function SessionsBlock({ goToSession }: { goToSession: (id: number) => void }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground/50">Sessions</h3>

      {/* Unified card container */}
      <div className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">

        {/* Next session row */}
        <motion.button
          onClick={() => goToSession(1)}
          whileTap={{ scale: 0.99 }}
          className="w-full text-left flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          {/* Date badge */}
          <div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-lg flex flex-col items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-primary/50 uppercase leading-none tracking-wider">Jul</span>
            <span className="text-xl font-black text-white leading-none mt-0.5">24</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                NEXT
              </span>
              <span className="text-[9px] font-bold tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                CONFIRMED
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">Strength & Conditioning</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-foreground/40 font-medium">
                <Clock size={10} /> Thu 24 Jul · 07:00 · 60 min
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-foreground/20 group-hover:text-primary transition-colors shrink-0" />
        </motion.button>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-4" />

        {/* Last session row */}
        <motion.button
          onClick={() => goToSession(4)}
          whileTap={{ scale: 0.99 }}
          className="w-full text-left flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          {/* Done badge */}
          <div className="w-12 h-12 bg-white/4 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-foreground/30" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold tracking-wider text-foreground/40 bg-white/5 px-1.5 py-0.5 rounded">
                LAST
              </span>
            </div>
            <p className="text-sm font-bold text-foreground/70">Upper Body Power</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-foreground/35 font-medium">
                <Dumbbell size={10} /> Tue 22 Jul · 7 exercises · 55 min
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-foreground/20 group-hover:text-foreground/50 transition-colors shrink-0" />
        </motion.button>
      </div>
    </section>
  );
}

/* ── Quote of the day ─────────────────────────────────────────────────────── */
function QuoteCard() {
  const q = getDailyQuote();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl"
      style={{ height: 190 }}
    >
      {/* Full-bleed background photo */}
      <img
        src={q.img}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center top' }}
      />

      {/* Dark gradient — heavy at bottom, light at top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.15) 100%)',
        }}
      />

      {/* Subtle purple tint overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: 'linear-gradient(135deg, #8B45D9 0%, transparent 60%)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        {/* Top label */}
        <span className="text-[9px] font-black tracking-[0.3em] text-primary uppercase">
          Today's Focus
        </span>

        {/* Bottom text */}
        <div>
          <p className="text-base font-bold text-white leading-snug drop-shadow-lg">
            {q.text}
          </p>
          {q.author && (
            <p className="text-[10px] text-white/50 font-medium mt-1.5">
              — {q.author}
            </p>
          )}
        </div>
      </div>
    </motion.div>
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

  return (
    <div className="min-h-screen bg-transparent text-foreground pb-28 md:pb-8">

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 pt-10 pb-8 flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium text-foreground/40 mb-1"
        >
          {getGreeting()}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-5xl font-black text-white leading-none tracking-tight"
        >
          {firstName}
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-10 h-0.5 bg-primary mt-4 rounded-full"
        />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 flex flex-col gap-7 md:grid md:grid-cols-2 md:gap-8">

        {/* Col 1 */}
        <div className="flex flex-col gap-7">
          <DailyChallengeCard />
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
              className="w-full bg-primary hover:bg-primary/90 transition-colors py-3.5 rounded-xl text-sm font-bold tracking-wide text-white"
            >
              Book a Session →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
