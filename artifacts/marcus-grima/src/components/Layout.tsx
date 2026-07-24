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
    <div className="min-h-screen bg-[#0A0A0A]">
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
