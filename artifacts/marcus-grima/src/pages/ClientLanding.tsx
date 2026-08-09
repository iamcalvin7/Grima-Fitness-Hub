/* ═══════════════════════════════════════════════════════════════════════════
   ClientLanding — Marcus Grima coaching lead-gen page
   Colour territory: Acid Lime · Black · Off-White · Soft Blue (wellbeing only)
═══════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  WhatsappLogo, ArrowRight,
  Plus, Minus, ArrowDown,
} from '@phosphor-icons/react';

/* ─── Palette ────────────────────────────────────────────────────────────── */
const LIME      = '#CAFF33';   // acid lime — primary action / accent
const BLACK     = '#0D0D0D';   // near-black
const OFF_WHITE = '#F4F4EE';   // warm off-white
const BLUE      = '#5090C8';   // soft blue — mental wellbeing only

/* ─── WhatsApp ───────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER  = '35699767698';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

/* ─── Shared CTA — lime pill, black text ─────────────────────────────────── */
function WAButton({ label }: { label: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full
                 font-black text-[13px] tracking-widest uppercase
                 px-6 py-3.5 transition-opacity duration-200 hover:opacity-90"
      style={{ backgroundColor: LIME, color: BLACK }}
    >
      <WhatsappLogo size={16} weight="fill" />
      {label}
      <ArrowRight size={13} weight="bold" />
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HERO — full-bleed photo, text bottom-left
══════════════════════════════════════════════════════════════════════════ */
const PILLARS = [
  { img: '/icon-barbell.png', label: 'Physical Training' },
  { img: '/icon-brain.png',   label: 'Mental Wellbeing'  },
  { img: '/icon-book.png',    label: 'Life Coaching'     },
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      </div>

      {/* Brand mark */}
      <div className="relative z-10 px-5 pt-5 md:px-10 md:pt-7">
        <p className="text-white font-black text-[11px] tracking-[0.18em] leading-[1.3] uppercase">
          MARCUS<br />GRIMA
        </p>
      </div>

      {/* Scroll arrow — pinned bottom centre */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center animate-bounce">
        <ArrowDown size={20} weight="bold" style={{ color: LIME }} />
      </div>

      {/* Hero copy — bottom-left */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10 md:pb-16 md:px-12">
        <div className="max-w-md">

          <h1
            className="font-black tracking-tight leading-[0.9] mb-4"
            style={{ fontSize: 'clamp(2.8rem, 9vw, 5rem)', color: OFF_WHITE }}
          >
            YOUR GOALS.<br />
            MY GUIDANCE.
          </h1>

          <p className="text-white/60 text-[13px] leading-relaxed mb-6 max-w-[260px]">
            Personalised coaching to help you become stronger,
            healthier &amp; happier.
          </p>

          {/* Pillars — lime icons */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-7">
            {PILLARS.map(({ img, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <img
                  src={img}
                  alt={label}
                  className="w-5 h-5 object-contain shrink-0"
                  draggable={false}
                />
                <span className="text-[11px] font-semibold" style={{ color: LIME }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <WAButton label="OWN YOUR JOURNEY." />
          <p className="text-white/30 text-[11px] mt-3">
            Click to speak on WhatsApp
          </p>

        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVICES — icon cards on black, no photos
══════════════════════════════════════════════════════════════════════════ */
const SERVICES = [
  {
    key:   'train',
    img:   '/icon-barbell.png',
    title: 'PHYSICAL TRAINING',
    desc:  'Personalised training built around your goals, fitness level and lifestyle.',
  },
  {
    key:   'think',
    img:   '/icon-brain.png',
    title: 'MENTAL WELLBEING',
    desc:  'Support to help you build confidence, resilience and a stronger mindset.',
  },
  {
    key:   'live',
    img:   '/icon-book.png',
    title: 'LIFE COACHING',
    desc:  'Guidance to help you move forward with more clarity, purpose and direction.',
  },
];

function CoachingCards() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section style={{ backgroundColor: BLACK }} className="py-12 md:py-16 px-4 md:px-10">

      {/* Header */}
      <div className="text-center mb-9 md:mb-12">
        <h2
          className="font-black tracking-tight leading-tight uppercase"
          style={{ fontSize: 'clamp(1.6rem,5vw,2.8rem)', color: LIME }}
        >
          On a mission to help you become stronger, healthier &amp; happier.
        </h2>
      </div>

      {/* Accordion cards */}
      <div className="max-w-xl mx-auto mb-10">
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: OFF_WHITE }}>
          Personalised:
        </p>
        <div className="flex flex-col gap-2">
        {SERVICES.map(({ key, img, title, desc }) => {
          const isOpen = openKey === key;
          return (
            <div
              key={key}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: OFF_WHITE }}
            >
              {/* Row — always visible, tap to toggle */}
              <button
                onClick={() => setOpenKey(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={img}
                    alt={title}
                    className="w-9 h-9 object-contain shrink-0"
                    draggable={false}
                  />
                  <p className="text-[12px] font-black tracking-[0.12em] uppercase" style={{ color: BLACK }}>
                    {title}
                  </p>
                </div>
                {isOpen
                  ? <Minus size={14} weight="bold" style={{ color: BLACK, opacity: 0.4 }} />
                  : <Plus  size={14} weight="bold" style={{ color: BLACK, opacity: 0.4 }} />
                }
              </button>

              {/* Expandable description */}
              {isOpen && (
                <div className="px-5 pb-5 pt-0">
                  <div className="w-5 h-[2px] rounded-full mb-3" style={{ backgroundColor: LIME }} />
                  <p className="text-[13px] leading-relaxed" style={{ color: '#555' }}>
                    {desc}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WALL OF SUCCESS
══════════════════════════════════════════════════════════════════════════ */
const RESULTS = [
  {
    key:    'peter',
    name:   'PETER BORG',
    tag:    "Real progress isn't about quick fixes.\nIt's about becoming someone new.",
    before: '/peter-before.jpg',
    after:  '/peter-after.jpg',
    story: [
      'Most people want to change their body without changing anything about how they actually live. That doesn\'t work.',
      'Peter didn\'t just start training harder. He changed the habits, mindset and choices that had been keeping him where he was.',
      'There\'s a version of you that got you to where you are right now. That same version cannot always get you to where you want to be. Real progress isn\'t just about motivation or a new programme. Sometimes it means being honest about what needs to change.',
      'That\'s uncomfortable. Most people make changes for a few weeks and eventually drift back because the habits underneath never changed.',
    ],
    highlight: 'Peter did.',
  },
];

function WallOfSuccess() {
  const [openStory, setOpenStory] = useState<string | null>(null);

  return (
    <section style={{ backgroundColor: '#111111' }} className="px-5 py-12 md:py-16 md:px-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: LIME }}>
          Wall of Success
        </p>
        <h2
          className="font-black tracking-tight leading-[0.9] mb-2 uppercase"
          style={{ fontSize: 'clamp(2rem,7vw,3.6rem)', color: OFF_WHITE }}
        >
          Real people.<br />Unreal progress.
        </h2>
        <p className="text-white/35 text-[13px] mb-8">Every result has a story.</p>

        {/* Result cards */}
        {RESULTS.map(({ key, name, tag, before, after, story, highlight }) => {
          const isOpen = openStory === key;
          return (
            <div key={key} className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: '#1A1A1A' }}>

              {/* Before / After photos */}
              <div className="relative flex h-64 md:h-80 overflow-hidden">
                {/* Before */}
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={before}
                    alt="Before"
                    className="w-full h-full object-cover object-top grayscale"
                    draggable={false}
                  />
                  <span
                    className="absolute top-3 left-3 text-[10px] font-black tracking-[0.2em] px-2.5 py-1 rounded"
                    style={{ backgroundColor: LIME, color: BLACK }}
                  >
                    BEFORE
                  </span>
                </div>
                {/* Divider */}
                <div className="w-[2px]" style={{ backgroundColor: BLACK }} />
                {/* After */}
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={after}
                    alt="After"
                    className="w-full h-full object-cover object-top"
                    draggable={false}
                  />
                  <span
                    className="absolute top-3 right-3 text-[10px] font-black tracking-[0.2em] px-2.5 py-1 rounded"
                    style={{ backgroundColor: LIME, color: BLACK }}
                  >
                    AFTER
                  </span>
                </div>
              </div>

              {/* Name + tag + toggle */}
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-black tracking-[0.1em] uppercase mb-1" style={{ color: OFF_WHITE }}>
                    {name}
                  </p>
                  <p className="text-[12px] leading-snug" style={{ color: 'rgba(255,255,255,0.4)', whiteSpace: 'pre-line' }}>
                    {tag}
                  </p>
                </div>
                <button
                  onClick={() => setOpenStory(isOpen ? null : key)}
                  className="shrink-0 flex items-center gap-2 border rounded-full px-4 py-2 text-[10px] font-black tracking-[0.14em] uppercase transition-opacity duration-200 hover:opacity-70"
                  style={{ borderColor: LIME, color: LIME }}
                >
                  {isOpen ? 'CLOSE' : "READ STORY"}
                  {isOpen ? <Minus size={10} weight="bold" /> : <Plus size={10} weight="bold" />}
                </button>
              </div>

              {/* Expandable story */}
              {isOpen && (
                <div className="px-5 pb-6">
                  <div className="w-5 h-[2px] rounded-full mb-4" style={{ backgroundColor: LIME }} />
                  <p className="text-[28px] font-black leading-none mb-4" style={{ color: LIME }}>"</p>
                  {story.map((para, i) => (
                    <p key={i} className="text-[13px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {para}
                    </p>
                  ))}
                  <p className="text-[13px] font-black" style={{ color: LIME }}>{highlight}</p>
                </div>
              )}

            </div>
          );
        })}

      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FREE CONVERSATION CTA
══════════════════════════════════════════════════════════════════════════ */
function FreeCTA() {
  return (
    <section style={{ backgroundColor: LIME }} className="px-5 py-8 md:py-10 md:px-12">
      <div className="max-w-xl">
        <p
          className="font-black tracking-tight leading-[0.92] mb-6"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 3.2rem)', color: BLACK }}
        >
          LET'S START WITH A FREE CONVERSATION ABOUT YOUR GOALS.{' '}
          <span style={{ color: 'rgba(0,0,0,0.38)' }}>NO COMMITMENT REQUIRED.</span>
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full
                     font-black text-[13px] tracking-widest uppercase
                     px-6 py-3.5 transition-opacity duration-200 hover:opacity-80"
          style={{ backgroundColor: BLACK, color: LIME }}
        >
          <WhatsappLogo size={16} weight="fill" />
          OWN YOUR JOURNEY.
          <ArrowRight size={13} weight="bold" />
        </a>
        <p className="text-[11px] mt-3" style={{ color: 'rgba(0,0,0,0.45)' }}>
          Click to speak on WhatsApp
        </p>
      </div>
    </section>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export function ClientLanding({ onSignIn: _onSignIn }: { onSignIn: () => void }) {
  return (
    <div style={{ backgroundColor: BLACK }} className="min-h-screen overflow-x-hidden">
      <Hero />
      <CoachingCards />
      <WallOfSuccess />
      <FreeCTA />
    </div>
  );
}
