import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('@/lib/api', () => ({ apiRequest }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', props, children) },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

import { MarcusSessionsHQ } from '@/pages/MarcusSessionsHQ';

const location = { id: 'location-1', name: 'Sliema Studio', timezone: 'Europe/Malta', addressDetails: '1 Main Street', isActive: true };
const booking = {
  id: 'booking-1', trainingSessionId: 'session-1', clientUserId: 'client-1', status: 'pending', rejectionReason: null,
  createdAt: '2026-08-22T10:00:00.000Z', confirmedAt: null, attendanceAt: null,
  session: { startsAt: '2026-08-18T10:00:00.000Z', endsAt: '2026-08-18T11:00:00.000Z', status: 'scheduled', sessionType: null, location },
  client: { id: 'client-1', firstName: 'Calvin', lastName: 'Test', email: 'calvin@example.com' },
};
const slot = {
  id: 'session-1', sessionTypeId: null, locationId: location.id, startsAt: '2026-08-18T10:00:00.000Z', endsAt: '2026-08-18T11:00:00.000Z',
  capacity: 4, reservedCapacity: 0, remainingCapacity: 4, status: 'scheduled', marcusNotes: null, sessionType: null, location,
};

function mockAdminData(resources: { sessions?: unknown[]; locations?: unknown[]; bookings?: unknown[] } = {}) {
  apiRequest.mockImplementation((path: string) => {
    if (path === '/admin/training-sessions') return Promise.resolve({ sessions: resources.sessions ?? [] });
    if (path === '/admin/bookings') return Promise.resolve({ bookings: resources.bookings ?? [booking] });
    if (path === '/admin/training-locations') return Promise.resolve({ locations: resources.locations ?? [location] });
    if (path === '/admin/session-types') return Promise.resolve({ sessionTypes: [] });
    if (path === '/admin/training-sessions/copy-previous-week') return Promise.resolve({ created: [{ sessionId: 'copy-1' }], skipped: [], conflicts: [] });
    if (path.startsWith('/admin/')) return Promise.resolve({});
    return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
  });
}

async function actEvent(action: () => void) {
  await act(async () => { action(); await Promise.resolve(); await Promise.resolve(); });
}

async function openWeekSchedule() {
  const scheduleButton = await screen.findByRole('button', { name: /schedule/i });
  await actEvent(() => fireEvent.click(scheduleButton));
  await actEvent(() => fireEvent.change(screen.getByLabelText('Week starting'), { target: { value: '2026-08-17' } }));
}

function futureDateKey() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

describe('MarcusSessionsHQ weekly schedule', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('keeps request approval available and does not fetch or expose recurrence controls', async () => {
    mockAdminData();
    render(<MarcusSessionsHQ />);
    expect(await screen.findByText('Calvin Test')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/admin/bookings');
    expect(apiRequest).not.toHaveBeenCalledWith('/admin/availability/rules');
    expect(screen.queryByRole('button', { name: /availability/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^locations$/i })).not.toBeInTheDocument();
  });

  it('creates a type-less bookable slot from the selected week', async () => {
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(await screen.findByText('Sliema Studio')).toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-create-session')));
    expect(screen.queryByText('Session Type')).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.change(dialog.querySelector('input[type="date"]')!, { target: { value: futureDateKey() } });
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ locationId: 'location-1', capacity: 4 }),
    })));
    const createCall = apiRequest.mock.calls.find(([path, options]) =>
      path === '/admin/training-sessions' && (options as { method?: string } | undefined)?.method === 'POST',
    )!;
    expect((createCall[1] as { body: Record<string, unknown> }).body.sessionTypeId).toBeUndefined();
  });

  it('defaults a current-week slot to a future type-less time instead of a past Monday', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T13:57:41.385Z'));
    mockAdminData();
    render(<MarcusSessionsHQ />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await actEvent(() => fireEvent.click(screen.getByRole('button', { name: /schedule/i })));
    await actEvent(() => fireEvent.change(screen.getByLabelText('Week starting'), { target: { value: '2026-08-17' } }));
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-create-session')));
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));

    const createCall = apiRequest.mock.calls.find(([path, options]) =>
      path === '/admin/training-sessions' && (options as { method?: string } | undefined)?.method === 'POST',
    )!;
    const body = (createCall[1] as { body: Record<string, unknown> }).body;
    expect(body).toMatchObject({ locationId: 'location-1', capacity: 4 });
    expect(body.sessionTypeId).toBeUndefined();
    expect(new Date(body.startsAt as string).getTime()).toBeGreaterThan(new Date().getTime());
    expect(new Date(body.endsAt as string).getTime()).toBeGreaterThan(new Date(body.startsAt as string).getTime());
  });

  it('locks booked rows in the weekly editor', async () => {
    mockAdminData({ sessions: [{ ...slot, reservedCapacity: 1, remainingCapacity: 3 }] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(await screen.findByText('Booked · locked')).toBeInTheDocument();
    expect(screen.getByTestId('btn-edit-session-session-1')).toBeDisabled();
    expect(screen.getByTestId('btn-delete-session-session-1')).toBeDisabled();
    expect(screen.getByTestId('btn-duplicate-session-session-1')).not.toBeDisabled();
  });

  it('duplicates an unbooked row through the same explicit save form', async () => {
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    await screen.findByText('Sliema Studio');
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-duplicate-session-session-1')));
    expect(await screen.findByText('Duplicate slot')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('dialog').querySelector('input[type="date"]')!, { target: { value: futureDateKey() } });
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions', expect.objectContaining({ method: 'POST' })));
  });

  it('copies the previous week and reports server outcomes', async () => {
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-copy-previous-week')));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions/copy-previous-week', {
      method: 'POST',
      body: { targetWeekStart: '2026-08-17' },
    }));
    expect(await screen.findByTestId('copy-week-report')).toHaveTextContent('1 created, 0 skipped, 0 conflicts. Bookings were not copied.');
  });

  it('adds a location from the schedule workflow when no active locations exist', async () => {
    mockAdminData({ locations: [] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(await screen.findByText('Create a location before adding slots.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-session')).toBeDisabled();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-add-location-inline')));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(dialog.querySelector('input')!, { target: { value: 'Valletta Gym' } });
    await actEvent(() => fireEvent.submit(dialog.querySelector('form')!));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-locations', expect.objectContaining({ method: 'POST' })));
  });
});