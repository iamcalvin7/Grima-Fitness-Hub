import React, { useState, useRef } from 'react';
import { FeatureCatalogue } from './ProposalCatalogue';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  CheckCircle, ArrowRight, X, Confetti,
  ShieldCheck, Barbell, TrendUp, ForkKnife, CalendarBlank,
  ChatCircle, Money, Briefcase, ChartLine, BookOpen,
  Brain, Lock, UserCircle, Rocket, Star, CaretRight,
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
    <section className="relative pt-20 pb-20 px-5 md:px-12 overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-72 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 65%)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}>
        <p className="text-[10px] font-bold tracking-[0.35em] text-primary uppercase mb-6">
          Project Proposal · 2026
        </p>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] max-w-3xl mb-8">
          Building the operating system for Marcus Grima Fitness.
        </h1>

        <p className="text-base md:text-lg text-white/55 font-medium leading-relaxed max-w-2xl mb-12">
          A single platform connecting personalised coaching, training, progress, bookings,
          communication, payments and business operations — everything Marcus needs to run
          a world-class PT business, in one place.
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
        className="grid grid-cols-3 gap-4 max-w-lg"
      >
        {[
          { value: '12', label: 'Product Pillars' },
          { value: 'Nov 30', label: 'Soft Launch' },
          { value: 'Dec 14', label: 'Public Launch' },
        ].map((s) => (
          <div key={s.label} className="border border-white/8 bg-white/[0.03] px-4 py-5">
            <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-1.5">{s.value}</p>
            <p className="text-[9px] font-bold tracking-[0.22em] text-white/35 uppercase">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   2. THE OPPORTUNITY
══════════════════════════════════════════════════════════════════════════════ */
function Opportunity() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>The Opportunity</SectionLabel>
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-6">
          A strong foundation.<br />The next step is making it real.
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-white/8 bg-white/[0.02] p-6">
            <p className="text-[9px] font-bold tracking-[0.25em] text-primary uppercase mb-3">Where We Are</p>
            <p className="text-sm text-white/60 leading-relaxed">
              The app already has a polished visual identity, complete onboarding,
              a fully secure account system, and a professional client-facing experience.
              The design language, authentication, profile system, and technical architecture
              are production-ready.
            </p>
          </div>
          <div className="border border-primary/20 bg-primary/[0.04] p-6">
            <p className="text-[9px] font-bold tracking-[0.25em] text-primary uppercase mb-3">Where We're Going</p>
            <p className="text-sm text-white/60 leading-relaxed">
              The next phase is connecting the prototype to the real business: live bookings,
              personalised programmes, real meal plans, payments, messaging, and the tools
              Marcus needs to run every client relationship from a single screen.
            </p>
          </div>
        </div>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   3. FEATURE CATALOGUE
══════════════════════════════════════════════════════════════════════════════ */
function Pillars() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Feature Catalogue</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">
        Every feature. Every status.
      </h2>
      <p className="text-sm text-white/45 mb-10 max-w-2xl">
        46 features across 12 product pillars — filterable by status, priority, phase, and category.
        Each card expands into a full brief. This catalogue doubles as both the sales pitch and a live
        delivery tracker as the build progresses.
      </p>
      <FeatureCatalogue />
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

function LaunchProduct() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Recommended Launch Product</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">
        Personalised coaching membership.
      </h2>
      <p className="text-sm text-white/45 mb-10 max-w-2xl">
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
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">Branding checklist.</h2>
      <p className="text-sm text-white/40 mb-8 max-w-xl">
        Building a brand that matches the quality of the platform.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 mb-8">
        {BRANDING_AREAS.map((area, i) => (
          <div key={area.title} className="flex items-start gap-4 p-5">
            <div className="w-6 h-6 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-primary">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide mb-1">{area.title}</p>
              <p className="text-xs text-white/45 leading-relaxed">{area.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Price */}
      <div className="border border-primary/20 bg-primary/[0.04] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold tracking-[0.3em] text-primary uppercase mb-1">Branding Investment</p>
          <p className="text-xs text-white/40">50% introductory rate · Full value shown for reference</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-3 justify-end">
            <span className="text-3xl font-black text-white tracking-tight">€3,067</span>
            <span className="text-sm text-white/25 line-through">€6,134</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-primary/70 uppercase mt-0.5">50% discount applied</p>
        </div>
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
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">Content production checklist.</h2>
      <p className="text-sm text-white/40 mb-8 max-w-xl">
        Quality content is what elevates the platform from functional to exceptional.
      </p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 mb-8">
        {CONTENT_AREAS.map((area, i) => (
          <div key={area.title} className="flex items-start gap-4 p-5">
            <div className="w-6 h-6 rounded-full border border-white/20 bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-white/50">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide mb-1">{area.title}</p>
              <p className="text-xs text-white/45 leading-relaxed">{area.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Prices */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-primary/20 bg-primary/[0.04] p-6">
          <p className="text-[9px] font-bold tracking-[0.3em] text-primary uppercase mb-1">Creative Direction & Production Management</p>
          <p className="text-xs text-white/40 mb-4">50% introductory rate applied</p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white tracking-tight">€5,420</span>
            <span className="text-sm text-white/25 line-through">€10,840</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-primary/70 uppercase mt-1">50% discount applied</p>
        </div>
        <div className="border border-white/8 bg-white/[0.02] p-6">
          <p className="text-[9px] font-bold tracking-[0.3em] text-white/40 uppercase mb-1">External Production Costs</p>
          <p className="text-xs text-white/30 mb-4">Estimated range depending on shoot scale, exercise count, and production team</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white/70 tracking-tight">€8,700</span>
            <span className="text-white/30 text-sm">–</span>
            <span className="text-2xl font-black text-white/70 tracking-tight">€26,000</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-white/25 uppercase mt-1">Estimate only · Confirmed on scope</p>
        </div>
      </div>
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
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">
        Video streaming, done properly.
      </h2>
      <p className="text-sm text-white/45 mb-10 max-w-2xl">
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
                <p className="text-sm font-bold text-white tracking-wide mb-0.5">{u.label}</p>
                <p className="text-xs text-white/40 leading-relaxed">{u.desc}</p>
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
                <p className="text-sm font-bold text-white tracking-wide mb-1">{h.title}</p>
                <p className="text-xs text-white/45 leading-relaxed">{h.desc}</p>
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
          <p className="text-2xl font-black text-white tracking-tight mb-1">€0</p>
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
          <p className="text-2xl font-black text-white tracking-tight mb-1">Pay-as-you-go</p>
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
            <p className="text-xs text-white/45 leading-relaxed">
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
   8. BUILD COST MODEL
══════════════════════════════════════════════════════════════════════════════ */
function BuildCost() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Build Cost Model</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">How the build is costed.</h2>
      <p className="text-sm text-white/40 mb-10 max-w-2xl">
        The platform is built on Replit with AI-assisted development. Costs are transparent and
        benchmarked against what has already been built — not estimated against traditional agency day rates.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="border border-white/8 bg-white/[0.02] p-6 md:col-span-2">
          <p className="text-[9px] font-bold tracking-[0.25em] text-white/35 uppercase mb-4">Actual Replit AI Usage — Current Project</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-2xl font-black text-white tracking-tight">$156.01</p>
              <p className="text-[10px] font-bold tracking-wider text-white/35 uppercase mt-1">AI usage this period</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight">$156.15</p>
              <p className="text-[10px] font-bold tracking-wider text-white/35 uppercase mt-1">Total project usage</p>
            </div>
          </div>
          <div className="border-t border-white/5 mt-5 pt-5">
            <p className="text-xs text-white/40 leading-relaxed">
              These are verified figures from the Replit billing dashboard for the current project period.
              Future features are estimated using the completed authentication system as a complexity benchmark,
              with revision allowances applied per sprint.
            </p>
          </div>
        </div>

        <div className="border border-primary/15 bg-primary/[0.03] p-6">
          <p className="text-[9px] font-bold tracking-[0.25em] text-primary/70 uppercase mb-4">Calvin — Product Owner Rate</p>
          <div className="mb-4">
            <p className="text-2xl font-black text-white tracking-tight">€26.44<span className="text-base font-bold text-white/40">/hr</span></p>
            <p className="text-[10px] font-bold tracking-wider text-primary/70 uppercase mt-1">Discounted rate</p>
          </div>
          <div className="border-t border-white/8 pt-4">
            <p className="text-xl font-bold text-white/40 tracking-tight">€52.88<span className="text-sm">/hr</span></p>
            <p className="text-[9px] font-bold tracking-wider text-white/25 uppercase mt-0.5 line-through">Standard rate</p>
          </div>
        </div>
      </div>

      <div className="border border-white/6 bg-white/[0.015] p-5">
        <div className="flex items-start gap-3">
          <ChartLine size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">
            <span className="text-white/80 font-semibold">Benchmark methodology:</span> The fully built authentication system
            (sign-up, sign-in, password reset, email verification, OAuth, session management, account lifecycle — 6,000+ lines,
            34 production-ready features) establishes the cost-per-complexity baseline. Each future feature sprint is estimated
            relative to this benchmark, adjusted for integration complexity and revision cycles.
          </p>
        </div>
      </div>
    </FadeSection>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   8. ROADMAP
══════════════════════════════════════════════════════════════════════════════ */
const ROADMAP = [
  { dates: '3–14 Aug 2026',         label: 'Final decisions & planning',             highlight: false },
  { dates: '17 Aug–11 Sep 2026',    label: 'Branding & product direction',            highlight: false },
  { dates: '17 Aug–16 Oct 2026',    label: 'Core platform build',                     highlight: false },
  { dates: '21 Sep–30 Oct 2026',    label: 'Bookings, payments & communication',      highlight: false },
  { dates: '14 Sep–2 Oct 2026',     label: 'Content planning & pre-production',       highlight: false },
  { dates: '5–23 Oct 2026',         label: 'Content production',                      highlight: false },
  { dates: '19 Oct–13 Nov 2026',    label: 'Editing & content integration',           highlight: false },
  { dates: '19 Oct–13 Nov 2026',    label: 'Website & launch journey',                highlight: false },
  { dates: '16–27 Nov 2026',        label: 'Testing & client migration',              highlight: false },
  { dates: '30 Nov–11 Dec 2026',    label: 'Soft launch',                             highlight: false },
  { dates: '14 December 2026',      label: 'Public Launch',                           highlight: true  },
];

function Roadmap() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Roadmap</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-10">Timeline to launch.</h2>

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
                  <p className="text-xl font-black text-white tracking-tight">{item.label}</p>
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
const DECISIONS = [
  { n: 1, text: 'Approve the launch scope and feature set' },
  { n: 2, text: 'Confirm membership options and session pricing' },
  { n: 3, text: 'Confirm booking rules, cancellation policy, and lead times' },
  { n: 4, text: 'Approve the branding scope and investment' },
  { n: 5, text: 'Approve the content production scope and budget range' },
  { n: 6, text: 'Confirm the exercise list for programme and video production' },
  { n: 7, text: 'Provide legal and business information (company name, VAT, address)' },
  { n: 8, text: 'Approve final budgets and timeline to begin' },
];

function Decisions() {
  return (
    <FadeSection className="px-5 md:px-12">
      <SectionLabel>Next Steps</SectionLabel>
      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">Decisions required from Marcus.</h2>
      <p className="text-sm text-white/40 mb-8 max-w-xl">Eight actions to move from proposal to production.</p>

      <div className="border border-white/8 bg-white/[0.02] divide-y divide-white/5 max-w-2xl">
        {DECISIONS.map((d) => (
          <div key={d.n} className="flex items-center gap-4 px-5 py-4">
            <span className="text-[10px] font-black text-white/20 w-5 text-right shrink-0">{d.n}</span>
            <ArrowRight size={12} weight="bold" className="text-primary shrink-0" />
            <span className="text-sm text-white/70">{d.text}</span>
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
        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-6">
          Launch focused. Scale with confidence.
        </h2>
        <p className="text-sm md:text-base text-white/55 leading-relaxed mb-10">
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
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Approve project direction?</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-8">
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
            <h3 className="text-xl font-black text-white tracking-tight mb-2">Direction approved.</h3>
            <p className="text-sm text-white/40 leading-relaxed mb-6">
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
export const Proposal = () => {
  const [showModal, setShowModal] = useState(false);
  const roadmapRef = useRef<HTMLDivElement>(null);

  const scrollToRoadmap = () => {
    roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen text-foreground pb-4">

      <Hero />

      <div className="space-y-0">
        <Divider />
        <Opportunity />
        <Divider />
        <Pillars />
        <Divider />
        <LaunchProduct />
        <Divider />
        <BrandingChecklist />
        <Divider />
        <ContentChecklist />
        <Divider />
        <MuxVideo />
        <Divider />
        <BuildCost />
        <Divider />
        <div ref={roadmapRef}>
          <Roadmap />
        </div>
        <Divider />
        <Decisions />
        <Divider />
        <FinalCTA
          onApprove={() => setShowModal(true)}
          onReview={scrollToRoadmap}
        />
      </div>

      <AnimatePresence>
        {showModal && <ApprovalModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
};
