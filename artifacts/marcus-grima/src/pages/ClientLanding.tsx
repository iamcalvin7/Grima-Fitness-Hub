/* ═══════════════════════════════════════════════════════════════════════════
   ClientLanding — Marcus Grima coaching lead-gen page
   Matches approved reference design exactly · Mobile-first
═══════════════════════════════════════════════════════════════════════════ */

import React from 'react';
import {
  WhatsappLogo, ArrowRight,
  Barbell, Brain, BookOpen,
  ShieldStar, Users, MapPin,
} from '@phosphor-icons/react';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER  = '35699767698';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;
const BLUE = '#5090C8';

/* ─── Shared CTA ─────────────────────────────────────────────────────────── */
function WAButton({ label }: { label: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full
                 bg-[#25D366] hover:bg-[#1ebe5d] text-white
                 font-bold text-[13px] tracking-wide px-5 py-3
                 transition-colors duration-200"
    >
      <WhatsappLogo size={16} weight="fill" />
      {label}
      <ArrowRight size={12} weight="bold" />
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HERO — full-bleed photo, text overlaid bottom-left
══════════════════════════════════════════════════════════════════════════ */
const PILLARS = [
  { Icon: Barbell,  label: 'Physical Training' },
  { Icon: Brain,    label: 'Mental Wellbeing' },
  { Icon: BookOpen, label: 'Life Coaching' },
];

function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden">

      {/* Background photo + overlay */}
      <div className="absolute inset-0">
        <img
          src="/hero.png"
          alt="Marcus Grima — Performance Coach"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
      </div>

      {/* Top bar: brand mark + decorative menu */}
      <div className="relative z-10 flex items-start justify-between px-5 pt-5 md:px-10 md:pt-7">
        <p className="text-white font-black text-[11px] tracking-[0.18em] leading-[1.3] uppercase">
          MARCUS<br />GRIMA
        </p>
        {/* Decorative hamburger — no navigation */}
        <div className="flex flex-col gap-[5px] pt-1 opacity-80">
          <span className="block w-5 h-[2px] bg-white rounded-sm" />
          <span className="block w-5 h-[2px] bg-white rounded-sm" />
          <span className="block w-5 h-[2px] bg-white rounded-sm" />
        </div>
      </div>

      {/* Hero copy — bottom-left */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10 md:pb-16 md:px-12">
        <div className="max-w-md">
          <p
            className="text-[11px] font-bold tracking-[0.28em] uppercase mb-3"
            style={{ color: BLUE }}
          >
            Malta · Online &amp; In-Person
          </p>

          <h1 className="text-white font-black tracking-tight leading-[0.92] mb-3"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)' }}>
            YOUR GOALS.<br />
            MY GUIDANCE.
          </h1>

          <p className="text-white/70 text-[14px] leading-relaxed mb-5 max-w-[260px]">
            Personalised coaching to help you become stronger,
            healthier &amp; happier.
          </p>

          {/* Pillars — inline horizontal, small */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
            {PILLARS.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={13} weight="regular" className="text-white/65" />
                <span className="text-[11px] text-white/75 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <WAButton label="LET'S TALK ON WHATSAPP" />
          <p className="text-white/35 text-[11px] mt-3">
            Free introduction. No commitment.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   COACHING BUILT AROUND YOU — 3-col photo cards, all visible at once
══════════════════════════════════════════════════════════════════════════ */
const CARDS = [
  {
    key: 'train', photo: '/hero.png',          crop: 'object-center',
    Icon: Barbell,  tag: 'TRAIN',
    desc: 'A physical plan built around you.',
  },
  {
    key: 'think', photo: '/mindset-today.png', crop: 'object-center',
    Icon: Brain,    tag: 'THINK',
    desc: 'Guidance for confidence, mindset and mental wellbeing.',
  },
  {
    key: 'live',  photo: '/team-amy.jpg',      crop: 'object-top',
    Icon: BookOpen, tag: 'LIVE',
    desc: 'Support beyond the gym, for the life you want to build.',
  },
];

function CoachingCards() {
  return (
    <section className="bg-white py-11 md:py-16">
      {/* Header — centred */}
      <div className="px-4 text-center mb-7 md:mb-10">
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-2"
          style={{ color: BLUE }}>
          Personalised Coaching
        </p>
        <h2 className="text-[22px] md:text-3xl font-black text-[#0F1D2E] tracking-tight mb-2">
          COACHING BUILT AROUND YOU.
        </h2>
        <p className="text-[13px] text-slate-500">
          Because your goals, your life and your starting point are different.
        </p>
      </div>

      {/* Cards — 3 equal columns, always visible */}
      <div className="grid grid-cols-3 gap-2 px-3 md:gap-4 md:px-10 max-w-4xl md:mx-auto">
        {CARDS.map(({ key, photo, crop, Icon, tag, desc }) => (
          <div
            key={key}
            className="relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '2/3' }}
          >
            <img
              src={photo} alt={tag}
              className={`absolute inset-0 w-full h-full object-cover ${crop}`}
              draggable={false}
            />
            {/* Dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Card content */}
            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4">
              <div
                className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center mb-1.5 md:mb-2"
                style={{ backgroundColor: BLUE }}
              >
                <Icon size={13} weight="regular" className="text-white" />
              </div>
              <p className="text-white font-black text-[11px] md:text-[14px] tracking-wide mb-0.5 md:mb-1">
                {tag}
              </p>
              <p className="text-white/75 text-[9px] md:text-[12px] leading-snug">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CREDIBILITY STRIP — 3 stats
══════════════════════════════════════════════════════════════════════════ */
const CREDS = [
  { Icon: ShieldStar, strong: '10+ YEARS',        soft: 'Coaching Experience' },
  { Icon: Users,      strong: 'CLIENTS ACROSS',   soft: 'Malta & Internationally' },
  { Icon: MapPin,     strong: 'ONLINE & IN-PERSON', soft: 'Coaching that adapts to you' },
];

function CredibilityStrip() {
  return (
    <section className="bg-[#F4F8FB] py-7 px-3 md:py-9 md:px-10">
      <div className="max-w-3xl mx-auto grid grid-cols-3 divide-x divide-slate-200">
        {CREDS.map(({ Icon, strong, soft }) => (
          <div key={strong} className="flex items-center gap-2 md:gap-3 px-2 md:px-6">
            <Icon size={18} weight="regular" className="text-slate-400 shrink-0 hidden sm:block" />
            <div>
              <p className="text-[8px] md:text-[10px] font-black tracking-[0.08em] text-[#0F1D2E] uppercase leading-tight">
                {strong}
              </p>
              <p className="text-[8px] md:text-[10px] text-slate-500 leading-tight mt-0.5">
                {soft}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHILOSOPHY — Own Your Journey
   Mobile: text content + background photo with overlay
   Desktop: left text / right photo
══════════════════════════════════════════════════════════════════════════ */
function Philosophy() {
  return (
    <section className="relative bg-[#F0F5FA] overflow-hidden">
      <div className="md:grid md:grid-cols-[55%_45%] md:min-h-[440px]">

        {/* Text */}
        <div className="relative z-10 px-5 py-12 md:px-14 md:py-16 flex flex-col justify-center">
          <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-4"
            style={{ color: BLUE }}>
            My Philosophy
          </p>
          <h2 className="font-black text-[#0F1D2E] tracking-tight leading-[0.92] mb-4"
            style={{ fontSize: 'clamp(2.4rem,6vw,3.8rem)' }}>
            OWN YOUR<br />JOURNEY.
          </h2>
          <p className="text-[14px] text-slate-500 leading-relaxed mb-7 max-w-[260px]">
            Your goals are yours.<br />
            My role is to help you move towards them.
          </p>
          <WAButton label="TALK TO MARCUS" />
        </div>

        {/* Photo — right side on desktop, background on mobile */}
        <div className="hidden md:block relative overflow-hidden">
          <img
            src="/marcus.png"
            alt="Marcus Grima"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F0F5FA] via-[#F0F5FA]/20 to-transparent" />
        </div>

      </div>

      {/* Mobile: subtle Marcus photo strip below text */}
      <div className="md:hidden">
        <img
          src="/marcus.png"
          alt="Marcus Grima"
          className="w-full object-cover object-top"
          style={{ height: '180px' }}
          draggable={false}
        />
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#1A2535] px-5 py-5">
      <div className="flex items-center justify-between max-w-4xl mx-auto md:px-5">
        <p className="text-[11px] font-black tracking-[0.18em] text-white uppercase">
          MARCUS GRIMA
        </p>
        <p className="text-[10px] text-white/30">© 2025 Marcus Grima</p>
        <p className="text-[10px] text-white/30">Privacy Policy</p>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export function ClientLanding({ onSignIn: _onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      <Hero />
      <CoachingCards />
      <CredibilityStrip />
      <Philosophy />
      <Footer />
    </div>
  );
}
