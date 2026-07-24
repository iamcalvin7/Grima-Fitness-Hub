import React from 'react';
import { motion } from 'framer-motion';
import { BadgePercent, Copy, Check } from 'lucide-react';

const OFFERS = [
  {
    id: 'fort-fitness',
    brand: 'Fort Fitness',
    title: '20% off Fort Fitness Membership',
    desc: 'Exclusive discount on any Fort Fitness membership plan for Marcus Grima PT clients.',
    discount: '20%',
    code: 'MGPT20',
    logo: 'offers/fort-fitness.jpg',
    logoBg: '#FFFFFF',
  },
  {
    id: 'protein-house',
    brand: 'Protein House',
    title: '10% off Protein House',
    desc: 'Save on supplements, shakes and meals across the full Protein House range.',
    discount: '10%',
    code: 'MGPT10',
    logo: 'offers/protein-house.jpg',
    logoBg: '#FFFFFF',
  },
  {
    id: '157-media',
    brand: '157 Media',
    title: '35% off 157 Media',
    desc: 'Discounted content creation and media packages from 157 Media.',
    discount: '35%',
    code: 'MGPT35',
    logo: 'offers/157-media.png',
    logoBg: '#000000',
  },
];

export function Offers() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(c => (c === code ? null : c)), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/40 uppercase mb-1">Marcus Grima PT</p>
          <h1 className="text-2xl font-bold tracking-wider">MEMBERS OFFERS</h1>
          <p className="text-xs text-foreground/40 mt-2">Exclusive partner discounts for members.</p>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="flex flex-col gap-4">
          {OFFERS.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-[#111111] border border-white/6 rounded-2xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-white/10"
                    style={{ background: offer.logoBg }}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}${offer.logo}`}
                      alt={offer.brand}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/40 uppercase">{offer.brand}</p>
                    <h2 className="text-base font-bold text-white mt-0.5 leading-snug">{offer.title}</h2>
                    <p className="text-xs text-foreground/45 mt-1 leading-relaxed">{offer.desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-black text-white leading-none">{offer.discount}</p>
                    <p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase mt-1">off</p>
                  </div>
                </div>

                {/* Code CTA */}
                <button
                  onClick={() => copyCode(offer.code)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-full border border-white/12 bg-white/4 hover:border-white/25 transition-colors"
                >
                  <BadgePercent size={13} className="text-white/50" />
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/80">
                    {copied === offer.code ? 'Copied!' : `Use code ${offer.code}`}
                  </span>
                  {copied === offer.code
                    ? <Check size={13} className="text-green-400" />
                    : <Copy size={13} className="text-white/40" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] text-white/20 font-medium mt-8">
          Show your code in store or apply it at checkout · Offers for active members only
        </p>
      </div>
    </div>
  );
}
