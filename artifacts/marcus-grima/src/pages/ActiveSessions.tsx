import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, Desktop, DeviceMobile, Globe, WarningCircle } from '@phosphor-icons/react';
import { apiRequest, ApiError } from '@/lib/api';

interface SessionRow {
  id: string;
  current: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

interface Props {
  onBack: () => void;
}

function deviceIcon(ua: string | null) {
  if (!ua) return <Globe size={18} weight="bold" className="text-white/40" />;
  const l = ua.toLowerCase();
  if (l.includes('mobile') || l.includes('android') || l.includes('iphone'))
    return <DeviceMobile size={18} weight="bold" className="text-white/40" />;
  return <Desktop size={18} weight="bold" className="text-white/40" />;
}

function shortAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const l = ua.toLowerCase();
  if (l.includes('chrome')) return 'Chrome';
  if (l.includes('safari') && !l.includes('chrome')) return 'Safari';
  if (l.includes('firefox')) return 'Firefox';
  if (l.includes('edge')) return 'Edge';
  return ua.slice(0, 30);
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ActiveSessions({ onBack }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError]       = useState('');

  const load = async () => {
    try {
      const data = await apiRequest<{ sessions: SessionRow[] }>('/account/sessions');
      setSessions(data.sessions);
    } catch {
      setError('Could not load sessions.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const revoke = async (id: string) => {
    setRevoking(id); setError('');
    try {
      await apiRequest(`/account/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke session.');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAll = async () => {
    setRevokingAll(true); setError('');
    try {
      await apiRequest('/account/sessions', { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign out other devices.');
    } finally {
      setRevokingAll(false);
    }
  };

  const others = sessions.filter(s => !s.current);

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 pt-12 pb-4 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1 -ml-1">
            <CaretLeft size={22} weight="bold" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-[0.15em] uppercase text-white">Active Sessions</h1>
            <p className="text-[10px] text-white/30 font-semibold tracking-wider">Devices signed in to your account</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="flex justify-center pt-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                <WarningCircle size={13} weight="fill" />{error}
              </div>
            )}

            {/* Current session */}
            {sessions.filter(s => s.current).map(s => (
              <section key={s.id}>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase mb-3">This Device</p>
                <div className="bg-[#111111] border border-primary/20 rounded-sm px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    {deviceIcon(s.userAgent)}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white tracking-wide">{shortAgent(s.userAgent)}</p>
                      <p className="text-[11px] text-white/35 font-medium">{s.ipAddress ?? 'Unknown IP'}</p>
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-primary">CURRENT</span>
                  </div>
                  <p className="text-[10px] text-white/25 font-semibold tracking-wide">
                    Last active {timeAgo(s.lastUsedAt)}
                  </p>
                </div>
              </section>
            ))}

            {/* Other sessions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase">
                  Other Devices {others.length > 0 && `(${others.length})`}
                </p>
                {others.length > 1 && (
                  <button onClick={() => void revokeAll()} disabled={revokingAll}
                    className="text-[10px] font-bold tracking-[0.2em] text-red-400/70 uppercase hover:text-red-400 disabled:opacity-40 transition-colors">
                    {revokingAll ? 'Signing out…' : 'Sign out all'}
                  </button>
                )}
              </div>

              {others.length === 0 ? (
                <p className="text-sm text-white/25 font-medium py-4">No other active sessions.</p>
              ) : (
                <div className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
                  <AnimatePresence>
                    {others.map((s, i) => (
                      <motion.div key={s.id}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-3 px-5 py-4 ${i < others.length - 1 ? 'border-b border-white/5' : ''}`}>
                        {deviceIcon(s.userAgent)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/80 tracking-wide truncate">{shortAgent(s.userAgent)}</p>
                          <p className="text-[11px] text-white/30 font-medium">{s.ipAddress ?? 'Unknown'} · {timeAgo(s.lastUsedAt)}</p>
                        </div>
                        <button
                          onClick={() => void revoke(s.id)}
                          disabled={revoking === s.id}
                          className="shrink-0 text-[10px] font-bold tracking-[0.2em] text-red-400/60 uppercase hover:text-red-400 disabled:opacity-40 transition-colors">
                          {revoking === s.id ? '…' : 'Sign out'}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
