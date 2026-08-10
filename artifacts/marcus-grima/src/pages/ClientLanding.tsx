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
            <span className="md:whitespace-nowrap">YOUR GOALS.</span><br />
            <span className="md:whitespace-nowrap">MY GUIDANCE.</span>
          </h1>

          <p className="text-white/70 text-[13px] leading-relaxed mb-6 max-w-[260px]">
            Personalised coaching to help you become stronger,
            healthier &amp; happier.
          </p>

          {/* Pillars — lime icons */}
          <div className="flex flex-nowrap gap-x-1.5 md:gap-x-4 mb-7">
            {PILLARS.map(({ img, label }) => (
              <div key={label} className="flex items-center gap-1 md:gap-2 shrink-0">
                <span
                  className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: OFF_WHITE }}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain"
                    draggable={false}
                  />
                </span>
                <span className="text-[min(11px,2.9vw)] md:text-[12px] font-semibold whitespace-nowrap" style={{ color: LIME }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left">
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
            src="/mission.jpg"
            alt="Marcus Grima running along the Maltese coast"
            className="w-full h-full object-cover aspect-[4/5]"
            draggable={false}
          />
        </div>
      </div>

      </div>

    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ABOUT ME
══════════════════════════════════════════════════════════════════════════ */
type AboutCardData = {
  key: string; num: string; title: string; teaser: string;
  heading?: string;
  body?: string[];
  values?: { name: string; line: string }[];
};

const ABOUT_CARDS: AboutCardData[] = [
  {
    key: 'story', num: '01', title: 'MY STORY',
    teaser: 'From discovering my passion for coaching to the science of transformation.',
    body: [
      'For most of my life, sport has been at the centre of everything I do. I spent years playing football professionally in Malta, where I learned about discipline, sacrifice, resilience and what it means to keep showing up when nobody cares how you feel.',
      'But eventually I realised football was only one chapter.',
      'What fascinated me even more was everything behind performance: the training, mindset, habits, psychology and the person you have to become to achieve something difficult.',
      'That obsession led me to coaching.',
    ],
  },
  {
    key: 'philosophy', num: '02', title: 'MY PHILOSOPHY',
    teaser: 'Why fitness is a vehicle for something much bigger than the physical results.',
    heading: 'FITNESS IS THE START. NOT THE FINISH.',
    body: [
      'Getting stronger matters. Getting leaner matters. Improving your health matters.',
      'But I believe the greatest transformation happens underneath.',
      'Training teaches you to keep promises to yourself. To voluntarily do difficult things. To understand that discomfort isn\u2019t always a reason to stop.',
      'Eventually, the person you become while chasing the physical goal becomes more valuable than the goal itself.',
      'I don\u2019t just want to help you lose 10kg. I want you to become the person who knows how they did it, and knows they can do difficult things again.',
    ],
  },
  {
    key: 'practice', num: '03', title: 'I PRACTICE WHAT I TEACH',
    teaser: 'Athlete first. I test my limits so I can better coach yours.',
    heading: 'I\u2019M NOT INTERESTED IN COACHING FROM THE SIDELINES.',
    body: [
      'My own journey didn\u2019t stop with football.',
      'It evolved into running, ultramarathons, HYROX, swimming, cycling and triathlon training. I deliberately pursue challenges that test what I\u2019m capable of physically and mentally.',
      'Not because I expect everyone I coach to do the same.',
      'Because putting myself through difficult things teaches me lessons I can bring back to the people I coach.',
      'I\u2019m still testing my limits too.',
    ],
  },
  {
    key: 'student', num: '04', title: 'ALWAYS A STUDENT',
    teaser: 'I\u2019m obsessed with learning and constantly evolving as a coach and human.',
    heading: 'THE MORE I LEARN, THE MORE I REALISE THERE IS TO LEARN.',
    body: [
      'I\u2019m fascinated by performance, psychology, physiology, nutrition, longevity, behaviour change, business, philosophy and spirituality.',
      'I learn from coaches, scientists, athletes, entrepreneurs and thinkers from completely different worlds.',
      'Because becoming a better coach means never assuming I\u2019ve figured everything out.',
      'Stay curious. Keep evolving.',
    ],
  },
  {
    key: 'coach', num: '05', title: 'HOW I COACH',
    teaser: 'More than programmes. It\u2019s about structure, accountability, education and real change.',
    heading: 'YOU DON\u2019T NEED MORE INFORMATION. YOU NEED A WAY TO LIVE IT.',
    body: [
      'Most people already know they should move more, eat better, sleep properly and exercise consistently.',
      'Knowing isn\u2019t usually the problem. Doing it consistently is.',
      'That\u2019s where coaching comes in.',
      'Structure. Accountability. Education. Feedback.',
      'Sometimes I\u2019ll push you. Sometimes the plan needs to change. The goal is understanding the difference.',
      'And I\u2019m not trying to make you dependent on a coach forever.',
      'My job is to give you the knowledge, confidence, discipline and self-awareness to eventually own your journey.',
    ],
  },
  {
    key: 'perfection', num: '06', title: 'NO PERFECTION REQUIRED',
    teaser: 'Real change isn\u2019t linear. It starts with self-awareness and identity.',
    heading: 'YOU DON\u2019T NEED TO HAVE IT ALL TOGETHER.',
    body: [
      'I\u2019ve had periods where I\u2019ve felt incredibly disciplined. I\u2019ve also fallen into habits I knew were working against me.',
      'It\u2019s taught me that knowing what to do and consistently doing it are completely different skills.',
      'Real change starts with understanding yourself: your habits, triggers, environment and behaviour.',
      'So instead of only asking: \u201CWhat do I need to do?\u201D',
      'I want you to start asking: \u201CWho do I need to become?\u201D',
    ],
  },
  {
    key: 'standfor', num: '07', title: 'WHAT I STAND FOR',
    teaser: 'The principles I live by and build everything on.',
    heading: 'THE THINGS THAT DON\u2019T CHANGE.',
    values: [
      { name: 'INTEGRITY',     line: 'Do what you said you would do.' },
      { name: 'GROWTH',        line: 'Stay curious. Never assume you\u2019ve arrived.' },
      { name: 'DISCIPLINE',    line: 'Your feelings matter. They can\u2019t always be in charge.' },
      { name: 'KINDNESS',      line: 'Ambition means little if you become a worse person along the way.' },
      { name: 'RELATIONSHIPS', line: 'Success means nothing without people to share it with.' },
      { name: 'FAITH',         line: 'There are things greater than achievement, status and money.' },
      { name: 'SERVICE',       line: 'Grow yourself. Then help someone else grow.' },
    ],
  },
  {
    key: 'building', num: '08', title: 'WHAT I\u2019M BUILDING',
    teaser: 'An ecosystem to help thousands of people transform their lives.',
    heading: 'THIS IS BIGGER THAN PERSONAL TRAINING.',
    body: [
      'My ambition is to build something that gives you everything you need to become stronger, healthier and happier.',
      'Training. Nutrition. Accountability. Education. Performance. Mindset. Community.',
      'Not simply somewhere to log workouts, but somewhere that helps you understand what to do, why you\u2019re doing it and who you\u2019re becoming in the process.',
      'The mission is simple: help as many people as possible take ownership of their journey.',
    ],
  },
  {
    key: 'journey', num: '09', title: 'I\u2019M ON THE JOURNEY TOO',
    teaser: 'I\u2019m still learning, growing and pushing for more. Let\u2019s build your best together.',
    body: [
      'I want to become a better coach. A better athlete. A better partner. A better son. A better friend. A better leader. A better human being.',
      'I don\u2019t have everything figured out.',
      'I\u2019m still learning, experimenting, failing, adjusting and growing.',
      'I don\u2019t expect you to have everything figured out either.',
    ],
  },
];

function AboutCard({ num, title, teaser, heading, body, values, isOpen, onToggle, cardKey }: {
  num: string; title: string; teaser: string;
  heading?: string; body?: string[]; values?: { name: string; line: string }[];
  isOpen: boolean; onToggle: () => void; cardKey: string;
}) {
  return (
    <div className="rounded-2xl" style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between px-5 py-4 text-left min-h-[44px] gap-3"
        aria-expanded={isOpen}
        aria-controls={`about-${cardKey}`}
      >
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] mb-1.5" style={{ color: LIME }}>{num}</p>
          <p className="text-[13px] font-black tracking-[0.1em] uppercase mb-1.5" style={{ color: OFF_WHITE }}>{title}</p>
          <p className="text-[12px] leading-relaxed text-white/50">{teaser}</p>
        </div>
        <span className="mt-1 shrink-0">
          {isOpen
            ? <Minus size={14} weight="bold" className="text-white/40" />
            : <Plus  size={14} weight="bold" className="text-white/40" />
          }
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5" id={`about-${cardKey}`}>
          <div className="w-5 h-[2px] rounded-full mb-3" style={{ backgroundColor: LIME }} />
          {heading && (
            <p className="text-[13px] font-black tracking-[0.06em] uppercase mb-3" style={{ color: OFF_WHITE }}>{heading}</p>
          )}
          {body && (
            <div className="space-y-2.5">
              {body.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-white/70">{p}</p>
              ))}
            </div>
          )}
          {values && (
            <div className="space-y-3">
              {values.map((v) => (
                <div key={v.name}>
                  <p className="text-[12px] font-black tracking-[0.12em] uppercase" style={{ color: LIME }}>{v.name}</p>
                  <p className="text-[13px] leading-relaxed text-white/70">{v.line}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AboutMe() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);
  const left  = ABOUT_CARDS.slice(0, 4);
  const right = ABOUT_CARDS.slice(4, 8);
  const last  = ABOUT_CARDS[8];

  return (
    <section id="about" style={{ backgroundColor: BLACK }} className="px-5 pt-14 md:pt-20 pb-12 md:pb-16 md:px-10">
      <div className="max-w-xl md:max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-[10px] font-black tracking-[0.32em] uppercase mb-3" style={{ color: LIME }}>
            About Me
          </p>
          <h2
            className="font-black tracking-tight leading-[0.95] uppercase mb-4"
            style={{ fontSize: 'clamp(2.2rem,7vw,4.5rem)', color: OFF_WHITE }}
          >
            I'm Marcus Grima.
          </h2>
          <p className="text-[11px] md:text-[13px] font-bold tracking-[0.18em] uppercase text-white/60 mb-5">
            Coach. Athlete. Entrepreneur. Obsessed with human potential.
          </p>
          <p className="text-[13px] md:text-[14px] leading-relaxed text-white/60 max-w-sm mx-auto">
            Everything I do is driven by one mission: to help you become the strongest,
            healthiest and happiest version of yourself.
          </p>
        </div>

        {/* ── MOBILE: infographic layout ─────────────────────────────────── */}
        <div className="md:hidden">
          {/* Photo (left) + card labels (right) side-by-side */}
          <div className="relative flex items-stretch">
            {/* Marcus — left column */}
            <div className="relative w-[46%] shrink-0">
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: LIME }}
              />
              <img
                src="/marcus-cutout-real.png"
                alt="Marcus Grima"
                className="relative w-full h-full object-cover object-top"
                draggable={false}
              />
            </div>

            {/* Card labels — right column, spread to match figure height */}
            <div className="flex-1 flex flex-col justify-around py-[6%] pl-0">
              {ABOUT_CARDS.slice(0, 7).map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className="flex items-center gap-2 text-left w-full py-1"
                  aria-expanded={openKey === c.key}
                >
                  {/* connector dot + line */}
                  <span className="shrink-0 flex items-center gap-1">
                    <span className="block w-[7px] h-[7px] rounded-full" style={{ backgroundColor: LIME }} />
                    <span className="block w-4 h-px" style={{ backgroundColor: LIME }} />
                  </span>
                  {/* number + title */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold tracking-[0.22em]" style={{ color: LIME }}>{c.num}</span>
                    <span className="block text-[11px] font-black tracking-[0.04em] uppercase leading-tight" style={{ color: OFF_WHITE }}>{c.title}</span>
                  </span>
                  {/* circle + button */}
                  <span
                    className="shrink-0 w-[22px] h-[22px] rounded-full border flex items-center justify-center"
                    style={{ borderColor: openKey === c.key ? LIME : 'rgba(202,255,51,0.45)' }}
                  >
                    {openKey === c.key
                      ? <Minus size={9} weight="bold" style={{ color: LIME }} />
                      : <Plus  size={9} weight="bold" style={{ color: LIME }} />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Expanded content for cards 01-07 — appears below infographic */}
          {ABOUT_CARDS.slice(0, 7).map((c) => openKey === c.key && (
            <div key={c.key} className="mt-3 px-4 py-4 rounded-2xl" style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}>
              <div className="w-5 h-[2px] rounded-full mb-3" style={{ backgroundColor: LIME }} />
              {c.heading && (
                <p className="text-[12px] font-black tracking-[0.06em] uppercase mb-3" style={{ color: OFF_WHITE }}>{c.heading}</p>
              )}
              {c.body && (
                <div className="space-y-2">
                  {c.body.map((p, i) => <p key={i} className="text-[13px] leading-relaxed text-white/70">{p}</p>)}
                </div>
              )}
              {c.values && (
                <div className="space-y-2.5">
                  {c.values.map((v) => (
                    <div key={v.name}>
                      <p className="text-[11px] font-black tracking-[0.12em] uppercase" style={{ color: LIME }}>{v.name}</p>
                      <p className="text-[13px] leading-relaxed text-white/70">{v.line}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Cards 08 + 09 full-width below */}
          <div className="flex flex-col gap-2 mt-3">
            {ABOUT_CARDS.slice(7).map((c) => (
              <AboutCard key={c.key} cardKey={c.key} num={c.num} title={c.title} teaser={c.teaser}
                heading={c.heading} body={c.body} values={c.values}
                isOpen={openKey === c.key} onToggle={() => toggle(c.key)} />
            ))}
          </div>
        </div>

        {/* ── DESKTOP: cards | photo | cards ────────────────────────────── */}
        <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:items-center">

          {/* Centre visual */}
          <div className="md:order-2 md:px-2">
            <div className="relative mx-auto md:max-w-[300px]">
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-2/3 blur-3xl opacity-25"
                style={{ backgroundColor: LIME }}
              />
              <img
                src="/marcus-cutout-real.png"
                alt="Marcus Grima"
                className="relative w-full drop-shadow-2xl"
                draggable={false}
              />
            </div>
          </div>

          {/* Left cards */}
          <div className="flex flex-col gap-3 md:order-1">
            {left.map((c) => (
              <AboutCard key={c.key} cardKey={c.key} num={c.num} title={c.title} teaser={c.teaser}
                heading={c.heading} body={c.body} values={c.values}
                isOpen={openKey === c.key} onToggle={() => toggle(c.key)} />
            ))}
          </div>

          {/* Right cards */}
          <div className="flex flex-col gap-3 md:order-3">
            {right.map((c) => (
              <AboutCard key={c.key} cardKey={c.key} num={c.num} title={c.title} teaser={c.teaser}
                heading={c.heading} body={c.body} values={c.values}
                isOpen={openKey === c.key} onToggle={() => toggle(c.key)} />
            ))}
          </div>
        </div>

        {/* Full-width 09 card — desktop only (mobile already includes it above) */}
        <div className="hidden md:block mt-6">
          <AboutCard cardKey={last.key} num={last.num} title={last.title} teaser={last.teaser}
            heading={last.heading} body={last.body} values={last.values}
            isOpen={openKey === last.key} onToggle={() => toggle(last.key)} />
        </div>

        {/* Closing quote */}
        <div className="text-center mt-10 md:mt-14">
          <p className="text-[11px] md:text-[12px] font-bold tracking-[0.22em] uppercase leading-loose text-white/70">
            You don't need to be perfect.<br />
            You don't need to feel ready.<br />
            You just need to be willing to start.
          </p>
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
  {
    key:    'keith',
    name:   'KEITH ABELA',
    tag:    'New Business Development, Marketing & Customer Relationship Management — Carmelo Abela',
    before: '/keith-before.jpg',
    after:  '/keith-after.jpg',
    story: [
      'This is what dedication and consistency look like! \u{1F4A5}',
      'Massive shoutout to Keith Abela for transforming not just his body, but his entire mindset in just 3 months.',
      'He\u2019s swapped old habits for better ones, prioritized his health, and shifted his identity toward a lifestyle that\u2019s here to stay.',
      'As I always tell my clients: The real goal is to live a long, healthy life \u2014 the results are just the by-product.',
      'Here\u2019s to setting big goals, smashing them, and building a strong community along the way!',
    ],
    highlight: 'Keith Abela did.',
  },
  {
    key:    'mark',
    name:   'MARK CAMILLERI',
    tag:    'Company Director — Still Malta',
    before: '/mark-before.jpg',
    after:  '/mark-after.jpg',
    story: [],
    highlight: 'Mark did.',
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
          <span className="md:whitespace-nowrap">Real people.</span><br />
          <span className="md:whitespace-nowrap">Unreal progress.</span>
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
      <div className="max-w-xl md:max-w-5xl md:mx-auto md:grid md:grid-cols-[1fr_auto] md:gap-12 md:items-center">
        <p
          className="font-black tracking-tight leading-[0.92] mb-6 md:mb-0 md:max-w-xl"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 3.2rem)', color: BLACK }}
        >
          LET'S START WITH A FREE CONVERSATION ABOUT YOUR GOALS.{' '}
          <span style={{ color: 'rgba(0,0,0,0.38)' }}>NO COMMITMENT REQUIRED.</span>
        </p>
        <div className="md:text-center">
        <div className="flex items-center md:justify-center gap-3">
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
        <a
          href="https://www.instagram.com/marcusgrima22/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Marcus Grima on Instagram"
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-opacity duration-200 hover:opacity-80"
          style={{ backgroundColor: BLACK }}
        >
          <InstagramLogo size={22} weight="regular" style={{ color: LIME }} />
        </a>
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'rgba(0,0,0,0.6)' }}>
          Click to speak on WhatsApp
        </p>
        </div>
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
      <AboutMe />
      <WallOfSuccess />
      <FreeCTA />
    </div>
  );
}
