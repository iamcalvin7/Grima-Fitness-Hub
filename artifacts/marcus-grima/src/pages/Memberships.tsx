import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Barbell } from '@phosphor-icons/react';
import type { Page } from '@/App';

interface MembershipsProps {
  setPage: (page: Page) => void;
}

interface Package {
  id: string;
  sessions: number;
  price: number;
  perSession: number;
  note: string;
  tag?: string;
}

const PACKAGES: Package[] = [
  { id: 'p3',  sessions: 3,  price: 120, perSession: 40, note: 'Perfect to get started' },
  { id: 'p5',  sessions: 5,  price: 185, perSession: 37, note: 'Build real momentum', tag: 'MOST POPULAR' },
  { id: 'p10', sessions: 10, price: 340, perSession: 34, note: 'Best value — full commitment', tag: 'BEST VALUE' },
];

export const Memberships = ({ setPage }: MembershipsProps) => {
  const [selected, setSelected] = useState<string>('p5');
  const pkg = PACKAGES.find(p => p.id === selected);

  return (
    <div className="pb-28 md:pb-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="px-5 md:px-8 pt-6 pb-5">
        <p className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-white/35">Memberships</p>
        <h1 className="text-2xl font-black text-white mt-1">Session Packages</h1>
        <p className="text-xs text-white/40 mt-1.5">
          Buy sessions in bundles and save. Use them any time with Marcus.
        </p>
      </header>

      {/* ── Packages ───────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGES.map((p, i) => {
          const active = selected === p.id;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelected(p.id)}
              aria-pressed={active}
              className="relative text-left rounded-2xl p-5 transition-colors duration-150"
              style={{
                background: active ? 'rgba(74,222,128,0.06)' : '#111111',
                border: active
                  ? '1px solid rgba(74,222,128,0.45)'
                  : '1px solid rgba(200,200,200,0.18)',
              }}
            >
              {p.tag && (
                <span
                  className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[8px] font-extrabold tracking-[0.18em] uppercase ${
                    active ? 'bg-green-400 text-black' : 'bg-white/90 text-black'
                  }`}
                >
                  {p.tag}
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,200,200,0.22)' }}>
                  <Barbell size={18} weight="fill" className={active ? 'text-green-400' : 'text-white/50'} />
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                    active ? 'bg-green-400 border-green-400' : 'border-white/20'
                  }`}
                >
                  {active && <Check size={12} weight="bold" className="text-black" />}
                </div>
              </div>

              <p className="text-3xl font-black text-white mt-4">
                {p.sessions}
                <span className="text-sm font-bold text-white/40 ml-1.5">sessions</span>
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">{p.note}</p>

              <div className="h-px my-4" style={{ background: 'rgba(200,200,200,0.1)' }} />

              <div className="flex items-baseline justify-between">
                <p className="text-xl font-black text-white">€{p.price}</p>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
                  €{p.perSession} / session
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Purchase CTA ───────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 mt-6 md:max-w-sm">
        <button
          onClick={() => setPage('sessions')}
          className="w-full py-3.5 rounded-full text-sm font-extrabold tracking-wide text-black bg-green-400 hover:bg-green-300 transition-colors"
        >
          Buy {pkg?.sessions} Sessions · €{pkg?.price}
        </button>
        <p className="text-center text-[10px] text-white/30 mt-3">
          Payment is settled directly with Marcus. Sessions never expire.
        </p>
      </div>
    </div>
  );
};

export default Memberships;
