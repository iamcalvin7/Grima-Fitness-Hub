import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft as ChevronLeft, WhatsappLogo, Barbell as Dumbbell, Medal as Award, Clock } from '@phosphor-icons/react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string;
  whatsapp: string;        // international format, digits only
  bio: string;
  specialties: string[];
  experience: string;
  certifications: string[];
}

const TEAM: TeamMember[] = [
  {
    id: 'jan',
    name: 'Jan Tanti',
    role: 'Strength & Conditioning Coach',
    photo: 'team-jan.jpg',
    whatsapp: '35679000001',
    bio: 'Jan specialises in strength and conditioning, helping clients build serious muscle and athletic performance. Known for his no-nonsense programming and technical eye on the big lifts.',
    specialties: ['Strength Training', 'Powerlifting', 'Athletic Performance'],
    experience: '6+ years coaching',
    certifications: ['NSCA-CSCS', 'First Aid Certified'],
  },
  {
    id: 'amy',
    name: 'Amy Zahra',
    role: 'Fitness & Nutrition Coach',
    photo: 'team-amy.jpg',
    whatsapp: '35679000002',
    bio: 'Amy combines training with practical nutrition coaching to deliver sustainable transformations. Her sessions are high-energy and beginner-friendly — perfect if you\'re just getting started.',
    specialties: ['Fat Loss', 'Nutrition Coaching', 'HIIT & Circuits'],
    experience: '4+ years coaching',
    certifications: ['REPs Level 3', 'Precision Nutrition L1'],
  },
];

export function Team() {
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const base = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6 max-w-2xl">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/40 uppercase mb-1">Marcus Grima PT</p>
          <h1 className="text-2xl font-bold tracking-wider">THE TEAM</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {TEAM.map(member => (
            <button
              key={member.id}
              onClick={() => setSelected(member)}
              className="text-left group"
            >
              <div className="rounded-2xl overflow-hidden border border-white/10 aspect-square">
                <img
                  src={`${base}${member.photo}`}
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <h2 className="text-base font-bold tracking-wide mt-3">{member.name}</h2>
              <p className="text-xs text-foreground/45 mt-0.5">{member.role}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Profile sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center md:justify-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="w-full md:max-w-md bg-[#0D0D0D] rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Photo header */}
              <div className="relative h-64">
                <img
                  src={`${base}${selected.photo}`}
                  alt={selected.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <ChevronLeft size={18} weight="bold" />
                </button>
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-2xl font-black tracking-wide text-white">{selected.name}</h2>
                  <p className="text-xs font-bold tracking-[0.15em] text-primary uppercase mt-1">{selected.role}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm text-foreground/60 leading-relaxed">{selected.bio}</p>

                {/* Quick facts */}
                <div className="flex items-center gap-2 mt-5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/60 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                    <Clock size={11} weight="fill" className="text-primary" /> {selected.experience}
                  </span>
                </div>

                {/* Specialties */}
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mt-6 mb-2.5">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {selected.specialties.map(s => (
                    <span key={s} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75 bg-primary/10 border border-primary/25 rounded-full px-3 py-1.5">
                      <Dumbbell size={11} weight="fill" className="text-primary" /> {s}
                    </span>
                  ))}
                </div>

                {/* Certifications */}
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mt-6 mb-2.5">Certifications</p>
                <div className="flex flex-col gap-2">
                  {selected.certifications.map(c => (
                    <div key={c} className="flex items-center gap-2.5 text-xs text-white/60">
                      <Award size={13} weight="fill" className="text-primary shrink-0" /> {c}
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <a
                  href={`https://wa.me/${selected.whatsapp}?text=${encodeURIComponent(`Hi ${selected.name.split(' ')[0]}, I found you through the Marcus Grima PT app!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 mb-2 w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-primary text-black font-bold text-sm tracking-wide"
                >
                  <WhatsappLogo size={18} weight="fill" />
                  Contact on WhatsApp
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
