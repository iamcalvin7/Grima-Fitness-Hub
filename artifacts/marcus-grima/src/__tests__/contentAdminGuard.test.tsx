/**
 * Runtime component tests for the Content Admin guard.
 *
 * Covers all four required cases from Gate 1B:
 *   • client  with forced activePage="content-admin" → no mount, redirect
 *   • missing / undefined role                       → no mount, redirect
 *   • legacy trainer                                 → no mount, redirect
 *   • admin                                          → mounts, no redirect
 *
 * Also verifies Sidebar and BurgerMenu Content Admin nav visibility because
 * both components are small, depend only on useAuth(), and need no extra
 * application mocking beyond what this file already provides.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ── Hoist mocks ────────────────────────────────────────────────────────────
// vi.mock() calls are hoisted to the top of the module by Vitest so they take
// effect before any import resolves.

// Replace ContentAdmin with a lightweight sentinel so tests never depend on
// the full page component or its API calls.
vi.mock('@/pages/ContentAdmin', () => ({
  ContentAdmin: () => <div data-testid="content-admin-page" />,
}));

// Replace the whole AuthContext module so components that call useAuth()
// receive a controlled value injected per test via mockReturnValue().
vi.mock('@/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Framer-motion produces WAAPI calls that jsdom does not support.  Replace the
// relevant exports with inert pass-through components so BurgerMenu renders
// its children synchronously without errors.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', rest, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ── Imports (after mock registrations) ────────────────────────────────────
import { useAuth } from '@/auth/AuthContext';
import type { AuthUser } from '@/auth/AuthContext';
import type { AuthContextValue } from '@/auth/AuthContext';
import { ContentAdminGuard } from '@/components/ContentAdminGuard';
import { Sidebar } from '@/components/Sidebar';
import { BurgerMenu } from '@/components/BurgerMenu';
import type { Page } from '@/App';

// ── Test helpers ──────────────────────────────────────────────────────────

function makeUser(role: 'admin' | 'trainer' | 'client'): AuthUser {
  return {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

/** Returns a full AuthContextValue with only `user` set to the provided value.
 *  All other fields are stubs — components under test only read `user`. */
function makeAuthValue(user: AuthUser | null): AuthContextValue {
  return {
    user,
    isLoading: false,
    isAuthenticated: user !== null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    profile: null,
    isProfileLoading: false,
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
    createProfile: vi.fn(),
  };
}

const mockedUseAuth = vi.mocked(useAuth);

// ── ContentAdminGuard ─────────────────────────────────────────────────────

describe('ContentAdminGuard', () => {
  let setActivePage: ReturnType<typeof vi.fn<(page: Page) => void>>;

  beforeEach(() => {
    setActivePage = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── client ──────────────────────────────────────────────────────────────

  describe('client with forced activePage="content-admin"', () => {
    it('does not mount ContentAdmin', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('client')}
        />,
      );
      expect(screen.queryByTestId('content-admin-page')).not.toBeInTheDocument();
    });

    it('redirects navigation to home', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('client')}
        />,
      );
      expect(setActivePage).toHaveBeenCalledWith('home');
      expect(setActivePage).toHaveBeenCalledTimes(1);
    });
  });

  // ── missing / undefined role ─────────────────────────────────────────────

  describe('user=null (missing / undefined role)', () => {
    it('fails closed: does not mount ContentAdmin', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={null}
        />,
      );
      expect(screen.queryByTestId('content-admin-page')).not.toBeInTheDocument();
    });

    it('fails closed: redirects to home', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={null}
        />,
      );
      expect(setActivePage).toHaveBeenCalledWith('home');
      expect(setActivePage).toHaveBeenCalledTimes(1);
    });
  });

  // ── legacy trainer ───────────────────────────────────────────────────────

  describe('legacy trainer with forced activePage="content-admin"', () => {
    it('does not mount ContentAdmin', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('trainer')}
        />,
      );
      expect(screen.queryByTestId('content-admin-page')).not.toBeInTheDocument();
    });

    it('redirects to home', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('trainer')}
        />,
      );
      expect(setActivePage).toHaveBeenCalledWith('home');
    });
  });

  // ── admin ────────────────────────────────────────────────────────────────

  describe('admin with activePage="content-admin"', () => {
    it('mounts ContentAdmin', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('admin')}
        />,
      );
      expect(screen.getByTestId('content-admin-page')).toBeInTheDocument();
    });

    it('does not redirect', () => {
      render(
        <ContentAdminGuard
          activePage="content-admin"
          setActivePage={setActivePage}
          user={makeUser('admin')}
        />,
      );
      expect(setActivePage).not.toHaveBeenCalled();
    });
  });

  // ── guard does not interfere with other pages ────────────────────────────

  it('admin on a non-content-admin page: does not mount ContentAdmin', () => {
    render(
      <ContentAdminGuard
        activePage="home"
        setActivePage={setActivePage}
        user={makeUser('admin')}
      />,
    );
    expect(screen.queryByTestId('content-admin-page')).not.toBeInTheDocument();
    expect(setActivePage).not.toHaveBeenCalled();
  });
});

// ── Sidebar — Content Admin nav visibility ────────────────────────────────

describe('Sidebar — Content Admin nav visibility', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Content Admin nav item for admin', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('admin')));
    render(<Sidebar activePage="home" onNavigate={vi.fn()} />);
    expect(screen.getByText('Content Admin')).toBeInTheDocument();
  });

  it('hides the Content Admin nav item for client', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('client')));
    render(<Sidebar activePage="home" onNavigate={vi.fn()} />);
    expect(screen.queryByText('Content Admin')).not.toBeInTheDocument();
  });

  it('hides the Content Admin nav item for trainer', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('trainer')));
    render(<Sidebar activePage="home" onNavigate={vi.fn()} />);
    expect(screen.queryByText('Content Admin')).not.toBeInTheDocument();
  });
});

// ── BurgerMenu — Content Admin item visibility ────────────────────────────

describe('BurgerMenu — Content Admin item visibility', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Content Admin item for admin', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('admin')));
    render(
      <BurgerMenu
        open={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        activePage="home"
      />,
    );
    expect(screen.getByText('Content Admin')).toBeInTheDocument();
  });

  it('hides the Content Admin item for client', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('client')));
    render(
      <BurgerMenu
        open={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        activePage="home"
      />,
    );
    expect(screen.queryByText('Content Admin')).not.toBeInTheDocument();
  });

  it('hides the Content Admin item for trainer', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue(makeUser('trainer')));
    render(
      <BurgerMenu
        open={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        activePage="home"
      />,
    );
    expect(screen.queryByText('Content Admin')).not.toBeInTheDocument();
  });
});
