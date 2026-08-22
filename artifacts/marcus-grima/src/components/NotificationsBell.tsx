import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, CircleNotch, X } from '@phosphor-icons/react';
import type { Page } from '@/App';
import { apiRequest } from '@/lib/api';

interface AppNotification {
  id: string;
  type: string;
  bookingId: string | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

interface NotificationsBellProps {
  onNavigate: (page: Page) => void;
  onOpenBooking: (bookingId: string) => void;
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsBell({ onNavigate, onOpenBooking }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest<NotificationsResponse>('/notifications');
      setNotifications(Array.isArray(response.notifications) ? response.notifications : []);
      setUnreadCount(Number(response.unreadCount) || 0);
    } catch {
      // Notifications are supplementary UI; do not interrupt the app shell.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );
  const badgeCount = Math.max(unreadCount, visibleUnreadCount);

  const markRead = async (notification: AppNotification) => {
    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, readAt } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await apiRequest(`/notifications/${notification.id}/read`, { method: 'POST' });
      } catch {
        void refresh();
      }
    }
    setOpen(false);
    if (notification.bookingId) onOpenBooking(notification.bookingId);
    else onNavigate('sessions');
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({
      ...item,
      readAt: item.readAt ?? new Date().toISOString(),
    })));
    setUnreadCount(0);
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
    } catch {
      void refresh();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={badgeCount > 0 ? `Notifications, ${badgeCount} unread` : 'Notifications'}
        aria-expanded={open}
        data-testid="notifications-button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition-colors hover:border-white/25 hover:text-white"
      >
        <Bell size={19} weight={open ? 'fill' : 'regular'} />
        {badgeCount > 0 && (
          <span
            data-testid="notifications-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground"
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#111112]/[.98] shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Inbox</p>
              <h2 className="mt-0.5 text-sm font-black text-white">Notifications</h2>
            </div>
            <div className="flex items-center gap-1">
              {badgeCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/35 hover:bg-white/8 hover:text-white"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-white/40">
                <CircleNotch size={16} className="animate-spin" />
                Loading notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Check size={22} className="mx-auto text-primary/70" />
                <p className="mt-3 text-sm font-bold text-white/70">You’re all caught up</p>
                <p className="mt-1 text-xs text-white/35">Booking updates will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/6">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => void markRead(notification)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/6 ${
                      notification.readAt ? 'opacity-60' : 'bg-primary/[.045]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.readAt ? 'bg-white/15' : 'bg-primary'
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-xs font-bold text-white">{notification.title}</span>
                          <span className="shrink-0 text-[10px] text-white/30">{relativeTime(notification.createdAt)}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-white/50">{notification.body}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}