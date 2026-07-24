import React, { useState } from 'react';
import { Onboarding } from '@/pages/Onboarding';
import { SplashScreen } from '@/pages/SplashScreen';
import { Home } from '@/pages/Home';
import { Sessions } from '@/pages/Sessions';
import { Messages } from '@/pages/Messages';
import { Profile } from '@/pages/Profile';
import { Workouts } from '@/pages/Workouts';
import { MealPlan } from '@/pages/MealPlan';
import { Layout } from '@/components/Layout';

export type Page = 'home' | 'sessions' | 'workouts' | 'meals' | 'messages' | 'profile';

function isAuthed() {
  try {
    const raw = localStorage.getItem('mg_auth');
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < 30 * 24 * 60 * 60 * 1000; // 30 days
  } catch { return false; }
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authed, setAuthed]         = useState(isAuthed);
  const [activePage, setActivePage] = useState<Page>('home');

  const handleLogout = () => {
    localStorage.removeItem('mg_auth');
    setAuthed(false);
    setActivePage('home');
  };

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (!authed)    return <Onboarding onComplete={() => setAuthed(true)} />;

  return (
    <Layout activePage={activePage} setPage={setActivePage}>
      {activePage === 'home'     && <Home     setPage={setActivePage} />}
      {activePage === 'sessions' && <Sessions setPage={setActivePage} />}
      {activePage === 'workouts' && <Workouts />}
      {activePage === 'meals'    && <MealPlan />}
      {activePage === 'messages' && <Messages setPage={setActivePage} />}
      {activePage === 'profile'  && <Profile  setPage={setActivePage} onLogout={handleLogout} />}
    </Layout>
  );
}

export default App;
