import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarBlank, Timer, MapPin, CaretRight, Plus,
  CheckCircle, XCircle, CaretLeft, X, Check, Barbell,
  ArrowClockwise, WarningCircle, SpinnerGap, ArrowsClockwise,
} from '@phosphor-icons/react';
import type { Page } from '@/App';
import { apiRequest, ApiError } from '@/lib/api';

interface SessionsProps {
  setPage: (page: Page) => void;
  openSessionId?: string | number;
}

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'rescheduled'
  | 'attended'
  | 'no_show'
  | string;

interface TrainingSession {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  reservedCapacity: number;
  remainingCapacity: number;
  status: string;
  sessionType?: {
    id?: string;
    name?: string | null;
    description?: string | null;
    durationMinutes?: number | null;
  } | null;
  location?: {
    id?: string;
    name?: string | null;
    timezone?: string | null;
    addressDetails?: string | null;
  } | null;
}

interface Booking {
  id: string;
  trainingSessionId: string;
  status: BookingStatus;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  rescheduledFromBookingId?: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  attendanceAt?: string | null;
  session: {
    startsAt: string;
    endsAt: string;
    status: string;
    sessionType?: {
      id?: string;
      name?: string | null;
    } | null;
    location?: {
      id?: string;
      name?: string | null;
      timezone?: string | null;
    } | null;
  };
}

interface SessionsResponse {
  sessions: TrainingSession[];
}

interface BookingsResponse {
  bookings: Booking[];
}

interface BookingMutationResponse {
  booking: Booking;
  replayed?: boolean;
}

const DEFAULT_TIMEZONE = 'Europe/Malta';
const DISCOVERY_DAYS = 90;
const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed']);
const FINAL_BOOKING_STATUSES = new Set(['rejected', 'cancelled', 'rescheduled', 'attended', 'no_show']);

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateParts(value: string | Date, timezone = DEFAULT_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
}

function dateKeyForValue(value: string | Date, timezone = DEFAULT_TIMEZONE): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

interface CalendarMonth {
  year: number;
  month: number;
}

function calendarMonthFromDateKey(key: string): CalendarMonth {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

function shiftCalendarMonth(month: CalendarMonth, offset: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function compareCalendarMonths(left: CalendarMonth, right: CalendarMonth): number {
  return left.year === right.year ? left.month - right.month : left.year - right.year;
}

function formatCalendarMonth(month: CalendarMonth): string {
  const label = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  return `${label} ${month.year}`;
}

function formatDate(value: string, timezone = DEFAULT_TIMEZONE): string {
  const parts = formatDateParts(value, timezone);
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`.toUpperCase();
}

function formatTime(value: string, timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value)).replace(' am', ' AM').replace(' pm', ' PM');
}

function formatDuration(minutes?: number | null, fallbackStart?: string, fallbackEnd?: string): string {
  if (typeof minutes === 'number' && minutes > 0) return `${minutes} MIN`;
  if (fallbackStart && fallbackEnd) {
    const difference = Math.round((new Date(fallbackEnd).getTime() - new Date(fallbackStart).getTime()) / 60000);
    if (difference > 0) return `${difference} MIN`;
  }
  return '60 MIN';
}

function readableStatus(status: BookingStatus): string {
  if (status === 'no_show') return 'COMPLETED · NO-SHOW';
  if (status === 'attended') return 'COMPLETED · ATTENDED';
  if (status === 'rescheduled') return 'RESCHEDULED';
  return status.replace(/_/g, ' ').toUpperCase();
}

function isFutureBooking(booking: Booking, now = new Date()): boolean {
  return new Date(booking.session.startsAt).getTime() > now.getTime();
}

function isUpcomingBooking(booking: Booking): boolean {
  return isFutureBooking(booking) && ACTIVE_BOOKING_STATUSES.has(booking.status);
}

function isBookingActionable(booking: Booking): boolean {
  return isUpcomingBooking(booking) && booking.session.status === 'scheduled';
}

function apiErrorMessage(error: unknown, action: string): string {
  if (!(error instanceof ApiError)) return `We couldn't ${action}. Please try again.`;
  if (error.status === 0) return error.message;
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You do not have permission to manage bookings.';
  if (error.status === 409) return error.message || `This booking is no longer available to ${action}.`;
  if (error.status === 400) return error.message || 'Please check your selection and try again.';
  return error.message || `We couldn't ${action}. Please try again.`;
}

/* ── Status badge ──────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const label = readableStatus(status);
  if (status === 'confirmed') return <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 font-bold tracking-wider whitespace-nowrap">{label}</span>;
  if (status === 'pending') return <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-1 font-bold tracking-wider whitespace-nowrap">{label}</span>;
  if (status === 'attended') return <span className="flex items-center gap-1 text-[10px] text-green-400/70 font-bold tracking-wider"><CheckCircle size={10} weight="fill" /> {label}</span>;
  if (status === 'cancelled' || status === 'rejected' || status === 'no_show') {
    return <span className="flex items-center gap-1 text-[10px] text-red-500/60 font-bold tracking-wider"><XCircle size={10} weight="fill" /> {label}</span>;
  }
  if (status === 'rescheduled') return <span className="flex items-center gap-1 text-[10px] text-foreground/40 font-bold tracking-wider"><ArrowsClockwise size={10} weight="bold" /> {label}</span>;
  return <span className="text-[10px] bg-white/10 text-foreground/60 px-2 py-1 font-bold tracking-wider whitespace-nowrap">{label}</span>;
};

/* ── Shared loading and feedback states ───────────────────────────────────── */
function LoadingState({ label = 'Loading your sessions' }: { label?: string }) {
  return (
    <div className="border border-white/5 bg-[#111111] min-h-48 flex flex-col items-center justify-center gap-3" data-testid="sessions-loading">
      <SpinnerGap size={24} className="animate-spin text-primary" />
      <p className="text-[10px] font-bold tracking-[0.18em] text-foreground/40 uppercase">{label}</p>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="border border-white/5 bg-[#111111] min-h-48 flex flex-col items-center justify-center text-center px-6" data-testid="sessions-empty">
      <CalendarBlank size={25} className="text-foreground/25 mb-3" />
      <h3 className="text-sm font-bold tracking-wider">{title}</h3>
      <p className="text-xs text-foreground/35 mt-2 max-w-sm leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border border-red-500/20 bg-red-500/[0.04] min-h-48 flex flex-col items-center justify-center text-center px-6" role="alert" data-testid="sessions-error">
      <WarningCircle size={25} className="text-red-400/70 mb-3" />
      <h3 className="text-sm font-bold tracking-wider">Could not load sessions</h3>
      <p className="text-xs text-foreground/45 mt-2 max-w-sm leading-relaxed">{message}</p>
      <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:border-primary/50 hover:text-primary transition-colors">
        <ArrowClockwise size={13} weight="bold" /> Retry
      </button>
    </div>
  );
}

function ActionError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-5 md:mx-8 mt-5 flex items-start gap-3 border border-red-500/20 bg-red-500/[0.05] px-4 py-3" role="alert" data-testid="booking-action-error">
      <WarningCircle size={17} className="text-red-400/80 shrink-0 mt-0.5" />
      <p className="text-xs text-red-100/75 leading-relaxed flex-1">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss error" className="text-foreground/40 hover:text-foreground"><X size={15} /></button>
    </div>
  );
}

/* ── Session detail panel ──────────────────────────────────────────────────── */
function SessionDetail({ booking, onBack }: { booking: Booking; onBack: () => void }) {
  const timezone = booking.session.location?.timezone ?? DEFAULT_TIMEZONE;
  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-y-auto pb-28 md:pb-12"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      data-testid="session-detail"
    >
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-5 md:px-8 py-4">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors text-sm font-bold tracking-wider uppercase mb-4">
          <CaretLeft size={16} weight="bold" /> Sessions
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-foreground/35 uppercase">{formatDate(booking.session.startsAt, timezone)} · {formatTime(booking.session.startsAt, timezone)}</p>
            <h1 className="text-xl font-black tracking-wider mt-1">{booking.session.sessionType?.name || 'Personal Training Session'}</h1>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-foreground/45">
          <span className="flex items-center gap-1.5"><Timer size={12} weight="fill" />{formatDuration(undefined, booking.session.startsAt, booking.session.endsAt)}</span>
          <span className="flex items-center gap-1.5"><MapPin size={12} weight="fill" />{booking.session.location?.name || 'Location to be confirmed'}</span>
        </div>
      </div>
      <div className="px-5 md:px-8 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary/60 uppercase">Session Details</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="bg-[#111111] border border-white/5 p-5 space-y-4">
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-1">Booking status</p>
            <p className="text-sm font-bold">{readableStatus(booking.status)}</p>
          </div>
          {booking.rejectionReason && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-1">Marcus's note</p>
              <p className="text-sm text-foreground/60 leading-relaxed">{booking.rejectionReason}</p>
            </div>
          )}
          {booking.cancellationReason && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-1">Cancellation note</p>
              <p className="text-sm text-foreground/60 leading-relaxed">{booking.cancellationReason}</p>
            </div>
          )}
          {!booking.rejectionReason && !booking.cancellationReason && (
            <p className="text-sm text-foreground/45 leading-relaxed">
              {booking.status === 'pending'
                ? 'Marcus will review your request and confirm your session shortly.'
                : booking.status === 'confirmed'
                  ? 'Your session is confirmed. We look forward to seeing you.'
                  : 'This booking is part of your session history.'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Booking sheet ─────────────────────────────────────────────────────────── */
interface BookingSheetProps {
  sessions: TrainingSession[];
  bookings: Booking[];
  onClose: () => void;
  onBook: (sessionId: string, idempotencyKey: string) => Promise<BookingMutationResponse>;
  onMutationRejected: (message: string) => Promise<void>;
}

type BookingStep = 'date' | 'time' | 'confirm' | 'done';

function BookingSheet({ sessions, bookings, onClose, onBook, onMutationRejected }: BookingSheetProps) {
  const [step, setStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef<string | null>(null);
  const submissionInFlight = useRef(false);

  const activeSessionIds = useMemo(
    () => new Set(bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status)).map((booking) => booking.trainingSessionId)),
    [bookings],
  );
  const bookableSessions = useMemo(
    () => sessions.filter((session) =>
      session.status === 'scheduled'
      && new Date(session.startsAt).getTime() > Date.now()
      && session.remainingCapacity > 0
      && !activeSessionIds.has(session.id),
    ),
    [activeSessionIds, sessions],
  );
  const calendarStartMonth = useMemo(() => {
    const firstBookableDate = bookableSessions
      .map((session) => dateKeyForValue(session.startsAt, session.location?.timezone ?? DEFAULT_TIMEZONE))
      .sort()[0] ?? dateKeyForValue(new Date(), DEFAULT_TIMEZONE);
    return calendarMonthFromDateKey(firstBookableDate);
  }, [bookableSessions]);
  const [calMonth, setCalMonth] = useState<CalendarMonth>(() => calendarStartMonth);
  const sessionsByDate = useMemo(() => {
    const result = new Map<string, TrainingSession[]>();
    for (const session of bookableSessions) {
      const key = dateKeyForValue(session.startsAt, session.location?.timezone ?? DEFAULT_TIMEZONE);
      const existing = result.get(key) ?? [];
      result.set(key, [...existing, session].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    }
    return result;
  }, [bookableSessions]);
  const calDays = useMemo(() => {
    const days: ({ key: string; day: number } | null)[] = [];
    const firstDow = (new Date(Date.UTC(calMonth.year, calMonth.month - 1, 1)).getUTCDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) days.push(null);
    const daysInMonth = new Date(Date.UTC(calMonth.year, calMonth.month, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ key: `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day });
    }
    return days;
  }, [calMonth]);
  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : [];
  const selectedTimezone = selectedSession?.location?.timezone ?? DEFAULT_TIMEZONE;
  const selectedDateLabel = selectedDate && selectedSessions[0]
    ? formatDate(selectedSessions[0].startsAt, selectedTimezone)
    : selectedDate || '';

  const selectDate = (key: string) => {
    setSelectedDate(key);
    setSelectedSession(null);
    setError(null);
  };

  const submit = async () => {
    if (!selectedSession || submitting || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError(null);
    keyRef.current ??= createIdempotencyKey('booking');
    try {
      await onBook(selectedSession.id, keyRef.current);
      setStep('done');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'We couldn’t send your request. Please try again.';
      setError(message);
      await onMutationRejected(message);
      onClose();
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 md:inset-auto md:bottom-0 md:right-0 md:top-0 md:w-[400px] bg-[#111111] border-l border-white/8 z-50 flex flex-col overflow-hidden"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      data-testid="booking-sheet"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          {step !== 'date' && step !== 'done' && (
            <button onClick={() => { if (step === 'time') setStep('date'); if (step === 'confirm') setStep('time'); }} aria-label="Go back" className="text-foreground/50 hover:text-foreground transition-colors">
              <CaretLeft size={18} weight="bold" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold tracking-[0.12em] uppercase">
              {step === 'date' && 'Select a Date'}{step === 'time' && 'Choose a Time'}
              {step === 'confirm' && 'Confirm Booking'}{step === 'done' && 'Request Sent'}
            </h2>
            {step === 'date' && <p className="text-[10px] text-foreground/40 font-semibold tracking-wider mt-0.5">Real-time availability</p>}
            {step === 'time' && <p className="text-[10px] text-foreground/40 font-semibold tracking-wider mt-0.5">{selectedDateLabel}</p>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close booking sheet" className="text-foreground/40 hover:text-foreground transition-colors"><X size={18} weight="bold" /></button>
      </div>

      {step !== 'done' && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 shrink-0">
          {(['date', 'time', 'confirm'] as const).map((currentStep, index) => (
            <React.Fragment key={currentStep}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                currentStep === step ? 'bg-primary text-primary-foreground' :
                ['date', 'time', 'confirm'].indexOf(currentStep) < ['date', 'time', 'confirm'].indexOf(step)
                  ? 'bg-primary/30 text-primary' : 'bg-white/8 text-foreground/30'
              }`}>{index + 1}</div>
              {index < 2 && <div className={`flex-1 h-px ${['date', 'time', 'confirm'].indexOf(currentStep) < ['date', 'time', 'confirm'].indexOf(step) ? 'bg-primary/30' : 'bg-white/8'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'date' && (
            <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-5">
              {bookableSessions.length === 0 ? (
                <EmptyState title="No sessions available" description="There are no future sessions with open capacity right now. Check back after Marcus adds more availability." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCalMonth((month) => shiftCalendarMonth(month, -1))} disabled={compareCalendarMonths(calMonth, calendarStartMonth) <= 0} aria-label="Previous month" className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"><CaretLeft size={16} weight="bold" /></button>
                    <span className="text-sm font-bold tracking-[0.12em]">{formatCalendarMonth(calMonth)}</span>
                    <button onClick={() => setCalMonth((month) => shiftCalendarMonth(month, 1))} aria-label="Next month" className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"><CaretRight size={16} weight="bold" /></button>
                  </div>
                  <div className="grid grid-cols-7 mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => <div key={day} className="text-center text-[9px] font-bold tracking-widest text-foreground/25 uppercase py-1">{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calDays.map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} />;
                      const key = day.key;
                      const hasSessions = (sessionsByDate.get(key)?.length ?? 0) > 0;
                      const isSelected = selectedDate === key;
                      return (
                        <button key={key} aria-label={hasSessions ? `Available on ${key}` : `Unavailable on ${key}`} disabled={!hasSessions} onClick={() => selectDate(key)} className={`relative aspect-square rounded-sm flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-primary text-primary-foreground' : hasSessions ? 'hover:bg-white/8 text-foreground' : 'text-foreground/15 cursor-default'}`}>
                          <span className="text-sm font-bold leading-none">{day.day}</span>
                          {hasSessions && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-5 text-[9px] font-bold tracking-widest text-foreground/35 uppercase">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/60 inline-block" /> Available</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Unavailable</span>
                  </div>
                  {selectedDate && <button onClick={() => setStep('time')} className="w-full mt-6 bg-primary hover:bg-primary/90 py-4 rounded-full text-primary-foreground font-bold tracking-[0.15em] uppercase text-sm transition-colors">See Available Times</button>}
                </>
              )}
            </motion.div>
          )}

          {step === 'time' && (
            <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-5">
              <div className="mb-5">
                <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-1">Available sessions</p>
                <p className="text-sm font-bold">{selectedSessions.length} {selectedSessions.length === 1 ? 'time' : 'times'} open with Marcus</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectedSessions.map((session) => {
                  const timezone = session.location?.timezone ?? DEFAULT_TIMEZONE;
                  const isSelected = selectedSession?.id === session.id;
                  return (
                    <button key={session.id} data-testid={`session-option-${session.id}`} onClick={() => { setSelectedSession(session); setError(null); }} className={`py-3 rounded-xl border text-xs font-bold tracking-wider transition-all ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-white/12 text-foreground hover:border-primary/50 hover:bg-primary/8'}`}>
                      {formatTime(session.startsAt, timezone)}
                    </button>
                  );
                })}
              </div>
              {selectedSession && (
                <div className="mt-4 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
                  <MapPin size={16} weight="fill" className="text-primary shrink-0" />
                  <div>
                    <p className="text-[9px] font-black tracking-[0.2em] text-primary/60 uppercase mb-0.5">Location</p>
                    <p className="text-sm font-bold text-white">{selectedSession.location?.name || 'Location to be confirmed'}</p>
                    <p className="text-[10px] text-foreground/45 mt-0.5">{formatDuration(selectedSession.sessionType?.durationMinutes, selectedSession.startsAt, selectedSession.endsAt)} · {selectedSession.remainingCapacity} place{selectedSession.remainingCapacity === 1 ? '' : 's'} remaining</p>
                  </div>
                </div>
              )}
              {selectedSession && <button onClick={() => setStep('confirm')} className="w-full mt-5 bg-primary hover:bg-primary/90 py-4 rounded-full text-primary-foreground font-bold tracking-[0.15em] uppercase text-sm transition-colors">Continue</button>}
            </motion.div>
          )}

          {step === 'confirm' && selectedSession && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-5">
              <div className="bg-[#0D0D0D] border border-white/8 rounded-sm p-5 mb-6">
                <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-4">Booking summary</p>
                <div className="space-y-4">
                  {[
                    { icon: <CalendarBlank size={15} weight="fill" className="text-primary mt-0.5 shrink-0" />, label: 'Date', value: formatDate(selectedSession.startsAt, selectedTimezone) },
                    { icon: <Timer size={15} weight="fill" className="text-primary mt-0.5 shrink-0" />, label: 'Time', value: `${formatTime(selectedSession.startsAt, selectedTimezone)} · ${formatDuration(selectedSession.sessionType?.durationMinutes, selectedSession.startsAt, selectedSession.endsAt)}` },
                    { icon: <MapPin size={15} weight="fill" className="text-primary mt-0.5 shrink-0" />, label: 'Location', value: selectedSession.location?.name || 'Location to be confirmed' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">{icon}<div><p className="text-[9px] font-bold tracking-widest text-foreground/35 uppercase">{label}</p><p className="text-sm font-bold mt-0.5">{value}</p></div></div>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-300/80 leading-relaxed mb-5" role="alert">{error}</p>}
              <p className="text-xs text-foreground/40 leading-relaxed mb-6">Marcus will receive your request and confirm shortly. Your place is held only when the server accepts the request.</p>
              <button onClick={() => void submit()} disabled={submitting} data-testid="confirm-booking-button" className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-wait py-4 rounded-full text-primary-foreground font-bold tracking-[0.15em] uppercase text-sm transition-colors flex items-center justify-center gap-2">
                {submitting && <SpinnerGap size={16} className="animate-spin" />} {submitting ? 'Sending request…' : 'Confirm Booking'}
              </button>
            </motion.div>
          )}

          {step === 'done' && selectedSession && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="px-6 py-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5"><Check size={28} weight="bold" className="text-primary" /></div>
              <h3 className="text-lg font-bold tracking-wider mb-2">Request Sent</h3>
              <p className="text-sm text-foreground/50 leading-relaxed mb-1">{formatDate(selectedSession.startsAt, selectedTimezone)}</p>
              <p className="text-sm font-bold text-primary mb-6">{formatTime(selectedSession.startsAt, selectedTimezone)}</p>
              <p className="text-xs text-foreground/35 leading-relaxed max-w-[260px]">Your request is pending Marcus's confirmation. Your Sessions page will reflect the saved booking.</p>
              <button onClick={onClose} className="mt-10 w-full border border-white/12 hover:border-white/25 py-4 rounded-full text-sm font-bold tracking-[0.15em] uppercase text-foreground/60 hover:text-foreground transition-colors">Done</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Rescheduling sheet ─────────────────────────────────────────────────────── */
function RescheduleSheet({
  booking,
  sessions,
  bookings,
  onClose,
  onReschedule,
  onMutationRejected,
}: {
  booking: Booking;
  sessions: TrainingSession[];
  bookings: Booking[];
  onClose: () => void;
  onReschedule: (originalId: string, replacementId: string, idempotencyKey: string) => Promise<BookingMutationResponse>;
  onMutationRejected: (message: string) => Promise<void>;
}) {
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const keyRef = useRef<string | null>(null);
  const submissionInFlight = useRef(false);
  const activeSessionIds = useMemo(
    () => new Set(bookings.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).map((item) => item.trainingSessionId)),
    [bookings],
  );
  const replacements = useMemo(
    () => sessions
      .filter((session) =>
        session.id !== booking.trainingSessionId
        && session.status === 'scheduled'
        && new Date(session.startsAt).getTime() > Date.now()
        && session.remainingCapacity > 0
        && !activeSessionIds.has(session.id),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [activeSessionIds, booking.trainingSessionId, sessions],
  );
  const submit = async () => {
    if (!replacementId || submitting || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError(null);
    keyRef.current ??= createIdempotencyKey('reschedule');
    try {
      await onReschedule(booking.id, replacementId, keyRef.current);
      setDone(true);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'We couldn’t reschedule this booking. Please try again.';
      setError(message);
      await onMutationRejected(message);
      onClose();
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 md:inset-auto md:bottom-0 md:right-0 md:top-0 md:w-[440px] bg-[#111111] border-l border-white/8 z-50 flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} data-testid="reschedule-sheet">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          {!done && <button onClick={onClose} aria-label="Go back" className="text-foreground/50 hover:text-foreground"><CaretLeft size={18} weight="bold" /></button>}
          <div>
            <h2 className="text-base font-bold tracking-[0.12em] uppercase">{done ? 'Rescheduled' : 'Reschedule Session'}</h2>
            <p className="text-[10px] text-foreground/40 font-semibold tracking-wider mt-0.5">Choose a real available session</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close reschedule sheet" className="text-foreground/40 hover:text-foreground"><X size={18} weight="bold" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {done ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5"><Check size={28} weight="bold" className="text-primary" /></div>
            <h3 className="text-lg font-bold tracking-wider mb-2">Request Sent</h3>
            <p className="text-sm text-foreground/45 leading-relaxed max-w-[270px]">Your original booking remains in your history and the replacement is pending Marcus's confirmation.</p>
            <button onClick={onClose} className="mt-10 w-full border border-white/12 hover:border-white/25 py-4 rounded-full text-sm font-bold tracking-[0.15em] uppercase text-foreground/60 hover:text-foreground">Done</button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-2">Current booking</p>
              <div className="bg-[#0D0D0D] border border-white/8 p-4">
                <p className="text-sm font-bold">{formatDate(booking.session.startsAt, booking.session.location?.timezone ?? DEFAULT_TIMEZONE)}</p>
                <p className="text-xs text-foreground/45 mt-1">{formatTime(booking.session.startsAt, booking.session.location?.timezone ?? DEFAULT_TIMEZONE)} · {booking.session.location?.name || 'Location to be confirmed'}</p>
              </div>
            </div>
            {replacements.length === 0 ? (
              <EmptyState title="No replacement sessions" description="There are no other future sessions with open capacity right now." />
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/35 uppercase mb-3">Available replacements</p>
                {replacements.map((session) => {
                  const timezone = session.location?.timezone ?? DEFAULT_TIMEZONE;
                  return (
                    <button key={session.id} data-testid={`replacement-${session.id}`} onClick={() => { setReplacementId(session.id); setError(null); }} className={`w-full text-left border p-4 transition-colors ${replacementId === session.id ? 'border-primary bg-primary/10' : 'border-white/8 bg-[#0D0D0D] hover:border-primary/40'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{formatDate(session.startsAt, timezone)}</p>
                          <p className="text-xs text-foreground/45 mt-1">{formatTime(session.startsAt, timezone)} · {session.location?.name || 'Location to be confirmed'}</p>
                        </div>
                        {replacementId === session.id && <Check size={17} className="text-primary shrink-0" weight="bold" />}
                      </div>
                      <p className="text-[10px] text-foreground/35 mt-2">{formatDuration(session.sessionType?.durationMinutes, session.startsAt, session.endsAt)} · {session.remainingCapacity} place{session.remainingCapacity === 1 ? '' : 's'} remaining</p>
                    </button>
                  );
                })}
              </div>
            )}
            {error && <p className="text-xs text-red-300/80 leading-relaxed mt-5" role="alert">{error}</p>}
            <button onClick={() => void submit()} disabled={!replacementId || submitting} data-testid="confirm-reschedule-button" className="w-full mt-6 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-full text-primary-foreground font-bold tracking-[0.15em] uppercase text-sm transition-colors flex items-center justify-center gap-2">
              {submitting && <SpinnerGap size={16} className="animate-spin" />} {submitting ? 'Sending request…' : 'Confirm Reschedule'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Animations ────────────────────────────────────────────────────────────── */
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

/* ── Main page ─────────────────────────────────────────────────────────────── */
export const Sessions = ({ setPage, openSessionId }: SessionsProps) => {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<Booking | null>(null);
  const [mutating, setMutating] = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const cancellationInFlight = useRef(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      const from = new Date();
      const to = new Date(from.getTime() + DISCOVERY_DAYS * 24 * 60 * 60 * 1000);
      const [sessionResponse, bookingResponse] = await Promise.all([
        apiRequest<SessionsResponse>(`/training-sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { signal }),
        apiRequest<BookingsResponse>('/bookings', { signal }),
      ]);
      setSessions(Array.isArray(sessionResponse.sessions) ? sessionResponse.sessions : []);
      setBookings(Array.isArray(bookingResponse.bookings) ? bookingResponse.bookings : []);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(apiErrorMessage(error, 'load your sessions'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    if (typeof openSessionId !== 'string') return;
    const matched = bookings.find((booking) => booking.id === openSessionId);
    if (matched) setDetailBooking(matched);
  }, [bookings, openSessionId]);

  const refreshData = async () => {
    setLoading(true);
    await loadData();
  };
  const reconcileRejectedMutation = async (message: string) => {
    setActionError(message);
    await refreshData();
  };

  const upcomingBookings = useMemo(
    () => bookings.filter(isUpcomingBooking).sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt)),
    [bookings],
  );
  const historicalBookings = useMemo(
    () => bookings.filter((booking) => !isUpcomingBooking(booking)).sort((a, b) => b.session.startsAt.localeCompare(a.session.startsAt)),
    [bookings],
  );

  const createBooking = async (sessionId: string, idempotencyKey: string): Promise<BookingMutationResponse> => {
    setMutating(`book:${sessionId}`);
    setActionError(null);
    try {
      const response = await apiRequest<BookingMutationResponse>('/bookings', {
        method: 'POST',
        body: {
          trainingSessionId: sessionId,
          idempotencyKey,
        },
      });
      await refreshData();
      return response;
    } catch (error) {
      const message = apiErrorMessage(error, 'send your booking request');
      throw new Error(message);
    } finally {
      setMutating(null);
    }
  };

  const cancelBooking = async () => {
    if (!confirmingCancel || mutating || cancellationInFlight.current) return;
    cancellationInFlight.current = true;
    const booking = confirmingCancel;
    setMutating(`cancel:${booking.id}`);
    setActionError(null);
    try {
      await apiRequest(`/bookings/${booking.id}/cancel`, { method: 'POST' });
      setConfirmingCancel(null);
      await refreshData();
    } catch (error) {
      const message = apiErrorMessage(error, 'cancel this booking');
      await reconcileRejectedMutation(message);
      setConfirmingCancel(null);
    } finally {
      cancellationInFlight.current = false;
      setMutating(null);
    }
  };

  const reschedule = async (originalId: string, replacementId: string, idempotencyKey: string): Promise<BookingMutationResponse> => {
    setMutating(`reschedule:${originalId}`);
    setActionError(null);
    try {
      const response = await apiRequest<BookingMutationResponse>(`/bookings/${originalId}/reschedule`, {
        method: 'POST',
        body: {
          replacementTrainingSessionId: replacementId,
          idempotencyKey,
        },
      });
      await refreshData();
      return response;
    } catch (error) {
      const message = apiErrorMessage(error, 'reschedule this booking');
      throw new Error(message);
    } finally {
      setMutating(null);
    }
  };

  const closeDetail = () => setDetailBooking(null);
  const renderBookingCard = (booking: Booking, historical: boolean) => {
    const timezone = booking.session.location?.timezone ?? DEFAULT_TIMEZONE;
    const actionable = !historical && isBookingActionable(booking);
    const isCancelling = mutating === `cancel:${booking.id}`;
    const isRescheduling = mutating === `reschedule:${booking.id}`;
    return (
      <motion.div key={booking.id} variants={itemVariants} data-testid={`booking-${booking.id}`}>
        <div className={`bg-[#111111] border ${historical ? 'border-white/5' : 'border-l-2 border-l-primary border-y-white/5 border-r-white/5'} p-5 rounded-r-sm h-full ${historical && FINAL_BOOKING_STATUSES.has(booking.status) ? 'opacity-60' : ''}`}>
          <div className="flex justify-between items-start gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest text-foreground/40 uppercase">{booking.session.sessionType?.name || 'Personal Training'}</p>
            <StatusBadge status={booking.status} />
          </div>
          <h4 className={`${historical ? 'text-sm' : 'text-base'} font-bold tracking-wider mb-4 ${historical ? 'text-foreground/80' : ''}`}>
            {formatDate(booking.session.startsAt, timezone)}<br />{formatTime(booking.session.startsAt, timezone)}
          </h4>
          <div className="flex flex-col gap-1.5 text-xs text-foreground/55 font-semibold mb-5">
            <div className="flex items-center gap-2"><Timer size={12} weight="fill" /><span>{formatDuration(undefined, booking.session.startsAt, booking.session.endsAt)}</span></div>
            <div className="flex items-center gap-2"><MapPin size={12} weight="fill" /><span>{booking.session.location?.name || 'Location to be confirmed'}</span></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => setDetailBooking(booking)} className={`${actionable ? 'flex-1' : ''} bg-primary/10 border border-primary/25 py-2 px-3 text-[10px] font-bold tracking-widest uppercase text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1`}>
              View Details <CaretRight size={11} weight="bold" />
            </button>
            {actionable && (
              <>
                <button onClick={() => setRescheduleBooking(booking)} disabled={Boolean(mutating)} className="border border-white/10 py-2 px-3 text-[10px] font-bold tracking-widest uppercase text-foreground/55 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-colors flex items-center justify-center gap-1">
                  <ArrowsClockwise size={11} weight="bold" /> Reschedule
                </button>
                <button onClick={() => setConfirmingCancel(booking)} disabled={Boolean(mutating)} className="border border-white/10 py-2 px-3 text-[10px] font-bold tracking-widest uppercase text-red-500/60 hover:text-red-400 hover:border-red-500/30 disabled:opacity-40 transition-colors">
                  {isCancelling ? <SpinnerGap size={13} className="animate-spin" /> : 'Cancel'}
                </button>
              </>
            )}
            {isRescheduling && <span className="sr-only">Rescheduling</span>}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 md:pb-0">
      <header className="px-5 md:px-8 py-5 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Sessions</h1>
            <p className="text-xs text-foreground/40 font-semibold tracking-wider mt-0.5 hidden md:block">Manage your training schedule</p>
          </div>
          <button onClick={() => { setActionError(null); setShowBooking(true); }} disabled={loading} data-testid="book-session-button" className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors">
            <Plus size={13} weight="bold" /> Book Session
          </button>
        </div>
        <div className="flex gap-0 border border-white/10 w-fit">
          {(['upcoming', 'past'] as const).map((currentTab) => (
            <button key={currentTab} onClick={() => setTab(currentTab)} className={`px-6 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors ${tab === currentTab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {currentTab}
            </button>
          ))}
        </div>
      </header>

      {actionError && <ActionError message={actionError} onDismiss={() => setActionError(null)} />}

      <div className="px-5 md:px-8 pt-6">
        {loading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={refreshData} /> : (
          <AnimatePresence mode="wait">
            {tab === 'upcoming' ? (
              <motion.div key="upcoming" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                {upcomingBookings.length === 0
                  ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No upcoming bookings" description="You don't have any upcoming sessions yet. Browse real availability to send Marcus a booking request." action={<button onClick={() => setShowBooking(true)} className="mt-5 bg-primary px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase text-primary-foreground">Book a Session</button>} /></div>
                  : upcomingBookings.map((booking) => renderBookingCard(booking, false))}
              </motion.div>
            ) : (
              <motion.div key="past" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                {historicalBookings.length === 0
                  ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No session history" description="Completed and past bookings will appear here after you attend a session." /></div>
                  : historicalBookings.map((booking) => renderBookingCard(booking, true))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {detailBooking && <SessionDetail booking={detailBooking} onBack={closeDetail} />}
        {showBooking && <><motion.div className="fixed inset-0 bg-black/70 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBooking(false)} /><BookingSheet sessions={sessions} bookings={bookings} onClose={() => setShowBooking(false)} onBook={createBooking} onMutationRejected={reconcileRejectedMutation} /></>}
        {rescheduleBooking && <><motion.div className="fixed inset-0 bg-black/70 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!mutating) setRescheduleBooking(null); }} /><RescheduleSheet booking={rescheduleBooking} sessions={sessions} bookings={bookings} onClose={() => setRescheduleBooking(null)} onReschedule={reschedule} onMutationRejected={reconcileRejectedMutation} /></>}
        {confirmingCancel && (
          <motion.div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="w-full max-w-sm bg-[#151515] border border-white/10 p-6">
              <h2 id="cancel-title" className="text-base font-bold tracking-wider">Cancel this booking?</h2>
              <p className="text-xs text-foreground/45 leading-relaxed mt-3">This will release your place for {formatDate(confirmingCancel.session.startsAt, confirmingCancel.session.location?.timezone ?? DEFAULT_TIMEZONE)} at {formatTime(confirmingCancel.session.startsAt, confirmingCancel.session.location?.timezone ?? DEFAULT_TIMEZONE)}. The server will confirm whether it is still eligible.</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmingCancel(null)} disabled={Boolean(mutating)} className="flex-1 border border-white/12 py-3 text-[10px] font-bold tracking-widest uppercase text-foreground/60 hover:text-foreground disabled:opacity-40">Keep Booking</button>
                <button onClick={() => void cancelBooking()} disabled={Boolean(mutating)} className="flex-1 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 py-3 text-[10px] font-bold tracking-widest uppercase text-white flex items-center justify-center gap-2">
                  {mutating === `cancel:${confirmingCancel.id}` && <SpinnerGap size={13} className="animate-spin" />} Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};