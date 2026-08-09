import React from 'react';
import { WhatsappLogo, ArrowRight } from '@phosphor-icons/react';

/* ─── WhatsApp destination ───────────────────────────────────────────────── */
const WHATSAPP_NUMBER  = '35699767698';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

/* ─── CTA button ─────────────────────────────────────────────────────────── */
function WAButton({ label = "LET'S TALK ON WHATSAPP", large = false }: {
  label?: string; large?: boolean;
}) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center justify-center gap-2.5
        bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#18a852]
        text-white font-black tracking-wide transition-colors duration-200
        w-full sm:w-auto
        ${large ? 'text-sm px-7 py-4' : 'text-sm px-6 py-3.5'}
      `}
    >
      <WhatsappLogo size={18} weight="fill" />
      {label}
      <ArrowRight size={14} weight="bold" />
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HERO PHOTO — full-width at the very top
══════════════════════════════════════════════════════════════════════════ */
function HeroPhoto() {
  return (
    <div className="w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
      <img
        src="/hero.png"
        alt="Marcus Grima — Personal Trainer"
        className="w-full h-full object-cover object-top"
        draggable={false}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INTRO — headline, pillars, primary CTA
══════════════════════════════════════════════════════════════════════════ */
const PILLARS = [
  { emoji: '💪', label: 'Physical Training' },
  { emoji: '🧠', label: 'Mental Wellbeing' },
  { emoji: '📚', label: 'Life Coaching' },
];

function Intro() {
  return (
    <section className="px-5 pt-8 pb-10 max-w-lg">
      {/* Brand eyebrow */}
      <p className="text-[10px] font-black tracking-[0.35em] text-neutral-400 uppercase mb-5">
        Malta · Online &amp; In-Person
      </p>

      <h1 className="text-[clamp(2.2rem,8vw,3.8rem)] font-black tracking-tight text-neutral-900 leading-[0.95] mb-4">
        YOUR GOALS.<br />
        MY GUIDANCE.
      </h1>

      <p className="text-[15px] text-neutral-500 leading-relaxed mb-7 max-w-xs">
        Personalised coaching to help you become stronger, healthier &amp; happier.
      </p>

      {/* Three pillars — compact inline row */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
        {PILLARS.map(({ emoji, label }) => (
          <span
            key={label}
            className="text-[11px] font-semibold text-neutral-500 tracking-wide"
          >
            {emoji}&nbsp;&nbsp;{label}
          </span>
        ))}
      </div>

      <WAButton large />

      <p className="text-[11px] text-neutral-400 mt-3">
        Free introduction. No commitment.
      </p>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BUILT AROUND YOU — three compact benefit rows
══════════════════════════════════════════════════════════════════════════ */
const BENEFITS = [
  {
    n: '01',
    title: 'A PLAN FOR YOU',
    desc: 'Training built around your goals, lifestyle and ability — not a generic programme.',
  },
  {
    n: '02',
    title: 'MARCUS IN YOUR CORNER',
    desc: 'Personal guidance, honest feedback and accountability from your coach directly.',
  },
  {
    n: '03',
    title: 'MORE THAN TRAINING',
    desc: 'Support for your physical health, mindset, and the life that surrounds it.',
  },
];

function BuiltAroundYou() {
  return (
    <section className="bg-[#F7F6F4] px-5 py-12">
      <div className="max-w-lg">
        <p className="text-[10px] font-black tracking-[0.35em] text-neutral-400 uppercase mb-4">
          Personalised Coaching
        </p>
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight mb-1">
          BUILT AROUND YOU.
        </h2>
        <p className="text-sm text-neutral-400 mb-8">
          No templates. No one-size-fits-all plans.
        </p>

        <div className="border-t border-neutral-200">
          {BENEFITS.map((b) => (
            <div
              key={b.n}
              className="border-b border-neutral-200 py-5 flex gap-5 items-start"
            >
              <span className="text-[10px] font-black text-neutral-300 tracking-widest mt-0.5 shrink-0 w-5">
                {b.n}
              </span>
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-neutral-800 uppercase mb-1">
                  {b.title}
                </p>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CLOSING CTA
══════════════════════════════════════════════════════════════════════════ */
function ClosingCTA() {
  return (
    <section className="px-5 py-12">
      <div className="max-w-lg">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">
          Ready to start?
        </h2>
        <p className="text-sm text-neutral-500 mb-7 max-w-xs leading-relaxed">
          Send Marcus a message. The first conversation is free and there's no obligation.
        </p>
        <WAButton label="MESSAGE MARCUS" />
        <p className="text-[11px] text-neutral-400 mt-3">
          Typically replies within a few hours.
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER — minimal, no navigation
══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-neutral-100 px-5 py-5">
      <p className="text-[10px] text-neutral-300 tracking-widest uppercase">
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
    <div className="bg-white min-h-screen text-neutral-900 overflow-x-hidden">
      <HeroPhoto />
      <Intro />
      <BuiltAroundYou />
      <ClosingCTA />
      <Footer />
    </div>
  );
}
