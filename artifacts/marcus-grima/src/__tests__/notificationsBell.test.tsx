import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsBell } from '@/components/NotificationsBell';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiRequest }));

const notification = {
  id: 'notification-1',
  type: 'booking_confirmed',
  bookingId: 'booking-1',
  title: 'Booking confirmed',
  body: 'Your booking has been confirmed.',
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe('NotificationsBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({
      notifications: [notification],
      unreadCount: 1,
    });
  });

  it('loads unread booking notifications and navigates to sessions when opened', async () => {
    const onNavigate = vi.fn();
    const onOpenBooking = vi.fn();
    render(<NotificationsBell onNavigate={onNavigate} onOpenBooking={onOpenBooking} />);

    await waitFor(() => expect(screen.getByTestId('notifications-badge')).toHaveTextContent('1'));
    fireEvent.click(screen.getByTestId('notifications-button'));
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Booking confirmed'));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      '/notifications/notification-1/read',
      { method: 'POST' },
    ));
    expect(onOpenBooking).toHaveBeenCalledWith('booking-1');
  });

  it('marks all notifications as read', async () => {
    render(<NotificationsBell onNavigate={vi.fn()} onOpenBooking={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('notifications-badge')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('notifications-button'));
    fireEvent.click(screen.getByText('Mark all read'));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      '/notifications/read-all',
      { method: 'POST' },
    ));
    expect(screen.queryByTestId('notifications-badge')).not.toBeInTheDocument();
  });
});