import React, { useState } from 'react';
import { Sidebar }    from '@/components/Sidebar';
import { BottomNav }  from '@/components/BottomNav';
import { BurgerMenu } from '@/components/BurgerMenu';
import type { Page }  from '@/App';

interface LayoutProps {
  activePage: Page;
  setPage:    (page: Page) => void;
  children:   React.ReactNode;
}

export const Layout = ({ activePage, setPage, children }: LayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (page: Page) => {
    setPage(page);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative">

      {/* ── Global background ─────────────────────────────────────────────
          Revolut-inspired: deep purple-black base + radial glows + grain  */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        {/* Base fill */}
        <div className="absolute inset-0" style={{ background: '#07050e' }} />

        {/* Top-right purple bloom */}
        <div className="absolute" style={{
          top: '-15%', right: '-10%',
          width: '65%', height: '65%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(120,50,210,0.22) 0%, rgba(90,30,170,0.08) 45%, transparent 70%)',
          filter: 'blur(1px)',
        }} />

        {/* Bottom-left indigo wash */}
        <div className="absolute" style={{
          bottom: '-10%', left: '-15%',
          width: '55%', height: '55%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(80,30,160,0.14) 0%, rgba(60,20,120,0.05) 50%, transparent 70%)',
        }} />

        {/* Centre deep glow — very subtle */}
        <div className="absolute" style={{
          top: '35%', left: '50%',
          transform: 'translateX(-50%)',
          width: '80%', height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(100,40,190,0.06) 0%, transparent 70%)',
        }} />

        {/* Grain texture overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          opacity: 0.032,
          mixBlendMode: 'overlay',
        }} />
      </div>

      {/* Desktop sidebar */}
      <Sidebar activePage={activePage} onNavigate={setPage} />

      {/* Main content */}
      <main className="md:ml-60 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav
        activePage={activePage}
        onNavigate={handleNav}
        onMenuOpen={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />

      {/* Burger menu sheet */}
      <BurgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNav}
        activePage={activePage}
      />
    </div>
  );
};
