import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiError, apiRequest } from '@/lib/api';
import { WeeklySchedulePlanner } from '@/components/WeeklySchedulePlanner';
import { CommercialHQ } from '@/components/CommercialHQ';
import { 
  CalendarBlank, MapPin, User, WarningCircle, CheckCircle, XCircle, 
  SpinnerGap, CaretRight, Plus, X, Barbell, Trash, 
  PencilSimple, ArrowClockwise, CurrencyEur
} from '@phosphor-icons/react';

// --- Types ---

export interface ManagedSession {
  id: string;
  sessionTypeId: string | null;
  locationId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  reservedCapacity: number;
  remainingCapacity: number;
  status: string;
  marcusNotes: string | null;
  sessionType?: { id: string; name: string; description: string | null; durationMinutes: number } | null;
  location?: { id: string; name: string; timezone: string; addressDetails: string | null } | null;
}

export interface ManagedBooking {
  id: string;
  trainingSessionId: string;
  clientUserId: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  attendanceAt: string | null;
  session: {
    startsAt: string;
    endsAt: string;
    status: string;
    sessionType?: { id: string; name: string } | null;
    location?: { id: string; name: string; timezone: string } | null;
  };
  client?: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface Location {
  id: string;
  name: string;
  timezone: string;
  addressDetails: string | null;
  isActive: boolean;
}

export interface SessionType {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  defaultCapacity: number;
  isActive: boolean;
}

export interface AvailabilityRule {
  id: string;
  ownerUserId: string;
  locationId: string;
  sessionTypeId: string;
  weekday: number;
  startsLocalTime: string;
  endsLocalTime: string;
  slotIntervalMinutes: number | null;
  capacityOverride: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  locationName: string;
  timezone: string;
  sessionTypeName: string;
  durationMinutes: number;
}

export interface AvailabilityException {
  id: string;
  availabilityRuleId: string | null;
  locationId: string;
  sessionTypeId: string;
  exceptionDate: string;
  kind: 'unavailable' | 'override' | 'additional';
  startsLocalTime: string | null;
  endsLocalTime: string | null;
  capacityOverride: number | null;
  reason: string | null;
}

export interface AvailabilityOccurrence {
  id: string;
  ruleId: string;
  localDate: string;
  localStartTime: string;
  timezone: string;
  startsAt: string | null;
  endsAt: string | null;
  sessionId: string | null;
  resolution: 'generated' | 'suppressed' | 'dst_skipped' | 'conflict';
  locationName: string;
  sessionTypeName: string;
}

// --- Helpers ---

function formatDateTime(iso: string | undefined, tz = 'Europe/Malta') {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toLocalDatetimeString(dateObj: Date | string | undefined) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Hooks ---

function useAdminData() {
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [bookings, setBookings] = useState<ManagedBooking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [occurrences, setOccurrences] = useState<AvailabilityOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setReloading(true);
    setError(null);

    try {
      const [sessRes, bookRes, locRes, typeRes, rulesRes, exceptionsRes, previewRes] = await Promise.all([
        apiRequest<{ sessions: ManagedSession[] }>('/admin/training-sessions'),
        apiRequest<{ bookings: ManagedBooking[] }>('/admin/bookings'),
        apiRequest<{ locations: Location[] }>('/admin/training-locations'),
        apiRequest<{ sessionTypes: SessionType[] }>('/admin/session-types'),
        apiRequest<{ rules?: AvailabilityRule[] }>('/admin/availability/rules'),
        apiRequest<{ exceptions?: AvailabilityException[] }>('/admin/availability/exceptions'),
        apiRequest<{ occurrences?: AvailabilityOccurrence[] }>('/admin/availability/preview'),
      ]);
      setSessions(sessRes.sessions);
      setBookings(bookRes.bookings);
      setLocations(locRes.locations);
      setSessionTypes(typeRes.sessionTypes);
      setRules(rulesRes.rules ?? []);
      setExceptions(exceptionsRes.exceptions ?? []);
      setOccurrences(previewRes.occurrences ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load HQ data';
      if (isInitial) setError(msg);
      throw err;
    } finally {
      if (isInitial) setLoading(false);
      else setReloading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true).catch(() => {});
  }, [fetchAll]);

  return {
    sessions, bookings, locations, sessionTypes, rules, exceptions, occurrences,
    loading, reloading, error, reload: fetchAll
  };
}

// --- Components ---

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} data-testid="modal-backdrop">
      <div className="bg-[#111] border border-white/10 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/5 transition-colors" data-testid="modal-close">
            <X size={18} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// -- Requests View
function RequestsView({ bookings, execute, actionId, openBookingId, loading, onBookingIntentResolved }: { bookings: ManagedBooking[], execute: (id: string, p: Promise<any>) => Promise<boolean>, actionId: string | null, openBookingId?: string, loading: boolean, onBookingIntentResolved?: () => void }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'rescheduled' | 'attended' | 'no_show'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ManagedBooking | null>(null);
  const [reason, setReason] = useState('');
  const [unavailableNotice, setUnavailableNotice] = useState(false);
  useEffect(() => {
    if (!openBookingId) return;
    const booking = bookings.find((candidate) => candidate.id === openBookingId);
    if (booking) {
      setStatusFilter('pending');
      setSelectedBooking(booking);
      onBookingIntentResolved?.();
    } else if (!loading) {
      onBookingIntentResolved?.();
      setSelectedBooking(null);
      setUnavailableNotice(true);
    }
  }, [bookings, loading, openBookingId, onBookingIntentResolved]);
  const visibleBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((booking) => booking.status === statusFilter);

  return (
    <div className="space-y-4">
      {unavailableNotice && (
        <div className="flex items-start gap-3 border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70" role="status" data-testid="status-booking-unavailable">
          <WarningCircle size={18} className="mt-0.5 shrink-0 text-white/50" />
          <p>This booking is no longer available. No booking details were shown.</p>
          <button type="button" onClick={() => setUnavailableNotice(false)} className="ml-auto shrink-0 text-xs font-bold uppercase tracking-wider text-white/45 hover:text-white" data-testid="button-dismiss-booking-unavailable">Dismiss</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.16em] uppercase text-white/45">Booking requests</p>
        <label className="text-xs text-white/45">
          <span className="sr-only">Filter booking status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"
            data-testid="select-booking-status"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="attended">Attended</option>
            <option value="no_show">No-show</option>
            <option value="all">All statuses</option>
          </select>
        </label>
      </div>
      {visibleBookings.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-lg flex flex-col items-center gap-3">
          <CheckCircle size={32} className="text-white/20" weight="fill" />
          <p className="text-white/40 text-sm">No {statusFilter === 'all' ? '' : statusFilter} bookings right now.</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-x-auto bg-white/[0.01]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Session</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {visibleBookings.map(b => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="font-bold text-white hover:text-primary transition-colors text-left"
                      data-testid={`button-booking-detail-${b.id}`}
                    >
                      {b.client?.firstName} {b.client?.lastName}
                    </button>
                    <div className="text-xs text-white/40 mt-0.5">{b.client?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{b.session.sessionType?.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{b.session.location?.name}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-white">{formatDateTime(b.session.startsAt, b.session.location?.timezone || 'Europe/Malta')}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {b.status === 'pending' && <>
                      <button 
                        disabled={actionId === `confirm-${b.id}`}
                        onClick={() => execute(`confirm-${b.id}`, apiRequest(`/admin/bookings/${b.id}/confirm`, { method: 'POST' }))}
                        className="px-4 py-2 bg-white text-black font-bold text-xs rounded hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[80px]"
                        data-testid={`btn-confirm-${b.id}`}
                      >
                        {actionId === `confirm-${b.id}` ? <SpinnerGap className="animate-spin" /> : 'Approve'}
                      </button>
                      <button 
                        onClick={() => setRejectId(b.id)}
                        className="px-4 py-2 bg-red-500/10 text-red-500 font-bold text-xs rounded hover:bg-red-500/20 transition-colors"
                        data-testid={`btn-reject-${b.id}`}
                      >
                        Reject
                      </button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectId && (
        <Modal title="Reject Booking" isOpen={true} onClose={() => setRejectId(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const succeeded = await execute(`reject-${rejectId}`, apiRequest(`/admin/bookings/${rejectId}/reject`, { method: 'POST', body: { reason } }));
            if (succeeded) {
              setRejectId(null);
              setReason('');
            }
          }} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Reason</label>
              <textarea 
                required
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" 
                rows={3} 
                placeholder="Let the client know why their request was rejected..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setRejectId(null)} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">Cancel</button>
              <button 
                type="submit"
                disabled={actionId === `reject-${rejectId}`}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded flex items-center justify-center min-w-[80px] transition-colors"
                data-testid="btn-confirm-reject"
              >
                {actionId === `reject-${rejectId}` ? <SpinnerGap className="animate-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedBooking && (
        <Modal title="Booking details" isOpen={true} onClose={() => setSelectedBooking(null)}>
          <dl className="space-y-4 text-sm">
            <div><dt className="text-white/40 text-xs uppercase tracking-wider">Client</dt><dd className="mt-1 text-white">{selectedBooking.client?.firstName} {selectedBooking.client?.lastName} · {selectedBooking.client?.email}</dd></div>
            <div><dt className="text-white/40 text-xs uppercase tracking-wider">Session</dt><dd className="mt-1 text-white">{selectedBooking.session.sessionType?.name} · {formatDateTime(selectedBooking.session.startsAt, selectedBooking.session.location?.timezone || 'Europe/Malta')}</dd></div>
            <div><dt className="text-white/40 text-xs uppercase tracking-wider">Status</dt><dd className="mt-1 text-white capitalize">{selectedBooking.status.replace('_', ' ')}</dd></div>
            {selectedBooking.rejectionReason && <div><dt className="text-white/40 text-xs uppercase tracking-wider">Rejection reason</dt><dd className="mt-1 text-white">{selectedBooking.rejectionReason}</dd></div>}
          </dl>
        </Modal>
      )}
    </div>
  );
}

// -- Schedule View
function ScheduleView({ sessions, bookings, locations, sessionTypes, execute, actionId }: { sessions: ManagedSession[], bookings: ManagedBooking[], locations: Location[], sessionTypes: SessionType[], execute: (id: string, p: Promise<any>) => Promise<boolean>, actionId: string | null }) {
  const [filter, setFilter] = useState<'upcoming'|'past'>('upcoming');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSession, setEditingSession] = useState<ManagedSession | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const now = new Date().toISOString();
  const filtered = sessions
    .filter(s => filter === 'upcoming' ? s.endsAt >= now : s.endsAt < now)
    .sort((a, b) => filter === 'upcoming' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt));

  const getSessionBookings = (sessionId: string) => bookings.filter(b => b.trainingSessionId === sessionId);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex bg-white/5 p-1 rounded border border-white/10 text-sm">
          <button onClick={() => setFilter('upcoming')} className={`px-4 py-1.5 rounded-sm font-medium transition-colors ${filter==='upcoming' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>Upcoming</button>
          <button onClick={() => setFilter('past')} className={`px-4 py-1.5 rounded-sm font-medium transition-colors ${filter==='past' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>Past</button>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold text-xs hover:bg-white/90 transition-colors" data-testid="btn-create-session"><Plus weight="bold" size={14} /> New Session</button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-lg flex flex-col items-center gap-3">
          <CalendarBlank size={32} className="text-white/20" weight="fill" />
          <p className="text-white/40 text-sm">No {filter} sessions found.</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-x-auto bg-white/[0.01]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Session</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Capacity</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map(s => {
                const sBookings = getSessionBookings(s.id);
                const isExpanded = expandedId === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-white/[0.03] transition-colors group">
                      <td className="p-3 text-center">
                        <button onClick={() => setExpandedId(isExpanded ? null : s.id)} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} session ${s.id}`} data-testid={`btn-expand-session-${s.id}`} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                          <CaretRight className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} weight="bold" />
                        </button>
                      </td>
                      <td className="p-4 font-bold text-white">{formatDateTime(s.startsAt, s.location?.timezone)}</td>
                      <td className="p-4 font-medium">{s.sessionType?.name}</td>
                      <td className="p-4 text-white/60">{s.location?.name}</td>
                      <td className="p-4 text-white/60">{s.reservedCapacity} / {s.capacity}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${s.status === 'scheduled' ? 'bg-primary/20 text-primary' : s.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                          <button onClick={() => setEditingSession(s)} disabled={actionId !== null} className="p-2 text-white/40 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Edit session" aria-label="Edit session" data-testid={`btn-edit-session-${s.id}`}><PencilSimple size={16} /></button>
                          {s.status === 'scheduled' && (
                            <>
                              <button onClick={() => execute(`complete-${s.id}`, apiRequest(`/admin/training-sessions/${s.id}/complete`, { method: 'POST'}))} disabled={actionId !== null} className="p-2 text-green-500/60 hover:text-green-400 rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Mark complete" aria-label="Mark session complete" data-testid={`btn-complete-session-${s.id}`}><CheckCircle size={16} /></button>
                              <button onClick={() => { if(confirm('Cancel this session?')) void execute(`cancel-${s.id}`, apiRequest(`/admin/training-sessions/${s.id}/cancel`, { method: 'POST'}))}} disabled={actionId !== null} className="p-2 text-red-500/60 hover:text-red-400 rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Cancel session" aria-label="Cancel session" data-testid={`btn-cancel-session-${s.id}`}><XCircle size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-black/40 border-b border-white/5">
                        <td colSpan={7} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-5 pl-14 border-l-2 border-primary/30 my-2">
                              {sBookings.length === 0 ? <p className="text-xs text-white/40 font-medium tracking-wide">No bookings yet.</p> : (
                                <table className="w-full text-sm text-left">
                                  <thead className="text-white/40 text-[10px] uppercase tracking-wider">
                                    <tr>
                                      <th className="pb-3 font-bold">Client</th>
                                      <th className="pb-3 font-bold">Status</th>
                                      <th className="pb-3 text-right font-bold">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {sBookings.map(b => (
                                      <tr key={b.id} className="group/booking">
                                        <td className="py-3 font-medium text-white">{b.client?.firstName} {b.client?.lastName}</td>
                                        <td className="py-3">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${b.status === 'confirmed' ? 'bg-primary/20 text-primary' : b.status === 'attended' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{b.status}</span>
                                        </td>
                                        <td className="py-3 text-right flex justify-end gap-3">
                                          {b.status === 'confirmed' && b.session.status === 'scheduled' && new Date(b.session.endsAt).getTime() <= Date.now() && (
                                            <>
                                              <button onClick={() => execute(`attend-${b.id}`, apiRequest(`/admin/bookings/${b.id}/attended`, { method: 'POST'}))} disabled={actionId !== null} className="text-[11px] uppercase tracking-wider font-bold text-green-400 hover:text-green-300 transition-colors disabled:opacity-40" data-testid={`btn-attend-${b.id}`}>Attended</button>
                                              <button onClick={() => execute(`noshow-${b.id}`, apiRequest(`/admin/bookings/${b.id}/no-show`, { method: 'POST'}))} disabled={actionId !== null} className="text-[11px] uppercase tracking-wider font-bold text-white/40 hover:text-white transition-colors disabled:opacity-40" data-testid={`btn-noshow-${b.id}`}>No-Show</button>
                                            </>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(isCreating || editingSession) && (
        <SessionModal 
          session={editingSession}
          locations={locations}
          sessionTypes={sessionTypes}
          onClose={() => { setIsCreating(false); setEditingSession(null); }}
           onSave={async (data) => {
             const succeeded = editingSession
               ? await execute(`edit-${editingSession.id}`, apiRequest(`/admin/training-sessions/${editingSession.id}`, { method: 'PATCH', body: data }))
               : await execute('create-session', apiRequest('/admin/training-sessions', { method: 'POST', body: data }));
             if (succeeded) {
               setIsCreating(false);
               setEditingSession(null);
             }
          }}
          submitting={actionId === 'create-session' || actionId === `edit-${editingSession?.id}`}
        />
      )}
    </div>
  );
}

function SessionModal({ session, locations, sessionTypes, onClose, onSave, submitting }: { session: ManagedSession | null, locations: Location[], sessionTypes: SessionType[], onClose: () => void, onSave: (data: any) => Promise<void>, submitting: boolean }) {
  const [formData, setFormData] = useState({
    sessionTypeId: session?.sessionTypeId || (sessionTypes.length > 0 ? sessionTypes[0].id : ''),
    locationId: session?.locationId || (locations.length > 0 ? locations[0].id : ''),
    startsAt: session ? toLocalDatetimeString(session.startsAt) : '',
    endsAt: session ? toLocalDatetimeString(session.endsAt) : '',
    capacity: session?.capacity || 10,
    marcusNotes: session?.marcusNotes || ''
  });

  const handleStartsAtChange = (val: string) => {
    setFormData(prev => {
      const next = { ...prev, startsAt: val };
      if (val && !prev.endsAt && prev.sessionTypeId) {
        const st = sessionTypes.find(t => t.id === prev.sessionTypeId);
        if (st) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            const end = new Date(d.getTime() + st.durationMinutes * 60000);
            next.endsAt = toLocalDatetimeString(end);
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      sessionTypeId: formData.sessionTypeId,
      locationId: formData.locationId,
      startsAt: new Date(formData.startsAt).toISOString(),
      endsAt: new Date(formData.endsAt).toISOString(),
      capacity: Number(formData.capacity),
      marcusNotes: formData.marcusNotes,
    });
  };

  return (
    <Modal title={session ? 'Edit Session' : 'Create Session'} isOpen={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Session Type</label>
            <select required value={formData.sessionTypeId} onChange={e => setFormData({...formData, sessionTypeId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors">
              <option value="" disabled>Select...</option>
              {sessionTypes.filter(t => t.isActive || t.id === session?.sessionTypeId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Location</label>
            <select required value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors">
              <option value="" disabled>Select...</option>
              {locations.filter(l => l.isActive || l.id === session?.locationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Starts At</label>
            <input required type="datetime-local" value={formData.startsAt} onChange={e => handleStartsAtChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Ends At</label>
            <input required type="datetime-local" value={formData.endsAt} onChange={e => setFormData({...formData, endsAt: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Capacity</label>
            <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
          </div>
        </div>
        {session && (
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Notes (Internal)</label>
            <textarea value={formData.marcusNotes} onChange={e => setFormData({...formData, marcusNotes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" rows={3} placeholder="Private notes for this session..." />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-white text-black text-xs font-bold rounded flex items-center justify-center min-w-[80px] hover:bg-white/90 transition-colors" data-testid="btn-save-session">
            {submitting ? <SpinnerGap className="animate-spin" /> : 'Save Session'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// -- Availability View
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function AvailabilityView({
  rules, exceptions, occurrences, locations, sessionTypes, execute, actionId
}: {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  occurrences: AvailabilityOccurrence[];
  locations: Location[];
  sessionTypes: SessionType[];
  execute: (id: string, p: Promise<any>) => Promise<boolean>;
  actionId: string | null;
}) {
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [impactMessage, setImpactMessage] = useState<string | null>(null);
  const activeLocations = locations.filter((location) => location.isActive);
  const activeTypes = sessionTypes.filter((type) => type.isActive);

  const toggleRule = async (rule: AvailabilityRule) => {
    const impact = await apiRequest<{ impact: { booked: unknown[]; unbookedSessionIds: string[] } }>(`/admin/availability/rules/${rule.id}/impact`);
    if (impact.impact.booked.length > 0) {
      setImpactMessage(`${impact.impact.booked.length} upcoming session${impact.impact.booked.length === 1 ? '' : 's'} has active bookings. Resolve those sessions from Schedule before changing this rule.`);
      return;
    }
    const confirmed = window.confirm(
      impact.impact.unbookedSessionIds.length
        ? `This will regenerate ${impact.impact.unbookedSessionIds.length} unbooked future session${impact.impact.unbookedSessionIds.length === 1 ? '' : 's'}. Continue?`
        : ` ${rule.isActive ? 'Deactivate' : 'Activate'} this rule?`,
    );
    if (!confirmed) return;
    const succeeded = await execute(
      `toggle-rule-${rule.id}`,
      apiRequest(`/admin/availability/rules/${rule.id}`, {
        method: 'PATCH',
        body: { isActive: !rule.isActive, confirmImpact: true },
      }),
    );
    if (succeeded) setImpactMessage(null);
  };

  return (
    <div className="space-y-8">
      {impactMessage && (
        <div role="alert" className="border border-amber-400/25 bg-amber-400/10 rounded-lg p-4 text-sm text-amber-100 flex gap-3">
          <WarningCircle size={20} className="shrink-0 text-amber-300" weight="fill" />
          <div className="flex-1">{impactMessage}</div>
          <button type="button" onClick={() => setImpactMessage(null)} aria-label="Dismiss impact notice" className="text-amber-200 hover:text-white"><X size={16} /></button>
        </div>
      )}
      <section aria-labelledby="availability-rules-heading">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Weekly availability</p>
            <h3 id="availability-rules-heading" className="mt-1 text-lg font-bold text-white">Materialized 120 days ahead</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void execute('availability-refresh', apiRequest('/admin/availability/refresh', { method: 'POST' }))}
              disabled={actionId !== null}
              className="px-3 py-2 rounded border border-white/15 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50"
              data-testid="btn-refresh-availability"
            >
              {actionId === 'availability-refresh' ? 'Refreshing…' : 'Refresh slots'}
            </button>
            <button
              type="button"
              onClick={() => { setEditingRule(null); setShowRuleForm(true); }}
              disabled={!activeLocations.length || !activeTypes.length}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold text-xs hover:bg-white/90 disabled:opacity-50"
              data-testid="btn-create-availability-rule"
            >
              <Plus size={14} weight="bold" /> New rule
            </button>
          </div>
        </div>
        {!activeLocations.length || !activeTypes.length ? (
          <p className="border border-white/10 rounded-lg p-4 text-sm text-white/50">Create an active location and session type before adding availability.</p>
        ) : rules.length === 0 ? (
          <p className="border border-white/10 rounded-lg p-8 text-center text-sm text-white/45">No recurring availability rules yet. One-off sessions remain available from Schedule.</p>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white/5 text-white/45 text-[10px] uppercase tracking-wider">
                <tr><th className="p-4">Day & hours</th><th className="p-4">Session</th><th className="p-4">Location</th><th className="p-4">Effective dates</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/[0.03]">
                    <td className="p-4 font-medium text-white">{WEEKDAYS[rule.weekday - 1]}<span className="block text-xs text-white/45 mt-1">{rule.startsLocalTime}–{rule.endsLocalTime} · every {rule.slotIntervalMinutes ?? rule.durationMinutes} min</span></td>
                    <td className="p-4 text-white/75">{rule.sessionTypeName}<span className="block text-xs text-white/45 mt-1">{rule.capacityOverride ? `${rule.capacityOverride} places` : 'Type capacity'}</span></td>
                    <td className="p-4 text-white/75">{rule.locationName}<span className="block text-xs text-white/45 mt-1">{rule.timezone}</span></td>
                    <td className="p-4 text-white/60">{rule.effectiveFrom}<span className="block text-xs text-white/45 mt-1">{rule.effectiveUntil ?? 'No end date'}</span></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${rule.isActive ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-white/45'}`}>{rule.isActive ? 'Active' : 'Paused'}</span></td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button type="button" onClick={() => { setEditingRule(rule); setShowRuleForm(true); }} disabled={actionId !== null} className="p-2 text-white/45 hover:text-white" aria-label={`Edit ${WEEKDAYS[rule.weekday - 1]} availability`}><PencilSimple size={16} /></button>
                      <button type="button" onClick={() => void toggleRule(rule)} disabled={actionId !== null} className="px-3 py-1.5 rounded text-xs font-bold text-white/65 hover:text-white hover:bg-white/10 disabled:opacity-40">{rule.isActive ? 'Pause' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="availability-exceptions-heading">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Exceptions</p>
            <h3 id="availability-exceptions-heading" className="mt-1 text-lg font-bold text-white">Unavailable, override & additional hours</h3>
          </div>
          <button type="button" onClick={() => setShowExceptionForm(true)} disabled={!rules.length} className="flex items-center gap-2 border border-white/15 px-4 py-2 rounded text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50"><Plus size={14} /> Add exception</button>
        </div>
        {exceptions.length === 0 ? <p className="border border-white/10 rounded-lg p-5 text-sm text-white/45">No exceptions scheduled.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {exceptions.slice(0, 12).map((exception) => (
              <div key={exception.id} className="border border-white/10 rounded-lg p-4 bg-white/[0.01]">
                <div className="flex justify-between gap-3"><strong className="text-sm text-white capitalize">{exception.kind.replace('_', ' ')}</strong><span className="text-xs text-white/45">{exception.exceptionDate}</span></div>
                <p className="text-xs text-white/55 mt-2">{exception.startsLocalTime && exception.endsLocalTime ? `${exception.startsLocalTime}–${exception.endsLocalTime}` : 'All day'}{exception.reason ? ` · ${exception.reason}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="generated-slots-heading">
        <div className="mb-4"><p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Preview</p><h3 id="generated-slots-heading" className="mt-1 text-lg font-bold text-white">Generated sessions</h3></div>
        {occurrences.length === 0 ? <p className="border border-white/10 rounded-lg p-5 text-sm text-white/45">Refresh availability after creating a rule to preview slots.</p> : (
          <div className="border border-white/10 rounded-lg overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-white/5 text-white/45 text-[10px] uppercase tracking-wider"><tr><th className="p-4">Local date & time</th><th className="p-4">Session</th><th className="p-4">Location</th><th className="p-4">Result</th></tr></thead><tbody className="divide-y divide-white/10">{occurrences.slice(0, 30).map((item) => <tr key={item.id}><td className="p-4 text-white">{item.localDate} <span className="text-white/45">{item.localStartTime}</span></td><td className="p-4 text-white/70">{item.sessionTypeName}</td><td className="p-4 text-white/70">{item.locationName}</td><td className="p-4"><span className="text-xs text-white/55 capitalize">{item.resolution.replace('_', ' ')}</span></td></tr>)}</tbody></table></div>
        )}
      </section>

      {showRuleForm && <AvailabilityRuleModal rule={editingRule} locations={activeLocations} sessionTypes={activeTypes} onClose={() => { setShowRuleForm(false); setEditingRule(null); }} submitting={actionId === 'save-availability-rule'} onSave={async (body) => {
        if (editingRule) {
          const impact = await apiRequest<{ impact: { booked: unknown[]; unbookedSessionIds: string[] } }>(`/admin/availability/rules/${editingRule.id}/impact`);
          if (impact.impact.booked.length) { setImpactMessage('This rule has booked sessions. Resolve those sessions individually in Schedule before editing it.'); return; }
          if (impact.impact.unbookedSessionIds.length && !window.confirm(`Regenerate ${impact.impact.unbookedSessionIds.length} unbooked future sessions using this update?`)) return;
          const succeeded = await execute('save-availability-rule', apiRequest(`/admin/availability/rules/${editingRule.id}`, { method: 'PATCH', body: { ...(body as Record<string, unknown>), confirmImpact: true } }));
          if (succeeded) { setShowRuleForm(false); setEditingRule(null); }
        } else {
          const succeeded = await execute('save-availability-rule', apiRequest('/admin/availability/rules', { method: 'POST', body }));
          if (succeeded) setShowRuleForm(false);
        }
      }} />}
      {showExceptionForm && <AvailabilityExceptionModal rules={rules} onClose={() => setShowExceptionForm(false)} submitting={actionId === 'save-availability-exception'} onSave={async (body) => {
        const succeeded = await execute('save-availability-exception', apiRequest('/admin/availability/exceptions', { method: 'POST', body }));
        if (succeeded) setShowExceptionForm(false);
      }} />}
    </div>
  );
}

function AvailabilityRuleModal({ rule, locations, sessionTypes, onClose, onSave, submitting }: { rule: AvailabilityRule | null; locations: Location[]; sessionTypes: SessionType[]; onClose: () => void; onSave: (body: unknown) => Promise<void>; submitting: boolean }) {
  const [form, setForm] = useState({
    locationId: rule?.locationId ?? locations[0]?.id ?? '',
    sessionTypeId: rule?.sessionTypeId ?? sessionTypes[0]?.id ?? '',
    weekday: String(rule?.weekday ?? 1),
    startsLocalTime: rule?.startsLocalTime ?? '09:00',
    endsLocalTime: rule?.endsLocalTime ?? '17:00',
    slotIntervalMinutes: String(rule?.slotIntervalMinutes ?? ''),
    capacityOverride: String(rule?.capacityOverride ?? ''),
    effectiveFrom: rule?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    effectiveUntil: rule?.effectiveUntil ?? '',
  });
  return <Modal title={rule ? 'Edit weekly availability' : 'New weekly availability'} isOpen={true} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave({ ...form, weekday: Number(form.weekday), slotIntervalMinutes: form.slotIntervalMinutes ? Number(form.slotIntervalMinutes) : undefined, capacityOverride: form.capacityOverride ? Number(form.capacityOverride) : null, effectiveUntil: form.effectiveUntil || null }); }}>
    <div className="grid grid-cols-2 gap-4"><label className="text-xs text-white/60">Day<select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white">{WEEKDAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label><label className="text-xs text-white/60">Location<select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="text-xs text-white/60">Session type<select value={form.sessionTypeId} onChange={(event) => setForm({ ...form, sessionTypeId: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white">{sessionTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label className="text-xs text-white/60">Slot spacing (minutes)<input type="number" min="1" value={form.slotIntervalMinutes} onChange={(event) => setForm({ ...form, slotIntervalMinutes: event.target.value })} placeholder="Uses session duration" className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">Start<input required type="time" value={form.startsLocalTime} onChange={(event) => setForm({ ...form, startsLocalTime: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">End<input required type="time" value={form.endsLocalTime} onChange={(event) => setForm({ ...form, endsLocalTime: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">Effective from<input required type="date" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">Effective until<input type="date" value={form.effectiveUntil} onChange={(event) => setForm({ ...form, effectiveUntil: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label></div>
    <label className="block text-xs text-white/60">Capacity override (optional)<input type="number" min="1" value={form.capacityOverride} onChange={(event) => setForm({ ...form, capacityOverride: event.target.value })} placeholder="Uses session type capacity" className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label>
    <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button type="submit" disabled={submitting} className="px-4 py-2 bg-white text-black text-xs font-bold rounded disabled:opacity-50">{submitting ? 'Saving…' : 'Save rule'}</button></div>
  </form></Modal>;
}

function AvailabilityExceptionModal({ rules, onClose, onSave, submitting }: { rules: AvailabilityRule[]; onClose: () => void; onSave: (body: unknown) => Promise<void>; submitting: boolean }) {
  const initial = rules[0];
  const [form, setForm] = useState({ ruleId: initial?.id ?? '', kind: 'unavailable', exceptionDate: new Date().toISOString().slice(0, 10), startsLocalTime: '', endsLocalTime: '', capacityOverride: '', reason: '' });
  const selected = rules.find((rule) => rule.id === form.ruleId) ?? initial;
  if (!selected) return null;
  const timesRequired = form.kind === 'additional';
  return <Modal title="Add availability exception" isOpen={true} onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave({ availabilityRuleId: selected.id, locationId: selected.locationId, sessionTypeId: selected.sessionTypeId, kind: form.kind, exceptionDate: form.exceptionDate, startsLocalTime: form.startsLocalTime || null, endsLocalTime: form.endsLocalTime || null, capacityOverride: form.capacityOverride ? Number(form.capacityOverride) : null, reason: form.reason || null, confirmImpact: true }); }}>
    <label className="block text-xs text-white/60">Rule<select value={form.ruleId} onChange={(event) => setForm({ ...form, ruleId: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white">{rules.map((rule) => <option key={rule.id} value={rule.id}>{WEEKDAYS[rule.weekday - 1]} · {rule.sessionTypeName} · {rule.locationName}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-4"><label className="text-xs text-white/60">Kind<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white"><option value="unavailable">Unavailable</option><option value="override">Override capacity</option><option value="additional">Additional hours</option></select></label><label className="text-xs text-white/60">Date<input required type="date" value={form.exceptionDate} onChange={(event) => setForm({ ...form, exceptionDate: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">Start<input required={timesRequired} type="time" value={form.startsLocalTime} onChange={(event) => setForm({ ...form, startsLocalTime: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label><label className="text-xs text-white/60">End<input required={timesRequired} type="time" value={form.endsLocalTime} onChange={(event) => setForm({ ...form, endsLocalTime: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label></div>
    {form.kind === 'override' && <label className="block text-xs text-white/60">Capacity override<input required type="number" min="1" value={form.capacityOverride} onChange={(event) => setForm({ ...form, capacityOverride: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label>}
    <label className="block text-xs text-white/60">Internal reason (optional)<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="mt-2 w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white" /></label>
    <p className="text-xs text-white/40">Booked sessions are never changed automatically. Resolve any booked conflict from Schedule.</p>
    <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button type="submit" disabled={submitting} className="px-4 py-2 bg-white text-black text-xs font-bold rounded disabled:opacity-50">{submitting ? 'Saving…' : 'Save exception'}</button></div>
  </form></Modal>;
}

// -- Locations View
function LocationsView({ locations, execute, actionId }: { locations: Location[], execute: (id: string, p: Promise<any>) => Promise<boolean>, actionId: string | null }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold text-xs hover:bg-white/90 transition-colors ml-auto" data-testid="btn-create-loc"><Plus weight="bold" size={14} /> New Location</button>
      </div>
      
      {locations.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-lg flex flex-col items-center gap-3">
          <MapPin size={32} className="text-white/20" weight="fill" />
          <p className="text-white/40 text-sm">No locations configured.</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-x-auto bg-white/[0.01]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-medium">Name & Address</th>
                <th className="p-4 font-medium">Timezone</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {locations.map(l => (
                <tr key={l.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-white">{l.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{l.addressDetails}</div>
                  </td>
                  <td className="p-4 text-white/60 font-mono text-xs">{l.timezone}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${l.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{l.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                      <button onClick={() => setEditingLoc(l)} disabled={actionId !== null} className="p-2 text-white/40 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Edit location" aria-label="Edit location"><PencilSimple size={16} /></button>
                      {l.isActive && <button onClick={() => { if(confirm('Deactivate this location?')) void execute(`deactivate-loc-${l.id}`, apiRequest(`/admin/training-locations/${l.id}/deactivate`, { method: 'POST'}))}} disabled={actionId !== null} className="p-2 text-red-500/60 hover:text-red-400 rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Deactivate location" aria-label="Deactivate location"><Trash size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(isCreating || editingLoc) && (
        <LocationModal 
          location={editingLoc}
          onClose={() => { setIsCreating(false); setEditingLoc(null); }}
          onSave={async (data) => {
            const succeeded = editingLoc
              ? await execute(`edit-loc-${editingLoc.id}`, apiRequest(`/admin/training-locations/${editingLoc.id}`, { method: 'PATCH', body: data }))
              : await execute('create-loc', apiRequest('/admin/training-locations', { method: 'POST', body: data }));
            if (succeeded) {
              setIsCreating(false);
              setEditingLoc(null);
            }
          }}
          submitting={actionId === 'create-loc' || actionId === `edit-loc-${editingLoc?.id}`}
        />
      )}
    </div>
  );
}

function LocationModal({ location, onClose, onSave, submitting }: { location: Location | null, onClose: () => void, onSave: (data: any) => Promise<void>, submitting: boolean }) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    timezone: location?.timezone || 'Europe/Malta',
    addressDetails: location?.addressDetails || ''
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

  return (
    <Modal title={location ? 'Edit Location' : 'Create Location'} isOpen={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Name</label>
          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Timezone</label>
          <input required value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} placeholder="Europe/Malta" className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Address Details</label>
          <textarea value={formData.addressDetails} onChange={e => setFormData({...formData, addressDetails: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" rows={3} />
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-white text-black text-xs font-bold rounded flex items-center justify-center min-w-[80px] hover:bg-white/90 transition-colors" data-testid="btn-save-loc">
            {submitting ? <SpinnerGap className="animate-spin" /> : 'Save Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// -- Session Types View
function SessionTypesView({ types, execute, actionId }: { types: SessionType[], execute: (id: string, p: Promise<any>) => Promise<boolean>, actionId: string | null }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState<SessionType | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold text-xs hover:bg-white/90 transition-colors ml-auto" data-testid="btn-create-type"><Plus weight="bold" size={14} /> New Session Type</button>
      </div>
      
      {types.length === 0 ? (
        <div className="p-12 text-center border border-white/10 rounded-lg flex flex-col items-center gap-3">
          <Barbell size={32} className="text-white/20" weight="fill" />
          <p className="text-white/40 text-sm">No session types configured.</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-x-auto bg-white/[0.01]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-medium">Name & Description</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Default Cap.</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {types.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-xs text-white/40 mt-0.5 max-w-sm truncate" title={t.description || ''}>{t.description}</div>
                  </td>
                  <td className="p-4 text-white/60 font-medium">{t.durationMinutes} min</td>
                  <td className="p-4 text-white/60 font-medium">{t.defaultCapacity}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                      <button onClick={() => setEditingType(t)} disabled={actionId !== null} className="p-2 text-white/40 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Edit session type" aria-label="Edit session type"><PencilSimple size={16} /></button>
                      {t.isActive && <button onClick={() => { if(confirm('Deactivate this session type?')) void execute(`deactivate-type-${t.id}`, apiRequest(`/admin/session-types/${t.id}/deactivate`, { method: 'POST'}))}} disabled={actionId !== null} className="p-2 text-red-500/60 hover:text-red-400 rounded hover:bg-white/10 transition-colors disabled:opacity-40" title="Deactivate session type" aria-label="Deactivate session type"><Trash size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(isCreating || editingType) && (
        <SessionTypeModal 
          type={editingType}
          onClose={() => { setIsCreating(false); setEditingType(null); }}
          onSave={async (data) => {
            const succeeded = editingType
              ? await execute(`edit-type-${editingType.id}`, apiRequest(`/admin/session-types/${editingType.id}`, { method: 'PATCH', body: data }))
              : await execute('create-type', apiRequest('/admin/session-types', { method: 'POST', body: data }));
            if (succeeded) {
              setIsCreating(false);
              setEditingType(null);
            }
          }}
          submitting={actionId === 'create-type' || actionId === `edit-type-${editingType?.id}`}
        />
      )}
    </div>
  );
}

function SessionTypeModal({ type, onClose, onSave, submitting }: { type: SessionType | null, onClose: () => void, onSave: (data: any) => Promise<void>, submitting: boolean }) {
  const [formData, setFormData] = useState({
    name: type?.name || '',
    description: type?.description || '',
    durationMinutes: type?.durationMinutes || 60,
    defaultCapacity: type?.defaultCapacity || 10
  });

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onSave({ ...formData, durationMinutes: Number(formData.durationMinutes), defaultCapacity: Number(formData.defaultCapacity) }); 
  };

  return (
    <Modal title={type ? 'Edit Session Type' : 'Create Session Type'} isOpen={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Name</label>
          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Description</label>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Duration (min)</label>
            <input required type="number" min="1" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Default Capacity</label>
            <input required type="number" min="1" value={formData.defaultCapacity} onChange={e => setFormData({...formData, defaultCapacity: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-white focus:border-white/30 outline-none transition-colors" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-white text-black text-xs font-bold rounded flex items-center justify-center min-w-[80px] hover:bg-white/90 transition-colors" data-testid="btn-save-type">
            {submitting ? <SpinnerGap className="animate-spin" /> : 'Save Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Main Page Component ---

export function MarcusSessionsHQ({ openBookingId, onBookingIntentResolved }: { openBookingId?: string, onBookingIntentResolved?: () => void }) {
  const data = useAdminData();
  const [activeTab, setActiveTab] = useState<'requests' | 'schedule' | 'availability' | 'commercial'>('requests');
  const [actionId, setActionId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  useEffect(() => {
    if (openBookingId) setActiveTab('requests');
  }, [openBookingId]);

  const execute = async (id: string, promise: Promise<any>) => {
    setActionId(id);
    setGlobalError(null);
    try {
      await promise;
      await data.reload(false);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const details = Object.entries(err.fields)
          .map(([field, message]) => `${field}: ${message}`)
          .join(' ');
        setGlobalError(`${err.message} ${details}`);
      } else {
        setGlobalError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
      await data.reload(false).catch(() => {});
      return false;
    } finally {
      setActionId(null);
    }
  };

  if (data.loading && !data.sessions.length && !data.error) {
    return <div className="flex h-[100dvh] items-center justify-center bg-[#0A0A0A] text-white"><SpinnerGap className="animate-spin text-primary" size={32} /></div>;
  }
  
  if (data.error && !data.sessions.length) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0A0A0A] text-white">
        <div className="text-center space-y-5 max-w-sm px-6">
          <WarningCircle size={48} className="mx-auto text-red-500/80" />
          <h2 className="text-xl font-bold tracking-tight">Failed to load HQ</h2>
          <p className="text-white/40 text-sm leading-relaxed">{data.error}</p>
          <button onClick={() => data.reload(true)} className="px-6 py-2.5 bg-white text-black rounded font-bold text-xs tracking-wider uppercase hover:bg-white/90 transition-colors mt-2">Retry Connection</button>
        </div>
      </div>
    );
  }

  const pendingCount = data.bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="flex min-h-[100dvh] flex-col md:h-[100dvh] md:flex-row bg-[#0A0A0A] text-foreground font-sans selection:bg-primary/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#0d0d0d] shrink-0">
        <div className="p-5 md:p-8 border-b border-white/10">
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white/90">Operator HQ</h1>
          <p className="text-[10px] text-white/40 tracking-widest mt-1.5 uppercase font-medium">Marcus Grima PT</p>
        </div>
        <nav className="p-3 md:p-4 flex gap-1.5 overflow-x-auto md:block md:space-y-1.5 flex-1">
          <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'requests' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
            <span className="flex items-center gap-3"><User size={16} weight={activeTab === 'requests' ? 'bold' : 'regular'} /> Requests</span>
            {pendingCount > 0 && <span className="bg-white text-black text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingCount}</span>}
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
            <span className="flex items-center gap-3"><CalendarBlank size={16} weight={activeTab === 'schedule' ? 'bold' : 'regular'} /> Schedule</span>
          </button>
          <button onClick={() => setActiveTab('availability')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'availability' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`} data-testid="button-tab-availability">
            <span className="flex items-center gap-3"><ArrowClockwise size={16} weight={activeTab === 'availability' ? 'bold' : 'regular'} /> Availability</span>
          </button>
          <button onClick={() => setActiveTab('commercial')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'commercial' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`} data-testid="button-tab-commercial">
            <span className="flex items-center gap-3"><CurrencyEur size={16} weight={activeTab === 'commercial' ? 'bold' : 'regular'} /> Commercial</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A]">
        <header className="h-16 md:h-20 border-b border-white/10 flex items-center justify-between px-4 md:px-10 shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {activeTab === 'schedule' ? 'Weekly Schedule' : activeTab === 'availability' ? 'Availability' : activeTab === 'commercial' ? 'Commercial HQ' : 'Requests'}
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={() => data.reload(false)} disabled={data.loading || data.reloading} className="p-2.5 text-white/30 hover:text-white rounded-full hover:bg-white/10 disabled:opacity-50 transition-colors" title="Sync with Server">
              <ArrowClockwise size={18} weight="bold" className={data.reloading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          <AnimatePresence mode="wait">
            {globalError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 flex items-start gap-4 bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-200">
                <WarningCircle size={20} className="text-red-400 shrink-0 mt-0.5" weight="fill" />
                <div className="flex-1 font-medium">{globalError}</div>
                <button onClick={() => setGlobalError(null)} className="text-red-400 hover:text-red-300 transition-colors"><X size={16} weight="bold" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {activeTab === 'requests' && <RequestsView bookings={data.bookings} execute={execute} actionId={actionId} openBookingId={openBookingId} loading={data.loading} onBookingIntentResolved={onBookingIntentResolved} />}
              {activeTab === 'schedule' && <WeeklySchedulePlanner sessions={data.sessions} locations={data.locations} sessionTypes={data.sessionTypes} execute={execute} actionId={actionId} />}
              {activeTab === 'availability' && <AvailabilityView rules={data.rules} exceptions={data.exceptions} occurrences={data.occurrences} locations={data.locations} sessionTypes={data.sessionTypes} execute={execute} actionId={actionId} />}
              {activeTab === 'commercial' && <CommercialHQ execute={execute} actionId={actionId} sessions={data.sessions} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
