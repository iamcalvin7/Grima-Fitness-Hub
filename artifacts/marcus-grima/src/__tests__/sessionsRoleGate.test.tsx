import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionsRoleGate } from '@/components/SessionsRoleGate';
import type { Page } from '@/App';

vi.mock('@/pages/Sessions', () => ({
  Sessions: () => <div data-testid="client-sessions-page">Client Sessions</div>,
}));

vi.mock('@/pages/MarcusSessionsHQ', () => ({
  MarcusSessionsHQ: () => <div data-testid="marcus-sessions-hq">Marcus Sessions HQ</div>,
}));

function renderGate(role: string | null | undefined) {
  const setPage = vi.fn<(page: Page) => void>();
  render(<SessionsRoleGate role={role} setPage={setPage} />);
  return setPage;
}

describe('SessionsRoleGate', () => {
  it('keeps the existing Client Sessions page for clients', () => {
    renderGate('client');
    expect(screen.getByTestId('client-sessions-page')).toBeInTheDocument();
    expect(screen.queryByTestId('marcus-sessions-hq')).not.toBeInTheDocument();
  });

  it('mounts Marcus Sessions HQ only for admins', () => {
    renderGate('admin');
    expect(screen.getByTestId('marcus-sessions-hq')).toBeInTheDocument();
    expect(screen.queryByTestId('client-sessions-page')).not.toBeInTheDocument();
  });

  it.each(['trainer', undefined, null, 'unknown'])(
    'fails closed for the %s role state',
    (role) => {
      renderGate(role);
      expect(screen.getByTestId('sessions-access-denied')).toBeInTheDocument();
      expect(screen.queryByTestId('client-sessions-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('marcus-sessions-hq')).not.toBeInTheDocument();
    },
  );
});