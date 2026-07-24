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
    // Sessions last 30 days
    return Date.now() - ts < 30 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function App() {
  const [showSplash, setShowSplash]       = useState(true);
  const [authed, setAuthed]               = useState(isAuthed);
  const [activePage, setActivePage]       = useState<Page>('home');

  // 1. Always show splash first (brand moment)
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // 2. If not authed, show onboarding + sign-in
  if (!authed) {
    return <Onboarding onComplete={() => setAuthed(true)} />;
  }

  // 3. Main app
  return (
    <Layout activePage={activePage} setPage={setActivePage}>
      {activePage === 'home'     && <Home     setPage={setActivePage} />}
      {activePage === 'sessions' && <Sessions setPage={setActivePage} />}
      {activePage === 'workouts' && <Workouts />}
      {activePage === 'meals'    && <MealPlan />}
      {activePage === 'messages' && <Messages setPage={setActivePage} />}
      {activePage === 'profile'  && <Profile  setPage={setActivePage} />}
    </Layout>
  );
}

export default App;
