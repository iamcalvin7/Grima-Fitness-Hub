import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Footprints, Fire, Star } from '@phosphor-icons/react';
import { buildLeaderboard, getTodayPoints, countChallengesDone } from '@/data/challenges';

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('mg_profile') || 'null'); } catch { return null; }
}

const RANK_STYLES: Record<number, { icon: React.ReactNode; colour: string; bg: string }> = {
  1: { icon: <Trophy size={14} weight="fill" />, colour: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  2: { icon: <Trophy size={14} weight="fill" />, colour: '#C0C0C0', bg: 'rgba(192,192,192,0.10)' },
  3: { icon: <Trophy size={14} weight="fill" />, colour: '#CD7F32', bg: 'rgba(205,127,50,0.10)' },
};

/* Profile photos per player */
const PHOTOS: Record<string, string> = {
  marcus: `${import.meta.env.BASE_URL}marcus.png`,
  jake:   'https://i.pravatar.cc/128?img=12',
  sophie: 'https://i.pravatar.cc/128?img=47',
  tom:    'https://i.pravatar.cc/128?img=53',
  emma:   'https://i.pravatar.cc/128?img=44',
  chris:  'https://i.pravatar.cc/128?img=59',
};

function Avatar({ entry, size, ring }: { entry: { id: string; avatar: string; role: string }; size: number; ring: string }) {
  const photo = PHOTOS[entry.id];
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 bg-white/8"
      style={{ width: size, height: size, border: ring, fontSize: size * 0.32, color: '#fff' }}
    >
      {photo
        ? <img src={photo} alt={entry.id} className="w-full h-full object-cover" loading="lazy" />
        : entry.avatar}
    </div>
  );
}

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
            style={{ boxShadow: '0 0 32px rgba(229,229,229,0.14)' }}>
            <div className="flex flex-col items-center">
              <p className="text-[9px] font-bold tracking-widest text-primary/60 uppercase">Your Rank</p>
              <p className="text-5xl font-black text-primary leading-none mt-0.5">#{myRank}</p>
            </div>
            <div className="h-10 w-px bg-primary/20" />
            <div className="flex-1">
              <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase mb-2">Today's points</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white/60">
                  <Footprints size={11} weight="fill" className="text-primary/60" /> {todayPts.steps} steps
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-white/60">
                  <Fire size={11} weight="fill" className="text-primary/60" /> {todayPts.calories} kcal
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Star size={11} weight="fill" /> +50 challenge
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
            { icon: <Footprints size={16} weight="fill" />, label: '1 pt per 100 steps',  colour: '#E5E5E5' },
            { icon: <Fire      size={16} weight="fill" />, label: '1 pt per 10 kcal',    colour: '#E5E5E5' },
            { icon: <Star       size={16} weight="fill" />, label: '+50 daily challenge',  colour: '#FFD700' },
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

      {/* ── Podium: top 3 ────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 mb-8">
        <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-5">Weekly standings</p>
        <div className="flex items-end justify-center gap-6">
          {[board[1], board[0], board[2]].filter(Boolean).map(entry => {
            const rank = board.indexOf(entry) + 1;
            const first = rank === 1;
            const rs = RANK_STYLES[rank];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rank * 0.08 }}
                className="flex flex-col items-center text-center"
              >
                {first && <Crown size={18} weight="fill" className="text-[#FFD700] mb-1.5" />}
                <div className="relative">
                  <Avatar entry={entry} size={first ? 84 : 64} ring={`2.5px solid ${rs.colour}`} />
                  <span
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black"
                    style={{ background: rs.colour }}
                  >
                    {rank}
                  </span>
                </div>
                <p className={`font-bold text-white mt-4 ${first ? 'text-sm' : 'text-xs'} max-w-[90px] truncate`}>
                  {entry.name}
                </p>
                <p className="text-[10px] font-semibold text-white/40 tabular-nums mt-0.5">
                  {entry.weekPts.toLocaleString()} pts
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Ranked list (4th onwards) ────────────────────────────────────── */}
      <div className="px-5 md:px-8 flex flex-col gap-2">
        {board.slice(3).map((entry, i) => {
          const rank    = i + 4;
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
              style={isYou ? { boxShadow: '0 0 20px rgba(229,229,229,0.12)' } : undefined}
            >
              {/* Progress fill */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  background: isYou
                    ? `linear-gradient(90deg, rgba(229,229,229,0.9) ${pct}%, transparent ${pct}%)`
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
              <Avatar
                entry={entry}
                size={36}
                ring={isYou
                  ? '1.5px solid rgba(229,229,229,0.45)'
                  : isMarcus
                  ? '1.5px solid rgba(255,215,0,0.3)'
                  : '1.5px solid rgba(255,255,255,0.08)'}
              />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${isYou ? 'text-white' : 'text-white/80'} truncate`}>
                    {entry.name}
                  </span>
                  {isMarcus && (
                    <span className="flex items-center gap-0.5 text-[8px] font-black text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
                      <Crown size={8} weight="fill" /> TRAINER
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
                        background: isYou ? '#E5E5E5' : isMarcus ? '#FFD700' : '#ffffff30',
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
