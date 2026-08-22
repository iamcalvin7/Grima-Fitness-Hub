import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) =>
    React.createElement('div', rest, children);
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

import { Sessions } from '@/pages/Sessions';

const sessionId = '8b83b899-798a-4960-aeb7-7d3a7f9e8a10';
const replacementSessionId = '0b712c14-553a-4c61-a4a2-b4d78ff4db27';
const bookingId = '1b1fa0b0-05ae-4971-af6f-7671d076b337';

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dateKey(value: string, timezone = 'Europe/Malta'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value)).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function makeSession(id = sessionId, daysFromNow = 3, remainingCapacity = 1) {
  const startsAt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  startsAt.setUTCHours(10, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  return {
    id,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    capacity: 2,
    reservedCapacity: 2 - remainingCapacity,
    remainingCapacity,
    status: 'scheduled',
    sessionType: { id: 'type-1', name: 'Strength Coaching', durationMinutes: 60 },
    location: { id: 'location-1', name: 'Fort Fitness Sliema', timezone: 'Europe/Malta' },
  };
}

function makeBooking(status = 'pending', session = makeSession()) {
  return {
    id: bookingId,
    trainingSessionId: session.id,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    session: {
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: session.status,
      sessionType: { id: 'type-1', name: session.sessionType.name },
      location: { id: 'location-1', name: session.location.name, timezone: session.location.timezone },
    },
  };
}

function renderSessions(openSessionId?: string) {
  return render(<Sessions setPage={vi.fn()} openSessionId={openSessionId} />);
}

async function waitForInitialLoad() {
  await waitFor(() => expect(screen.queryByTestId('sessions-loading')).not.toBeInTheDocument());
}

async function openBookingFor(session: ReturnType<typeof makeSession>) {
  fireEvent.click(screen.getByTestId('book-session-button'));
  await waitFor(() => expect(screen.getByTestId('booking-sheet')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: `Available on ${dateKey(session.startsAt, session.location.timezone)}` }));
  fireEvent.click(screen.getByRole('button', { name: 'See Available Times' }));
  fireEvent.click(screen.getByTestId(`session-option-${session.id}`));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeInTheDocument());
}

describe('Sessions booking integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows a loading state before rendering real server availability', async () => {
    const liveSession = makeSession();
    let releaseSessions: ((value: Response) => void) | undefined;
    let releaseBookings: ((value: Response) => void) | undefined;
    const sessionsPending = new Promise<Response>((resolve) => { releaseSessions = resolve; });
    const bookingsPending = new Promise<Response>((resolve) => { releaseBookings = resolve; });
    vi.mocked(fetch).mockReturnValueOnce(sessionsPending).mockReturnValueOnce(bookingsPending);

    renderSessions();
    expect(screen.getByTestId('sessions-loading')).toBeInTheDocument();

    releaseSessions?.(response({ sessions: [liveSession] }));
    releaseBookings?.(response({ bookings: [] }));
    await waitForInitialLoad();

    fireEvent.click(screen.getByTestId('book-session-button'));
    fireEvent.click(screen.getByRole('button', { name: `Available on ${dateKey(liveSession.startsAt)}` }));
    fireEvent.click(screen.getByRole('button', { name: 'See Available Times' }));
    fireEvent.click(screen.getByTestId(`session-option-${liveSession.id}`));
    expect(screen.getByText('Fort Fitness Sliema')).toBeInTheDocument();
    expect(screen.queryByText('STRENGTH & CONDITIONING')).not.toBeInTheDocument();
  });

  it('shows an empty availability state instead of static fallback slots', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ sessions: [] })).mockResolvedValueOnce(response({ bookings: [] }));
    renderSessions();
    await waitForInitialLoad();

    fireEvent.click(screen.getByTestId('book-session-button'));
    expect(await screen.findByText('No sessions available')).toBeInTheDocument();
    expect(screen.queryByText('Request Sent!')).not.toBeInTheDocument();
  });

  it('uses the session location timezone to make a date selectable', async () => {
    const locationTimezone = 'America/Los_Angeles';
    const liveSession = {
      ...makeSession(),
      startsAt: '2026-08-24T00:30:00.000Z',
      endsAt: '2026-08-24T01:30:00.000Z',
      location: { id: 'location-2', name: 'Pacific Studio', timezone: locationTimezone },
    };
    const locationDate = dateKey(liveSession.startsAt, locationTimezone);
    vi.mocked(fetch).mockResolvedValueOnce(response({ sessions: [liveSession] })).mockResolvedValueOnce(response({ bookings: [] }));

    renderSessions();
    await waitForInitialLoad();
    fireEvent.click(screen.getByTestId('book-session-button'));
    fireEvent.click(screen.getByRole('button', { name: `Available on ${locationDate}` }));
    fireEvent.click(screen.getByRole('button', { name: 'See Available Times' }));
    expect(screen.getByTestId(`session-option-${liveSession.id}`)).toBeInTheDocument();
  });

  it('opens only the matching booking when loaded from a notification link, including after refresh', async () => {
    const liveSession = makeSession();
    const booking = makeBooking('confirmed', liveSession);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }))
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }));

    const firstLoad = renderSessions(booking.id);
    expect(await screen.findByTestId('session-detail')).toBeInTheDocument();
    firstLoad.unmount();

    renderSessions(booking.id);
    expect(await screen.findByTestId('session-detail')).toBeInTheDocument();
  });

  it('does not reveal a booking when a notification link contains an unavailable booking ID', async () => {
    const liveSession = makeSession();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [makeBooking('pending', liveSession)] }));

    renderSessions('foreign-or-missing-booking');
    await waitForInitialLoad();
    expect(screen.queryByTestId('session-detail')).not.toBeInTheDocument();
  });

  it('shows a recoverable error and retries both API requests', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response({ sessions: [] }))
      .mockResolvedValueOnce(response({ bookings: [] }));

    renderSessions();
    expect(await screen.findByTestId('sessions-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitForInitialLoad();
    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('submits a real booking once and refreshes persisted state', async () => {
    const liveSession = makeSession();
    const newBooking = makeBooking('pending', liveSession);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [] }))
      .mockResolvedValueOnce(response({ booking: newBooking, replayed: false }, 201))
      .mockResolvedValueOnce(response({ sessions: [{ ...liveSession, remainingCapacity: 0, reservedCapacity: 2 }] }))
      .mockResolvedValueOnce(response({ bookings: [newBooking] }));

    renderSessions();
    await waitForInitialLoad();
    await openBookingFor(liveSession);

    const confirm = screen.getByTestId('confirm-booking-button');
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect((await screen.findAllByText('Request Sent')).length).toBeGreaterThan(0);
    const postCalls = vi.mocked(fetch).mock.calls.filter(([, options]) => (options as RequestInit | undefined)?.method === 'POST');
    expect(postCalls).toHaveLength(1);
    const body = JSON.parse(String((postCalls[0]?.[1] as RequestInit).body));
    expect(body).toEqual(expect.objectContaining({ trainingSessionId: liveSession.id }));
    expect(body).not.toHaveProperty('clientUserId');
    expect(body).not.toHaveProperty('tenantId');
    expect(body).toHaveProperty('idempotencyKey');
  });

  it('does not show booking success when capacity is rejected by the server', async () => {
    const liveSession = makeSession();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [] }))
      .mockResolvedValueOnce(response({ error: 'Training session is full' }, 409))
      .mockResolvedValueOnce(response({ sessions: [{ ...liveSession, remainingCapacity: 0, reservedCapacity: 2 }] }))
      .mockResolvedValueOnce(response({ bookings: [] }));

    renderSessions();
    await waitForInitialLoad();
    await openBookingFor(liveSession);
    fireEvent.click(screen.getByTestId('confirm-booking-button'));

    expect((await screen.findAllByText('Training session is full')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Request Sent')).toHaveLength(0);
    await waitFor(() => expect(screen.queryByTestId('booking-sheet')).not.toBeInTheDocument());
  });

  it('cancels an eligible booking only after confirmation and refreshes the list', async () => {
    const liveSession = makeSession();
    const booking = makeBooking('confirmed', liveSession);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [liveSession] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }))
      .mockResolvedValueOnce(response({ booking: { ...booking, status: 'cancelled' }, replayed: false }))
      .mockResolvedValueOnce(response({ sessions: [{ ...liveSession, remainingCapacity: 2, reservedCapacity: 0 }] }))
      .mockResolvedValueOnce(response({ bookings: [{ ...booking, status: 'cancelled' }] }));

    renderSessions();
    await waitForInitialLoad();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).find((button) => dialog.contains(button))!);

    await waitFor(() => {
      const postCall = vi.mocked(fetch).mock.calls.find(([url, options]) =>
        String(url).includes(`/bookings/${booking.id}/cancel`) && (options as RequestInit).method === 'POST',
      );
      expect(postCall).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'past' }));
    expect(await screen.findByText('CANCELLED')).toBeInTheDocument();
  });

  it('reschedules atomically through the replacement endpoint', async () => {
    const originalSession = makeSession(sessionId, 3);
    const replacement = makeSession(replacementSessionId, 5);
    const booking = makeBooking('pending', originalSession);
    const replacementBooking = { ...makeBooking('pending', replacement), id: 'cec4f78c-b0a6-4b0f-b2a7-7972456116a0', rescheduledFromBookingId: booking.id };
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [originalSession, replacement] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }))
      .mockResolvedValueOnce(response({ booking: replacementBooking, replayed: false }, 201))
      .mockResolvedValueOnce(response({ sessions: [originalSession, replacement] }))
      .mockResolvedValueOnce(response({ bookings: [{ ...booking, status: 'rescheduled' }, replacementBooking] }));

    renderSessions();
    await waitForInitialLoad();
    fireEvent.click(screen.getByRole('button', { name: /reschedule/i }));
    expect(await screen.findByTestId('reschedule-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`replacement-${replacement.id}`));
    const confirm = screen.getByTestId('confirm-reschedule-button');
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(await screen.findByText('Rescheduled')).toBeInTheDocument();
    const postCalls = vi.mocked(fetch).mock.calls.filter(([url, options]) =>
      String(url).includes(`/bookings/${booking.id}/reschedule`) && (options as RequestInit).method === 'POST',
    );
    expect(postCalls).toHaveLength(1);
    const body = JSON.parse(String((postCalls[0]?.[1] as RequestInit).body));
    expect(body).toEqual(expect.objectContaining({ replacementTrainingSessionId: replacement.id, idempotencyKey: expect.any(String) }));
  });

  it('keeps the original booking visible when atomic rescheduling is rejected', async () => {
    const originalSession = makeSession(sessionId, 3);
    const replacement = makeSession(replacementSessionId, 5);
    const booking = makeBooking('confirmed', originalSession);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ sessions: [originalSession, replacement] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }))
      .mockResolvedValueOnce(response({ error: 'Training session is full' }, 409))
      .mockResolvedValueOnce(response({ sessions: [originalSession, { ...replacement, remainingCapacity: 0, reservedCapacity: 2 }] }))
      .mockResolvedValueOnce(response({ bookings: [booking] }));

    renderSessions();
    await waitForInitialLoad();
    fireEvent.click(screen.getByRole('button', { name: /reschedule/i }));
    fireEvent.click(await screen.findByTestId(`replacement-${replacement.id}`));
    fireEvent.click(screen.getByTestId('confirm-reschedule-button'));

    expect((await screen.findAllByText('Training session is full')).length).toBeGreaterThan(0);
    expect(screen.getByTestId(`booking-${booking.id}`)).toBeInTheDocument();
    expect(screen.queryByText('Rescheduled')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reschedule-sheet')).not.toBeInTheDocument();
  });
});