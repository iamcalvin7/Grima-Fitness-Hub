import React, { useState } from 'react';
import { Sidebar }    from '@/components/Sidebar';
import { BottomNav }  from '@/components/BottomNav';
import { BurgerMenu } from '@/components/BurgerMenu';
import { NotificationsBell } from '@/components/NotificationsBell';
import type { Page }  from '@/App';

interface LayoutProps {
  activePage: Page;
  setPage:    (page: Page) => void;
  onOpenBooking: (bookingId: string) => void;
  children:   React.ReactNode;
}

export const Layout = ({ activePage, setPage, onOpenBooking, children }: LayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (page: Page) => {
    setPage(page);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative">

      {/* ── Global background ─────────────────────────────────────────────
          Black & metallic base + subtle silver glows + grain  */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        {/* Base fill — subtle vertical depth */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, #101012 0%, #0a0a0b 35%, #060606 100%)' }} />

        {/* Top glow — Revolut-style bloom behind the header */}
        <div className="absolute" style={{
          top: '-25%', left: '50%',
          transform: 'translateX(-50%)',
          width: '120%', height: '55%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(230,230,235,0.10) 0%, rgba(200,200,210,0.04) 45%, transparent 70%)',
          filter: 'blur(2px)',
        }} />

        {/* Top-right chrome sheen */}
        <div className="absolute" style={{
          top: '-15%', right: '-10%',
          width: '65%', height: '65%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(220,220,225,0.08) 0%, rgba(200,200,205,0.03) 45%, transparent 70%)',
          filter: 'blur(1px)',
        }} />

        {/* Bottom-left graphite wash */}
        <div className="absolute" style={{
          bottom: '-10%', left: '-15%',
          width: '60%', height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(190,190,200,0.05) 0%, rgba(170,170,180,0.02) 50%, transparent 70%)',
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
        <div className="fixed right-4 top-4 z-40 md:right-7 md:top-6">
          <NotificationsBell onNavigate={setPage} onOpenBooking={onOpenBooking} />
        </div>
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
