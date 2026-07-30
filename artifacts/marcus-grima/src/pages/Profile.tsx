import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Barbell, TrendUp, CaretRight,
  Bell, ShieldCheck, Question, SignOut, PencilSimple, Medal,
  DeviceMobile,
} from '@phosphor-icons/react';
import type { Page } from '@/App';
import { useAuth, type ClientProfile } from '@/auth/AuthContext';

interface ProfileProps {
  setPage:  (page: Page) => void;
  onLogout: () => void;
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'MG';
}

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return '—';
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '—';
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years > 0 && years < 120 ? `${years} yrs` : '—';
}

function memberSinceFrom(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/** Downscale the chosen image to a small square JPEG data URL. */
function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const SIZE = 256;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return; }
      // cover-crop to square
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const Profile = ({ setPage, onLogout }: ProfileProps) => {
  const { user, profile, updateProfile, createProfile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [firstDraft, setFirstDraft] = useState('');
  const [lastDraft, setLastDraft] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');

  /** PATCH when a profile exists, otherwise create one on the fly. */
  const persist = async (input: Parameters<typeof updateProfile>[0]) => {
    setSaveState('saving');
    setSaveError('');
    try {
      if (profile) await updateProfile(input);
      else await createProfile(input);
      setSaveState('saved');
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2000);
      return true;
    } catch {
      setSaveState('error');
      setSaveError('Could not save changes. Please try again.');
      return false;
    }
  };

  const startEditName = () => {
    setFirstDraft(profile?.firstName ?? user?.firstName ?? '');
    setLastDraft(profile?.lastName ?? user?.lastName ?? '');
    setSaveError('');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!firstDraft.trim() || !lastDraft.trim()) {
      setSaveError('Both names are required.');
      return;
    }
    const ok = await persist({ firstName: firstDraft.trim(), lastName: lastDraft.trim() });
    if (ok) setEditingName(false);
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeAvatar(file);
      await persist({ avatarUrl: dataUrl });
    } catch {
      setSaveState('error');
      setSaveError('Could not read that image.');
    }
  };

  // Derived display values (server profile → auth user → fallbacks)
  const p: ClientProfile | null = profile;
  const firstName = p?.firstName ?? user?.firstName ?? 'Marcus';
  const lastName  = p?.lastName ?? user?.lastName ?? '';
  const displayName   = `${firstName} ${lastName}`.trim();
  const initials      = getInitials(firstName, lastName);
  const avatar        = p?.avatarUrl ?? null;
  const goal          = p?.goal ?? '—';
  const experience    = p?.experienceLevel ?? '—';
  const activity      = p?.activityLevel ?? '—';
  const weight        = p?.weightKg != null ? `${p.weightKg} kg` : '—';
  const height        = p?.heightCm != null ? `${p.heightCm} cm` : '—';
  const age           = ageFromDob(p?.dateOfBirth);
  const memberSince   = memberSinceFrom(user?.createdAt);
  const emailHandle   = user?.email.split('@')[0] ?? 'member';

  const stats = [
    { label: 'Total Sessions', value: '47',  icon: <Barbell size={16} weight="fill" /> },
    { label: 'This Month',     value: '8',   icon: <TrendUp size={16} weight="fill" /> },
    { label: 'Day Streak',     value: '12',  icon: <Medal size={16} weight="fill" /> },
  ];

  const goals = [
    { label: 'Primary Goal',   value: goal },
    { label: 'Weekly Target',  value: '3–4 sessions' },
    { label: 'Experience',     value: experience },
    { label: 'Activity Level', value: activity },
  ];

  const personal = [
    { label: 'Age',          value: age },
    { label: 'Weight',       value: weight },
    { label: 'Height',       value: height },
    { label: 'Member Since', value: memberSince },
  ];

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">
      <header className="px-5 md:px-8 py-5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Profile</h1>
          <p className="text-xs text-foreground/40 font-semibold tracking-wider mt-0.5 hidden md:block">Your account & settings</p>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Saving…</span>}
          {saveState === 'saved'  && <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Saved</span>}
          {saveState === 'error'  && <span className="text-[10px] font-bold tracking-widest uppercase text-red-400">Error</span>}
          <button onClick={() => fileInputRef.current?.click()} className="text-foreground/40 hover:text-foreground transition-colors"><PencilSimple size={18} weight="fill" /></button>
        </div>
      </header>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />

      <motion.div className="px-5 md:px-8 pt-6 pb-8" variants={containerVariants} initial="hidden" animate="show">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">

          {/* LEFT */}
          <div className="flex flex-col gap-8">
            {/* Avatar & Name */}
            <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-5">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-bold text-foreground tracking-wider overflow-hidden">
                    {avatar
                      ? <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary border-2 border-[#0A0A0A] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PencilSimple size={11} weight="fill" className="text-primary-foreground" />
                  </div>
                </button>
                <div>
                  <h2 className="text-2xl font-bold tracking-[0.15em] uppercase mb-1">{displayName}</h2>
                  {editingName ? (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <input
                          autoFocus
                          value={firstDraft}
                          onChange={(e) => { setFirstDraft(e.target.value); setSaveError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          className="bg-[#1A1A1A] border border-white/15 focus:border-primary/50 outline-none px-2 py-1 text-xs font-bold tracking-widest text-white w-24 rounded-sm"
                          placeholder="First"
                        />
                        <input
                          value={lastDraft}
                          onChange={(e) => { setLastDraft(e.target.value); setSaveError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          className="bg-[#1A1A1A] border border-white/15 focus:border-primary/50 outline-none px-2 py-1 text-xs font-bold tracking-widest text-white w-24 rounded-sm"
                          placeholder="Last"
                        />
                        <button onClick={() => void saveName()} disabled={saveState === 'saving'} className="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 disabled:opacity-40">
                          {saveState === 'saving' ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingName(false)} className="text-[10px] font-bold tracking-widest uppercase text-white/35 hover:text-white/60">Cancel</button>
                      </div>
                      {saveError && <p className="text-[10px] text-red-400 font-semibold mt-1">{saveError}</p>}
                    </div>
                  ) : (
                    <button onClick={startEditName} className="flex items-center gap-1.5 mb-1 mx-auto md:mx-0 group">
                      <p className="text-xs font-bold tracking-widest text-white/35 uppercase group-hover:text-white/60 transition-colors">@{emailHandle}</p>
                      <PencilSimple size={10} weight="fill" className="text-white/25 group-hover:text-white/60 transition-colors" />
                    </button>
                  )}
                  <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Premium Member</p>
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2">
                    <Target size={12} weight="fill" className="text-primary" />
                    <span className="text-[11px] font-bold tracking-wider text-primary uppercase">{goal}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-[#111111] border border-white/5 p-4 flex flex-col items-center text-center gap-2">
                  <div className="text-primary">{s.icon}</div>
                  <p className="text-2xl font-bold tracking-wider">{s.value}</p>
                  <p className="text-[9px] font-bold tracking-widest text-foreground/40 uppercase leading-tight">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Membership Card */}
            <motion.section variants={itemVariants} className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Membership</h3>
              <div className="relative overflow-hidden bg-[#111111] border border-primary/20 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1">Premium Plan</p>
                      <h4 className="text-lg font-bold tracking-wider">3 Sessions / Week</h4>
                    </div>
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider">ACTIVE</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-foreground/50 tracking-wider">
                    <span>SINCE {memberSince.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Log Out */}
            <motion.section variants={itemVariants}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-full border border-white/10 text-sm font-bold tracking-[0.15em] uppercase text-foreground/50 hover:text-red-400 hover:border-red-500/20 transition-colors"
              >
                <SignOut size={16} weight="fill" />
                Log Out
              </button>
            </motion.section>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-8">
            {/* Training Goals */}
            <motion.section variants={itemVariants} className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Training Goals</h3>
              <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                {goals.map((item, i) => (
                  <div key={item.label} className={`flex justify-between items-center px-5 py-4 ${i < goals.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <p className="text-xs font-bold tracking-widest text-foreground/40 uppercase">{item.label}</p>
                    <p className="text-xs font-bold tracking-wider text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Personal Info */}
            <motion.section variants={itemVariants} className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Personal Info</h3>
              <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                {personal.map((item, i) => (
                  <div key={item.label} className={`flex justify-between items-center px-5 py-4 ${i < personal.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <p className="text-xs font-bold tracking-widest text-foreground/40 uppercase">{item.label}</p>
                    <p className="text-xs font-bold tracking-wider text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Settings */}
            <motion.section variants={itemVariants} className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Settings</h3>
              <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                {/* Notifications toggle */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3 text-foreground/70">
                    <Bell size={16} weight="fill" />
                    <span className="text-sm font-bold tracking-wider">Notifications</span>
                  </div>
                  <button
                    onClick={() => setNotifications(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Security */}
                <button onClick={() => setPage('security')}
                  className="w-full flex justify-between items-center px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 text-foreground/70">
                    <ShieldCheck size={16} weight="fill" />
                    <span className="text-sm font-bold tracking-wider">Security</span>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-foreground/30" />
                </button>

                {/* Active Sessions */}
                <button onClick={() => setPage('active-sessions')}
                  className="w-full flex justify-between items-center px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 text-foreground/70">
                    <DeviceMobile size={16} weight="fill" />
                    <span className="text-sm font-bold tracking-wider">Active Sessions</span>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-foreground/30" />
                </button>

                {/* Help */}
                <div className="flex justify-between items-center px-5 py-4">
                  <div className="flex items-center gap-3 text-foreground/70">
                    <Question size={16} weight="fill" />
                    <span className="text-sm font-bold tracking-wider">Help & Support</span>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-foreground/30" />
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
