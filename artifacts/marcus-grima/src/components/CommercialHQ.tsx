import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { ManagedSession } from '@/pages/MarcusSessionsHQ';
import {
  CheckCircle, CurrencyEur, Lock, Plus, Receipt, SpinnerGap, Tag, Users, WarningCircle, X,
} from '@phosphor-icons/react';

export function formatEur(minorUnits: number | null | undefined) {
  if (minorUnits === null || minorUnits === undefined) return '—';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(minorUnits / 100);
}

function parseEur(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

type Rate = { participantCount: number; amountMinor: number };
type PricingPlan = {
  id: string;
  name: string;
  kind: 'default' | 'tier' | 'custom';
  version: number;
  currency: string;
  isActive: boolean;
  rates: Rate[];
};
type CommercialClient = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  assignmentPlanId: string | null;
  assignmentPlanName: string | null;
  balance: {
    totalValueMinor: number;
    heldValueMinor: number;
    availableValueMinor: number;
    pricing: { planName: string; planVersion: number } | null;
  };
};
type PreviewRow = {
  bookingId: string;
  clientName: string;
  outcome: 'attended' | 'no_show';
  heldAmountMinor: number | null;
  finalChargeAmountMinor: number | null;
  releasedAmountMinor: number | null;
  noShowDecisionRequired: boolean;
  settled: boolean;
};
type SettlementPreview = {
  attendanceCount: number;
  unresolvedCount: number;
  canSettle: boolean;
  rows: PreviewRow[];
};
type ClassPricingSummary = {
  state: 'open' | 'closed';
  closeReason: 'full' | 'marcus_manual' | null;
  closedAt: string | null;
  confirmedParticipantCount: number;
  capacity: number;
  canClose: boolean;
  participants: {
    bookingId: string;
    clientName: string;
    bookingStatus: string;
    maximumHeldAmountMinor: number | null;
    heldAmountMinor: number | null;
    projectedLockedAmountMinor: number | null;
    lockedAmountMinor: number | null;
    lockedParticipantCount: number | null;
    settled: boolean;
  }[];
};

type AsyncAction = (id: string, promise: Promise<unknown>) => Promise<boolean>;

export function CommercialHQ({
  execute,
  actionId,
  sessions,
}: {
  execute: AsyncAction;
  actionId: string | null;
  sessions: ManagedSession[];
}) {
  const [tab, setTab] = useState<'clients' | 'plans' | 'classes' | 'settlements'>('clients');

  return (
    <div className="flex h-full flex-col bg-[#0A0A0A]">
      <div className="mb-6 flex w-fit max-w-full overflow-x-auto rounded border border-white/10 bg-white/5 p-1 text-sm">
        {([
          ['clients', 'Clients', Users],
          ['plans', 'Pricing plans', Tag],
           ['classes', 'Class pricing', Lock],
          ['settlements', 'Settlements', Receipt],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 font-medium transition-colors ${
              tab === value ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {tab === 'clients' && <ClientsView key="clients" execute={execute} actionId={actionId} />}
        {tab === 'plans' && <PlansView key="plans" execute={execute} actionId={actionId} />}
        {tab === 'classes' && <ClassPricingView key="classes" execute={execute} actionId={actionId} sessions={sessions} />}
        {tab === 'settlements' && (
          <SettlementsView key="settlements" execute={execute} actionId={actionId} sessions={sessions} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientsView({ execute, actionId }: { execute: AsyncAction; actionId: string | null }) {
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<CommercialClient | null>(null);
  const [adjusting, setAdjusting] = useState<CommercialClient | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientResult, planResult] = await Promise.all([
        apiRequest<{ clients: CommercialClient[] }>('/admin/commercial/clients'),
        apiRequest<{ pricingPlans: PricingPlan[] }>('/admin/commercial/pricing-plans'),
      ]);
      setClients(clientResult.clients);
      setPlans(planResult.pricingPlans);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load client balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} retry={refresh} />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <p className="text-sm text-white/45">Assign a client’s rate card and manage their internal training value.</p>
      {clients.length === 0 ? (
        <EmptyBlock icon={<Users size={30} weight="fill" />} label="No active clients are ready for commercial setup." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.01]">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              <tr><th className="p-4">Client</th><th className="p-4">Rate card</th><th className="p-4 text-right">Available</th><th className="p-4 text-right">Held</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clients.map((client) => (
                <tr key={client.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="p-4"><div className="font-bold text-white">{client.firstName} {client.lastName}</div><div className="mt-0.5 text-xs text-white/40">{client.email}</div></td>
                  <td className="p-4">
                    <span className="rounded bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {client.assignmentPlanName ?? client.balance.pricing?.planName ?? 'No plan'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-white">{formatEur(client.balance.availableValueMinor)}</td>
                  <td className="p-4 text-right text-amber-400/85">{formatEur(client.balance.heldValueMinor)}</td>
                  <td className="p-4 text-right"><div className="flex justify-end gap-2">
                    <button onClick={() => setAssigning(client)} className="rounded bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10">Plan</button>
                    <button onClick={() => setAdjusting(client)} className="rounded bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-white/90">Adjust value</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {assigning && <AssignPlanModal client={assigning} plans={plans} onClose={() => setAssigning(null)} execute={execute} actionId={actionId} onSuccess={refresh} />}
      {adjusting && <AdjustValueModal client={adjusting} onClose={() => setAdjusting(null)} execute={execute} actionId={actionId} onSuccess={refresh} />}
    </motion.div>
  );
}

function AssignPlanModal({ client, plans, onClose, execute, actionId, onSuccess }: { client: CommercialClient; plans: PricingPlan[]; onClose: () => void; execute: AsyncAction; actionId: string | null; onSuccess: () => Promise<void> }) {
  const [pricingPlanId, setPricingPlanId] = useState(client.assignmentPlanId ?? '');
  const activePlans = plans.filter((plan) => plan.isActive);
  const action = `assign-plan-${client.id}`;
  return <Modal title={`Assign rate card: ${client.firstName}`} onClose={onClose}>
    <form onSubmit={async (event) => {
      event.preventDefault();
      const ok = await execute(action, apiRequest(`/admin/commercial/clients/${client.id}/pricing`, { method: 'PUT', body: { pricingPlanId } }));
      if (ok) { await onSuccess(); onClose(); }
    }} className="space-y-5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Pricing plan
        <select value={pricingPlanId} onChange={(event) => setPricingPlanId(event.target.value)} required className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30">
          <option value="" disabled>Select a plan</option>
          {activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · v{plan.version}</option>)}
        </select>
      </label>
      <ModalActions onClose={onClose} busy={actionId === action} label="Assign plan" />
    </form>
  </Modal>;
}

function AdjustValueModal({ client, onClose, execute, actionId, onSuccess }: { client: CommercialClient; onClose: () => void; execute: AsyncAction; actionId: string | null; onSuccess: () => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const action = `adjust-value-${client.id}`;
  return <Modal title={`Adjust training value: ${client.firstName}`} onClose={onClose}>
    <form onSubmit={async (event) => {
      event.preventDefault();
      const amountMinor = parseEur(amount);
      if (amountMinor === null || amountMinor === 0 || !reason.trim()) return;
      const ok = await execute(action, apiRequest(`/admin/commercial/clients/${client.id}/value`, { method: 'POST', body: { amountMinor, reason: reason.trim(), idempotencyKey: crypto.randomUUID() } }));
      if (ok) { await onSuccess(); onClose(); }
    }} className="space-y-5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Amount (EUR)
        <input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 50.00 or -10.00" required className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30" />
      </label>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Reason
        <input value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={500} placeholder="Why this adjustment was made" className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30" />
      </label>
      <ModalActions onClose={onClose} busy={actionId === action} label="Save adjustment" />
    </form>
  </Modal>;
}

function PlansView({ execute, actionId }: { execute: AsyncAction; actionId: string | null }) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const refresh = async () => {
    setLoading(true); setError(null);
    try { setPlans((await apiRequest<{ pricingPlans: PricingPlan[] }>('/admin/commercial/pricing-plans')).pricingPlans); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load pricing plans.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} retry={refresh} />;
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="flex items-center justify-between"><p className="text-sm text-white/45">Rates lock from the confirmed participant count when a class closes, in EUR per client.</p><button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded bg-white px-4 py-2 text-xs font-bold text-black hover:bg-white/90"><Plus size={14} weight="bold" /> New plan</button></div>
    {plans.length === 0 ? <EmptyBlock icon={<Tag size={30} weight="fill" />} label="Create an active default plan before clients can reserve sessions." /> : <div className="grid gap-4 md:grid-cols-2">
      {plans.map((plan) => <div key={plan.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{plan.name}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/45">{plan.kind} · v{plan.version}</p></div><span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${plan.isActive ? 'bg-primary/15 text-primary' : 'bg-white/10 text-white/40'}`}>{plan.isActive ? 'Active' : 'Archived'}</span></div>
        <div className="mt-5 space-y-2 border-t border-white/8 pt-4">{plan.rates.map((rate) => <div key={rate.participantCount} className="flex justify-between text-sm"><span className="text-white/60">{rate.participantCount} {rate.participantCount === 1 ? 'attendee' : 'attendees'}</span><span className="font-bold text-white">{formatEur(rate.amountMinor)}</span></div>)}</div>
        {plan.isActive && <button onClick={async () => { if (window.confirm(`Archive ${plan.name}?`)) { const ok = await execute(`archive-${plan.id}`, apiRequest(`/admin/commercial/pricing-plans/${plan.id}`, { method: 'PATCH', body: { isActive: false } })); if (ok) await refresh(); } }} disabled={actionId !== null} className="mt-5 text-xs font-bold text-white/40 hover:text-white">Archive plan</button>}
      </div>)}
    </div>}
    {creating && <CreatePlanModal onClose={() => setCreating(false)} execute={execute} actionId={actionId} onSuccess={refresh} />}
  </motion.div>;
}

function CreatePlanModal({ onClose, execute, actionId, onSuccess }: { onClose: () => void; execute: AsyncAction; actionId: string | null; onSuccess: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'default' | 'tier' | 'custom'>('default');
  const [rates, setRates] = useState([{ count: '1', amount: '' }, { count: '2', amount: '' }]);
  const action = 'create-pricing-plan';
  return <Modal title="Create pricing plan" onClose={onClose}>
    <form onSubmit={async (event) => {
      event.preventDefault();
      const parsed = rates.map((rate) => ({ participantCount: Number(rate.count), amountMinor: parseEur(rate.amount) }));
      if (!name.trim() || parsed.some((rate) => !Number.isInteger(rate.participantCount) || rate.participantCount < 1 || rate.amountMinor === null)) return;
      const ok = await execute(action, apiRequest('/admin/commercial/pricing-plans', { method: 'POST', body: { name: name.trim(), kind, rates: parsed } }));
      if (ok) { await onSuccess(); onClose(); }
    }} className="space-y-5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Plan name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30" /></label>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Plan type<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mt-2 w-full rounded border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30"><option value="default">Tenant default</option><option value="tier">Tier</option><option value="custom">Client-specific</option></select></label>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Per-client rates (EUR)</p><div className="mt-2 space-y-2">{rates.map((rate, index) => <div key={index} className="flex gap-2"><input type="number" min="1" value={rate.count} onChange={(event) => setRates(rates.map((item, current) => current === index ? { ...item, count: event.target.value } : item))} aria-label="Confirmed participant count" className="w-28 rounded border border-white/10 bg-white/5 p-3 text-sm text-white" /><input type="number" min="0" step="0.01" value={rate.amount} onChange={(event) => setRates(rates.map((item, current) => current === index ? { ...item, amount: event.target.value } : item))} aria-label="Rate in EUR" className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 p-3 text-sm text-white" />{rates.length > 1 && <button type="button" onClick={() => setRates(rates.filter((_, current) => current !== index))} className="px-2 text-white/45 hover:text-white"><X size={16} /></button>}</div>)}</div><button type="button" onClick={() => setRates([...rates, { count: String(rates.length + 1), amount: '' }])} className="mt-3 text-xs font-bold text-primary hover:text-primary/80">Add confirmed-count rate</button></div>
      <ModalActions onClose={onClose} busy={actionId === action} label="Create plan" />
    </form>
  </Modal>;
}

function ClassPricingView({ execute, actionId, sessions }: { execute: AsyncAction; actionId: string | null; sessions: ManagedSession[] }) {
  const [selected, setSelected] = useState<ManagedSession | null>(null);
  const eligible = sessions
    .filter((session) => session.status === 'scheduled' && new Date(session.startsAt) > new Date())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  if (eligible.length === 0) {
    return <EmptyBlock icon={<Lock size={30} weight="fill" />} label="No upcoming scheduled classes are available for pricing review." />;
  }
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <p className="text-sm text-white/45">Only confirmed participants determine the price. Closing a class locks each value and releases any excess hold immediately.</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {eligible.map((session) => <div key={session.id} className="flex min-h-44 flex-col justify-between rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{new Date(session.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p><h3 className="mt-2 font-bold text-white">{session.sessionType?.name ?? 'Training session'}</h3><p className="mt-1 text-sm text-white/45">{session.reservedCapacity} reserved of {session.capacity} capacity</p></div>
        <button onClick={() => setSelected(session)} className="mt-5 rounded bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10">Review class price</button>
      </div>)}
    </div>
    {selected && <ClassPricingModal session={selected} onClose={() => setSelected(null)} execute={execute} actionId={actionId} />}
  </motion.div>;
}

function ClassPricingModal({ session, onClose, execute, actionId }: { session: ManagedSession; onClose: () => void; execute: AsyncAction; actionId: string | null }) {
  const [summary, setSummary] = useState<ClassPricingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const result = await apiRequest<{ classPricing: ClassPricingSummary }>(`/admin/commercial/sessions/${session.id}/pricing-summary`);
      setSummary(result.classPricing);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load class pricing.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [session.id]);
  return <Modal title="Class price lock" onClose={onClose} wide>
    <p className="mb-5 text-sm text-white/45">{session.sessionType?.name ?? 'Training session'} · {new Date(session.startsAt).toLocaleString()}</p>
    {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} retry={refresh} /> : summary && <div className="space-y-5">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded border p-4 ${summary.state === 'closed' ? 'border-green-500/20 bg-green-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{summary.state === 'closed' ? 'Price locked' : 'Projected class price'}</p><p className="mt-1 text-sm font-bold text-white">{summary.confirmedParticipantCount} confirmed of {summary.capacity} capacity</p></div>
        <span className={summary.state === 'closed' ? 'text-xs font-bold uppercase tracking-wider text-green-300' : 'text-xs font-bold uppercase tracking-wider text-amber-300'}>{summary.state === 'closed' ? `Closed ${summary.closeReason === 'full' ? 'at capacity' : 'by Marcus'}` : 'Open'}</span>
      </div>
      <div className="overflow-x-auto rounded border border-white/10"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/45"><tr><th className="p-3">Client</th><th className="p-3 text-right">Maximum hold</th><th className="p-3 text-right">{summary.state === 'closed' ? 'Locked value' : 'Projected value'}</th><th className="p-3 text-right">Current hold</th></tr></thead><tbody className="divide-y divide-white/10">{summary.participants.map((participant) => <tr key={participant.bookingId}><td className="p-3 font-medium text-white">{participant.clientName}</td><td className="p-3 text-right text-white/55">{formatEur(participant.maximumHeldAmountMinor)}</td><td className="p-3 text-right font-bold text-primary">{formatEur(participant.lockedAmountMinor ?? participant.projectedLockedAmountMinor)}</td><td className="p-3 text-right text-amber-300">{formatEur(participant.heldAmountMinor)}</td></tr>)}{summary.participants.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-sm text-white/40">No confirmed participants yet.</td></tr>}</tbody></table></div>
      {summary.state === 'open' && <p className="text-xs leading-relaxed text-white/45">Closing is final for pricing: new bookings are blocked, the confirmed count is frozen, and any amount above the locked value is released to each client’s available balance.</p>}
      <div className="flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white">Close</button>{summary.canClose && <button onClick={async () => { const ok = await execute(`close-class-${session.id}`, apiRequest(`/admin/commercial/sessions/${session.id}/close`, { method: 'POST' })); if (ok) await refresh(); }} disabled={actionId !== null} className="rounded bg-white px-5 py-2 text-xs font-bold text-black disabled:opacity-40">Lock class price</button>}</div>
    </div>}
  </Modal>;
}

function SettlementsView({ execute, actionId, sessions }: { execute: AsyncAction; actionId: string | null; sessions: ManagedSession[] }) {
  const completed = sessions.filter((session) => session.status === 'completed');
  if (completed.length === 0) return <EmptyBlock icon={<CheckCircle size={30} weight="fill" />} label="No completed sessions are ready for settlement." />;
  const [selected, setSelected] = useState<ManagedSession | null>(null);
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {completed.map((session) => <div key={session.id} className="flex min-h-44 flex-col justify-between rounded-lg border border-white/10 bg-white/[0.02] p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{new Date(session.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p><h3 className="mt-2 font-bold text-white">{session.sessionType?.name ?? 'Training session'}</h3><p className="mt-1 text-sm text-white/45">{session.reservedCapacity} reserved clients</p></div><button onClick={() => setSelected(session)} className="mt-5 rounded bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10">Preview settlement</button></div>)}
    {selected && <SettlementModal session={selected} onClose={() => setSelected(null)} execute={execute} actionId={actionId} />}
  </motion.div>;
}

function SettlementModal({ session, onClose, execute, actionId }: { session: ManagedSession; onClose: () => void; execute: AsyncAction; actionId: string | null }) {
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Record<string, string>>({});
  const refresh = async () => { setLoading(true); setError(null); try { const result = await apiRequest<SettlementPreview>(`/admin/commercial/sessions/${session.id}/settlement-preview`); setPreview(result); setCharges(Object.fromEntries(result.rows.filter((row) => row.noShowDecisionRequired).map((row) => [row.bookingId, String((row.heldAmountMinor ?? 0) / 100)]))); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load settlement preview.'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, [session.id]);
  return <Modal title="Settlement preview" onClose={onClose} wide>
    <p className="mb-5 text-sm text-white/45">{session.sessionType?.name ?? 'Training session'} · {new Date(session.startsAt).toLocaleString()}</p>
    {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} retry={refresh} /> : preview && <div className="space-y-5">
      {preview.unresolvedCount > 0 && <div className="flex gap-3 rounded border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"><WarningCircle size={20} className="shrink-0" />{preview.unresolvedCount} active participant outcome{preview.unresolvedCount === 1 ? '' : 's'} must be resolved before settlement.</div>}
      <div className="overflow-x-auto rounded border border-white/10"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/45"><tr><th className="p-3">Client</th><th className="p-3">Outcome</th><th className="p-3 text-right">Locked hold</th><th className="p-3 text-right">Final charge</th></tr></thead><tbody className="divide-y divide-white/10">{preview.rows.map((row) => <tr key={row.bookingId}><td className="p-3 font-medium text-white">{row.clientName}</td><td className="p-3"><span className={row.outcome === 'attended' ? 'text-green-400' : 'text-red-400'}>{row.outcome === 'attended' ? 'Attended' : 'No-show'}</span>{row.noShowDecisionRequired && <div className="mt-2 flex items-center gap-2"><input aria-label={`No-show charge for ${row.clientName}`} type="number" min="0" max={(row.heldAmountMinor ?? 0) / 100} step="0.01" value={charges[row.bookingId] ?? ''} onChange={(event) => setCharges({ ...charges, [row.bookingId]: event.target.value })} className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white" /><button onClick={async () => { const amount = parseEur(charges[row.bookingId] ?? ''); if (amount === null) return; const ok = await execute(`noshow-${row.bookingId}`, apiRequest(`/admin/commercial/bookings/${row.bookingId}/no-show-decision`, { method: 'POST', body: { waived: false, selectedChargeAmountMinor: amount } })); if (ok) await refresh(); }} disabled={actionId !== null} className="rounded bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-300">Charge</button><button onClick={async () => { const ok = await execute(`noshow-${row.bookingId}`, apiRequest(`/admin/commercial/bookings/${row.bookingId}/no-show-decision`, { method: 'POST', body: { waived: true } })); if (ok) await refresh(); }} disabled={actionId !== null} className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70">Waive</button></div>}</td><td className="p-3 text-right text-amber-300">{formatEur(row.heldAmountMinor)}</td><td className="p-3 text-right font-bold text-white">{formatEur(row.finalChargeAmountMinor)}</td></tr>)}{preview.rows.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-sm text-white/40">No commercial booking records are ready to settle.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-4"><span className="text-xs font-bold uppercase tracking-wider text-white/50">Attendance recorded</span><span className="font-bold text-white">{preview.attendanceCount}</span></div>
      <div className="flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white">Close</button><button onClick={async () => { const ok = await execute(`settle-${session.id}`, apiRequest(`/admin/commercial/sessions/${session.id}/settle`, { method: 'POST' })); if (ok) onClose(); }} disabled={!preview.canSettle || actionId !== null} className="rounded bg-white px-5 py-2 text-xs font-bold text-black disabled:opacity-40">Finalize settlement</button></div>
    </div>}
  </Modal>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}><div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg border border-white/10 bg-[#111] p-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`} onClick={(event) => event.stopPropagation()}><h2 className="mb-5 text-lg font-bold text-white">{title}</h2>{children}</div></div>;
}
function ModalActions({ onClose, busy, label }: { onClose: () => void; busy: boolean; label: string }) { return <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white">Cancel</button><button type="submit" disabled={busy} className="flex min-w-28 items-center justify-center rounded bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{busy ? <SpinnerGap className="animate-spin" /> : label}</button></div>; }
function LoadingBlock() { return <div className="flex justify-center py-12"><SpinnerGap size={24} className="animate-spin text-primary" /></div>; }
function ErrorBlock({ message, retry }: { message: string; retry: () => Promise<void> }) { return <div className="rounded border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200"><p>{message}</p><button onClick={() => void retry()} className="mt-3 text-xs font-bold underline">Try again</button></div>; }
function EmptyBlock({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 p-12 text-center text-white/35">{icon}<p className="text-sm">{label}</p></div>; }