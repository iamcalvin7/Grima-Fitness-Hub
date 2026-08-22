import React, { useEffect } from 'react';
import type { Page } from '@/App';
import { MarcusSessionsHQ } from '@/pages/MarcusSessionsHQ';
import { Sessions } from '@/pages/Sessions';

interface SessionsRoleGateProps {
  role: string | null | undefined;
  setPage: (page: Page) => void;
  openSessionId?: string | number;
  openPendingBookingId?: string;
  onBookingIntentResolved?: () => void;
}

export function SessionsRoleGate({ role, setPage, openSessionId, openPendingBookingId, onBookingIntentResolved }: SessionsRoleGateProps) {
  useEffect(() => {
    if (role && role !== 'client' && role !== 'admin' && (openPendingBookingId || openSessionId)) {
      onBookingIntentResolved?.();
    }
  }, [role, openPendingBookingId, openSessionId, onBookingIntentResolved]);

  if (role === 'client') {
    return <Sessions setPage={setPage} openSessionId={openSessionId} onBookingIntentResolved={onBookingIntentResolved} />;
  }

  if (role === 'admin') {
    return <MarcusSessionsHQ openBookingId={openPendingBookingId} onBookingIntentResolved={onBookingIntentResolved} />;
  }

  return (
    <section
      className="min-h-[100dvh] flex items-center justify-center px-6 text-center"
      aria-labelledby="sessions-access-title"
      data-testid="sessions-access-denied"
    >
      <div className="max-w-sm">
        <p className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase">Sessions</p>
        <h1 id="sessions-access-title" className="mt-3 text-2xl font-bold text-white">
          Session access unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/45">
          Your account does not have access to client booking controls or Sessions HQ.
        </p>
        <button
          type="button"
          onClick={() => setPage('home')}
          className="mt-6 px-4 py-2 bg-white text-black text-xs font-bold tracking-wider uppercase"
          data-testid="button-return-home-from-sessions"
        >
          Return home
        </button>
      </div>
    </section>
  );
}