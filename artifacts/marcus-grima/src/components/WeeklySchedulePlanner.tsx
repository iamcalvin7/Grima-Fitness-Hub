import React, { useState } from 'react';
import { CalendarBlank, Plus } from '@phosphor-icons/react';
import { apiRequest } from '@/lib/api';
import type { Location, ManagedSession } from '@/pages/MarcusSessionsHQ';

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
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateTime(date.toISOString()).slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function defaultSlotDateTimes(weekStart: string) {
  const weekEnd = addDays(weekStart, 6);
  const now = new Date();
  const today = localDateTime(now.toISOString()).slice(0, 10);
  let date = weekStart;
  let minutes = 10 * 60;

  if (today >= weekStart && today <= weekEnd) {
    date = today;
    minutes = Math.max(
      minutes,
      Math.ceil((now.getHours() * 60 + now.getMinutes() + 30) / 30) * 30,
    );
    if (minutes + 60 > 24 * 60 && date < weekEnd) {
      date = addDays(date, 1);
      minutes = 10 * 60;
    }
  }

  const formatTime = (value: number) => {
    const hours = Math.floor(value / 60);
    const remainder = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };
  return {
    date,
    startsAt: formatTime(minutes),
    endsAt: formatTime(minutes + 60),
  };
}

function displayDay(iso: string, timezone?: string | null) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone ?? 'Europe/Malta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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

function PlannerModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#111] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
      <div className="mb-6 flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-white">{title}</h3><button type="button" onClick={onClose} className="text-sm font-bold text-white/50 hover:text-white">Close</button></div>
      {children}
    </div>
  </div>;
}

function SlotForm({
  session,
  duplicate,
  weekStart,
  locations,
  submitting,
  onClose,
  onSave,
}: {
  session: ManagedSession | null;
  duplicate: ManagedSession | null;
  weekStart: string;
  locations: Location[];
  submitting: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const source = session ?? duplicate;
  const defaults = source
    ? { date: localDateTime(source.startsAt).slice(0, 10), startsAt: localDateTime(source.startsAt).slice(11, 16), endsAt: localDateTime(source.endsAt).slice(11, 16) }
    : defaultSlotDateTimes(weekStart);
  const [form, setForm] = useState({
    date: defaults.date,
    startsAt: defaults.startsAt,
    endsAt: defaults.endsAt,
    locationId: source?.locationId ?? locations[0]?.id ?? '',
    capacity: String(source?.capacity ?? 4),
    marcusNotes: session?.marcusNotes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const startsAt = new Date(`${form.date}T${form.startsAt}`);
    const endsAt = new Date(`${form.date}T${form.endsAt}`);
    const capacity = Number(form.capacity);
    if (!form.date || !Number.isFinite(startsAt.getTime())) {
      nextErrors.date = 'Enter a valid date and start time.';
    }
    if (!form.locationId) nextErrors.locationId = 'Choose an active location.';
    if (!form.startsAt || !Number.isFinite(startsAt.getTime())) {
      nextErrors.startsAt = 'Enter a valid start time.';
    } else if (startsAt <= new Date()) {
      nextErrors.startsAt = 'Start time must be in the future.';
    }
    if (!form.endsAt || !Number.isFinite(endsAt.getTime())) {
      nextErrors.endsAt = 'Enter a valid end time.';
    } else if (Number.isFinite(startsAt.getTime()) && endsAt <= startsAt) {
      nextErrors.endsAt = 'End time must be after the start time.';
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
      nextErrors.capacity = 'Maximum Clients must be a whole number from 1 to 10,000.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return <PlannerModal title={session ? 'Edit slot' : duplicate ? 'Duplicate slot' : 'Add bookable slot'} onClose={onClose}>
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (!validate()) return;
      void onSave({
        locationId: form.locationId,
        startsAt: new Date(`${form.date}T${form.startsAt}`).toISOString(),
        endsAt: new Date(`${form.date}T${form.endsAt}`).toISOString(),
        capacity: Number(form.capacity),
        ...(session ? { marcusNotes: form.marcusNotes || null } : {}),
      });
    }}>
      {duplicate && <p className="rounded border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">Choose a different date or time before saving the copy.</p>}
      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs font-bold uppercase tracking-wider text-white/60">Date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" />{errors.date && <span className="mt-1 block normal-case tracking-normal text-red-300">{errors.date}</span>}</label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/60">Location<select required value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white"><option value="" disabled>Select…</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>{errors.locationId && <span className="mt-1 block normal-case tracking-normal text-red-300">{errors.locationId}</span>}</label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/60">Start time<input required type="time" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" />{errors.startsAt && <span className="mt-1 block normal-case tracking-normal text-red-300">{errors.startsAt}</span>}</label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/60">End time<input required type="time" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" />{errors.endsAt && <span className="mt-1 block normal-case tracking-normal text-red-300">{errors.endsAt}</span>}</label>
        <label className="col-span-2 text-xs font-bold uppercase tracking-wider text-white/60">Maximum Clients<input required min="1" max="10000" type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" />{errors.capacity && <span className="mt-1 block normal-case tracking-normal text-red-300">{errors.capacity}</span>}</label>
      </div>
      {session && <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Internal notes<textarea value={form.marcusNotes} onChange={(event) => setForm({ ...form, marcusNotes: event.target.value })} rows={3} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white" /></label>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50" data-testid="btn-save-session">{submitting ? 'Saving…' : 'Save slot'}</button></div>
    </form>
  </PlannerModal>;
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

export function WeeklySchedulePlanner({ sessions, locations, execute, actionId }: { sessions: ManagedSession[]; locations: Location[]; execute: Execute; actionId: string | null }) {
  const [weekStart, setWeekStart] = useState(mondayKey);
  const [editing, setEditing] = useState<ManagedSession | null>(null);
  const [duplicating, setDuplicating] = useState<ManagedSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [copyReport, setCopyReport] = useState<string | null>(null);
  const weekEnd = addDays(weekStart, 6);
  const activeLocations = locations.filter((location) => location.isActive);
  const slots = sessions.filter((session) => {
    const date = localDateKey(session.startsAt, session.location?.timezone ?? 'Europe/Malta');
    return session.status === 'scheduled' && date >= weekStart && date <= weekEnd;
  }).sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  const saveSlot = async (body: Record<string, unknown>) => {
    const path = editing ? `/admin/training-sessions/${editing.id}` : '/admin/training-sessions';
    const succeeded = await execute(editing ? `edit-${editing.id}` : 'create-session', apiRequest(path, { method: editing ? 'PATCH' : 'POST', body }));
    if (succeeded) { setEditing(null); setDuplicating(null); setCreating(false); }
  };

  const copyPreviousWeek = async () => {
    const succeeded = await execute('copy-previous-week', apiRequest<{ created: unknown[]; skipped: unknown[]; conflicts: unknown[] }>('/admin/training-sessions/copy-previous-week', { method: 'POST', body: { targetWeekStart: weekStart } }).then((result) => {
      setCopyReport(`${result.created.length} created, ${result.skipped.length} skipped, ${result.conflicts.length} conflict${result.conflicts.length === 1 ? '' : 's'}. Bookings were not copied.`);
      return result;
    }));
    if (!succeeded) setCopyReport(null);
  };

  return <div className="space-y-5">
    <section className="rounded-lg border border-white/10 bg-white/[0.01] p-4 md:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Weekly schedule</p><h3 className="mt-1 text-lg font-bold text-white">Add the slots Clients can book</h3><p className="mt-1 text-xs text-white/45">Saved slots are live immediately. Session type is not required.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">Previous</button>
          <label className="text-xs text-white/55">Week of<input aria-label="Week starting" type="date" value={weekStart} onChange={(event) => setWeekStart(mondayKey(new Date(`${event.target.value}T12:00:00`)))} className="ml-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">Next</button>
          <button type="button" onClick={() => void copyPreviousWeek()} disabled={actionId !== null} className="rounded border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50" data-testid="btn-copy-previous-week">{actionId === 'copy-previous-week' ? 'Copying…' : 'Copy Previous Week'}</button>
          <button type="button" onClick={() => setCreating(true)} disabled={!activeLocations.length} className="flex items-center gap-2 rounded bg-white px-4 py-2 text-xs font-bold text-black hover:bg-white/90 disabled:opacity-50" data-testid="btn-create-session"><Plus size={14} weight="bold" /> Add Slot</button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs"><span className="text-white/45">{activeLocations.length ? `${activeLocations.length} active location${activeLocations.length === 1 ? '' : 's'} available` : 'Create a location before adding slots.'}</span><button type="button" onClick={() => setCreatingLocation(true)} className="font-bold text-primary hover:text-white" data-testid="btn-add-location-inline">Add a location</button></div>
      {copyReport && <p role="status" data-testid="copy-week-report" className="mt-3 rounded border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">{copyReport}</p>}
    </section>
    {slots.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-white/10 p-12 text-center"><CalendarBlank size={32} className="text-white/20" weight="fill" /><p className="text-sm text-white/40">No bookable slots for this week yet.</p></div> :
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.01]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50"><tr><th className="p-4">Day & date</th><th className="p-4">Time</th><th className="p-4">Location</th><th className="p-4">Clients</th><th className="p-4">Slot</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-white/10">{slots.map((slot) => {
        const locked = slot.reservedCapacity > 0;
        return <tr key={slot.id} className="hover:bg-white/[0.03]"><td className="p-4 font-medium text-white">{displayDay(slot.startsAt, slot.location?.timezone)}</td><td className="p-4 text-white/75">{displayTime(slot.startsAt, slot.location?.timezone)}–{displayTime(slot.endsAt, slot.location?.timezone)}</td><td className="p-4 text-white/75">{slot.location?.name}</td><td className="p-4 text-white/75">{slot.reservedCapacity} / {slot.capacity}</td><td className="p-4">{locked ? <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Booked · locked</span> : <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">Open</span>}</td><td className="whitespace-nowrap p-4 text-right"><button type="button" onClick={() => setDuplicating(slot)} disabled={actionId !== null} className="px-2 py-1.5 text-xs font-bold text-white/60 hover:text-white disabled:opacity-40" data-testid={`btn-duplicate-session-${slot.id}`}>Duplicate</button><button type="button" onClick={() => setEditing(slot)} disabled={locked || actionId !== null} className="px-2 py-1.5 text-xs font-bold text-white/60 hover:text-white disabled:opacity-40" data-testid={`btn-edit-session-${slot.id}`}>{locked ? 'Locked' : 'Edit'}</button><button type="button" onClick={() => { if (window.confirm('Delete this unbooked slot?')) void execute(`delete-${slot.id}`, apiRequest(`/admin/training-sessions/${slot.id}`, { method: 'DELETE' })); }} disabled={locked || actionId !== null} className="px-2 py-1.5 text-xs font-bold text-red-400/75 hover:text-red-300 disabled:opacity-40" data-testid={`btn-delete-session-${slot.id}`}>Delete</button></td></tr>;
      })}</tbody></table></div>}
    {(creating || editing || duplicating) && <SlotForm session={editing} duplicate={duplicating} weekStart={weekStart} locations={activeLocations} submitting={actionId === 'create-session' || actionId === `edit-${editing?.id}`} onClose={() => { setCreating(false); setEditing(null); setDuplicating(null); }} onSave={saveSlot} />}
    {creatingLocation && <LocationForm submitting={actionId === 'create-location'} onClose={() => setCreatingLocation(false)} onSave={async (body) => { const succeeded = await execute('create-location', apiRequest('/admin/training-locations', { method: 'POST', body })); if (succeeded) setCreatingLocation(false); }} />}
  </div>;
}