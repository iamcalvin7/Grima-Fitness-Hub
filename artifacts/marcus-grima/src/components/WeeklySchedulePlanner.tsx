import React, { useState } from 'react';
import {
  CaretLeft, CaretRight, Plus, DotsThree, Trash, CopySimple, PencilSimple, MapPin, Users, WarningCircle
} from '@phosphor-icons/react';
import { apiRequest } from '@/lib/api';
import type { Location, ManagedSession, SessionType } from '@/pages/MarcusSessionsHQ';

type Execute = (id: string, request: Promise<unknown>) => Promise<boolean>;

function localDateKey(iso: string, timezone = 'Europe/Malta') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso)).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mondayKey(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return mondayKey();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateTime(date.toISOString()).slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : dateKey;
}

function displayDayLong(iso: string, timezone?: string | null) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone ?? 'Europe/Malta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

function displayTime(iso: string, timezone?: string | null) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone ?? 'Europe/Malta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function dateKeyParts(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function displayDateKey(dateKey: string, options: Intl.DateTimeFormatOptions) {
  const { year, month, day } = dateKeyParts(dateKey);
  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function displayWeekRange(startKey: string, endKey: string) {
  const start = dateKeyParts(startKey);
  const end = dateKeyParts(endKey);
  const startDay = displayDateKey(startKey, { day: 'numeric' });
  const endDay = displayDateKey(endKey, { day: 'numeric' });
  const startMonth = displayDateKey(startKey, { month: 'short' });
  const endMonth = displayDateKey(endKey, { month: 'short' });
  if (start.year === end.year && start.month === end.month) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.year}`;
  }
  return `${startDay} ${startMonth} ${start.year} – ${endDay} ${endMonth} ${end.year}`;
}

function zonedDateTimeToIso(dateKey: string, time: string, timezone: string) {
  const { year, month, day } = dateKeyParts(dateKey);
  const [hours, minutes] = time.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(utcGuess).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const offsetMinutes = match
    ? (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === '-' ? -1 : 1)
    : 0;
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number) {
  const bounded = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${String(Math.floor(bounded / 60)).padStart(2, '0')}:${String(bounded % 60).padStart(2, '0')}`;
}

function zonedMinutesNow(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function PlannerModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#111] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm font-bold text-white/50 hover:text-white">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LocationForm({ submitting, onClose, onSave }: { submitting: boolean; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', timezone: 'Europe/Malta', addressDetails: '' });
  return <PlannerModal title="Add location" onClose={onClose}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave(form); }}>
    <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" /></label>
    <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Timezone<input required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" /></label>
    <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Address details<textarea value={form.addressDetails} onChange={(event) => setForm({ ...form, addressDetails: event.target.value })} rows={3} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" /></label>
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Save location</button></div>
  </form></PlannerModal>;
}
function defaultTimesForDay(dateKey: string, existingSlots: ManagedSession[], timezone: string) {
  let defaultStart = '09:00';
  let defaultEnd = '10:00';

  if (existingSlots.length > 0) {
    const lastSlot = existingSlots
      .slice()
      .sort((left, right) => new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime())
      .at(-1);
    if (lastSlot) {
      defaultStart = displayTime(lastSlot.endsAt, lastSlot.location?.timezone ?? timezone);
      const startMinutes = timeToMinutes(defaultStart);
      defaultEnd = formatTime(startMinutes >= 23 * 60 ? 23 * 60 + 59 : startMinutes + 60);
    }
  } else {
    const now = new Date();
    const todayKey = localDateKey(now.toISOString(), timezone);
    if (dateKey === todayKey) {
      const minutes = Math.ceil((zonedMinutesNow(timezone) + 30) / 30) * 30;
      defaultStart = formatTime(minutes);
      defaultEnd = formatTime(Math.min(24 * 60 - 1, minutes + 60));
    }
  }
  return { startsAt: defaultStart, endsAt: defaultEnd };
}

function InlineSlotForm({
  dateKey,
  mode,
  sourceSession,
  locations,
  sessionTypes,
  existingSlots,
  timezone,
  submitting,
  onClose,
  onSave
}: {
  dateKey: string;
  mode: 'create' | 'edit' | 'duplicate';
  sourceSession?: ManagedSession;
  locations: Location[];
  sessionTypes: SessionType[];
  existingSlots: ManagedSession[];
  timezone: string;
  submitting: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const isEdit = mode === 'edit';
  const defaults = sourceSession
    ? {
         startsAt: displayTime(sourceSession.startsAt, sourceSession.location?.timezone ?? timezone),
         endsAt: displayTime(sourceSession.endsAt, sourceSession.location?.timezone ?? timezone),
        locationId: sourceSession.locationId,
        sessionTypeId: sourceSession.sessionTypeId ?? '',
        capacity: String(sourceSession.capacity),
      }
    : (() => {
         const t = defaultTimesForDay(dateKey, existingSlots, timezone);
        return {
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          locationId: locations[0]?.id ?? '',
          sessionTypeId: '',
          capacity: '4',
        };
      })();

  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const startsAt = new Date(zonedDateTimeToIso(dateKey, form.startsAt, timezone));
    const endsAt = new Date(zonedDateTimeToIso(dateKey, form.endsAt, timezone));
    const capacity = Number(form.capacity);

    if (!form.locationId) nextErrors.locationId = 'Required';
    if (!form.startsAt || !Number.isFinite(startsAt.getTime())) {
      nextErrors.startsAt = 'Invalid';
    } else if (startsAt <= new Date()) {
      nextErrors.startsAt = 'Must be future';
    }
    if (!form.endsAt || !Number.isFinite(endsAt.getTime())) {
      nextErrors.endsAt = 'Invalid';
    } else if (Number.isFinite(startsAt.getTime()) && endsAt <= startsAt) {
      nextErrors.endsAt = 'Must be after start';
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
      nextErrors.capacity = '1-10000';
    }
    console.log("Validation errors:", nextErrors, "for startsAt:", startsAt, "new Date:", new Date(), "endsAt:", endsAt);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    void onSave({
      locationId: form.locationId,
      sessionTypeId: form.sessionTypeId || null,
       startsAt: zonedDateTimeToIso(dateKey, form.startsAt, timezone),
       endsAt: zonedDateTimeToIso(dateKey, form.endsAt, timezone),
      capacity: Number(form.capacity),
    });
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-md p-4 my-2 animate-in fade-in slide-in-from-top-2 duration-200" data-testid={`inline-slot-form-${dateKey}`}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Start</label>
            <input required type="time" value={form.startsAt} onChange={e => setForm({...form, startsAt: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white" data-testid={`input-slot-start-${dateKey}`} />
            {errors.startsAt && <span className="text-[10px] text-red-400 mt-1 block">{errors.startsAt}</span>}
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">End</label>
            <input required type="time" value={form.endsAt} onChange={e => setForm({...form, endsAt: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white" data-testid={`input-slot-end-${dateKey}`} />
            {errors.endsAt && <span className="text-[10px] text-red-400 mt-1 block">{errors.endsAt}</span>}
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Session type (optional)</label>
            <select value={form.sessionTypeId} onChange={e => setForm({...form, sessionTypeId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white" data-testid={`select-slot-type-${dateKey}`}>
              <option value="">(None)</option>
              {sessionTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Location</label>
            <select required value={form.locationId} onChange={e => setForm({...form, locationId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white" data-testid={`select-slot-location-${dateKey}`}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {errors.locationId && <span className="text-[10px] text-red-400 mt-1 block">{errors.locationId}</span>}
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Capacity</label>
            <input required type="number" min="1" max="10000" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white" data-testid={`input-slot-capacity-${dateKey}`} />
            {errors.capacity && <span className="text-[10px] text-red-400 mt-1 block">{errors.capacity}</span>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} data-testid="btn-save-session" className="bg-white text-black px-4 py-1.5 text-xs font-bold rounded hover:bg-white/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : mode === 'duplicate' ? 'Save Copy' : 'Add Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function WeeklySchedulePlanner({ sessions, locations, sessionTypes, execute, actionId }: { sessions: ManagedSession[]; locations: Location[]; sessionTypes: SessionType[]; execute: Execute; actionId: string | null }) {
  const [weekStart, setWeekStart] = useState(mondayKey);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [copyReport, setCopyReport] = useState<string | null>(null);

  type FormState = {
    mode: 'create' | 'edit' | 'duplicate';
    dateKey: string;
    sourceSession?: ManagedSession;
  };
  const [activeForm, setActiveForm] = useState<FormState | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const activeLocations = locations.filter((location) => location.isActive);
  const scheduleTimezone = activeLocations[0]?.timezone ?? 'Europe/Malta';
  const todayKey = localDateKey(new Date().toISOString(), scheduleTimezone);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const saveSlot = async (body: Record<string, unknown>) => {
    if (!activeForm) return;
    const isEdit = activeForm.mode === 'edit';
    const id = activeForm.sourceSession?.id;
    const path = isEdit ? `/admin/training-sessions/${id}` : '/admin/training-sessions';
    const method = isEdit ? 'PATCH' : 'POST';
    const action = isEdit ? `edit-${id}` : 'create-session';

    const succeeded = await execute(action, apiRequest(path, { method, body }));
    if (succeeded) {
      setActiveForm(null);
    }
  };

  const copyPreviousWeek = async () => {
    const succeeded = await execute('copy-previous-week', apiRequest<{ created: unknown[]; skipped: unknown[]; conflicts: unknown[] }>('/admin/training-sessions/copy-previous-week', { method: 'POST', body: { targetWeekStart: weekStart } }).then((result) => {
      setCopyReport(`${result.created.length} created, ${result.skipped.length} skipped, ${result.conflicts.length} conflict${result.conflicts.length === 1 ? '' : 's'}. Bookings were not copied.`);
      return result;
    }));
    if (!succeeded) setCopyReport(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Weekly Schedule</p>
          <h2 className="mt-1 text-lg font-bold text-white tracking-tight">Set when clients can book you.</h2>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-white/45">
              {activeLocations.length ? `${activeLocations.length} active location${activeLocations.length === 1 ? '' : 's'} available` : 'Create a location before adding slots.'}
            </span>
            <button type="button" onClick={() => setCreatingLocation(true)} className="font-bold text-primary hover:text-white transition-colors" data-testid="btn-add-location-inline">Add a location</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-md border border-white/10 p-0.5">
            <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 rounded-sm transition-colors" aria-label="Previous week" data-testid="button-previous-week">
              <CaretLeft weight="bold" size={14} /> Previous
            </button>
            <span className="px-3 py-1.5 text-center text-sm font-bold text-white" data-testid="text-week-range">{displayWeekRange(weekStart, weekEnd)}</span>
            <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 rounded-sm transition-colors" aria-label="Next week" data-testid="button-next-week">
              Next <CaretRight weight="bold" size={14} />
            </button>
          </div>
          <button type="button" onClick={copyPreviousWeek} disabled={actionId !== null} className="px-3 py-2 border border-white/10 rounded-md text-xs font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5" data-testid="btn-copy-previous-week">
            <CopySimple size={14} />
            <span className="hidden md:inline">{actionId === 'copy-previous-week' ? 'Copying...' : 'Copy Previous Week'}</span>
          </button>
        </div>
      </div>

      {copyReport && (
        <p role="status" data-testid="copy-week-report" className="px-4 py-3 rounded-md border border-primary/25 bg-primary/10 text-xs text-primary font-medium flex items-center gap-2">
          <WarningCircle size={16} />
          {copyReport}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {days.map((dayDate) => {
          const daySlots = sessions.filter(session => {
            const date = localDateKey(session.startsAt, scheduleTimezone);
            return session.status === 'scheduled' && date === dayDate;
          }).sort((left, right) => left.startsAt.localeCompare(right.startsAt));

          const formOpen = activeForm?.dateKey === dayDate;
          const isPastDay = dayDate < todayKey;
          const isToday = dayDate === todayKey;
          const canAdd = activeLocations.length > 0
            && !isPastDay
            && (!isToday || zonedMinutesNow(scheduleTimezone) < 23 * 60 + 59)
            && actionId === null;

          return (
            <section key={dayDate} className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden flex flex-col" data-testid={`day-section-${dayDate}`}>
              {/* Day Header */}
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide" data-testid={`text-day-heading-${dayDate}`}>{displayDayLong(dayDate)}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveForm({ mode: 'create', dateKey: dayDate })}
                   disabled={!canAdd}
                  className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  data-testid={`btn-create-session-${dayDate}`}
                  aria-label={`Add slot on ${dayDate}`}
                   title={isPastDay ? 'Past days cannot receive new slots.' : undefined}
                >
                  <Plus weight="bold" size={16} />
                </button>
              </div>

              {/* Day Content */}
              <div className="p-2 md:p-3 flex flex-col gap-1">
                {daySlots.length === 0 && !formOpen && (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs font-medium text-white/30 uppercase tracking-widest" data-testid={`text-no-availability-${dayDate}`}>No availability</p>
                  </div>
                )}

                {daySlots.map(slot => {
                  const locked = slot.reservedCapacity > 0;
                  const isEditingThis = activeForm?.mode === 'edit' && activeForm.sourceSession?.id === slot.id;
                  const isDuplicatingThis = activeForm?.mode === 'duplicate' && activeForm.sourceSession?.id === slot.id;

                  if (isEditingThis || isDuplicatingThis) {
                    return (
                      <div key={`form-${slot.id}`} className="px-2">
                        <InlineSlotForm
                          dateKey={dayDate}
                          mode={activeForm.mode}
                          sourceSession={activeForm.sourceSession}
                          locations={activeLocations}
                          sessionTypes={sessionTypes}
                          existingSlots={daySlots}
                           timezone={scheduleTimezone}
                          submitting={actionId === 'create-session' || actionId === `edit-${slot.id}`}
                          onClose={() => setActiveForm(null)}
                          onSave={saveSlot}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={slot.id} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 flex-1">
                        <div className="text-sm font-bold text-white min-w-[100px]">
                          {displayTime(slot.startsAt, slot.location?.timezone)} - {displayTime(slot.endsAt, slot.location?.timezone)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 text-white/60">
                            <MapPin size={14} className="text-white/40" />
                            {slot.location?.name}
                          </span>
                          {slot.sessionType && (
                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-medium">
                              {slot.sessionType.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-white/60">
                            <Users size={14} className="text-white/40" />
                            {slot.reservedCapacity}/{slot.capacity}
                          </span>
                          {locked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">Locked</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300">Open</span>
                          )}
                        </div>
                      </div>

                      <div className="absolute right-3 top-2.5 md:relative md:top-auto flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === slot.id ? null : slot.id)}
                          disabled={actionId !== null}
                          className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/10 disabled:opacity-40 transition-colors"
                          data-testid={`btn-session-actions-${slot.id}`}
                          aria-label={`Actions for slot at ${displayTime(slot.startsAt, slot.location?.timezone)}`}
                          aria-expanded={openMenuId === slot.id}
                        >
                          <DotsThree size={20} weight="bold" />
                        </button>
                        {openMenuId === slot.id && (
                          <div className="absolute right-0 top-9 z-10 w-32 rounded-md border border-white/10 bg-[#151515] p-1 shadow-xl" role="menu">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setActiveForm({ mode: 'edit', dateKey: dayDate, sourceSession: slot });
                              }}
                              disabled={locked || actionId !== null}
                              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-40"
                              data-testid={`btn-edit-session-${slot.id}`}
                              role="menuitem"
                            >
                              <PencilSimple size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setActiveForm({ mode: 'duplicate', dateKey: dayDate, sourceSession: slot });
                              }}
                              disabled={actionId !== null}
                              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-40"
                              data-testid={`btn-duplicate-session-${slot.id}`}
                              role="menuitem"
                            >
                              <CopySimple size={14} /> Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                if (window.confirm('Delete this unbooked slot?')) {
                                  void execute(`delete-${slot.id}`, apiRequest(`/admin/training-sessions/${slot.id}`, { method: 'DELETE' }));
                                }
                              }}
                              disabled={locked || actionId !== null}
                              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-medium text-red-300 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-40"
                              data-testid={`btn-delete-session-${slot.id}`}
                              role="menuitem"
                            >
                              <Trash size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeForm?.mode === 'create' && formOpen && (
                  <div className="px-2">
                    <InlineSlotForm
                      dateKey={dayDate}
                      mode="create"
                      locations={activeLocations}
                      sessionTypes={sessionTypes}
                      existingSlots={daySlots}
                       timezone={scheduleTimezone}
                      submitting={actionId === 'create-session'}
                      onClose={() => setActiveForm(null)}
                      onSave={saveSlot}
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {creatingLocation && (
        <LocationForm submitting={actionId === 'create-location'} onClose={() => setCreatingLocation(false)} onSave={async (body) => { const succeeded = await execute('create-location', apiRequest('/admin/training-locations', { method: 'POST', body })); if (succeeded) setCreatingLocation(false); }} />
      )}
    </div>
  );
}
