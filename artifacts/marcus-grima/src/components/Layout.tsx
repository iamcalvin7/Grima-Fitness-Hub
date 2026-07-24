import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import type { Page } from '@/App';

interface LayoutProps {
  activePage: Page;
  setPage: (page: Page) => void;
  children: React.ReactNode;
}

export const Layout = ({ activePage, setPage, children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Desktop sidebar */}
      <Sidebar activePage={activePage} onNavigate={setPage} />

      {/* Main content — offset by sidebar on desktop */}
      <main className="md:ml-60 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav activePage={activePage} onNavigate={setPage} />
    </div>
  );
};
