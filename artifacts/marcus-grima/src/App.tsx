import React, { useEffect, useState } from 'react';
import { Onboarding }        from '@/pages/Onboarding';
import { SplashScreen }       from '@/pages/SplashScreen';
import { Home }               from '@/pages/Home';
import { Messages }           from '@/pages/Messages';
import { Profile }            from '@/pages/Profile';
import { Workouts }           from '@/pages/Workouts';
import { MealPlan }           from '@/pages/MealPlan';
import { Leaderboard }        from '@/pages/Leaderboard';
import { Offers }             from '@/pages/Offers';
import { Memberships }        from '@/pages/Memberships';
import { Team }               from '@/pages/Team';
import { Feed }               from '@/pages/Feed';
import { ContentAdminGuard }  from '@/components/ContentAdminGuard';
import { Proposal }           from '@/pages/Proposal';
import { ClientLanding }      from '@/pages/ClientLanding';
import { AccountSecurity }    from '@/pages/AccountSecurity';
import { ActiveSessions }     from '@/pages/ActiveSessions';
import { DeleteAccount }      from '@/pages/DeleteAccount';
import { ForgotPassword }     from '@/pages/ForgotPassword';
import { ResetPassword }      from '@/pages/ResetPassword';
import { VerifyEmailHandler } from '@/pages/VerifyEmailHandler';
import { OAuthCallback }      from '@/pages/OAuthCallback';
import { Layout }             from '@/components/Layout';
import { SessionsRoleGate }   from '@/components/SessionsRoleGate';
import { useAuth } from '@/auth/AuthContext';
import { LANDING_ONLY } from '@/config';

export type Page =
  | 'home' | 'sessions' | 'workouts' | 'meals' | 'messages'
  | 'profile' | 'leaderboard' | 'offers' | 'memberships' | 'team'
  | 'security' | 'active-sessions' | 'delete-account'
  | 'feed' | 'content-admin';

/* Standalone proposal page: lives at its own URL under the app base path. */
export const PROPOSAL_PATH = `${import.meta.env.BASE_URL}proposal`;

function isProposalEntry(): boolean {
  return window.location.pathname.replace(/\/+$/, '') === PROPOSAL_PATH.replace(/\/+$/, '');
}

/* ── Query-parameter entry points ─────────────────────────────────────── */
type Modal =
  | { kind: 'reset';  token: string }
  | { kind: 'verify'; token: string }
  | { kind: 'oauth';  outcome: 'success' | 'error' }
  | null;

function readModal(): Modal {
  const params = new URLSearchParams(window.location.search);
  const reset  = params.get('reset');
  const verify = params.get('verify');
  const oauth  = params.get('oauth');
  const oauthErr = params.get('oauth_error');
  if (reset)    return { kind: 'reset',  token: reset };
  if (verify)   return { kind: 'verify', token: verify };
  if (oauth === 'success') return { kind: 'oauth', outcome: 'success' };
  if (oauthErr) return { kind: 'oauth', outcome: 'error' };
  return null;
}

function isJoinEntry(): boolean {
  return (
    new URLSearchParams(window.location.search).has('join') ||
    window.location.pathname === '/ownyourjourney'
  );
}

function clearQueryParams() {
  window.history.replaceState({}, '', window.location.pathname);
}

function App() {
  /* Landing-only mode: the whole site is the landing page — no login, no app. */
  if (LANDING_ONLY) {
    return <ClientLanding onSignIn={() => {}} />;
  }
  return <FullApp />;
}

function FullApp() {
  const { isLoading, isAuthenticated, isProfileLoading, profile, user, signOut } = useAuth();
  const [showSplash,    setShowSplash]    = useState(true);
  const [activePage,    setActivePage]    = useState<Page>('home');
  const [sessionFocus,  setSessionFocus]  = useState<number | undefined>(undefined);

  /**
   * `enteredApp` gates the onboarding flow: an already-authenticated user
   * (session cookie) enters the app directly, while a fresh signup stays in
   * onboarding until the welcome screen's onComplete — even though the
   * session already exists by then.
   */
  const [enteredApp,   setEnteredApp]   = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  /* Lead page: shown to unauthenticated visitors arriving via ?join or /join */
  const isLead = isJoinEntry();
  const [showLeadPage, setShowLeadPage] = useState(() => isLead);
  // Skip the splash screen entirely for lead-page visitors

  /* Modal driven by query params (?reset=, ?verify=, ?oauth=success …) */
  const [modal, setModal] = useState<Modal>(null);

  // Read query params once on mount, before any auth state is known.
  useEffect(() => {
    const m = readModal();
    if (m) { setModal(m); clearQueryParams(); }
  }, []);

  useEffect(() => {
    if (!isLoading && !authResolved) {
      setAuthResolved(true);
      if (isAuthenticated) setEnteredApp(true);
    }
  }, [isLoading, isAuthenticated, authResolved]);

  // If the session ends (logout or expiry detected), fall back to onboarding.
  useEffect(() => {
    if (authResolved && !isAuthenticated && enteredApp) {
      setEnteredApp(false);
      setActivePage('home');
    }
  }, [authResolved, isAuthenticated, enteredApp]);

  // Content Admin guard is handled by <ContentAdminGuard> below — both the
  // redirect useEffect and the conditional render live there so they can be
  // unit-tested in isolation. Server-side capability enforcement remains the
  // security authority; the guard is an additional UX safeguard only.

  const handleLogout = () => { void signOut(); };

  const goToSession = (id: number) => {
    setSessionFocus(id);
    setActivePage('sessions');
  };

  const handleSetPage = (page: Page) => {
    if (page !== 'sessions') setSessionFocus(undefined);
    setActivePage(page);
  };

  /* Keep splash up until session + profile resolve. */
  if (!isLead && (showSplash || isLoading || (isAuthenticated && isProfileLoading))) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  /* ── Token / OAuth modals (shown before any auth routing) ────────────── */

  if (modal?.kind === 'reset') {
    return (
      <ResetPassword
        token={modal.token}
        onDone={() => setModal(null)}
      />
    );
  }

  if (modal?.kind === 'verify') {
    return (
      <VerifyEmailHandler
        token={modal.token}
        onDone={(emailChanged) => {
          setModal(null);
          // Email-change tokens sign out every session — send back to onboarding.
          if (emailChanged) { setEnteredApp(false); signOut().catch(() => {}); }
        }}
      />
    );
  }

  if (modal?.kind === 'oauth') {
    return (
      <OAuthCallback
        outcome={modal.outcome}
        onSuccess={() => {
          setModal(null);
          setEnteredApp(true);
        }}
        onError={() => setModal(null)}
      />
    );
  }

  /* ── Lead-gen landing (public, ?join URL param) ───────────────────── */

  if (showLeadPage) {
    return (
      <ClientLanding
        onSignIn={() => setShowLeadPage(false)}
      />
    );
  }

  /* ── Auth / onboarding gates ─────────────────────────────────────────── */

  if (!isAuthenticated || !enteredApp) {
    return <Onboarding onComplete={() => setEnteredApp(true)} />;
  }

  /* Authenticated but no profile yet (OAuth users): run profile-only flow. */
  if (!profile?.onboardingCompleted) {
    return <Onboarding onComplete={() => setEnteredApp(true)} profileOnly />;
  }

  /* ── Standalone proposal page (own URL, staff only) ──────────────────── */
  if (isProposalEntry()) {
    const isStaff = profile && (user?.role === 'trainer' || user?.role === 'admin');
    if (!isStaff) {
      window.location.replace(import.meta.env.BASE_URL);
      return null;
    }
    return <Proposal />;
  }

  /* ── Main app ────────────────────────────────────────────────────────── */

  /* Full-screen security sub-pages: rendered outside Layout to avoid nav. */
  if (activePage === 'security') {
    return (
      <AccountSecurity
        onBack={() => setActivePage('profile')}
        onDeleteAccount={() => setActivePage('delete-account')}
      />
    );
  }
  if (activePage === 'active-sessions') {
    return (
      <ActiveSessions onBack={() => setActivePage('profile')} />
    );
  }
  if (activePage === 'delete-account') {
    return (
      <DeleteAccount
        onBack={() => setActivePage('security')}
        onDeleted={() => {
          setEnteredApp(false);
          setActivePage('home');
        }}
      />
    );
  }

  return (
    <Layout activePage={activePage} setPage={handleSetPage}>
      {activePage === 'home'        && <Home     setPage={handleSetPage} goToSession={goToSession} />}
      {activePage === 'sessions'    && (
        <SessionsRoleGate
          role={user?.role}
          setPage={handleSetPage}
          openSessionId={sessionFocus}
        />
      )}
      {activePage === 'workouts'    && <Workouts />}
      {activePage === 'meals'       && <MealPlan />}
      {activePage === 'messages'    && <Messages setPage={handleSetPage} />}
      {activePage === 'profile'     && <Profile  setPage={handleSetPage} onLogout={handleLogout} />}
      {activePage === 'leaderboard' && <Leaderboard />}
      {activePage === 'offers'      && <Offers />}
      {activePage === 'memberships' && <Memberships setPage={handleSetPage} />}
      {activePage === 'team'          && <Team />}
      {activePage === 'feed'          && <Feed />}
      <ContentAdminGuard activePage={activePage} setActivePage={handleSetPage} user={user} />
    </Layout>
  );
}

export default App;
