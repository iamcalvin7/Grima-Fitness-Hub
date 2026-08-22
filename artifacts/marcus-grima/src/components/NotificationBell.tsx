import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Bell, BellSlash, Check, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { apiRequest } from '@/lib/api';

type NotificationEvent =
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_rescheduled';

interface AppNotification {
  id: string;
  eventType: NotificationEvent;
  title: string;
  body: string;
  bookingId: string;
  trainingSessionId: string;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  onOpenBooking: (bookingId: string) => void;
}

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export function NotificationBell({ onOpenBooking }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [list, unread] = await Promise.all([
        apiRequest<{ notifications: AppNotification[] }>('/notifications'),
        apiRequest<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(Array.isArray(list.notifications) ? list.notifications : []);
      setUnreadCount(Number.isFinite(unread.count) ? unread.count : 0);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load notifications.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(false); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load(false);
  }, [open, load]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const markReadAndOpen = async (notification: AppNotification) => {
    setMutationError(null);
    if (notification.isRead) {
      setOpen(false);
      onOpenBooking(notification.bookingId);
      return;
    }

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setMarkingId(notification.id);
    setNotifications((items) => items.map((item) => (
      item.id === notification.id
        ? { ...item, isRead: true, readAt: new Date().toISOString() }
        : item
    )));
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await apiRequest(`/notifications/${notification.id}/read`, { method: 'POST' });
      setOpen(false);
      onOpenBooking(notification.bookingId);
    } catch (error) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setMutationError(error instanceof Error ? error.message : 'Failed to mark notification as read.');
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    setMutationError(null);
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setMarkingAll(true);
    setNotifications((items) => items.map((item) => (
      item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() }
    )));
    setUnreadCount(0);
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
    } catch (error) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setMutationError(error instanceof Error ? error.message : 'Failed to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center border border-white/10 bg-[#0b0b0c]/90 text-white/70 shadow-lg backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        data-testid="button-notifications"
      >
        <Bell size={19} weight={unreadCount > 0 ? 'fill' : 'regular'} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full border border-[#0b0b0c] bg-primary px-1 text-[9px] font-black text-primary-foreground"
            data-testid="status-unread-notification-count"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="absolute right-0 top-12 z-[70] flex max-h-[min(70vh,560px)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden border border-white/10 bg-[#09090a] shadow-2xl"
          aria-label="Notifications"
          data-testid="panel-notifications"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold tracking-[0.1em] text-white uppercase">Notifications</h2>
              <p className="mt-0.5 text-[10px] font-medium text-white/40" data-testid="text-notification-summary">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => { void markAllRead(); }}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-primary uppercase transition-colors hover:text-white disabled:opacity-50"
                data-testid="button-mark-all-notifications-read"
              >
                {markingAll ? <SpinnerGap size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
                Mark all read
              </button>
            )}
          </header>

          {mutationError && (
            <div className="flex items-start gap-2 border-b border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-100" data-testid="status-notification-mutation-error">
              <WarningCircle size={16} className="mt-0.5 shrink-0 text-red-300" weight="fill" />
              <span>{mutationError}</span>
            </div>
          )}

          <div className="min-h-0 overflow-y-auto">
            {loading && (
              <div className="space-y-3 p-4" aria-label="Loading notifications" data-testid="status-notifications-loading">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="animate-pulse border border-white/5 bg-white/[0.03] px-3 py-4">
                    <div className="h-3 w-2/5 bg-white/10" />
                    <div className="mt-3 h-3 w-4/5 bg-white/5" />
                  </div>
                ))}
              </div>
            )}

            {!loading && loadError && (
              <div className="px-6 py-10 text-center" data-testid="status-notifications-error">
                <WarningCircle size={28} className="mx-auto text-red-300/80" weight="fill" />
                <p className="mt-3 text-sm text-white/70">{loadError}</p>
                <button
                  type="button"
                  onClick={() => { void load(); }}
                  className="mt-4 inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-bold tracking-wider text-white uppercase hover:bg-white/10"
                  data-testid="button-retry-notifications"
                >
                  <ArrowClockwise size={14} weight="bold" />
                  Try again
                </button>
              </div>
            )}

            {!loading && !loadError && notifications.length === 0 && (
              <div className="px-6 py-12 text-center" data-testid="status-notifications-empty">
                <BellSlash size={30} className="mx-auto text-white/25" />
                <p className="mt-3 text-sm font-medium text-white/65">You are all caught up.</p>
                <p className="mt-1 text-xs leading-5 text-white/35">Booking updates will appear here.</p>
              </div>
            )}

            {!loading && !loadError && notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                disabled={markingId === notification.id}
                onClick={() => { void markReadAndOpen(notification); }}
                className={`w-full border-b border-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-wait ${
                  notification.isRead ? 'bg-transparent' : 'bg-white/[0.045]'
                }`}
                data-testid={`button-notification-${notification.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-transparent' : 'bg-primary'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`text-xs font-bold ${notification.isRead ? 'text-white/60' : 'text-white'}`}>{notification.title}</span>
                      <span className="shrink-0 text-[10px] text-white/35">{relativeTime(notification.createdAt)}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/45">{notification.body}</span>
                  </span>
                  {markingId === notification.id && <SpinnerGap size={15} className="mt-0.5 shrink-0 animate-spin text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}