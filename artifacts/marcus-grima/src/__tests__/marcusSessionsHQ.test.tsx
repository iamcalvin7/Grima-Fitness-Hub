import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('@/lib/api', () => ({ apiRequest }));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import { MarcusSessionsHQ } from '@/pages/MarcusSessionsHQ';

const pendingBooking = {
  id: 'booking-1',
  trainingSessionId: 'session-1',
  clientUserId: 'client-1',
  status: 'pending',
  rejectionReason: null,
  createdAt: '2026-08-22T10:00:00.000Z',
  confirmedAt: null,
  attendanceAt: null,
  session: {
    startsAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-09-01T11:00:00.000Z',
    status: 'scheduled',
    sessionType: { id: 'type-1', name: 'Personal Training' },
    location: { id: 'location-1', name: 'Sliema Studio', timezone: 'Europe/Malta' },
  },
  client: { id: 'client-1', firstName: 'Calvin', lastName: 'Test', email: 'calvin@example.com' },
};

const managedLocation = {
  id: 'location-1',
  name: 'Sliema Studio',
  timezone: 'Europe/Malta',
  addressDetails: '1 Main Street',
  isActive: true,
};

const managedType = {
  id: 'type-1',
  name: 'Personal Training',
  description: 'One-to-one coaching',
  durationMinutes: 60,
  defaultCapacity: 1,
  isActive: true,
};

const managedSession = {
  id: 'session-1',
  sessionTypeId: 'type-1',
  locationId: 'location-1',
  startsAt: '2026-09-01T10:00:00.000Z',
  endsAt: '2026-09-01T11:00:00.000Z',
  capacity: 4,
  reservedCapacity: 1,
  remainingCapacity: 3,
  status: 'scheduled',
  marcusNotes: null,
  sessionType: managedType,
  location: managedLocation,
};

function mockAdminData(
  bookings = [pendingBooking],
  confirmFails = false,
  resources: { sessions?: unknown[]; locations?: unknown[]; sessionTypes?: unknown[] } = {},
) {
  apiRequest.mockImplementation((path: string) => {
    if (path === '/admin/training-sessions') return Promise.resolve({ sessions: resources.sessions ?? [] });
    if (path === '/admin/bookings') return Promise.resolve({ bookings });
    if (path === '/admin/training-locations') return Promise.resolve({ locations: resources.locations ?? [] });
    if (path === '/admin/session-types') return Promise.resolve({ sessionTypes: resources.sessionTypes ?? [] });
    if (path === '/admin/bookings/booking-1/confirm') {
      return confirmFails
        ? Promise.reject(new Error('Booking can no longer be confirmed.'))
        : Promise.resolve({ booking: { ...pendingBooking, status: 'confirmed' } });
    }
    if (path.startsWith('/admin/')) return Promise.resolve({});
    return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
  });
}

describe('MarcusSessionsHQ', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads pending booking requests from the admin endpoint envelope', async () => {
    mockAdminData();
    render(<MarcusSessionsHQ />);

    expect(await screen.findByText('Calvin Test')).toBeInTheDocument();
    expect(screen.getByTestId('btn-confirm-booking-1')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/admin/bookings');
  });

  it('confirms a request and refreshes authoritative admin data', async () => {
    mockAdminData();
    render(<MarcusSessionsHQ />);

    await screen.findByTestId('btn-confirm-booking-1');
    fireEvent.click(screen.getByTestId('btn-confirm-booking-1'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/admin/bookings/booking-1/confirm', { method: 'POST' });
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.filter(([path]) => path === '/admin/training-sessions').length).toBeGreaterThan(1);
    });
  });

  it('retains the request view and reloads authoritative data after a failed confirmation', async () => {
    mockAdminData([pendingBooking], true);
    render(<MarcusSessionsHQ />);

    await screen.findByTestId('btn-confirm-booking-1');
    fireEvent.click(screen.getByTestId('btn-confirm-booking-1'));

    expect(await screen.findByText('Booking can no longer be confirmed.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-confirm-booking-1')).toBeInTheDocument();
    await waitFor(() => {
      expect(apiRequest.mock.calls.filter(([path]) => path === '/admin/bookings').length).toBeGreaterThan(1);
    });
  });

  it('filters bookings by status and opens a booking detail view', async () => {
    const confirmedBooking = {
      ...pendingBooking,
      id: 'booking-2',
      status: 'confirmed',
      client: { ...pendingBooking.client, firstName: 'Mira', lastName: 'Admin' },
    };
    mockAdminData([pendingBooking, confirmedBooking]);
    render(<MarcusSessionsHQ />);

    await screen.findByText('Calvin Test');
    fireEvent.change(screen.getByTestId('select-booking-status'), { target: { value: 'confirmed' } });

    expect(await screen.findByText('Mira Admin')).toBeInTheDocument();
    expect(screen.queryByText('Calvin Test')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-booking-detail-booking-2'));
    expect(await screen.findByText('Booking details')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('shows empty schedule, location, and type management states with creation controls', async () => {
    mockAdminData([]);
    render(<MarcusSessionsHQ />);

    await screen.findByText('No pending bookings right now.');
    fireEvent.click(screen.getByRole('button', { name: /schedule/i }));
    expect(await screen.findByText('No upcoming sessions found.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /locations/i }));
    expect(await screen.findByText('No locations configured.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-loc')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /session types/i }));
    expect(await screen.findByText('No session types configured.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-create-type')).toBeInTheDocument();
  });

  it('covers session create/edit, completion, cancellation, and duplicate-submit protection', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockAdminData([], false, { sessions: [managedSession], locations: [managedLocation], sessionTypes: [managedType] });
    render(<MarcusSessionsHQ />);
    fireEvent.click(await screen.findByRole('button', { name: /schedule/i }));
    await screen.findByText('Personal Training');

    fireEvent.click(screen.getByTestId('btn-edit-session-session-1'));
    fireEvent.submit(screen.getByTestId('btn-save-session').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions/session-1', expect.objectContaining({ method: 'PATCH' })));

    await screen.findByTestId('btn-complete-session-session-1');
    fireEvent.click(screen.getByTestId('btn-complete-session-session-1'));
    expect(screen.getByTestId('btn-cancel-session-session-1')).toBeDisabled();
    await waitFor(() => expect(screen.getByTestId('btn-cancel-session-session-1')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('btn-cancel-session-session-1'));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions/session-1/complete', { method: 'POST' });
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-sessions/session-1/cancel', { method: 'POST' });
  });

  it('covers location and session-type create, edit, and deactivate paths', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockAdminData([], false, { locations: [managedLocation], sessionTypes: [managedType] });
    render(<MarcusSessionsHQ />);

    fireEvent.click(await screen.findByRole('button', { name: /locations/i }));
    await screen.findByText('Sliema Studio');
    fireEvent.click(screen.getByTestId('btn-create-loc'));
    fireEvent.submit(screen.getByTestId('btn-save-loc').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-locations', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(screen.queryByTestId('btn-save-loc')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit location/i }));
    fireEvent.submit(screen.getByTestId('btn-save-loc').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/training-locations/location-1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.click(screen.getByRole('button', { name: /deactivate location/i }));
    expect(apiRequest).toHaveBeenCalledWith('/admin/training-locations/location-1/deactivate', { method: 'POST' });

    fireEvent.click(await screen.findByRole('button', { name: /session types/i }));
    await screen.findByText('Personal Training');
    fireEvent.click(screen.getByTestId('btn-create-type'));
    fireEvent.submit(screen.getByTestId('btn-save-type').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/session-types', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(screen.queryByTestId('btn-save-type')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit session type/i }));
    fireEvent.submit(screen.getByTestId('btn-save-type').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/session-types/type-1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.click(screen.getByRole('button', { name: /deactivate session type/i }));
    expect(apiRequest).toHaveBeenCalledWith('/admin/session-types/type-1/deactivate', { method: 'POST' });
  });

  it('covers rejection and attendance/no-show actions with past-session eligibility', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const pastSession = { ...managedSession, startsAt: '2020-01-01T10:00:00.000Z', endsAt: '2020-01-01T11:00:00.000Z' };
    const pastBooking = { ...pendingBooking, session: { ...pendingBooking.session, startsAt: pastSession.startsAt, endsAt: pastSession.endsAt } };
    const confirmedPastBooking = { ...pastBooking, id: 'booking-2', status: 'confirmed' };
    mockAdminData([pastBooking, confirmedPastBooking], false, { sessions: [pastSession] });
    render(<MarcusSessionsHQ />);
    await screen.findByTestId('btn-reject-booking-1');
    fireEvent.click(screen.getByTestId('btn-reject-booking-1'));
    fireEvent.submit(screen.getByTestId('btn-confirm-reject').closest('form')!);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/bookings/booking-1/reject', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(screen.queryByTestId('btn-confirm-reject')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /schedule/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^past$/i }));
    await screen.findByTestId('btn-expand-session-session-1');
    fireEvent.click(screen.getByTestId('btn-expand-session-session-1'));
    expect(screen.getByTestId('btn-attend-booking-2')).toBeInTheDocument();
    expect(screen.getByTestId('btn-noshow-booking-2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-attend-booking-2'));
    await waitFor(() => expect(screen.getByTestId('btn-noshow-booking-2')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('btn-noshow-booking-2'));
    expect(apiRequest).toHaveBeenCalledWith('/admin/bookings/booking-2/attended', { method: 'POST' });
    expect(apiRequest).toHaveBeenCalledWith('/admin/bookings/booking-2/no-show', { method: 'POST' });
  });
});