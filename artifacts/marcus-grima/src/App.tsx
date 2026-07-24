import React, { useState } from 'react';
import { SplashScreen } from '@/pages/SplashScreen';
import { Home } from '@/pages/Home';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="bg-[#050505] min-h-screen flex items-center justify-center font-sans">
      <div className="w-full h-full sm:h-[844px] sm:w-[390px] sm:rounded-[40px] sm:overflow-hidden sm:shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:border-[8px] sm:border-[#1A1A1A] relative bg-[#0A0A0A]">
        {showSplash ? (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        ) : (
          <Home />
        )}
      </div>
    </div>
  );
}

export default App;
