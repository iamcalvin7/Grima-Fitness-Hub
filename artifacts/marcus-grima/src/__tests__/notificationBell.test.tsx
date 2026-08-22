import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '@/components/NotificationBell';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiRequest }));

const notification = {
  id: 'notification-1',
  eventType: 'booking_confirmed',
  title: 'Booking confirmed',
  body: 'Your booking is confirmed.',
  bookingId: 'booking-1',
  trainingSessionId: 'session-1',
  readAt: null,
  isRead: false,
  createdAt: '2026-08-22T10:00:00.000Z',
};

function mockLoad() {
  apiRequest.mockImplementation((path: string) => {
    if (path === '/notifications') return Promise.resolve({ notifications: [notification] });
    if (path === '/notifications/unread-count') return Promise.resolve({ count: 1 });
    if (path === `/notifications/${notification.id}/read`) return Promise.resolve({ notification });
    return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
  });
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad();
  });

  it('shows an accurate unread badge and opens a booking after marking it read', async () => {
    const onOpenBooking = vi.fn();
    render(<NotificationBell onOpenBooking={onOpenBooking} />);
    await waitFor(() => expect(screen.getByTestId('status-unread-notification-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByTestId('button-notifications'));
    const item = await screen.findByTestId(`button-notification-${notification.id}`);
    fireEvent.click(item);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      `/notifications/${notification.id}/read`,
      { method: 'POST' },
    ));
    expect(onOpenBooking).toHaveBeenCalledWith(notification.bookingId);
  });

  it('restores unread state and shows a visible error when marking read fails', async () => {
    apiRequest.mockImplementation((path: string) => {
      if (path === '/notifications') return Promise.resolve({ notifications: [notification] });
      if (path === '/notifications/unread-count') return Promise.resolve({ count: 1 });
      if (path === `/notifications/${notification.id}/read`) return Promise.reject(new Error('Read failed'));
      return Promise.reject(new Error(`Unexpected endpoint: ${path}`));
    });
    const onOpenBooking = vi.fn();
    render(<NotificationBell onOpenBooking={onOpenBooking} />);
    await waitFor(() => expect(screen.getByTestId('status-unread-notification-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByTestId('button-notifications'));
    fireEvent.click(await screen.findByTestId(`button-notification-${notification.id}`));

    expect(await screen.findByTestId('status-notification-mutation-error')).toHaveTextContent('Read failed');
    expect(screen.getByTestId('status-unread-notification-count')).toHaveTextContent('1');
    expect(onOpenBooking).not.toHaveBeenCalled();
  });
});