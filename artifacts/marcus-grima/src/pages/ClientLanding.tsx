/* ═══════════════════════════════════════════════════════════════════════════
   ClientLanding — Marcus Grima coaching lead-gen page
   Premium wellbeing / performance direction · Mobile-first
═══════════════════════════════════════════════════════════════════════════ */

import React from 'react';
import {
  WhatsappLogo, ArrowRight,
  Barbell, Brain, BookOpen,
} from '@phosphor-icons/react';

/* ─── WhatsApp ───────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER  = '35699767698';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

/* ─── Shared components ──────────────────────────────────────────────────── */
function WAButton({
  label,
  dark = false,
}: {
  label: string;
  dark?: boolean;
}) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center justify-center gap-2.5 font-bold text-sm
        tracking-wide transition-colors duration-200 px-6 py-3.5 w-full sm:w-auto
        rounded-full
        bg-[#25D366] hover:bg-[#1ebe5d] text-white
      `}
    >
      <WhatsappLogo size={18} weight="fill" />
      {label}
      <ArrowRight size={14} weight="bold" />
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO
   Mobile:  photo at top → copy below on sky-blue bg
   Desktop: side-by-side, copy left / photo right
══════════════════════════════════════════════════════════════════════════ */
const PILLARS = [
  { Icon: Barbell,  label: 'Physical Training' },
  { Icon: Brain,    label: 'Mental Wellbeing' },
  { Icon: BookOpen, label: 'Life Coaching' },
];

function Hero() {
  return (
    <section className="bg-[#EBF3FB] overflow-hidden">
      <div className="md:grid md:grid-cols-[55%_45%] md:min-h-[600px]">

        {/* PHOTO ── mobile: first (top) / desktop: second (right) */}
        <div className="order-first md:order-last md:relative">
          <div
            className="w-full overflow-hidden"
            style={{ aspectRatio: '4/3' }}
          >
            <img
              src="/hero.png"
              alt="Marcus Grima — Performance Coach"
              className="w-full h-full object-cover object-top md:absolute md:inset-0 md:h-full md:w-full"
              draggable={false}
            />
          </div>
        </div>

        {/* COPY ── mobile: second (below photo) / desktop: first (left) */}
        <div className="order-last md:order-first flex flex-col justify-center px-5 py-6 md:px-14 md:py-12">
          <h1 className="text-[clamp(2.2rem,7vw,4rem)] font-black tracking-tight text-[#0F1D2E] leading-[0.93] mb-3">
            YOUR GOALS.<br />
            MY GUIDANCE.
          </h1>

          <p className="text-[14px] text-slate-500 leading-relaxed mb-4 max-w-xs">
            Personalised coaching to help you become stronger, healthier &amp; happier.
          </p>

          {/* Pillar tiles ── 3-col side by side */}
          <div className="grid grid-cols-3 gap-2 mb-5 max-w-xs">
            {PILLARS.map(({ Icon, label }) => (
              <div
                key={label}
                className="bg-white/80 backdrop-blur-sm border border-white/70 shadow-sm
                           flex flex-col items-center justify-center gap-2 py-3 px-1 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-[#EBF3FB] flex items-center justify-center">
                  <Icon size={15} weight="regular" className="text-slate-600" />
                </div>
                <span className="text-[9px] font-bold tracking-[0.1em] text-slate-700 uppercase leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <WAButton label="LET'S TALK ON WHATSAPP" />
          <p className="text-[11px] text-slate-400 mt-2">
            Free introduction. No commitment.
          </p>
        </div>

      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — COACHING BUILT AROUND YOU
   Mobile:  horizontal swipe cards (snap scroll)
   Desktop: 3-column grid
══════════════════════════════════════════════════════════════════════════ */
const CARDS = [
  {
    key:   'train',
    photo: '/hero.png',
    crop:  'object-center',
    tag:   'TRAIN',
    title: 'A physical plan built around you.',
  },
  {
    key:   'think',
    photo: '/mindset-today.png',
    crop:  'object-center',
    tag:   'THINK',
    title: 'Guidance for confidence, mindset and mental wellbeing.',
  },
  {
    key:   'live',
    photo: '/team-amy.jpg',
    crop:  'object-top',
    tag:   'LIVE',
    title: 'Support beyond the gym, for the life you want to build.',
  },
];

function CoachingCards() {
  return (
    <section className="bg-white py-12 md:py-16">
      {/* Header */}
      <div className="px-5 md:px-10 mb-8 md:text-center">
        <p className="text-[10px] font-black tracking-[0.32em] text-slate-400 uppercase mb-3">
          Personalised Coaching
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-[#0F1D2E] tracking-tight leading-tight mb-2">
          COACHING BUILT AROUND YOU.
        </h2>
        <p className="text-sm text-slate-500">
          Because your goals, your life and your starting point are different.
        </p>
      </div>

      {/* Cards — horizontal scroll on mobile, grid on desktop */}
      <div
        className="flex gap-3 px-5 pb-2 overflow-x-auto snap-x snap-mandatory
                   md:grid md:grid-cols-3 md:gap-5 md:px-10 md:overflow-visible
                   scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {CARDS.map(({ key, photo, crop, tag, title }) => (
          <div
            key={key}
            className="relative flex-none w-[78vw] sm:w-[55vw] md:w-auto
                       overflow-hidden snap-start
                       shadow-sm"
            style={{ aspectRatio: '3/4' }}
          >
            <img
              src={photo}
              alt={tag}
              className={`absolute inset-0 w-full h-full object-cover ${crop}`}
              draggable={false}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Label + copy */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black tracking-[0.28em] text-white/70 uppercase">
                  {tag}
                </span>
              </div>
              <p className="text-[14px] font-semibold text-white leading-snug">
                {title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — SUCCESS STORIES
══════════════════════════════════════════════════════════════════════════ */
const STORIES = [
  {
    key:    'result-client',
    photo:  '/result-client.jpg',
    crop:   'object-top',
    name:   'Daniel',
    result: 'Body recomposition',
    quote:  'Training with Marcus completely changed how I approach my health. The results speak for themselves.',
  },
  {
    key:    'result-transformation',
    photo:  '/result-transformation.jpg',
    crop:   'object-center',
    name:   'Chris',
    result: 'Full transformation',
    quote:  'I went from the worst shape of my life to the best — with a plan that actually worked for me.',
  },
];

function SuccessStories() {
  return (
    <section className="bg-[#F0F6FB] py-12 md:py-16">
      <div className="px-5 md:px-10 mb-8 md:text-center">
        <p className="text-[10px] font-black tracking-[0.32em] text-slate-400 uppercase mb-3">
          Real Results
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-[#0F1D2E] tracking-tight leading-tight">
          CLIENT SUCCESS STORIES.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 md:px-10 max-w-3xl md:mx-auto">
        {STORIES.map(({ key, photo, crop, name, result, quote }) => (
          <div key={key} className="bg-white shadow-sm overflow-hidden">
            {/* Photo */}
            <div className="w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src={photo}
                alt={`${name} — ${result}`}
                className={`w-full h-full object-cover ${crop}`}
                draggable={false}
              />
            </div>
            {/* Copy */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-black tracking-[0.18em] text-[#0F1D2E] uppercase">
                    {name}
                  </p>
                  <p className="text-[10px] text-slate-400 tracking-wide uppercase">
                    {result}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                "{quote}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 4 — PHILOSOPHY / OWN YOUR JOURNEY
   Dark navy with Marcus photo, emotional close + WhatsApp CTA
══════════════════════════════════════════════════════════════════════════ */
function Philosophy() {
  return (
    <section className="relative bg-[#111E2D] overflow-hidden">
      {/* Background photo with strong dark overlay */}
      <div className="absolute inset-0">
        <img
          src="/marcus.png"
          alt=""
          aria-hidden
          className="w-full h-full object-cover object-top opacity-30"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111E2D]/95 via-[#111E2D]/80 to-[#111E2D]/50" />
      </div>

      {/* Desktop: two-column layout */}
      <div className="relative md:grid md:grid-cols-[1fr_auto] md:items-center max-w-4xl mx-auto">
        {/* Content */}
        <div className="px-5 py-14 md:px-14 md:py-20">
          <p className="text-[10px] font-black tracking-[0.32em] text-white/40 uppercase mb-5">
            My Philosophy
          </p>
          <h2 className="text-[clamp(2.2rem,6vw,3.5rem)] font-black tracking-tight text-white leading-[0.95] mb-5">
            OWN YOUR<br />JOURNEY.
          </h2>
          <p className="text-[15px] text-white/60 leading-relaxed mb-8 max-w-xs">
            Your goals are yours.<br />
            My role is to help you move towards them.
          </p>
          <WAButton label="TALK TO MARCUS" dark />
        </div>

        {/* Desktop photo panel */}
        <div className="hidden md:block w-72 h-full relative">
          <img
            src="/hero.png"
            alt="Marcus Grima"
            className="h-full w-full object-cover object-top opacity-60"
            style={{ minHeight: '400px' }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111E2D] to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER — no navigation, text only
══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#0D1824] px-5 py-5">
      <p className="text-[10px] text-white/20 tracking-[0.25em] uppercase">
        Marcus Grima · Performance Coach · Malta
      </p>
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
      <SuccessStories />
      <Philosophy />
      <Footer />
    </div>
  );
}
