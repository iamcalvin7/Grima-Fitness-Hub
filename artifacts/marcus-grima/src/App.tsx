import React, { useEffect, useState } from 'react';
import { Onboarding }  from '@/pages/Onboarding';
import { SplashScreen } from '@/pages/SplashScreen';
import { Home }        from '@/pages/Home';
import { Sessions }    from '@/pages/Sessions';
import { Messages }    from '@/pages/Messages';
import { Profile }     from '@/pages/Profile';
import { Workouts }    from '@/pages/Workouts';
import { MealPlan }     from '@/pages/MealPlan';
import { Leaderboard } from '@/pages/Leaderboard';
import { Offers } from '@/pages/Offers';
import { Memberships } from '@/pages/Memberships';
import { Team }        from '@/pages/Team';
import { Layout }       from '@/components/Layout';
import { useAuth } from '@/auth/AuthContext';

export type Page = 'home' | 'sessions' | 'workouts' | 'meals' | 'messages' | 'profile' | 'leaderboard' | 'offers' | 'memberships' | 'team';

function App() {
  const { isLoading, isAuthenticated, isProfileLoading, signOut } = useAuth();
  const [showSplash,    setShowSplash]    = useState(true);
  const [activePage,    setActivePage]    = useState<Page>('home');
  const [sessionFocus,  setSessionFocus]  = useState<number | undefined>(undefined);

  /**
   * `enteredApp` gates the onboarding flow: an already-authenticated user
   * (session cookie) enters the app directly, while a fresh signup stays in
   * onboarding until the welcome screen's onComplete — even though the
   * session already exists by then.
   */
  const [enteredApp, setEnteredApp] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    if (!isLoading && !authResolved) {
      setAuthResolved(true);
      // Redirect authenticated users away from login/signup on load.
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

  const handleLogout = () => {
    void signOut();
  };

  /** Navigate to Sessions and optionally deep-link into a specific session. */
  const goToSession = (id: number) => {
    setSessionFocus(id);
    setActivePage('sessions');
  };

  /** Clear the focus once Sessions has consumed it so back-navigation works cleanly. */
  const handleSetPage = (page: Page) => {
    if (page !== 'sessions') setSessionFocus(undefined);
    setActivePage(page);
  };

  // Keep the splash up until the session check — and, for signed-in users,
  // the initial profile load — has resolved, so no stale/fallback data flashes.
  if (showSplash || isLoading || (isAuthenticated && isProfileLoading)) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated || !enteredApp) {
    return <Onboarding onComplete={() => setEnteredApp(true)} />;
  }

  return (
    <Layout activePage={activePage} setPage={handleSetPage}>
      {activePage === 'home'     && <Home     setPage={handleSetPage} goToSession={goToSession} />}
      {activePage === 'sessions' && <Sessions setPage={handleSetPage} openSessionId={sessionFocus} />}
      {activePage === 'workouts' && <Workouts />}
      {activePage === 'meals'    && <MealPlan />}
      {activePage === 'messages' && <Messages setPage={handleSetPage} />}
      {activePage === 'profile'      && <Profile      setPage={handleSetPage} onLogout={handleLogout} />}
      {activePage === 'leaderboard'  && <Leaderboard />}
      {activePage === 'offers'       && <Offers />}
      {activePage === 'memberships'  && <Memberships setPage={handleSetPage} />}
      {activePage === 'team'         && <Team />}
    </Layout>
  );
}

export default App;
