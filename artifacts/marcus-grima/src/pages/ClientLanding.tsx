import React from 'react';
import { motion } from 'framer-motion';
import { WhatsappLogo, ArrowRight, InstagramLogo } from '@phosphor-icons/react';

/* ─── WhatsApp destination ──────────────────────────────────────────────── */
const WHATSAPP_NUMBER  = '35699767698';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

/* ─── CTA button ────────────────────────────────────────────────────────── */
function WAButton({ label }: { label: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#18a852] text-white font-black text-sm tracking-wide px-6 py-3.5 transition-colors duration-200 w-full sm:w-auto justify-center"
    >
      <WhatsappLogo size={18} weight="fill" />
      {label}
      <ArrowRight size={14} weight="bold" />
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO
══════════════════════════════════════════════════════════════════════════ */
function Hero({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="relative min-h-svh flex flex-col justify-between overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/hero.png"
          alt=""
          aria-hidden
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/75" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <img src="/logo.png" alt="Marcus Grima" className="h-7 w-auto" />
        <button
          onClick={onSignIn}
          className="text-[10px] font-black tracking-[0.25em] text-white/40 uppercase hover:text-white/70 transition-colors"
        >
          Member Sign In →
        </button>
      </div>

      {/* Hero copy */}
      <motion.div
        className="px-5 pb-10 pt-8 max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black tracking-[0.35em] text-white/50 uppercase mb-5">
          Malta · Online &amp; In-Person
        </p>

        <h1 className="text-[clamp(2.8rem,9vw,5rem)] font-black tracking-tight text-white leading-[0.95] mb-5">
          YOUR GOALS.<br />
          MY GUIDANCE.
        </h1>

        <p className="text-[15px] text-white/60 font-medium leading-relaxed mb-6 max-w-xs">
          Personalised coaching to help you become stronger, healthier &amp; happier.
        </p>

        {/* Three pillars — inline, minimal */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
          {[
            '💪  Physical Training',
            '🧠  Mental Wellbeing',
            '📚  Life Coaching',
          ].map((pillar) => (
            <span
              key={pillar}
              className="text-[11px] font-semibold text-white/55 tracking-wide"
            >
              {pillar}
            </span>
          ))}
        </div>

        <WAButton label="LET'S TALK ON WHATSAPP" />

        <p className="text-[10px] text-white/30 mt-3 tracking-wide">
          Free introduction. No commitment.
        </p>
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — BUILT AROUND YOU
══════════════════════════════════════════════════════════════════════════ */
const BENEFITS = [
  {
    title: 'A PLAN FOR YOU',
    desc:  'Training built around your goals, lifestyle and ability.',
  },
  {
    title: 'MARCUS IN YOUR CORNER',
    desc:  'Personal guidance, honest feedback and accountability.',
  },
  {
    title: 'MORE THAN TRAINING',
    desc:  'Support for your physical health, mindset and the life around it.',
  },
];

function BuiltAroundYou() {
  return (
    <section className="px-5 py-14 max-w-lg">
      <p className="text-[10px] font-black tracking-[0.35em] text-white/30 uppercase mb-4">
        Personalised Coaching
      </p>
      <h2 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
        BUILT AROUND YOU.
      </h2>
      <p className="text-sm text-white/40 mb-8">
        No templates. No one-size-fits-all plans.
      </p>

      <div className="space-y-0 border-t border-white/8">
        {BENEFITS.map((b, i) => (
          <div key={b.title} className="border-b border-white/8 py-4 flex gap-5 items-start">
            <span className="text-[10px] font-black text-white/20 tracking-widest mt-0.5 shrink-0 w-4">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] text-white uppercase mb-1">
                {b.title}
              </p>
              <p className="text-sm text-white/45 leading-relaxed">
                {b.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — FINAL BRAND / CTA
══════════════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="px-5 py-14 border-t border-white/8">
      {/* Marcus identity */}
      <div className="flex items-center gap-4 mb-7">
        <img
          src="/marcus.png"
          alt="Marcus Grima"
          className="w-14 h-14 rounded-full object-cover object-top border border-white/10 shrink-0"
        />
        <div>
          <p className="text-sm font-black text-white tracking-wide">Marcus Grima</p>
          <p className="text-xs text-white/35 tracking-wider uppercase">Performance Coach</p>
        </div>
      </div>

      {/* Quote */}
      <blockquote className="text-[15px] font-medium text-white/60 leading-relaxed mb-8 border-l-2 border-white/15 pl-4 italic max-w-sm">
        "My job is to understand where you want to go and help you get there."
      </blockquote>

      {/* Brand statement */}
      <h2 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
        OWN YOUR JOURNEY.
      </h2>
      <p className="text-sm text-white/40 mb-7">
        Your goals are personal. Your coaching should be too.
      </p>

      <WAButton label="MESSAGE MARCUS" />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════════════ */
function Footer({ onSignIn }: { onSignIn: () => void }) {
  return (
    <footer className="border-t border-white/5 px-5 py-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Marcus Grima" className="h-5 w-auto opacity-30" />
          <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase hidden sm:block">
            Marcus Grima · Malta
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://instagram.com/marcusgrimapt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/50 transition-colors"
          >
            <InstagramLogo size={15} weight="fill" />
          </a>
          <button
            onClick={onSignIn}
            className="text-[9px] text-white/20 hover:text-white/45 transition-colors tracking-[0.25em] uppercase"
          >
            Member Sign In
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export function ClientLanding({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white overflow-x-hidden">
      <Hero onSignIn={onSignIn} />
      <BuiltAroundYou />
      <FinalCTA />
      <Footer onSignIn={onSignIn} />
    </div>
  );
}
