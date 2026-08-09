/* ═══════════════════════════════════════════════════════════════════════════
   ClientLanding — Marcus Grima coaching lead-gen page
   Colour territory: Acid Lime · Black · Off-White · Soft Blue (wellbeing only)
═══════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  WhatsappLogo, ArrowRight,
  Plus, Minus, ArrowDown, InstagramLogo,
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
          src="/hero.jpg"
          alt="Marcus Grima — Performance Coach"
          className="w-full h-full object-cover object-[center_25%]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      </div>

      {/* Brand mark + Instagram */}
      <div className="relative z-10 px-5 pt-5 md:px-10 md:pt-7 flex items-start justify-between">
        <p className="text-white font-black text-[11px] tracking-[0.18em] leading-[1.3] uppercase">
          MARCUS<br />GRIMA
        </p>
        <a
          href="https://www.instagram.com/marcusgrima22/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Marcus Grima on Instagram"
          className="w-11 h-11 -mt-2 -mr-2 flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
        >
          <InstagramLogo size={22} weight="regular" style={{ color: LIME }} />
        </a>
      </div>

      {/* Scroll arrow — pinned bottom centre */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center animate-bounce">
        <ArrowDown size={20} weight="bold" style={{ color: LIME }} />
      </div>

      {/* Hero copy — bottom-left */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-16 md:pb-20 md:px-12">
        <div className="max-w-md">

          <h1
            className="font-black tracking-tight leading-[0.9] mb-4"
            style={{ fontSize: 'clamp(2.8rem, 9vw, 5rem)', color: OFF_WHITE }}
          >
            YOUR GOALS.<br />
            MY GUIDANCE.
          </h1>

          <p className="text-white/70 text-[13px] leading-relaxed mb-6 max-w-[260px]">
            Personalised coaching to help you become stronger,
            healthier &amp; happier.
          </p>

          {/* Pillars — lime icons */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-7">
            {PILLARS.map(({ img, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: OFF_WHITE }}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-4 h-4 object-contain"
                    draggable={false}
                  />
                </span>
                <span className="text-[12px] font-semibold" style={{ color: LIME }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center text-center">
            <WAButton label="OWN YOUR JOURNEY." />
            <p className="text-white/60 text-[12px] mt-3">
              Click to speak on WhatsApp
            </p>
          </div>

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
    <section id="services" style={{ backgroundColor: BLACK }} className="pt-12 md:pt-16 pb-4 md:pb-6 px-4 md:px-10">

      <div className="max-w-xl md:max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-12 md:items-center">

      {/* Left column — header + accordions */}
      <div>

      {/* Header — mirrors Wall of Success: lime label + off-white headline */}
      <div className="mb-8">
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: LIME }}>
          Own Your Journey.
        </p>
        <h2
          className="font-black tracking-tight leading-tight uppercase"
          style={{ fontSize: 'clamp(1.6rem,5vw,2.8rem)', color: OFF_WHITE }}
        >
          On a mission to help you become stronger, healthier &amp; happier.
        </h2>
      </div>

      {/* Accordion cards */}
      <div>
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
                className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[44px]"
                aria-expanded={isOpen}
                aria-controls={`service-desc-${key}`}
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
                <div className="px-5 pb-5 pt-0" id={`service-desc-${key}`}>
                  <div className="w-5 h-[2px] rounded-full mb-3" style={{ backgroundColor: LIME }} />
                  <p className="text-[13px] leading-relaxed" style={{ color: '#444' }}>
                    {desc}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      </div>

      {/* Right column — photo (desktop only) */}
      <div className="hidden md:block">
        <div className="rounded-2xl overflow-hidden">
          <img
            src="/hero.jpg"
            alt="Marcus Grima coaching"
            className="w-full h-full object-cover object-[center_20%] aspect-[4/5]"
            draggable={false}
          />
        </div>
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
    tag:    'Music Producer & Guitarist — Red\u00A0Electric',
    before: '/peter-before.jpg',
    after:  '/peter-after.jpg',
    story: [
      'Most people want to change their body without changing anything about how they actually live.',
      'That doesn\u2019t work.',
      'This guy didn\u2019t just start training harder. He genuinely stopped being the person he was before \u2014 the habits, the mindset, the way he spent his time, the way he thought about himself. All of it had to go.',
      'There\u2019s a version of you that got you to where you are right now. And that same version of you cannot get you to where you want to be. It\u2019s not about motivation or a new program. It\u2019s about being honest enough to admit that who you\u2019ve been isn\u2019t who you need to be.',
      'That\u2019s uncomfortable. Most people won\u2019t do it. They\u2019ll change their diet for a few weeks, go to the gym for a month, and then drift back - because deep down they never actually let go of the old identity.',
    ],
    highlight: 'He did.',
  },
  {
    key:    'jeff',
    name:   'JEFF GAMBIN',
    tag:    'Entrepreneur & Restaurateur — Surfside',
    before: '/jeff-before.jpg',
    after:  '/jeff-after.jpg',
    story: [
      'What no one sees in this transformation is the person he had to become to achieve it. When we first started training together just under 2 years ago, we were doing private sessions at Surfside because walking into a gym felt intimidating.',
      'Fast forward to today and he\u2019s gone from 115kg to 83kg. But anyone can see the physical transformation. What most people won\u2019t see is the person he had to become along the way. The early mornings. The days he couldn\u2019t be bothered. The weekends where it would\u2019ve been easier to stay comfortable. The countless small decisions nobody sees that slowly built a completely different guy. Over the last 2 years I\u2019ve watched this guy become more disciplined, more consistent, more confident and more resilient. That\u2019s the real transformation. The body is just a reflection of everything that\u2019s happened underneath.',
      'One thing I\u2019ve learned from coaching is that people rarely change their lives because they suddenly find motivation. They change because they decide they\u2019re no longer willing to be the person they\u2019ve been.',
      'I\u2019m incredibly proud of the transformation Jeff has made and the 2.0 version of himself he\u2019s become. But more than that, I\u2019m grateful that this journey gave me a friend I have so much admiration and respect for. One of the most special parts of this job isn\u2019t the physical transformation - it\u2019s the relationships that are built along the way. Watching people change their lives is rewarding, but building friendships that last a lifetime is something I\u2019ll never take for granted.',
      'Jeff dedicates his transformation to his forever fit papa, Jeremy Gambin who I have no doubt would be super proud of him. \u{1FAF6}',
    ],
    highlight: 'Jeff did.',
  },
];

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50); // percentage revealed from the left (before side)
  const containerRef = React.useRef<HTMLDivElement>(null);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons > 0 || e.pointerType === 'touch') updateFromClientX(e.clientX);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault(); setPos((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault(); setPos((p) => Math.min(100, p + 5));
    } else if (e.key === 'Home') {
      e.preventDefault(); setPos(0);
    } else if (e.key === 'End') {
      e.preventDefault(); setPos(100);
    }
  };

  return (
    <div style={{ backgroundColor: '#1A1A1A' }}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none touch-none cursor-ew-resize focus:outline-none focus-visible:ring-2"
        style={{ aspectRatio: '1122 / 1402', ['--tw-ring-color' as string]: LIME }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Before and after comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
      >
        {/* After — base layer */}
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Before — clipped to slider position */}
        <img
          src={before}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />

        {/* Labels */}
        <span
          className="absolute top-3 left-3 text-[10px] font-black tracking-[0.2em] px-2.5 py-1 rounded pointer-events-none"
          style={{ backgroundColor: LIME, color: BLACK, opacity: pos > 15 ? 1 : 0, transition: 'opacity 0.2s' }}
        >
          BEFORE
        </span>
        <span
          className="absolute top-3 right-3 text-[10px] font-black tracking-[0.2em] px-2.5 py-1 rounded pointer-events-none"
          style={{ backgroundColor: LIME, color: BLACK, opacity: pos < 85 ? 1 : 0, transition: 'opacity 0.2s' }}
        >
          AFTER
        </span>

        {/* Divider + handle */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-[3px] h-full mx-auto" style={{ backgroundColor: LIME }} />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: LIME }}
          >
            <span className="font-black text-[12px] tracking-tighter" style={{ color: BLACK }}>{'<>'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WallOfSuccess() {
  const [openStory, setOpenStory] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const prev = () => { setIndex((i) => (i - 1 + RESULTS.length) % RESULTS.length); setOpenStory(null); };
  const next = () => { setIndex((i) => (i + 1) % RESULTS.length); setOpenStory(null); };

  return (
    <section id="wall" style={{ backgroundColor: '#111111' }} className="px-5 pt-6 md:pt-8 pb-12 md:pb-16 md:px-10">
      <div className="max-w-2xl md:max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-12 md:items-center">

        {/* Text column — header + controls (right on desktop) */}
        <div className="md:order-2">

        {/* Header */}
        <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: LIME }}>
          Wall of Success
        </p>
        <h2
          className="font-black tracking-tight leading-[0.9] mb-8 uppercase"
          style={{ fontSize: 'clamp(2rem,7vw,3.6rem)', color: OFF_WHITE }}
        >
          Real people.<br />Unreal progress.
        </h2>

        {/* Carousel controls */}
        <div className="flex items-center justify-center md:justify-start gap-4 mb-4 md:mb-0">
          <p className="text-[12px] font-black tracking-[0.2em]" style={{ color: OFF_WHITE }}>
            <span style={{ color: LIME }}>{String(index + 1).padStart(2, '0')}</span>
            {' / '}
            {String(RESULTS.length).padStart(2, '0')}
          </p>
          <button
            onClick={prev}
            aria-label="Previous client"
            className="w-11 h-11 rounded-full border flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
            style={{ borderColor: LIME, color: LIME }}
          >
            <ArrowRight size={14} weight="bold" style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button
            onClick={next}
            aria-label="Next client"
            className="w-11 h-11 rounded-full border flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
            style={{ borderColor: LIME, color: LIME }}
          >
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>

        </div>

        {/* Card column — active result card (left on desktop) */}
        <div className="mt-0 md:order-1 md:max-w-[420px] md:justify-self-center w-full">
        {[RESULTS[index]].map(({ key, name, tag, before, after, story, highlight }) => {
          const isOpen = openStory === key;
          return (
            <div key={key} className="rounded-2xl overflow-hidden w-full" style={{ backgroundColor: '#1A1A1A' }}>

              {/* Before / After slider */}
              <BeforeAfterSlider before={before} after={after} />

              {/* Name + tag + toggle */}
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-black tracking-[0.1em] uppercase mb-1" style={{ color: OFF_WHITE }}>
                    {name}
                  </p>
                  <p className="text-[12px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-line' }}>
                    {tag}
                  </p>
                </div>
                {story.length > 0 && (
                <button
                  onClick={() => setOpenStory(isOpen ? null : key)}
                  className="shrink-0 flex items-center gap-2 border rounded-full px-4 py-2.5 min-h-[44px] text-[11px] font-black tracking-[0.14em] uppercase transition-opacity duration-200 hover:opacity-70"
                  style={{ borderColor: LIME, color: LIME }}
                  aria-expanded={isOpen}
                  aria-controls={`story-${key}`}
                >
                  {isOpen ? 'CLOSE' : "READ STORY"}
                  {isOpen ? <Minus size={10} weight="bold" /> : <Plus size={10} weight="bold" />}
                </button>
                )}
              </div>

              {/* Expandable story */}
              {isOpen && (
                <div className="px-5 pb-6" id={`story-${key}`}>
                  <div className="w-5 h-[2px] rounded-full mb-4" style={{ backgroundColor: LIME }} />
                  <p className="text-[28px] font-black leading-none mb-4" style={{ color: LIME }}>"</p>
                  {story.map((para, i) => (
                    <p key={i} className="text-[13px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
        <p className="text-[12px] mt-3" style={{ color: 'rgba(0,0,0,0.6)' }}>
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
  // Scroll to #hash target after mount (SPA renders after the browser's
  // native anchor-scroll pass, so we do it manually).
  React.useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div style={{ backgroundColor: BLACK }} className="min-h-screen overflow-x-hidden">
      <Hero />
      <CoachingCards />
      <WallOfSuccess />
      <FreeCTA />
    </div>
  );
}
