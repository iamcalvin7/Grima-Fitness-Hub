import React, { useState, useRef } from 'react';
import { FeatureCatalogue } from './ProposalCatalogue';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  CheckCircle, ArrowRight, X, Confetti,
  ShieldCheck, Barbell, TrendUp, ForkKnife, CalendarBlank,
  ChatCircle, Money, Briefcase, ChartLine, BookOpen,
  Brain, Lock, UserCircle, Rocket, Star, CaretRight, CaretDown,
  Checks, Play, UploadSimple, Globe, Lightning, Warning,
} from '@phosphor-icons/react';

/* ── Fade-in section wrapper ───────────────────────────────────────────────── */
function FadeSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Section label ─────────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mb-4">
      {children}
    </p>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────────── */
function Divider() {
  return <div className="border-t border-white/5 my-16" />;
}

/* ══════════════════════════════════════════════════════════════════════════════
   1. HERO
══════════════════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative pt-20 pb-8 px-5 md:px-12 overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-72 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 65%)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}>
        <p className="text-[10px] font-bold tracking-[0.35em] text-primary uppercase mb-6">
          Project Proposal · 2026
        </p>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-primary leading-[1.05] max-w-3xl mb-8">
          Building the future of Marcus Grima Fitness.
        </h1>

        <p className="text-base md:text-lg text-white/55 font-medium leading-relaxed max-w-2xl mb-12">
          Turning Marcus Grima Fitness into a scalable digital business with one connected
          platform for members, coaching and growth.
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
        className="grid grid-cols-2 gap-4 max-w-lg"
      >
        {[
          { value: 'Oct 15, 2026', label: 'Soft Launch' },
          { value: 'Jan 3, 2027', label: 'Public Launch' },
        ].map((s) => (
          <div key={s.label} className="border border-white/8 bg-white/[0.03] px-4 py-5">
            <p className="text-2xl md:text-3xl font-black text-primary tracking-tight leading-none mb-1.5">{s.value}</p>
            <p className="text-[9px] font-bold tracking-[0.22em] text-white/35 uppercase">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   2. SETTING THE STAGE — WHY / WHAT / HOW
══════════════════════════════════════════════════════════════════════════════ */
const CLIENT_DEMANDS = [
  'More programmes to manage',
  'More communication',
  'More bookings and follow-ups',
  'More progress tracking',
  'More content to deliver',
  'More admin behind the scenes',
  'More demand on Marcus personally',
];

const CLIENT_ABILITIES = [
  'Access their personalised training programme',
  'Follow workouts step by step',
  'Log weights, sets, reps and performance',
  'Track progress over time',
  'Complete regular check-ins',
  'Set and follow goals',
  'Build better habits',
  'Access nutrition guidance',
  'Book coaching sessions',
  'Communicate directly with Marcus',
  'Watch exercise demonstrations',
  'Access educational and motivational content',
  'Manage their membership and account',
];

const APP_ENCOURAGES = [
  { k: 'Consistency', v: 'by making the next action clear' },
  { k: 'Accountability', v: 'through check-ins, progress and goals' },
  { k: 'Growth', v: 'by making improvement visible' },
  { k: 'Confidence', v: 'through education and guidance' },
  { k: 'Engagement', v: 'by maintaining the coaching relationship between sessions' },
  { k: 'Ownership', v: 'by helping clients understand and control their own journey' },
];

const BEST_MEANS = [
  'The easiest to use',
  'The most personal',
  'The most motivating',
  'The most connected',
  'The most useful day to day',
  'Unmistakably Marcus',
];

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mb-6">
      {items.map((g) => (
        <li key={g} className="flex items-start gap-2 text-sm text-white leading-relaxed">
          <span className="mt-[7px] h-1 w-1 rounded-full bg-primary shrink-0" />
          <span>{g}</span>
        </li>
      ))}
    </ul>
  );
}

function SettingTheStage() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Setting The Stage</SectionLabel>

      {/* The Why */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-5">The Why — The Challenge</h2>
        <p className="text-base md:text-lg font-bold text-white leading-relaxed mb-5">
          The business has grown because Marcus is at the centre of everything.
          That is also what will eventually limit it.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          Marcus has built a loyal client base through trust, expertise, personal service and
          the direct relationship he has with the people he coaches. That is what made the
          business successful. But the same model that created the growth will eventually
          create a ceiling.
        </p>
        <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Every new client means</p>
        <Bullets items={CLIENT_DEMANDS} />
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          There are only so many hours in the day. If every new client requires more of
          Marcus's time, the business can continue to grow, but it cannot scale efficiently.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          There is also a wider opportunity. Today, most revenue is still tied directly to
          personal training. Marcus has the potential to become one of Malta's most
          recognised names in fitness, performance and wellbeing — but reaching that level
          requires a business model that goes beyond selling hours.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed">
          The opportunity now is to take everything that makes Marcus's coaching valuable and
          build a business around it that can reach far more people.
        </p>
      </div>

      <AppMockups />

      {/* The What */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-5">The What — The Client Experience</h2>
        <p className="text-base md:text-lg font-bold text-white leading-relaxed mb-5">
          The app will become the centre of the client's fitness journey.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          One place to know what to do, understand how they are progressing, stay
          accountable, receive guidance and remain connected to Marcus throughout the week.
          Instead of moving between WhatsApp conversations, booking systems, workout
          trackers, nutrition tools, notes and saved content, the most important parts of the
          client experience will live in one connected platform.
        </p>
        <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Clients will be able to</p>
        <Bullets items={CLIENT_ABILITIES} />
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          But the app will be more than a collection of tools. It will act as an extension of
          Marcus — a digital coaching layer that continues supporting clients when Marcus is
          not physically beside them.
        </p>
        <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">It will encourage</p>
        <ul className="space-y-1.5 mb-6">
          {APP_ENCOURAGES.map((e) => (
            <li key={e.k} className="flex items-start gap-2 text-sm text-white leading-relaxed">
              <span className="mt-[7px] h-1 w-1 rounded-full bg-primary shrink-0" />
              <span><span className="font-bold text-primary">{e.k}</span> {e.v}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm md:text-base text-white leading-relaxed">
          The app will not replace the personal relationship. It will make it stronger.
          Marcus's coaching will no longer exist only inside the gym session — it will become
          part of the client's everyday fitness journey.
        </p>
      </div>

      {/* The How */}
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-5">The How — The Vision</h2>
        <p className="text-base md:text-lg font-bold text-white leading-relaxed mb-5">
          Build the best fitness and coaching platform in Malta.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          We are not building a companion app for the existing business. We are building the
          digital product that will define the next version of it. The ambition is to create
          an experience that feels premium, personal and genuinely useful enough that clients
          choose to use it every day.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          It will take the strongest behaviours people already value from training apps,
          habit trackers, nutrition tools, booking platforms, messaging and content platforms
          — and bring them together into one experience built specifically around Marcus's
          coaching philosophy.
        </p>
        <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Being the best will not mean having the most features. It will mean being</p>
        <Bullets items={BEST_MEANS} />
        <p className="text-sm md:text-base text-white leading-relaxed mb-5">
          The platform will be built to evolve. As the business grows, it will support new
          programmes, memberships, services, content, community experiences and future
          revenue opportunities without needing to rebuild the foundation each time.
        </p>
        <p className="text-sm md:text-base text-white leading-relaxed">
          The result will be more than an app. It will become the digital home of the brand
          and the infrastructure behind its next stage of growth. The goal is not to compete
          with other personal trainers — it is to set the standard for what a modern fitness
          brand in Malta can become.
        </p>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   2x. APP MOCKUPS — visual break for the overview
══════════════════════════════════════════════════════════════════════════════ */
function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 snap-center w-[230px]">
      <div className="rounded-[2rem] border border-white/12 bg-[#0A0A0A] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="rounded-[1.6rem] bg-[#111] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
          <div className="pt-8 pb-5 px-3.5 h-[420px] flex flex-col gap-3">
            {children}
          </div>
        </div>
      </div>
      <p className="text-[9px] font-bold tracking-[0.25em] text-white/35 uppercase text-center mt-3">{label}</p>
    </div>
  );
}

function MockToday() {
  return (
    <>
      <div>
        <p className="text-[8px] font-bold tracking-widest text-white/30 uppercase">Wednesday</p>
        <p className="text-sm font-black text-white tracking-tight">Morning, Sarah 👋</p>
      </div>
      <div className="rounded-xl bg-primary p-3">
        <p className="text-[8px] font-black tracking-widest text-black/50 uppercase mb-0.5">Today's Session</p>
        <p className="text-xs font-black text-black leading-tight">Lower Body Strength</p>
        <p className="text-[9px] font-bold text-black/60 mt-1">6 exercises · 45 min</p>
        <div className="mt-2 inline-block rounded-full bg-black px-3 py-1 text-[8px] font-black tracking-widest text-primary uppercase">Start Workout</div>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <p className="text-[8px] font-black tracking-widest text-white/30 uppercase mb-1.5">Today's Habits</p>
        {[['Protein target', true], ['10k steps', true], ['Evening stretch', false]].map(([h, done]) => (
          <div key={h as string} className="flex items-center gap-2 py-1">
            <div className={`w-3 h-3 rounded-full border ${done ? 'bg-primary border-primary' : 'border-white/20'}`} />
            <p className={`text-[10px] font-semibold ${done ? 'text-white' : 'text-white/40'}`}>{h}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 flex items-center justify-between">
        <div>
          <p className="text-[8px] font-black tracking-widest text-white/30 uppercase">Next PT Session</p>
          <p className="text-[10px] font-bold text-white mt-0.5">Fri 07:30 · with Marcus</p>
        </div>
        <div className="text-primary text-[16px] font-black">→</div>
      </div>
    </>
  );
}

function MockWorkout() {
  return (
    <>
      <div>
        <p className="text-[8px] font-bold tracking-widest text-primary uppercase">Lower Body Strength</p>
        <p className="text-sm font-black text-white tracking-tight">Back Squat</p>
        <p className="text-[9px] text-white/40 font-semibold">Set 3 of 4 · 90s rest</p>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/8">
        {[['1', '80 kg', '8 reps', true], ['2', '85 kg', '6 reps', true], ['3', '90 kg', '5 reps', false], ['4', '90 kg', '5 reps', false]].map(([set, kg, reps, done]) => (
          <div key={set as string} className={`flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-0 ${done ? 'bg-primary/[0.06]' : 'bg-white/[0.02]'}`}>
            <p className="text-[9px] font-black text-white/30">SET {set}</p>
            <p className="text-[10px] font-bold text-white">{kg}</p>
            <p className="text-[10px] font-bold text-white/60">{reps}</p>
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${done ? 'bg-primary border-primary' : 'border-white/20'}`}>
              {done ? <span className="text-[7px] font-black text-black">✓</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
        <p className="text-[8px] font-black tracking-widest text-white/30 uppercase mb-1">Form Cue · from Marcus</p>
        <p className="text-[10px] text-white leading-relaxed">Drive through the mid-foot, chest proud out of the hole.</p>
      </div>
      <div className="mt-auto rounded-full bg-primary py-2 text-center text-[9px] font-black tracking-widest text-black uppercase">Log Set · 90 kg × 5</div>
    </>
  );
}

function MockProgress() {
  return (
    <>
      <div>
        <p className="text-[8px] font-bold tracking-widest text-white/30 uppercase">Progress</p>
        <p className="text-sm font-black text-white tracking-tight">12 weeks in</p>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[8px] font-black tracking-widest text-white/30 uppercase">Body Weight</p>
          <p className="text-[10px] font-black text-primary">-6.4 kg</p>
        </div>
        <svg viewBox="0 0 180 60" className="w-full">
          <polyline
            points="0,12 25,16 50,22 75,20 100,30 125,36 150,42 180,50"
            fill="none" stroke="hsl(76 100% 60%)" strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="180" cy="50" r="3.5" fill="hsl(76 100% 60%)" />
        </svg>
        <div className="flex justify-between mt-1">
          <p className="text-[8px] font-bold text-white/25">MAY</p>
          <p className="text-[8px] font-bold text-white/25">AUG</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['Squat 1RM', '+15 kg'], ['Check-ins', '12/12'], ['Streak', '38 days'], ['Sessions', '46']].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
            <p className="text-[11px] font-black text-primary tracking-tight">{v}</p>
            <p className="text-[8px] font-bold tracking-widest text-white/30 uppercase mt-0.5">{k}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-2.5">
        <p className="text-[9px] font-bold text-primary leading-relaxed">🎉 New milestone — strongest squat to date.</p>
      </div>
    </>
  );
}

function MockCoach() {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-black">MG</div>
        <div>
          <p className="text-[11px] font-black text-white tracking-tight leading-none">Marcus</p>
          <p className="text-[8px] font-bold text-primary mt-0.5">● Online</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/8 px-3 py-2">
          <p className="text-[10px] text-white leading-relaxed">Saw your check-in — sleep is trending up. Nice work 💪</p>
        </div>
        <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/8 px-3 py-2">
          <p className="text-[10px] text-white leading-relaxed">I've bumped Friday's squat top set. You're ready for it.</p>
        </div>
        <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2">
          <p className="text-[10px] text-black font-semibold leading-relaxed">Let's go 🔥 see you Friday</p>
        </div>
      </div>
      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 flex items-center justify-between">
        <p className="text-[9px] text-white/25 font-semibold">Message Marcus…</p>
        <span className="text-primary text-[11px] font-black">↑</span>
      </div>
    </>
  );
}

function AppMockups() {
  return (
    <div className="relative -mx-5 md:-mx-12 my-12">
      <div className="flex gap-6 overflow-x-auto px-5 md:px-12 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        <PhoneFrame label="Today"><MockToday /></PhoneFrame>
        <PhoneFrame label="Workout Logging"><MockWorkout /></PhoneFrame>
        <PhoneFrame label="Progress"><MockProgress /></PhoneFrame>
        <PhoneFrame label="Coaching Chat"><MockCoach /></PhoneFrame>
      </div>
      <p className="text-[9px] font-bold tracking-[0.25em] text-white/25 uppercase text-center mt-2">Early concept mockups — final design follows the branding phase</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   2b. THE APP — CORE VISION
══════════════════════════════════════════════════════════════════════════════ */
const TODAY_CLIENT_TOOLS = [
  ['WhatsApp', 'communication'],
  ['Google Calendar / Calendly', 'bookings'],
  ['MyFitnessPal', 'calories and nutrition'],
  ['Strong / Hevy / Fitbod', 'workout tracking'],
  ['Apple Health / Google Fit', 'activity data'],
  ['Notes / spreadsheets', 'measurements and progress'],
  ['YouTube / Instagram', 'exercise demos and education'],
  ['Stripe / Revolut / banking apps', 'payments'],
  ['Email', 'updates and resources'],
  ['Facebook / WhatsApp groups', 'community'],
  ['Google Drive / PDFs', 'plans and documents'],
];

const TODAY_MARCUS_TOOLS = [
  'Spreadsheets', 'Calendars', 'Messaging apps', 'Payment dashboards',
  'Notes', 'Content platforms', 'Client records', 'Manual follow-ups',
];

const TOMORROW_REPLACES = [
  'Workout tracking apps', 'Programme PDFs', 'Progress spreadsheets',
  'Habit trackers', 'Calorie and hydration trackers', 'Booking tools',
  'Client messaging tools', 'Basic community groups', 'Educational content libraries',
  'Exercise video libraries', 'Membership portals', 'Payment and subscription tools',
  'Manual client check-ins', 'Manual follow-up systems',
];

type VisionGroup = { title: string; icon: React.ElementType; items: string[] };

const CLIENT_SIDE_GROUPS: VisionGroup[] = [
  { title: 'Training', icon: Barbell, items: ['Personalised programmes', 'Guided workouts', 'Exercise demonstrations', 'Sets, reps and weights', 'Workout history', 'Progressive overload tracking'] },
  { title: 'Progress', icon: TrendUp, items: ['Measurements', 'Progress photos', 'Goals', 'Milestones', 'Check-ins', 'Habit tracking', 'Performance history'] },
  { title: 'Nutrition', icon: ForkKnife, items: ['Nutrition guidance', 'Calorie tracking', 'Hydration tracking', 'Meal plans', 'Recipes', 'Daily habits'] },
  { title: 'Coaching', icon: ChatCircle, items: ['Direct messaging', 'Feedback', 'Coaching updates', 'Reminders', 'Accountability', 'Personalised guidance'] },
  { title: 'Bookings', icon: CalendarBlank, items: ['Session booking', 'Availability', 'Upcoming sessions', 'Changes and cancellations'] },
  { title: 'Content & Community', icon: Globe, items: ['Educational videos', 'Articles', 'Exercise content', 'Member feed', 'Challenges', 'Community experiences'] },
  { title: 'Membership', icon: Money, items: ['Membership status', 'Payments', 'Subscription management', 'Account settings'] },
];

const MARCUS_HQ_GROUPS: VisionGroup[] = [
  { title: 'Clients', icon: UserCircle, items: ['Client database', 'Client profiles', 'Onboarding', 'Goals', 'History', 'Client status'] },
  { title: 'Coaching', icon: Barbell, items: ['Programme builder', 'Workout builder', 'Exercise library', 'Programme assignment', 'Check-in reviews', 'Performance monitoring'] },
  { title: 'Client Oversight', icon: ChartLine, items: ['Progress dashboards', 'Missed workout indicators', 'Check-in status', 'Engagement signals', 'Clients requiring attention'] },
  { title: 'Bookings', icon: CalendarBlank, items: ['Calendar', 'Availability', 'Session management', 'Rescheduling', 'Attendance'] },
  { title: 'Communication', icon: ChatCircle, items: ['Direct client messaging', 'Broadcast updates', 'Follow-ups', 'Reminders', 'Notifications'] },
  { title: 'Content', icon: Play, items: ['Upload videos', 'Publish articles', 'Manage exercise demonstrations', 'Member feed', 'Educational resources'] },
  { title: 'Commercial', icon: Money, items: ['Memberships', 'Subscriptions', 'Payments', 'Client status', 'Revenue visibility'] },
  { title: 'Business Intelligence', icon: Brain, items: ['Client growth', 'Engagement', 'Retention', 'Programme activity', 'Revenue', 'Operational insights'] },
];

function VisionBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-white leading-relaxed">
      <span className="mt-[7px] h-1 w-1 rounded-full bg-primary shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Vision() {
  const [side, setSide] = useState<'client' | 'marcus'>('client');
  const groups = side === 'client' ? CLIENT_SIDE_GROUPS : MARCUS_HQ_GROUPS;
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>The App — Core Vision</SectionLabel>

      {/* Core vision */}
      <div className="max-w-3xl mb-12">
        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight leading-tight mb-6">
          One platform. Two experiences. Everything connected.
        </h2>
        <div className="space-y-4">
          <p className="text-sm md:text-base text-white leading-relaxed">
            The core vision is to bring the entire Marcus Grima Fitness journey under one roof.
            Today, clients and the business rely on a mix of separate tools for training, progress
            tracking, nutrition, bookings, messaging, payments and content. Each tool solves one
            part of the journey, but together they create a fragmented experience.
          </p>
          <p className="text-base md:text-lg font-bold text-white leading-relaxed">The app changes that.</p>
          <p className="text-sm md:text-base text-white leading-relaxed">
            For clients, it becomes the single place they use to train, track progress, stay
            accountable, communicate and manage their fitness journey. For Marcus, it becomes the
            control centre for coaching, client management, content, bookings, payments and
            business operations.
          </p>
          <p className="text-sm md:text-base text-white leading-relaxed">
            The ambition is not to replace every specialist tool behind the scenes. It is to make
            those tools invisible to the client and give them one clear, branded experience.
          </p>
        </div>
      </div>

      {/* Today vs Tomorrow — the chaos collapses into one app */}
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-stretch mb-14 max-w-5xl">
        {/* Today: scattered tool chaos */}
        <div className="border border-white/8 bg-white/[0.02] p-6 flex flex-col">
          <p className="text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase mb-1">Today</p>
          <p className="text-lg font-black text-white tracking-tight mb-5">Multiple apps. Multiple systems. Multiple journeys.</p>
          <div className="flex-1 flex flex-wrap content-center justify-center gap-2.5 py-4">
            {TODAY_CLIENT_TOOLS.map(([tool, use], i) => (
              <motion.span
                key={tool}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                title={use}
                style={{ transform: `rotate(${[-3, 2, -1.5, 2.5, -2, 1, 3, -2.5, 1.5, -1, 2][i % 11]}deg)` }}
                className="px-3 py-1.5 border border-white/12 bg-white/[0.04] text-[11px] font-bold text-white/70 shadow-lg"
              >
                {tool}
              </motion.span>
            ))}
            {TODAY_MARCUS_TOOLS.map((t, i) => (
              <span
                key={t}
                style={{ transform: `rotate(${[2, -2.5, 1.5, -1, 3, -3, 1, -2][i % 8]}deg)` }}
                className="px-2.5 py-1 border border-white/8 bg-white/[0.02] text-[10px] font-semibold text-white/40"
              >
                {t}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/60 leading-relaxed mt-4 text-center">
            A fitness experience spread across <span className="font-black text-white">{TODAY_CLIENT_TOOLS.length + TODAY_MARCUS_TOOLS.length}+ separate places</span>.
          </p>
        </div>

        {/* Arrow */}
        <div className="flex md:flex-col items-center justify-center gap-2 text-primary">
          <Lightning size={22} weight="fill" />
          <ArrowRight size={26} weight="bold" className="rotate-90 md:rotate-0" />
        </div>

        {/* Tomorrow: one phone */}
        <div className="border border-primary/25 bg-primary/[0.04] p-6 flex flex-col">
          <p className="text-[9px] font-bold tracking-[0.25em] text-primary uppercase mb-1">Tomorrow</p>
          <p className="text-lg font-black text-white tracking-tight mb-5">One Marcus Grima Fitness platform.</p>
          <div className="flex-1 flex items-center justify-center py-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="w-[150px] h-[290px] rounded-[28px] border-2 border-primary/50 bg-black shadow-[0_0_60px_-15px_rgba(190,255,60,0.4)] relative overflow-hidden"
            >
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 rounded-full bg-white/8" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                <span className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-black font-black text-lg tracking-tighter">MG</span>
                <p className="text-[10px] font-black tracking-[0.2em] text-white uppercase text-center leading-relaxed">Marcus Grima<br />Fitness</p>
                <p className="text-[8px] font-bold tracking-[0.15em] text-primary uppercase">One app. Everything.</p>
              </div>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/15" />
            </motion.div>
          </div>
          <p className="text-sm text-white leading-relaxed mt-4 text-center">
            Replaces or reduces the need for <span className="font-black text-primary">{TOMORROW_REPLACES.length} categories of tools</span> —
            anything still running behind the scenes stays invisible to the client.
          </p>
        </div>
      </div>

      {/* Client side / Marcus HQ toggle */}
      <div className="max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            {side === 'client' ? 'The Client Side' : 'Marcus HQ'}
          </h3>
          <div className="inline-flex border border-white/10 bg-white/[0.03] p-1">
            {([['client', 'Client'], ['marcus', 'Marcus']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setSide(v)}
                className={`px-5 py-2 text-[11px] font-black tracking-[0.15em] uppercase transition-colors ${
                  side === v ? 'bg-primary text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm md:text-base text-white/70 leading-relaxed mb-6">
          {side === 'client'
            ? 'Everything the client needs to move forward.'
            : 'Everything Marcus needs to deliver and manage the experience.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, gi) => {
            const Icon = g.icon;
            return (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: gi * 0.06, duration: 0.35 }}
                className="border border-white/8 bg-white/[0.02] p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="h-9 w-9 border border-primary/30 bg-primary/10 flex items-center justify-center">
                    <Icon size={17} weight="fill" className="text-primary" />
                  </span>
                  <span className="text-[9px] font-black text-white/25 tracking-widest">{String(g.items.length).padStart(2, '0')}</span>
                </div>
                <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase mb-3">{g.title}</p>
                <ul className="space-y-1.5">
                  {g.items.map((i) => <VisionBullet key={i}>{i}</VisionBullet>)}
                </ul>
              </motion.div>
            );
          })}
        </div>
        <p className="text-sm md:text-base text-white leading-relaxed mt-8">
          {side === 'client'
            ? 'Instead of managing their fitness across multiple platforms, the client gets one clear home for their journey.'
            : 'The client sees a simple fitness app. Marcus sees the operating system behind it.'}
        </p>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   3. FEATURE CATALOGUE
══════════════════════════════════════════════════════════════════════════════ */
const PRODUCT_PILLARS = [
  { title: 'Account & Onboarding', desc: 'Secure sign-up, guided onboarding and profile building — a premium first impression from day one.' },
  { title: 'Coaching & Training', desc: 'Personalised training programmes, exercise library and structured coaching delivery.' },
  { title: 'Progress & Accountability', desc: 'Check-ins, progress photos, measurements and visible results that keep members on track.' },
  { title: 'Nutrition & Daily Habits', desc: 'Nutrition guidance, calorie and water tracking, and daily habit building.' },
  { title: 'Bookings & Service Delivery', desc: 'Session booking, scheduling and cancellations managed entirely in-app.' },
  { title: 'Communication & Community', desc: 'Direct messaging, the community feed and the home of Marcus Grima Fitness members.' },
  { title: 'Payments & Revenue', desc: 'Memberships, subscriptions, digital products and one-off payments — all in one place.' },
  { title: 'Business Operations', desc: 'Invoicing, VAT records, client administration and the systems that run the business.' },
  { title: 'Growth & Acquisition', desc: 'Referrals, offers and the tools that turn the app into a customer acquisition engine.' },
  { title: 'Content & Education', desc: 'Workout videos, educational content and knowledge delivered directly to members.' },
  { title: 'Data & Intelligence', desc: 'Reporting, business insights and visibility across member activity and progress.' },
  { title: 'Safety & Compliance', desc: 'Data protection, privacy and the safeguards a professional platform requires.' },
];

function ProductPillars() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Product Pillars</SectionLabel>
      <p className="text-sm text-white mb-10 max-w-2xl">
        Every feature in the platform belongs to one of twelve product pillars — together they
        cover the full member journey and the full business behind it.
      </p>
      {/* Horizontal scroll strip — swipe/scroll through the 12 pillars */}
      <div className="relative -mx-5 md:-mx-12">
        <div
          className="flex gap-4 overflow-x-auto px-5 md:px-12 pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {PRODUCT_PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="border border-white/8 bg-white/[0.02] p-5 w-[240px] sm:w-[260px] shrink-0 snap-start"
            >
              <p className="text-[9px] font-bold tracking-[0.25em] text-primary uppercase mb-2">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="text-sm font-bold text-primary tracking-wide mb-1">{p.title}</p>
              <p className="text-xs text-white leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        {/* Edge fades to hint at more content */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/80 to-transparent" />
      </div>
      <p className="mt-2 text-[10px] font-bold tracking-widest text-white/25 uppercase flex items-center gap-1.5">
        Scroll to explore all 12 <ArrowRight size={11} weight="bold" className="text-primary" />
      </p>
    </FadeSection>
  );
}

function Pillars() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <FadeSection className="px-5 md:px-12">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full text-left group"
      >
        <SectionLabel>Feature Catalogue</SectionLabel>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight">
            Every feature. Every status.
          </h2>
          <span className="flex items-center gap-2 shrink-0 text-[10px] font-bold tracking-widest uppercase text-white/35 group-hover:text-primary transition-colors">
            {collapsed ? 'Expand' : 'Collapse'}
            <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }} className="inline-flex">
              <CaretDown size={14} weight="bold" />
            </motion.span>
          </span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="catalogue"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white mb-10 max-w-2xl">
              46 features across 12 product pillars — each card expands into a full brief. This
              catalogue doubles as both the sales pitch and a live delivery tracker as the build progresses.
            </p>
            <FeatureCatalogue />
          </motion.div>
        )}
      </AnimatePresence>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   4. LAUNCH PRODUCT
══════════════════════════════════════════════════════════════════════════════ */
const MEMBER_ITEMS = [
  'Secure account with personalised profile',
  'Guided onboarding experience',
  'Personalised training programme',
  'Workout tracking and logging',
  'Weekly coach check-ins',
  'Direct messaging with Marcus',
  'Progress tracking over time',
  'Session bookings and reminders',
  'Membership management and payments',
  'Essential nutrition and habit content',
];

const MARCUS_ITEMS = [
  'Full client record and history',
  'Programme creation and assignment',
  'Check-in review and response',
  'Bookings, calendar, and scheduling',
  'Payment receipts and reporting',
  'Direct client communication',
  'Operational alerts and flags',
  'Business summary dashboard',
];

/* ── Onboarding Flow ── */
const ONBOARDING_STEPS = [
  { n: 1, title: 'Welcome & choice', desc: 'New members are greeted with the brand and choose their path: sign up with email, one tap with Google (Apple to follow), or sign in if they already have an account.' },
  { n: 2, title: 'Name', desc: 'How Marcus greets them in the app — the experience is personal from the first screen.' },
  { n: 3, title: 'Gender', desc: 'Helps Marcus tailor programme and nutrition guidance.' },
  { n: 4, title: 'Age', desc: 'Used for safe, age-appropriate programming.' },
  { n: 5, title: 'Current weight', desc: 'The starting point for progress tracking — updatable anytime in the profile.' },
  { n: 6, title: 'Height', desc: 'Completes the basic physical profile.' },
  { n: 7, title: 'Goal', desc: 'Build Muscle, Lose Weight, Get Fit, Increase Strength, or Improve Endurance — Marcus builds the programme around this.' },
  { n: 8, title: 'Activity level', desc: 'Beginner, Intermediate, or Advanced — sets the right starting intensity.' },
  { n: 9, title: 'Create login', desc: 'Email and password last, once they\u2019re already invested — then straight into the app.' },
];

function OnboardingFlow() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Onboarding Flow</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        From stranger to member in under two minutes.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        Onboarding is a guided, one-question-per-screen journey with a progress bar — built to
        feel effortless and to hand Marcus a complete coaching profile before the member even
        lands in the app. Members joining with Google skip the account steps and only complete
        their profile.
      </p>

      <div className="relative max-w-2xl">
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-white/8" />
        <div className="flex flex-col">
          {ONBOARDING_STEPS.map((s) => (
            <div key={s.n} className="relative flex items-start gap-5 pl-0 py-3">
              <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0 text-primary text-[11px] font-black z-10 bg-[#0A0A0A]">
                {s.n}
              </div>
              <div className="pt-1">
                <p className="text-sm font-bold text-primary tracking-wide mb-0.5">{s.title}</p>
                <p className="text-xs text-white leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/6 bg-white/[0.015] p-5 mt-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <CheckCircle size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-white leading-relaxed">
            <span className="text-white/80 font-semibold">Why it matters:</span> every answer feeds
            directly into Marcus's coaching tools — the goal, activity level and stats arrive in the
            client dashboard the moment a member finishes, so the first programme can be built
            without a single intake form or back-and-forth message.
          </p>
        </div>
      </div>
    </FadeSection>
  );
}

/* ── Wearable & Health Data Support ── */
const WEARABLES = [
  { name: 'Apple Watch / Apple Health', how: 'Native app', phase: 'Later', note: 'Steps, workouts, heart rate, sleep. Requires the future iOS app — Apple Health is only accessible to native apps.',
    access: 'API is free, but only reachable through a native iOS app — which carries the $99/yr Apple Developer fee.' },
  { name: 'Fitbit', how: 'Direct web API', phase: 'Launch-ready', note: 'Steps, activity, heart rate, sleep via one-tap account connection.',
    access: 'Free and dependable. Minute-by-minute detail needs a simple approval from Google, routinely granted.' },
  { name: 'Garmin', how: 'Direct web API', phase: 'Launch-ready', note: 'Full activity and wellness data via Garmin Connect.',
    access: 'Free, but requires applying to Garmin as a business — approval can take weeks and is not automatic.' },
  { name: 'Strava', how: 'Direct web API', phase: 'Launch-ready', note: 'Runs, rides and workouts — popular with outdoor athletes.',
    access: 'Free, with a caveat: Strava\u2019s terms restrict showing a member\u2019s data to anyone but the member — coach visibility sits in a grey area.' },
  { name: 'Oura Ring', how: 'Direct web API', phase: 'Launch-ready', note: 'Sleep, readiness and recovery scores.',
    access: 'Free and straightforward — no approval process.' },
  { name: 'Polar', how: 'Direct web API', phase: 'Launch-ready', note: 'Training sessions and heart-rate data via Polar Flow.',
    access: 'Free (Polar AccessLink API) — no approval process.' },
  { name: 'Whoop', how: 'Direct web API', phase: 'Launch-ready', note: 'Strain, recovery and sleep metrics.',
    access: 'Free, but developer access must be applied for and approved by Whoop.' },
  { name: 'Withings', how: 'Direct web API', phase: 'Launch-ready', note: 'Smart scales and hybrid watches — weight and body composition.',
    access: 'Free and straightforward — no approval process.' },
  { name: 'Samsung Galaxy Watch / Health Connect', how: 'Native app', phase: 'Later', note: 'Android health data via Health Connect. Requires the future Android app.',
    access: 'API is free, but only reachable through a native Android app ($25 one-off Google Play registration).' },
  { name: 'Xiaomi / Amazfit, Suunto, Coros & others', how: 'Aggregator API', phase: 'As needed', note: 'Covered through an aggregator service (e.g. Terra) if members request them.',
    access: 'Not free — aggregator services typically cost ~€100+/month. Only worth adding once member demand justifies it.' },
];

const WEARABLE_PHASE_STYLE: Record<string, string> = {
  'Launch-ready': 'text-primary border-primary/30 bg-primary/10',
  'Later':        'text-orange-400 border-orange-500/25 bg-orange-500/10',
  'As needed':    'text-white/40 border-white/10 bg-white/5',
};

function WearableSupport() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Wearables & Health Data</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        Members' data, wherever it lives.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        Steps, workouts, heart rate and sleep flow in automatically from the devices members
        already wear. Most connect directly from the web app with one tap — no app store
        required. Apple Health and Health Connect follow when the native apps ship.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 mb-6">
        {WEARABLES.map((w) => (
          <div key={w.name} className="p-5 md:flex md:items-start md:gap-6">
            <div className="md:w-72 shrink-0 mb-2 md:mb-0">
              <p className="text-sm font-bold text-primary tracking-wide">{w.name}</p>
              <p className="text-[9px] font-bold tracking-[0.22em] text-white/30 uppercase mt-1">{w.how}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-white leading-relaxed">{w.note}</p>
              <p className="text-[11px] text-white/35 leading-relaxed mt-1.5">
                <span className="text-primary/70 font-semibold uppercase tracking-wider text-[9px] mr-1.5">Access &amp; cost</span>
                {w.access}
              </p>
            </div>
            <span className={`inline-block border px-2.5 py-1 text-[9px] font-bold tracking-[0.18em] uppercase mt-2 md:mt-0 shrink-0 ${WEARABLE_PHASE_STYLE[w.phase]}`}>
              {w.phase}
            </span>
          </div>
        ))}
      </div>

      <div className="border border-white/5 bg-white/[0.01] p-4 flex items-start gap-3">
        <Warning size={14} weight="fill" className="text-white/25 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/30 leading-relaxed">
          "Launch-ready" means the provider offers a web API the platform can integrate at launch
          without any app store presence. Apple Health and Health Connect are platform-locked to
          native apps by Apple and Google respectively. Actual integration order will follow
          member demand — each connection is a small, independent build.
        </p>
      </div>
    </FadeSection>
  );
}

function LaunchProduct() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Recommended Launch Product</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        Personalised coaching membership.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        The launch proposition is focused: a premium one-to-one coaching relationship, fully
        delivered through the app. Members get a complete experience; Marcus gets everything
        he needs to manage it.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-white/8 bg-white/[0.02] p-6">
          <p className="text-[9px] font-bold tracking-[0.25em] text-white/35 uppercase mb-4">Member experience</p>
          <div className="flex flex-col gap-3">
            {MEMBER_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={15} weight="fill" className="text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-primary/15 bg-primary/[0.03] p-6">
          <p className="text-[9px] font-bold tracking-[0.25em] text-primary/70 uppercase mb-4">Marcus receives</p>
          <div className="flex flex-col gap-3">
            {MARCUS_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={15} weight="fill" className="text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   5. BRANDING CHECKLIST
══════════════════════════════════════════════════════════════════════════════ */
const BRANDING_AREAS = [
  { title: 'Brand Foundations', desc: 'Brand positioning, tone of voice, target audience definition, and competitive differentiation. The strategic layer that everything else is built on.' },
  { title: 'Brand Identity', desc: 'Final logo suite, typography selection, colour system, iconography style, and the complete visual identity package.' },
  { title: 'Digital Look & Feel', desc: 'UI component refinement, app visual language, motion principles, and design system documentation aligned to the final brand.' },
  { title: 'Content Direction', desc: 'Photography art direction, video treatment, social media style guide, and content templates for ongoing use.' },
  { title: 'Final Brand Package', desc: 'Delivered brand guidelines document, all asset files, and a usage guide Marcus can hand to any future creative partner.' },
];

function BrandingChecklist() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Branding</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">Branding checklist.</h2>
      <p className="text-sm text-white mb-8 max-w-xl">
        Building a brand that matches the quality of the platform.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 mb-8">
        {BRANDING_AREAS.map((area, i) => (
          <div key={area.title} className="flex items-start gap-4 p-5">
            <div className="w-6 h-6 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-primary">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary tracking-wide mb-1">{area.title}</p>
              <p className="text-xs text-white leading-relaxed">{area.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   6. CONTENT PRODUCTION CHECKLIST
══════════════════════════════════════════════════════════════════════════════ */
const CONTENT_AREAS = [
  { title: 'Brand & Website Photography', desc: 'Marcus portraits, in-gym action photography, lifestyle content, and hero imagery for the website and app store.' },
  { title: 'Exercise Videos', desc: 'Demonstration videos for every exercise in the programme library — clean, branded, showing proper form.' },
  { title: 'App How-To Videos', desc: 'Short screen-capture or filmed tutorials showing members how to use key features: bookings, programmes, check-ins.' },
  { title: 'Educational Content', desc: 'Training principles, nutrition foundations, recovery guidance, and mindset content for in-app delivery.' },
  { title: 'Launch Content', desc: 'Social media content, email announcements, launch-day posts, and member welcome materials.' },
  { title: 'Editing & Delivery', desc: 'Full post-production, colour grading, audio clean-up, subtitle generation, and final file delivery in all required formats.' },
];

function ContentChecklist() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Content Production</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">Content production checklist.</h2>
      <p className="text-sm text-white mb-8 max-w-xl">
        Quality content is what elevates the platform from functional to exceptional.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 mb-8">
        {CONTENT_AREAS.map((area, i) => (
          <div key={area.title} className="flex items-start gap-4 p-5">
            <div className="w-6 h-6 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-white/50">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary tracking-wide mb-1">{area.title}</p>
              <p className="text-xs text-white leading-relaxed">{area.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   6b. THIRD-PARTY SERVICES
══════════════════════════════════════════════════════════════════════════════ */
const THIRD_PARTY_SERVICES = [
  { item: 'Mux — video streaming', cost: 'Usage-based · ~€0–50/mo early on', note: 'Hosts, processes and streams every video in the platform — exercise demos, feed videos, educational content. Free during development; live costs scale with library size and viewing. Full explanation below.' },
  { item: 'Resend (or similar) — email', cost: 'Free tier · €0–20/mo', note: 'Sends verification, password-reset and notification emails. Free tier covers thousands of emails per month; paid tiers only as volume grows. Needs a one-time API key setup before launch.' },
  { item: 'Stripe — payments', cost: '~1.5–2.9% + €0.25 per transaction', note: 'Processes memberships, session payments and any digital products. No monthly fee — costs only exist when revenue exists.' },
  { item: 'Google Sign-In — authentication', cost: 'Free', note: 'One-tap sign-in with a Google account — already built and working in the app.' },
  { item: 'Apple Sign-In — authentication', cost: 'Included in Apple $99/yr', note: 'Sign-in with an Apple ID. Built, but requires the Apple Developer account to switch on.' },
  { item: 'Wearable platforms — health data', cost: 'Free APIs (aggregator ~€100+/mo only if needed)', note: 'Fitbit, Garmin, Strava, Oura, Polar, Whoop and Withings connect via their official APIs so member activity flows into the app. Some (Garmin, Whoop) require partner approval.' },
  { item: 'Replit — hosting & infrastructure', cost: '~€20–40/mo', note: 'Runs the app, API and database in production, plus the AI-assisted development environment the platform is built in. Scales with traffic.' },
];

function ThirdPartyServices() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Third-Party Services</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        The services the platform works with, and why.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        The platform doesn't reinvent solved problems — it plugs into best-in-class services
        for video, email, payments and health data. Each one is listed here with its job.
      </p>
      <InvestTable title="Services" rows={THIRD_PARTY_SERVICES} headers={['Service', 'Pricing', 'Why we need it']} />
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   7. MUX VIDEO STREAMING
══════════════════════════════════════════════════════════════════════════════ */
const MUX_HOW = [
  {
    step: 1,
    icon: <UploadSimple size={18} weight="fill" />,
    title: 'Marcus uploads a video',
    desc: 'From the Content Admin panel, Marcus selects a video file. It goes directly to Mux — it never sits on the app server.',
  },
  {
    step: 2,
    icon: <Lightning size={18} weight="fill" />,
    title: 'Mux processes it automatically',
    desc: 'Mux compresses the file, generates a thumbnail, and creates streaming-ready versions for every screen size and connection speed.',
  },
  {
    step: 3,
    icon: <Globe size={18} weight="fill" />,
    title: 'Members stream it instantly',
    desc: 'The video is delivered from Mux\'s global CDN — fast and smooth whether a member is on Wi-Fi in Malta or mobile data abroad.',
  },
  {
    step: 4,
    icon: <ShieldCheck size={18} weight="fill" />,
    title: 'The app stores only a playback ID',
    desc: 'The platform never stores raw video files. It holds a short reference ID; Mux handles everything else. Clean, secure, scalable.',
  },
];

const MUX_USES = [
  { label: 'Feed videos', desc: 'Training tips, mindset content, announcements, and anything Marcus publishes to the member feed.' },
  { label: 'Exercise demonstrations', desc: 'Every exercise in the programme library gets a clear, branded demonstration video.' },
  { label: 'Educational content', desc: 'Longer-form nutrition guides, technique breakdowns, and mindset videos.' },
  { label: 'Recorded classes', desc: 'Any group sessions or recorded live workouts made available to members on demand.' },
];

function MuxVideo() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Build Plan · Content &amp; Video</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        Video streaming, done properly.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        All video content on the platform — feed posts, exercise demonstrations, educational
        videos, and recorded classes — is hosted and streamed through{' '}
        <span className="text-white/80 font-semibold">Mux</span>, a purpose-built video
        infrastructure service used by the world's leading fitness and media apps. The platform
        integrates with Mux so Marcus gets professional-grade video delivery without any of
        the infrastructure overhead.
      </p>

      {/* Where Mux is used */}
      <div className="mb-10">
        <p className="text-[10px] font-bold tracking-[0.3em] text-white/35 uppercase mb-4">Where Mux is used</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MUX_USES.map((u) => (
            <div key={u.label} className="flex items-start gap-3 border border-white/6 bg-white/[0.02] p-4">
              <Play size={14} weight="fill" className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary tracking-wide mb-0.5">{u.label}</p>
                <p className="text-xs text-white leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-10">
        <p className="text-[10px] font-bold tracking-[0.3em] text-white/35 uppercase mb-4">How it works</p>
        <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5">
          {MUX_HOW.map((h) => (
            <div key={h.step} className="flex items-start gap-4 p-5">
              <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-0.5">
                {h.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-primary tracking-wide mb-1">{h.title}</p>
                <p className="text-xs text-white leading-relaxed">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost section */}
      <p className="text-[10px] font-bold tracking-[0.3em] text-white/35 uppercase mb-4">Mux Costs</p>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {/* Free / testing */}
        <div className="border border-white/8 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} weight="fill" className="text-primary" />
            <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">Free / Testing</p>
          </div>
          <p className="text-2xl font-black text-primary tracking-tight mb-1">€0</p>
          <p className="text-[9px] font-bold tracking-widest text-white/30 uppercase mb-4">During development &amp; testing</p>
          <div className="space-y-2">
            {[
              'Up to 10 video assets stored at no cost',
              'Generous viewing hours for internal testing',
              'Full feature access — no restricted plan',
              'No credit card required to start',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <ArrowRight size={11} weight="bold" className="text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-white/50">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Paid production */}
        <div className="border border-primary/15 bg-primary/[0.03] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={16} weight="fill" className="text-primary" />
            <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">Paid · Live Platform</p>
          </div>
          <p className="text-2xl font-black text-primary tracking-tight mb-1">Pay-as-you-go</p>
          <p className="text-[9px] font-bold tracking-widest text-white/30 uppercase mb-4">No monthly minimum</p>
          <div className="space-y-3">
            {[
              { trigger: 'Uploading a video', rate: '~$0.015 per minute of video uploaded' },
              { trigger: 'Storing videos', rate: '~$0.007 per GB stored per month' },
              { trigger: 'Members watching', rate: '~$0.00025 per viewer-minute delivered' },
            ].map((row) => (
              <div key={row.trigger} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-0.5">{row.trigger}</p>
                <p className="text-xs text-white/40">{row.rate}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What triggers costs */}
      <div className="border border-white/6 bg-white/[0.015] p-5 mb-4">
        <div className="flex items-start gap-3">
          <ChartLine size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-white/80 mb-1.5">What determines the monthly bill</p>
            <p className="text-xs text-white leading-relaxed">
              Mux charges are driven by three things: how many videos are stored, how many minutes of
              video are uploaded over time, and how many minutes members spend watching. A small video
              library with moderate member activity typically costs well under{' '}
              <span className="text-white/70 font-semibold">€50/month</span>. A large library with
              high engagement can scale toward several hundred. The exact figure is only known once
              content volume and member viewing habits are established — and because it scales with
              usage, it grows in proportion to the business.
            </p>
          </div>
        </div>
      </div>

      {/* Advisory note */}
      <div className="border border-white/5 bg-white/[0.01] p-4 flex items-start gap-3">
        <Warning size={14} weight="fill" className="text-white/25 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/30 leading-relaxed">
          Mux pricing shown is approximate and based on current public rates. All figures are in USD and
          subject to change. Actual costs are confirmed in the Mux dashboard and billed directly to
          the account holder. This section will be updated with real usage data once the platform goes live.
        </p>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   8b. LAUNCH & RUNNING COSTS
══════════════════════════════════════════════════════════════════════════════ */
const LAUNCH_COSTS = [
  {
    item: 'Apple Developer Program',
    cost: '$99 / year',
    kind: 'Required for App Store',
    note: 'Mandatory annual membership to publish and keep the iOS app on the App Store. Also unlocks Apple Sign-In.',
  },
  {
    item: 'Google Play Developer Account',
    cost: '$25 one-off',
    kind: 'Required for Play Store',
    note: 'One-time registration fee to publish the Android app on Google Play.',
  },
  {
    item: 'App store commission',
    cost: '15–30% of in-app sales',
    kind: 'Only on in-app purchases',
    note: 'Apple and Google take a commission on digital subscriptions sold inside the apps (15% under the Small Business Program up to $1M/yr). Web payments avoid this.',
  },
];

const RUNNING_COSTS = [
  {
    item: 'Hosting (Replit deployment)',
    cost: '~€20–40 / month',
    kind: 'Core infrastructure',
    note: 'Runs the app, API and database in production. Scales with traffic; current usage sits at the low end.',
  },
  {
    item: 'Custom domain',
    cost: '~€10–20 / year',
    kind: 'Brand',
    note: 'e.g. marcusgrimafitness.com — annual renewal.',
  },
  {
    item: 'Video streaming (Mux)',
    cost: '€0 now · usage-based live',
    kind: 'Scales with content',
    note: 'Free during development. Live costs depend on library size and viewing — typically well under €50/month early on. Detailed breakdown in the Brand & Content tab.',
  },
  {
    item: 'Transactional email (Resend or similar)',
    cost: '€0–20 / month',
    kind: 'Verification & notifications',
    note: 'Sends verification, password-reset and notification emails. Free tier covers thousands of emails per month; paid tiers only as volume grows.',
  },
  {
    item: 'Payment processing (Stripe)',
    cost: '~1.5–2.9% + €0.25 per transaction',
    kind: 'Only when earning',
    note: 'No monthly fee — Stripe charges a small percentage of each successful payment. Costs only exist when revenue exists.',
  },
];

/* Simple table renderer: Item | Cost | Notes */
function InvestTable({ title, rows, headers = ['Item', 'Cost', 'Notes'] }: {
  title: string;
  rows: { item: string; cost: string; note: string }[];
  headers?: [string, string, string];
}) {
  return (
    <div className="mb-10">
      <p className="text-[10px] font-bold tracking-[0.3em] text-white/35 uppercase mb-3">{title}</p>
      <div className="border border-white/8 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/8">
              <th className="px-4 py-3 text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase w-[30%]">{headers[0]}</th>
              <th className="px-4 py-3 text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase w-[22%]">{headers[1]}</th>
              <th className="px-4 py-3 text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase">{headers[2]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.item} className="bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3.5 text-sm font-bold text-primary align-top">{r.item}</td>
                <td className="px-4 py-3.5 text-sm font-black text-white align-top whitespace-nowrap">{r.cost}</td>
                <td className="px-4 py-3.5 text-xs text-white/70 leading-relaxed align-top">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BUILD_ROWS = [
  { item: 'AI-assisted build (Replit)', cost: '$156 to date', note: 'Verified from the Replit billing dashboard. Future features estimated against the completed authentication system as a benchmark.' },
  { item: 'Calvin — product owner', cost: '€26.44 / hr', note: 'Discounted rate (standard €52.88/hr).' },
];

const BRAND_CONTENT_ROWS = [
  { item: 'Branding', cost: '€3,067', note: '50% introductory rate (full value €6,134). Brand foundations, identity, digital look & feel, content direction and final brand package.' },
  { item: 'Creative direction & production management', cost: '€5,420', note: '50% introductory rate (full value €10,840). Managing the full content production effort end to end.' },
  { item: 'External production costs', cost: '€8,700–26,000', note: 'Estimate only — depends on shoot scale, exercise count and production team. Confirmed on scope.' },
];

function Investment() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Investment</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">
        Every cost, in one place.
      </h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        Three tables cover the entire financial picture: building the platform, getting it
        launched, and keeping it running. No hidden fees — most costs only grow when the
        business grows.
      </p>

      <InvestTable title="1 · Build" rows={BUILD_ROWS} />
      <InvestTable title="2 · Branding & Content" rows={BRAND_CONTENT_ROWS} />
      <InvestTable title="3 · Launch (One-off)" rows={LAUNCH_COSTS} />
      <InvestTable title="4 · Running (Monthly)" rows={RUNNING_COSTS} />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { value: '~€125', label: 'One-off to launch on both stores', sub: 'Apple $99/yr + Google $25' },
          { value: '€30–80', label: 'Typical monthly running cost', sub: 'Hosting, email, early video usage' },
          { value: '% based', label: 'Payment & store fees', sub: 'Only charged when revenue comes in' },
        ].map((s) => (
          <div key={s.label} className="border border-primary/15 bg-primary/[0.03] p-5">
            <p className="text-2xl font-black text-primary tracking-tight">{s.value}</p>
            <p className="text-[9px] font-bold tracking-[0.22em] text-primary/70 uppercase mt-1.5">{s.label}</p>
            <p className="text-[10px] text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="border border-white/5 bg-white/[0.01] p-4 flex items-start gap-3">
        <Warning size={14} weight="fill" className="text-white/25 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/30 leading-relaxed">
          Figures follow current public pricing (USD where noted) and are subject to change by the
          providers. Store commissions apply only to digital products sold inside the mobile apps.
          This page will be updated with real invoices once the platform is live.
        </p>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   8. ROADMAP
══════════════════════════════════════════════════════════════════════════════ */
const ROADMAP = [
  { dates: '3–14 Aug 2026',         label: 'Final decisions & planning',             highlight: false },
  { dates: '17 Aug–4 Sep 2026',     label: 'Branding & product direction',            highlight: false },
  { dates: '17 Aug–25 Sep 2026',    label: 'Core platform build',                     highlight: false },
  { dates: '24 Aug–11 Sep 2026',    label: 'Content planning & pre-production',       highlight: false },
  { dates: '7 Sep–2 Oct 2026',      label: 'Bookings, payments & communication',      highlight: false },
  { dates: '14 Sep–2 Oct 2026',     label: 'Content production',                      highlight: false },
  { dates: '28 Sep–9 Oct 2026',     label: 'Editing, content & website integration',  highlight: false },
  { dates: '5–14 Oct 2026',         label: 'Testing & client migration',              highlight: false },
  { dates: '15 October 2026',       label: 'Soft Launch',                             highlight: true  },
  { dates: '15 Oct–18 Dec 2026',    label: 'Soft-launch period — feedback & refinement', highlight: false },
  { dates: '3 January 2027',        label: 'Public Launch',                           highlight: true  },
];

function Roadmap() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Roadmap</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-10">Timeline to launch.</h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/8 md:left-[11px]" />

        <div className="flex flex-col gap-0">
          {ROADMAP.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22,1,0.36,1] }}
              className={`relative flex items-start gap-5 pl-8 py-4 ${
                item.highlight ? 'my-2' : ''
              }`}
            >
              {/* Dot */}
              <div className={`absolute left-0 top-5 w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center ${
                item.highlight
                  ? 'border-primary bg-primary shadow-[0_0_16px_rgba(34,197,94,0.4)]'
                  : 'border-white/15 bg-[#0A0A0A]'
              }`}>
                {item.highlight && <Star size={10} weight="fill" className="text-white" />}
              </div>

              {/* Content */}
              {item.highlight ? (
                <div className="w-full border border-primary/30 bg-primary/[0.06] px-5 py-4">
                  <p className="text-[9px] font-bold tracking-[0.25em] text-primary uppercase mb-1">{item.dates}</p>
                  <p className="text-xl font-black text-primary tracking-tight">{item.label}</p>
                  <p className="text-xs text-primary/70 font-semibold mt-1 tracking-wider">TARGET LAUNCH DATE</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-6 py-1">
                  <p className="text-[10px] font-bold tracking-wider text-white/30 uppercase w-48 shrink-0">{item.dates}</p>
                  <p className="text-sm font-semibold text-white/70 mt-0.5 sm:mt-0">{item.label}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   9. DECISIONS REQUIRED
══════════════════════════════════════════════════════════════════════════════ */
const DECISION_LIST = [
  {
    q: 'Web app or App Store?',
    d: 'Recommended: launch as a web app (PWA) — no store fees, no 15–30% commission, instant updates, and most wearables connect from day one. Add a lightweight native app later for Apple Health / Health Connect syncing, keeping subscriptions on the web so the commission never applies.',
  },
  {
    q: 'What is in the launch scope?',
    d: 'Approve the launch feature set — the Launch wave in the Feature Catalogue defines exactly what ships on day one.',
  },
  {
    q: 'What are the membership options and prices?',
    d: 'Confirm the membership tiers, session pricing and any packages before payments are built.',
  },
  {
    q: 'What are the booking rules?',
    d: 'Confirm the cancellation policy, lead times and rescheduling rules that the booking system will enforce.',
  },
  {
    q: 'What is the branding scope?',
    d: 'Approve the branding direction and investment — logo, colours, typography and how the brand carries through the app.',
  },
  {
    q: 'What is the content production budget?',
    d: 'Approve the scope and budget range for video and content production, including the exercise library.',
  },
  {
    q: 'Exercise library — which exercises go in?',
    d: 'Marcus to decide the list. His chosen exercises become the library used for programme building and video production, so filming can be planned in one block.',
  },
  {
    q: 'What are the legal and business details?',
    d: 'Provide company name, VAT number and registered address for invoices, terms and payment setup.',
  },
  {
    q: 'Approve budget and timeline?',
    d: 'Final sign-off on the overall budget and roadmap dates so the build can begin.',
  },
];

function Decisions() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Decisions</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-3">Decisions required from Marcus.</h2>
      <p className="text-sm text-white mb-10 max-w-2xl">
        Nine questions to answer to move from proposal to production. The first one is the
        biggest — the rest are quick confirmations.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 max-w-3xl">
        {DECISION_LIST.map((d, i) => (
          <div key={d.q} className="flex items-start gap-4 px-5 py-5">
            <span className="text-sm font-black text-primary/40 w-6 text-right shrink-0 mt-0.5">{i + 1}</span>
            <div>
              <p className="text-sm font-black text-primary tracking-tight mb-1.5">{d.q}</p>
              <p className="text-xs text-white leading-relaxed">{d.d}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   10. FINAL CTA
══════════════════════════════════════════════════════════════════════════════ */
function FinalCTA({ onApprove, onReview }: { onApprove: () => void; onReview: () => void }) {
  return (
    <FadeSection className="px-5 md:px-12 pb-24">
      <div className="max-w-2xl">
        <SectionLabel>Proposal Summary</SectionLabel>
        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tight mb-6">
          Launch focused. Scale with confidence.
        </h2>
        <p className="text-sm md:text-base text-white leading-relaxed mb-10">
          The recommendation is to launch Marcus Grima Fitness as a focused personalised coaching platform first —
          delivering a genuinely exceptional experience for the first cohort of members. Once the core experience
          is proven, the platform expands naturally into digital products, open community, and intelligent automation.
          Build the foundation right, and everything that follows is faster and better.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onApprove}
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/85 transition-colors px-8 py-4 flex items-center justify-center gap-3 text-white font-bold tracking-[0.12em] uppercase text-sm"
          >
            <Checks size={16} weight="bold" />
            Approve Project Direction
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onReview}
            className="flex-1 sm:flex-none border border-white/15 hover:border-white/30 transition-colors px-8 py-4 flex items-center justify-center gap-3 text-white/60 hover:text-white font-bold tracking-[0.12em] uppercase text-sm"
          >
            Review Roadmap
            <CaretRight size={14} weight="bold" />
          </motion.button>
        </div>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   APPROVAL MODAL
══════════════════════════════════════════════════════════════════════════════ */
function ApprovalModal({ onClose }: { onClose: () => void }) {
  const [approved, setApproved] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="bg-[#0F0F0F] border border-white/10 w-full max-w-sm p-8 relative"
      >
        {!approved ? (
          <>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition-colors">
              <X size={16} weight="bold" />
            </button>
            <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center mb-6">
              <Checks size={22} weight="fill" className="text-primary" />
            </div>
            <h3 className="text-xl font-black text-primary tracking-tight mb-2">Approve project direction?</h3>
            <p className="text-sm text-white leading-relaxed mb-8">
              This records your approval of the Marcus Grima Fitness project proposal, scope, and timeline as presented.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setApproved(true)}
                className="w-full bg-primary hover:bg-primary/85 transition-colors py-3.5 text-white font-bold tracking-[0.12em] uppercase text-sm"
              >
                Yes, approve direction
              </button>
              <button onClick={onClose} className="w-full border border-white/8 hover:border-white/20 transition-colors py-3.5 text-white/40 hover:text-white/60 font-bold tracking-[0.12em] uppercase text-sm">
                Not yet
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-5"
            >
              <Confetti size={28} weight="fill" className="text-primary" />
            </motion.div>
            <h3 className="text-xl font-black text-primary tracking-tight mb-2">Direction approved.</h3>
            <p className="text-sm text-white leading-relaxed mb-6">
              Marcus Grima Fitness is a go. The next step is confirming the eight decisions and starting the sprint.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/85 transition-colors py-3 text-white font-bold tracking-[0.12em] uppercase text-sm"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'vision',    label: 'Vision' },
  { id: 'features',  label: 'Features' },
  { id: 'brand',     label: 'Brand & Content' },
  { id: 'services',  label: 'Third-Party' },
  { id: 'investment', label: 'Investment' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'roadmap',   label: 'Roadmap' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const Proposal = () => {
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const roadmapRef = useRef<HTMLDivElement>(null);

  const scrollToRoadmap = () => {
    roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectTab = (id: TabId) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div
      className="min-h-screen text-foreground pb-4"
      /* Scope the brand lime (#CAFF33) to the proposal page: all `primary`
         accents inside resolve to lime instead of the app-wide white. */
      style={{ ['--primary' as string]: '76 100% 60%' }}
    >

      <Hero />

      {/* Mobile: horizontal tab bar (sidebars don't fit small screens) */}
      <div className="md:hidden sticky top-0 z-20 bg-[#0D0D0D]/95 backdrop-blur-sm border-y border-white/8">
        <div className="flex gap-1 px-5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => selectTab(t.id)}
              className={`shrink-0 px-4 py-3.5 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px
                ${tab === t.id
                  ? 'text-primary border-primary'
                  : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="md:flex md:items-start">
        {/* Desktop: side tab navigation */}
        <nav className="hidden md:block sticky top-0 shrink-0 w-52 pl-12 pr-6 py-8 self-start">
          <div className="border-l border-white/8 flex flex-col">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => selectTab(t.id)}
                className={`text-left px-4 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors border-l-2 -ml-px
                  ${tab === t.id
                    ? 'text-primary border-primary'
                    : 'text-white/40 border-transparent hover:text-white/70'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div key={tab} className="space-y-0 pt-4 flex-1 min-w-0">
        {tab === 'overview' && (
          <SettingTheStage />
        )}

        {tab === 'vision' && (
          <Vision />
        )}

        {tab === 'features' && (<>
          <ProductPillars />
          <Divider />
          <Pillars />
          <Divider />
          <OnboardingFlow />
          <Divider />
          <WearableSupport />
        </>)}

        {tab === 'brand' && (<>
          <BrandingChecklist />
          <Divider />
          <ContentChecklist />
        </>)}

        {tab === 'services' && (<>
          <ThirdPartyServices />
          <Divider />
          <MuxVideo />
        </>)}

        {tab === 'investment' && (
          <Investment />
        )}

        {tab === 'decisions' && (
          <Decisions />
        )}

        {tab === 'roadmap' && (
          <div ref={roadmapRef}>
            <Roadmap />
          </div>
        )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && <ApprovalModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
};
