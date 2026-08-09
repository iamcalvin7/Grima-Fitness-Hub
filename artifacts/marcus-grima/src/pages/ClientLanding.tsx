/* ═══════════════════════════════════════════════════════════════════════════
   ClientLanding — Marcus Grima coaching lead-gen page
   Colour territory: Acid Lime · Black · Off-White · Soft Blue (wellbeing only)
═══════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  WhatsappLogo, ArrowRight,
  Barbell, Brain, BookOpen, Plus, Minus, ArrowDown,
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
  { Icon: Barbell,  label: 'Physical Training' },
  { Icon: Brain,    label: 'Mental Wellbeing'  },
  { Icon: BookOpen, label: 'Life Coaching'     },
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
            {PILLARS.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={13} weight="regular" style={{ color: LIME }} />
                <span className="text-[11px] font-semibold" style={{ color: LIME }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <WAButton label="LET'S TALK ON WHATSAPP" />
          <p className="text-white/30 text-[11px] mt-3">
            Free introduction. No commitment.
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
    Icon:  Barbell,
    title: 'PHYSICAL TRAINING',
    desc:  'Personalised training built around your goals, fitness level and lifestyle.',
    iconBg: LIME,
    iconColor: BLACK,
  },
  {
    key:   'think',
    Icon:  Brain,
    title: 'MENTAL WELLBEING',
    desc:  'Support to help you build confidence, resilience and a stronger mindset.',
    iconBg: BLUE,
    iconColor: '#fff',
  },
  {
    key:   'live',
    Icon:  BookOpen,
    title: 'LIFE COACHING',
    desc:  'Guidance to help you move forward with more clarity, purpose and direction.',
    iconBg: LIME,
    iconColor: BLACK,
  },
];

function CoachingCards() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section style={{ backgroundColor: BLACK }} className="py-12 md:py-16 px-4 md:px-10">

      {/* Header */}
      <div className="text-center mb-9 md:mb-12">
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: LIME }}>
          On a mission to help you
        </p>
        <h2
          className="font-black tracking-tight leading-tight mb-3"
          style={{ fontSize: 'clamp(1.6rem,5vw,2.8rem)', color: OFF_WHITE }}
        >
          STRONGER. HEALTHIER. HAPPIER.
        </h2>
        <p className="text-[14px] text-white/35">
          Through personalised coaching built around you.
        </p>
      </div>

      {/* Accordion cards */}
      <div className="flex flex-col gap-2 max-w-xl mx-auto mb-10">
        {SERVICES.map(({ key, Icon, title, desc, iconBg, iconColor }) => {
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
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: iconBg }}
                  >
                    <Icon size={16} weight="regular" style={{ color: iconColor }} />
                  </div>
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

    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FREE CONVERSATION CTA
══════════════════════════════════════════════════════════════════════════ */
function FreeCTA() {
  return (
    <section style={{ backgroundColor: LIME }} className="px-5 py-12 md:py-16 md:px-12">
      <div className="max-w-xl">
        <p
          className="font-black tracking-tight leading-[0.92] mb-6"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 3.2rem)', color: BLACK }}
        >
          LET'S START WITH A FREE CONVERSATION ABOUT YOUR GOALS.
        </p>
        <p className="text-[14px] mb-8 font-medium" style={{ color: 'rgba(0,0,0,0.55)' }}>
          No commitment required.
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
          LET'S TALK ON WHATSAPP
          <ArrowRight size={13} weight="bold" />
        </a>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ backgroundColor: BLACK, borderTop: '1px solid rgba(255,255,255,0.12)' }} className="px-5 pt-4 pb-4 overflow-hidden">
      <p
        className="font-black leading-tight tracking-tight uppercase select-none mb-3"
        style={{ fontSize: 'clamp(1.4rem, 5.5vw, 2.8rem)', color: LIME, opacity: 0.6 }}
      >
        FITNESS BEYOND<br />THE PHYSICAL.
      </p>

      <div className="border-t pt-3 flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          MARCUS GRIMA
        </p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2025</p>
      </div>
    </footer>
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
      <FreeCTA />
      <Footer />
    </div>
  );
}
