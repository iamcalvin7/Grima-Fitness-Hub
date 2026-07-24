import React, { useState } from 'react';
import { SplashScreen } from '@/pages/SplashScreen';
import { Home } from '@/pages/Home';
import { Sessions } from '@/pages/Sessions';
import { Messages } from '@/pages/Messages';
import { Profile } from '@/pages/Profile';
import { Workouts } from '@/pages/Workouts';
import { Layout } from '@/components/Layout';

export type Page = 'home' | 'sessions' | 'workouts' | 'messages' | 'profile';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<Page>('home');

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Layout activePage={activePage} setPage={setActivePage}>
      {activePage === 'home'     && <Home     setPage={setActivePage} />}
      {activePage === 'sessions' && <Sessions setPage={setActivePage} />}
      {activePage === 'workouts' && <Workouts />}
      {activePage === 'messages' && <Messages setPage={setActivePage} />}
      {activePage === 'profile'  && <Profile  setPage={setActivePage} />}
    </Layout>
  );
}

export default App;
