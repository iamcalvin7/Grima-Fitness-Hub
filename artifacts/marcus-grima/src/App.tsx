import React, { useState } from 'react';
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
import { Layout }       from '@/components/Layout';

export type Page = 'home' | 'sessions' | 'workouts' | 'meals' | 'messages' | 'profile' | 'leaderboard' | 'offers';

function forceOnboarding() {
  return new URLSearchParams(window.location.search).has('onboarding');
}

function isAuthed() {
  if (forceOnboarding()) return false;
  try {
    const raw = localStorage.getItem('mg_auth');
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < 30 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function App() {
  const [showSplash,    setShowSplash]    = useState(true);
  const [authed,        setAuthed]        = useState(isAuthed);
  const [activePage,    setActivePage]    = useState<Page>('home');
  const [sessionFocus,  setSessionFocus]  = useState<number | undefined>(undefined);

  const handleLogout = () => {
    localStorage.removeItem('mg_auth');
    setAuthed(false);
    setActivePage('home');
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

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (!authed)    return <Onboarding onComplete={() => setAuthed(true)} />;

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
    </Layout>
  );
}

export default App;
