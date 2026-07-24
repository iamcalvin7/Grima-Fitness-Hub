import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, Activity } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { BottomNav } from '@/components/BottomNav';
import type { Page } from '@/App';

const stepData = [
  { day: 'M', steps: 6000 },
  { day: 'T', steps: 8500 },
  { day: 'W', steps: 7200 },
  { day: 'T', steps: 8432 },
  { day: 'F', steps: 4000 },
  { day: 'S', steps: 2000 },
  { day: 'S', steps: 3000 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

interface HomeProps {
  setPage: (page: Page) => void;
}

export const Home = ({ setPage }: HomeProps) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 overflow-x-hidden">
      {/* Top Bar */}
      <header className="px-5 py-4 flex justify-between items-center sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
        <div className="w-8 h-8">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" fill="#C0C0C0" />
            <path d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" fill="#C0C0C0" />
          </svg>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary border border-white/10 flex items-center justify-center text-foreground font-bold tracking-wider text-sm shadow-inner shadow-black/50">
          MG
        </div>
      </header>

      <motion.main 
        className="px-5 pt-6 pb-12 flex flex-col gap-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Greeting Section */}
        <motion.section variants={itemVariants} className="space-y-1">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-[0.2em] uppercase">Good Morning,</h2>
          <h1 className="text-4xl font-bold tracking-wider text-foreground">MARCUS</h1>
          <div className="w-12 h-1 bg-primary mt-3" />
        </motion.section>

        {/* Your Next Session */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Your Next Session</h3>
          <div className="bg-[#111111] border-l-2 border-l-primary p-5 rounded-r-sm shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-primary mb-1">STRENGTH & CONDITIONING</p>
                <h4 className="text-lg font-bold">THURSDAY, 24 JULY · 07:00 AM</h4>
              </div>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider">CONFIRMED</span>
            </div>
            <div className="flex flex-col gap-2 text-sm text-foreground/80 font-semibold mb-6">
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-foreground/30 rounded-full" /> 60 MIN</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-foreground/30 rounded-full" /> MARCUS GRIMA STUDIO, LONDON</p>
            </div>
            <button
              onClick={() => setPage('sessions')}
              className="text-xs font-bold tracking-[0.2em] text-foreground hover:text-primary transition-colors flex items-center gap-2 uppercase"
            >
              View Details <span>→</span>
            </button>
          </div>
        </motion.section>

        {/* Your Metrics */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Your Metrics</h3>
            <p className="text-[10px] text-foreground/40 font-semibold tracking-wide uppercase mt-1">Connected via Apple Health</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111111] border border-white/5 p-4 rounded-sm flex flex-col items-center justify-center text-center">
              <Activity className="text-foreground/50 w-5 h-5 mb-2" />
              <p className="text-lg font-bold">8,432</p>
              <p className="text-[9px] font-bold tracking-widest text-primary uppercase mt-1">+12% vs yesterday</p>
            </div>
            <div className="bg-[#111111] border border-white/5 p-4 rounded-sm flex flex-col items-center justify-center text-center">
              <Flame className="text-foreground/50 w-5 h-5 mb-2" />
              <p className="text-lg font-bold">647 <span className="text-xs">kcal</span></p>
              <p className="text-[9px] font-bold tracking-widest text-foreground/40 uppercase mt-1">Active</p>
            </div>
            <div className="bg-[#111111] border border-white/5 p-4 rounded-sm flex flex-col items-center justify-center text-center">
              <Heart className="text-foreground/50 w-5 h-5 mb-2" />
              <p className="text-lg font-bold">72 <span className="text-xs">bpm</span></p>
              <p className="text-[9px] font-bold tracking-widest text-foreground/40 uppercase mt-1">Resting</p>
            </div>
          </div>

          <div className="bg-[#111111] border border-white/5 p-4 rounded-sm h-32 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepData}>
                <Bar dataKey="steps" radius={[2, 2, 0, 0]}>
                  {stepData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.day === 'T' && entry.steps === 8432 ? 'hsl(var(--primary))' : '#C0C0C0'} opacity={entry.day === 'T' && entry.steps === 8432 ? 1 : 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[10px] font-bold text-foreground/40 mt-2 px-1">
              <span>M</span><span>T</span><span>W</span><span className="text-primary">T</span><span>F</span><span>S</span><span>S</span>
            </div>
          </div>
        </motion.section>

        {/* Messages */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Messages</h3>
          <button onClick={() => setPage('messages')} className="w-full bg-[#111111] border border-white/5 p-4 rounded-sm flex gap-4 items-start text-left hover:border-primary/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold shrink-0">
              MG
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-bold text-sm">Marcus Grima</h4>
                <span className="text-[10px] text-foreground/40 font-semibold tracking-wider">2h ago</span>
              </div>
              <p className="text-xs text-foreground/70 font-medium leading-relaxed">
                Great work on yesterday's session. Make sure you're getting enough protein today — aim for at least 180g. See you Thursday 💪
              </p>
            </div>
            <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
          </button>
        </motion.section>

        {/* Book A Session */}
        <motion.section variants={itemVariants} className="relative overflow-hidden rounded-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-[#0A0A0A] z-0" />
          <div className="relative z-10 p-6 flex flex-col items-center text-center border border-primary/20">
            <h3 className="text-xl font-bold tracking-widest mb-1">BOOK YOUR NEXT SESSION</h3>
            <p className="text-xs font-semibold text-foreground/60 tracking-wider uppercase mb-6">Schedule time with Marcus</p>
            <button onClick={() => setPage('sessions')} className="w-full bg-primary hover:bg-primary/90 text-foreground py-4 font-bold tracking-[0.2em] uppercase transition-all relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(40,24,77,0.5)]">
              <span className="relative z-10">Book Now →</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>
          </div>
        </motion.section>

        {/* Last Session Recap */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Last Session Recap</h3>
          <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <p className="text-[10px] font-bold tracking-widest text-foreground/40 mb-1">TUESDAY, 22 JULY</p>
              <h4 className="text-lg font-bold tracking-wider mb-3">UPPER BODY POWER</h4>
              <div className="flex gap-4 text-xs font-semibold text-foreground/60 tracking-wider mb-4">
                <span>55 MIN</span>
                <span>•</span>
                <span>EXERCISES: 7</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['CHEST', 'SHOULDERS', 'TRICEPS'].map(part => (
                  <span key={part} className="px-2 py-1 border border-foreground/20 text-[10px] font-bold tracking-widest uppercase">
                    {part}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-2">
              {[
                { name: 'Bench Press', sets: '4 × 8 @ 80kg' },
                { name: 'Overhead Press', sets: '3 × 10 @ 50kg' },
                { name: 'Incline Dumbbell Press', sets: '3 × 12 @ 28kg' },
                { name: 'Lateral Raises', sets: '4 × 15 @ 10kg' },
                { name: 'Skull Crushers', sets: '3 × 12 @ 30kg' },
                { name: 'Cable Flyes', sets: '3 × 15 @ 15kg' },
                { name: 'Tricep Dips', sets: '3 × failure' },
              ].map((exercise, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-bold">{exercise.name}</p>
                    <p className="text-xs font-semibold text-foreground/40 tracking-wider">{exercise.sets}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </motion.main>

      <BottomNav activePage="home" onNavigate={setPage} />
    </div>
  );
};
