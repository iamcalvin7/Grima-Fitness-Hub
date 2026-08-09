import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  WhatsappLogo, Barbell, ChatsCircle, TrendUp, ForkKnife,
  ArrowRight, CheckCircle, Star, InstagramLogo, MapPin,
} from '@phosphor-icons/react';

/* ── Update this with Marcus's real WhatsApp number (include country code, no +) ── */
const WHATSAPP_NUMBER = '35699000000'; // e.g. 35699123456 for Malta (+356 99 123 456)
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Marcus, I'm interested in your coaching. Can we have a quick chat?"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

/* ── Fade-in helper ─────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── WhatsApp Button ─────────────────────────────────────────────────── */
function WAButton({ size = 'lg', label = 'Message Marcus on WhatsApp' }: {
  size?: 'sm' | 'lg'; label?: string;
}) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center justify-center gap-2.5 font-black tracking-wide
        bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#18a852]
        text-white transition-all duration-200
        ${size === 'lg'
          ? 'px-7 py-4 text-sm rounded-none w-full sm:w-auto'
          : 'px-5 py-3 text-xs rounded-none'
        }
      `}
    >
      <WhatsappLogo size={size === 'lg' ? 20 : 16} weight="fill" />
      {label}
      <ArrowRight size={size === 'lg' ? 16 : 13} weight="bold" />
    </a>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SECTIONS
───────────────────────────────────────────────────────────────────── */

function Hero({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="relative min-h-svh flex flex-col justify-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/hero.png"
          alt="Marcus Grima"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/70 via-transparent to-transparent" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Marcus Grima" className="h-7 w-auto" />
          <span className="text-[10px] font-black tracking-[0.25em] text-white/60 uppercase hidden sm:block">
            Personal Trainer
          </span>
        </div>
        <button
          onClick={onSignIn}
          className="text-[10px] font-black tracking-widest text-white/40 uppercase hover:text-white/70 transition-colors"
        >
          Member Sign In →
        </button>
      </div>

      {/* Hero content */}
      <div className="px-5 pb-10 pt-32 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-black tracking-[0.35em] text-white/50 uppercase mb-5">
            Malta · Online & In-Person
          </p>

          <h1 className="text-[clamp(2.6rem,8vw,4.5rem)] font-black tracking-tight text-white leading-[1.0] mb-6">
            RESULTS.<br />
            NOT<br />
            EXCUSES.
          </h1>

          <p className="text-base text-white/65 font-medium leading-relaxed mb-8 max-w-sm">
            Personalised coaching from Marcus Grima — built around your goals,
            your schedule, and your life. Online and in-person.
          </p>

          <WAButton />

          <p className="text-[10px] text-white/30 mt-4 tracking-wide">
            Free intro call · No commitment required
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const BENEFITS = [
  {
    icon: <Barbell size={22} weight="fill" />,
    title: 'Programme Built for You',
    desc: "Not a template. Not a PDF. A programme written specifically for your goals, fitness level, and equipment — updated as you progress.",
  },
  {
    icon: <ChatsCircle size={22} weight="fill" />,
    title: 'Direct Access to Marcus',
    desc: "Message Marcus anytime. Get real coaching advice, form checks, and adjustments — not automated replies or a support team.",
  },
  {
    icon: <TrendUp size={22} weight="fill" />,
    title: 'Accountability That Works',
    desc: "Weekly check-ins, progress tracking, and honest feedback. Marcus knows where you are and what you need to do next.",
  },
  {
    icon: <ForkKnife size={22} weight="fill" />,
    title: 'Nutrition Guidance',
    desc: "Simple, sustainable nutrition principles that fit your lifestyle. No extreme diets, no calorie obsession — just what actually works.",
  },
];

function Benefits() {
  return (
    <section className="px-5 py-16 max-w-2xl mx-auto">
      <FadeUp>
        <p className="text-[10px] font-black tracking-[0.35em] text-white/35 uppercase mb-4">
          What You Get
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 leading-tight">
          Everything you need.<br />Nothing you don't.
        </h2>
        <p className="text-sm text-white/45 mb-10 max-w-md leading-relaxed">
          Working with Marcus means having a coach in your corner every single day — not just during sessions.
        </p>
      </FadeUp>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BENEFITS.map((b, i) => (
          <FadeUp key={b.title} delay={i * 0.08}>
            <div className="border border-white/8 bg-white/[0.025] p-5 hover:border-white/15 transition-colors h-full">
              <div className="text-white mb-3">{b.icon}</div>
              <p className="text-sm font-black text-white tracking-wide mb-2">{b.title}</p>
              <p className="text-xs text-white/50 leading-relaxed">{b.desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Send Marcus a message',
    desc: "Tap the WhatsApp button and introduce yourself. Tell him your goals in a few sentences — no CV required.",
  },
  {
    n: '02',
    title: 'Free 15-minute call',
    desc: "Marcus gets on a quick call to understand where you are, what you want, and whether working together makes sense.",
  },
  {
    n: '03',
    title: 'Your programme starts',
    desc: "Week one begins. Your personalised programme is waiting in the app, and Marcus is available from day one.",
  },
];

function HowItWorks() {
  return (
    <section className="px-5 py-16 border-t border-white/5">
      <div className="max-w-2xl mx-auto">
        <FadeUp>
          <p className="text-[10px] font-black tracking-[0.35em] text-white/35 uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-10 leading-tight">
            Three steps to starting.
          </h2>
        </FadeUp>

        <div className="space-y-0 border border-white/8 bg-white/[0.015] divide-y divide-white/5">
          {STEPS.map((s, i) => (
            <FadeUp key={s.n} delay={i * 0.1}>
              <div className="flex items-start gap-5 p-5">
                <span className="text-[2rem] font-black text-white/10 leading-none shrink-0 w-10 text-right">
                  {s.n}
                </span>
                <div className="pt-1">
                  <p className="text-sm font-black text-white tracking-wide mb-1.5">{s.title}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

const PROOF_POINTS = [
  'Online & in-person coaching options',
  'Clients across Malta and internationally',
  'Specialises in body recomposition and athletic performance',
  'Nutrition coaching included with all programmes',
];

function SocialProof() {
  return (
    <section className="px-5 py-16 border-t border-white/5">
      <div className="max-w-2xl mx-auto">
        <FadeUp>
          <div className="flex items-center gap-3 mb-8">
            <img src="/marcus.png" alt="Marcus Grima" className="w-14 h-14 object-cover object-top rounded-full border border-white/10" />
            <div>
              <p className="text-sm font-black text-white">Marcus Grima</p>
              <p className="text-xs text-white/40">Personal Trainer · Malta</p>
            </div>
          </div>

          <blockquote className="text-lg md:text-xl font-semibold text-white/80 leading-relaxed mb-6 italic border-l-2 border-white/20 pl-5">
            "I don't believe in one-size-fits-all programmes. Every client I work with gets my full attention and a plan that's built around their actual life — not someone else's."
          </blockquote>

          <div className="flex flex-wrap gap-3 mt-6">
            {PROOF_POINTS.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <CheckCircle size={13} weight="fill" className="text-white/40 shrink-0" />
                <span className="text-xs text-white/40">{p}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 py-16 border-t border-white/5 bg-white/[0.015]">
      <div className="max-w-2xl mx-auto text-center">
        <FadeUp>
          <div className="flex justify-center gap-0.5 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} weight="fill" className="text-yellow-400" />
            ))}
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            Ready to start?
          </h2>
          <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto leading-relaxed">
            Send Marcus a message today. The first conversation is free and there's no obligation.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <WAButton label="Start on WhatsApp" />
          </div>

          <p className="text-[10px] text-white/25 mt-5 tracking-widest uppercase">
            Typically replies within a few hours
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer({ onSignIn }: { onSignIn: () => void }) {
  return (
    <footer className="border-t border-white/5 px-5 py-8">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Marcus Grima" className="h-5 w-auto opacity-40" />
          <span className="text-[10px] text-white/25 tracking-widest uppercase">
            Marcus Grima PT · Malta
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href={`https://instagram.com/marcusgrimapt`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <InstagramLogo size={16} weight="fill" />
          </a>
          <button
            onClick={onSignIn}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors tracking-widest uppercase"
          >
            Member Sign In
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────── */
export function ClientLanding({ onSignIn }: { onSignIn: () => void }) {
  // Sticky WhatsApp bar visibility — hide when hero CTA is in view
  const heroCTARef = useRef<HTMLDivElement>(null);
  const heroCTAInView = useInView(heroCTARef, { margin: '0px' });

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white overflow-x-hidden">
      <Hero onSignIn={onSignIn} />

      <div ref={heroCTARef} className="h-0" />

      <Benefits />
      <HowItWorks />
      <SocialProof />
      <FinalCTA />
      <Footer onSignIn={onSignIn} />

      {/* Sticky WhatsApp bar — shows once hero CTA scrolls out of view */}
      {!heroCTAInView && (
        <motion.div
          className="fixed bottom-0 inset-x-0 z-50 p-3 bg-[#0A0A0A]/95 backdrop-blur-sm border-t border-white/8 sm:hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <WAButton label="Message Marcus" />
        </motion.div>
      )}
    </div>
  );
}
