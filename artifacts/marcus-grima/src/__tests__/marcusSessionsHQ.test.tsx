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
    if (path === '/admin/availability/rules') return Promise.resolve({ rules: [] });
    if (path === '/admin/availability/exceptions') return Promise.resolve({ exceptions: [] });
    if (path === '/admin/availability/preview') return Promise.resolve({ occurrences: [] });
    if (path === '/admin/training-sessions/copy-previous-week') return Promise.resolve({ created: [{ sessionId: 'copy-1' }], skipped: [], conflicts: [] });
    if (path.startsWith('/admin/')) return Promise.resolve({});
    return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
  });
}

async function actEvent(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openWeekSchedule() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  const scheduleButton = screen.getByRole('button', { name: /schedule/i });
  await actEvent(() => fireEvent.click(scheduleButton));
}

function useScheduleClock(iso = '2026-08-18T08:00:00.000Z') {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('MarcusSessionsHQ weekly schedule', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('keeps request approval available and exposes the availability workspace', async () => {
    mockAdminData();
    render(<MarcusSessionsHQ />);
    expect(await screen.findByText('Calvin Test')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/admin/bookings');
    expect(apiRequest).toHaveBeenCalledWith('/admin/availability/rules');
    expect(screen.getByRole('button', { name: /availability/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^locations$/i })).not.toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByRole('button', { name: /availability/i })));
    expect(screen.getByRole('heading', { name: 'Materialized 120 days ahead' })).toBeInTheDocument();
    expect(screen.getByText('Create an active location and session type before adding availability.')).toBeInTheDocument();
  });

  it('opens the matching booking request from a notification link without exposing unknown IDs', async () => {
    mockAdminData();
    const matching = render(<MarcusSessionsHQ openBookingId={booking.id} />);
    expect(await screen.findByRole('heading', { name: 'Booking details' })).toBeInTheDocument();
    matching.unmount();

    mockAdminData();
    render(<MarcusSessionsHQ openBookingId="foreign-or-missing-booking" />);
    expect(await screen.findByText('Calvin Test')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Booking details' })).not.toBeInTheDocument();
  });

  it('renders every weekday group and navigates using the visible date range', async () => {
    useScheduleClock();
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();

    for (const dateKey of ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23']) {
      expect(screen.getByTestId(`day-section-${dateKey}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('text-no-availability-2026-08-17')).toHaveTextContent('No availability');
    expect(screen.getByTestId('text-week-range')).toHaveTextContent('17 Aug – 23 Aug 2026');
    expect(screen.queryByLabelText('Week starting')).not.toBeInTheDocument();

    await actEvent(() => fireEvent.click(screen.getByTestId('button-next-week')));
    expect(screen.getByTestId('text-week-range')).toHaveTextContent('24 Aug – 30 Aug 2026');
    await actEvent(() => fireEvent.click(screen.getByTestId('button-previous-week')));
    expect(screen.getByTestId('text-week-range')).toHaveTextContent('17 Aug – 23 Aug 2026');
  });

  it('keeps a complete range label when the selected week crosses years', async () => {
    useScheduleClock('2026-12-31T10:00:00.000Z');
    mockAdminData();
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();

    expect(screen.getByTestId('text-week-range')).toHaveTextContent('28 Dec 2026 – 3 Jan 2027');
    expect(screen.getByTestId('day-section-2027-01-03')).toBeInTheDocument();
  });

  it('creates a type-less bookable slot from the selected week', async () => {
    useScheduleClock();
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(screen.getByText('Sliema Studio')).toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-create-session-2026-08-18')));
    expect(screen.getByText('Session type (optional)')).toBeInTheDocument();
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ locationId: 'location-1', capacity: 4 }),
    }));
    const createCall = apiRequest.mock.calls.find(([path, options]) =>
      path === '/admin/training-sessions' && (options as { method?: string } | undefined)?.method === 'POST',
    )!;
    expect((createCall[1] as { body: Record<string, unknown> }).body).toMatchObject({
      sessionTypeId: null,
      startsAt: expect.stringMatching(/^2026-08-18T/),
      endsAt: expect.stringMatching(/^2026-08-18T/),
    });
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
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-create-session-2026-08-22'))); // click + for today
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));

    const createCall = apiRequest.mock.calls.find(([path, options]) =>
      path === '/admin/training-sessions' && (options as { method?: string } | undefined)?.method === 'POST',
    )!;
    const body = (createCall[1] as { body: Record<string, unknown> }).body;
    expect(body).toMatchObject({ locationId: 'location-1', capacity: 4 });
    expect(body.sessionTypeId).toBeNull();
    expect(new Date(body.startsAt as string).getTime()).toBeGreaterThan(new Date().getTime());
    expect(new Date(body.endsAt as string).getTime()).toBeGreaterThan(new Date(body.startsAt as string).getTime());
  });

  it('locks booked rows in the weekly editor', async () => {
    useScheduleClock();
    mockAdminData({ sessions: [{ ...slot, reservedCapacity: 1, remainingCapacity: 3 }] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-session-actions-session-1')));
    expect(screen.getByTestId('btn-edit-session-session-1')).toBeDisabled();
    expect(screen.getByTestId('btn-delete-session-session-1')).toBeDisabled();
    expect(screen.getByTestId('btn-duplicate-session-session-1')).not.toBeDisabled();
  });

  it('duplicates an unbooked row through the same explicit save form', async () => {
    useScheduleClock();
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(screen.getByText('Sliema Studio')).toBeInTheDocument();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-session-actions-session-1')));
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-duplicate-session-session-1')));
    expect(screen.getByText('Save Copy')).toBeInTheDocument();
    await actEvent(() => fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions', expect.objectContaining({ method: 'POST' }));
  });

  it('copies the previous week and reports server outcomes', async () => {
    useScheduleClock();
    mockAdminData({ sessions: [slot] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-copy-previous-week')));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions/copy-previous-week', {
      method: 'POST',
      body: { targetWeekStart: '2026-08-17' },
    });
    expect(screen.getByTestId('copy-week-report')).toHaveTextContent('1 created, 0 skipped, 0 conflicts. Bookings were not copied.');
  });

  it('adds a location from the schedule workflow when no active locations exist', async () => {
    useScheduleClock();
    mockAdminData({ locations: [] });
    render(<MarcusSessionsHQ />);
    await openWeekSchedule();
    expect(screen.getByText('Create a location before adding slots.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-session-2026-08-17')).toBeDisabled();
    await actEvent(() => fireEvent.click(screen.getByTestId('btn-add-location-inline')));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(dialog.querySelector('input')!, { target: { value: 'Valletta Gym' } });
    await actEvent(() => fireEvent.submit(dialog.querySelector('form')!));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-locations', expect.objectContaining({ method: 'POST' }));
  });
});