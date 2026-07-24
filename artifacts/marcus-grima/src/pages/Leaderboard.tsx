import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Zap, Footprints, Flame, Star } from 'lucide-react';
import { buildLeaderboard, getTodayPoints, countChallengesDone } from '@/data/challenges';

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('mg_profile') || 'null'); } catch { return null; }
}

const RANK_STYLES: Record<number, { icon: React.ReactNode; colour: string; bg: string }> = {
  1: { icon: <Trophy size={14} />, colour: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  2: { icon: <Trophy size={14} />, colour: '#C0C0C0', bg: 'rgba(192,192,192,0.10)' },
  3: { icon: <Trophy size={14} />, colour: '#CD7F32', bg: 'rgba(205,127,50,0.10)' },
};

export function Leaderboard() {
  const profile      = loadProfile();
  const firstName    = profile?.firstName ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1).toLowerCase() : 'You';
  const initials     = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || 'ME'
    : 'ME';

  const [done]       = useState(countChallengesDone);
  const todayPts     = getTodayPoints(done);
  const board        = buildLeaderboard(done, initials, firstName);
  const myRank       = board.findIndex(e => e.role === 'you') + 1;
  const maxPts       = board[0]?.weekPts ?? 1;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-5 md:px-8 pt-10 pb-8">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <p className="text-[10px] font-bold tracking-[0.3em] text-primary/60 uppercase mb-1">This Week</p>
          <h1 className="text-4xl font-black text-white tracking-tight">Leaderboard</h1>

          {/* User's rank card */}
          <div className="mt-6 flex items-center gap-5 bg-primary/10 border border-primary/30 rounded-2xl px-5 py-4"
            style={{ boxShadow: '0 0 32px rgba(139,69,217,0.18)' }}>
            <div className="flex flex-col items-center">
              <p className="text-[9px] font-bold tracking-widest text-primary/60 uppercase">Your Rank</p>
              <p className="text-5xl font-black text-primary leading-none mt-0.5">#{myRank}</p>
            </div>
            <div className="h-10 w-px bg-primary/20" />
            <div className="flex-1">
              <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase mb-2">Today's points</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white/60">
                  <Footprints size={11} className="text-primary/60" /> {todayPts.steps} steps
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white/60">
                  <Flame size={11} className="text-primary/60" /> {todayPts.calories} kcal
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Star size={11} /> +50 challenge
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">
                {todayPts.total} <span className="text-sm font-medium text-white/40">pts today</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Points breakdown ─────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 mb-6">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-3">How points are earned</p>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <Footprints size={16} />, label: '1 pt per 100 steps',  colour: '#8B45D9' },
            { icon: <Flame      size={16} />, label: '1 pt per 10 kcal',    colour: '#8B45D9' },
            { icon: <Star       size={16} />, label: '+50 daily challenge',  colour: '#FFD700' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-[#111111] border border-white/8 rounded-xl p-3 flex flex-col items-center text-center gap-2"
            >
              <span style={{ color: item.colour }}>{item.icon}</span>
              <p className="text-[9px] font-semibold text-white/40 leading-tight">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Ranked list ──────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 flex flex-col gap-2">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-1">Weekly standings</p>

        {board.map((entry, i) => {
          const rank    = i + 1;
          const isYou   = entry.role === 'you';
          const isMarcus= entry.role === 'trainer';
          const rs      = RANK_STYLES[rank];
          const pct     = Math.round((entry.weekPts / maxPts) * 100);

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border overflow-hidden
                ${isYou
                  ? 'bg-primary/10 border-primary/35'
                  : 'bg-[#111111] border-white/6'}`}
              style={isYou ? { boxShadow: '0 0 20px rgba(139,69,217,0.15)' } : undefined}
            >
              {/* Progress fill */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  background: isYou
                    ? `linear-gradient(90deg, #8B45D9 ${pct}%, transparent ${pct}%)`
                    : `linear-gradient(90deg, #ffffff ${pct}%, transparent ${pct}%)`,
                }}
              />

              {/* Rank */}
              <div className="w-7 shrink-0 flex justify-center">
                {rs ? (
                  <span style={{ color: rs.colour }}>{rs.icon}</span>
                ) : (
                  <span className="text-xs font-bold text-white/25">#{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: isYou
                    ? 'rgba(139,69,217,0.25)'
                    : isMarcus
                    ? 'rgba(255,215,0,0.12)'
                    : 'rgba(255,255,255,0.06)',
                  color: isYou ? '#A565F2' : isMarcus ? '#FFD700' : '#ffffff80',
                  border: isYou
                    ? '1.5px solid rgba(139,69,217,0.4)'
                    : isMarcus
                    ? '1.5px solid rgba(255,215,0,0.3)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                }}
              >
                {entry.avatar}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${isYou ? 'text-white' : 'text-white/80'} truncate`}>
                    {entry.name}
                  </span>
                  {isMarcus && (
                    <span className="flex items-center gap-0.5 text-[8px] font-black text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
                      <Crown size={8} /> TRAINER
                    </span>
                  )}
                  {isYou && (
                    <span className="text-[8px] font-black text-primary bg-primary/15 px-1.5 py-0.5 rounded">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 h-1 bg-white/6 rounded-full overflow-hidden max-w-[80px]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isYou ? '#8B45D9' : isMarcus ? '#FFD700' : '#ffffff30',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30 font-medium">+{entry.todayPts} today</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right shrink-0">
                <p className={`text-base font-black tabular-nums ${isYou ? 'text-primary' : 'text-white/80'}`}>
                  {entry.weekPts.toLocaleString()}
                </p>
                <p className="text-[9px] text-white/30 font-medium">pts</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-white/20 font-medium mt-8 px-5">
        Leaderboard resets every Monday · Steps & calories synced via Apple Health
      </p>
    </div>
  );
}
