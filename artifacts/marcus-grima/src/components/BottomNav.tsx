import React from 'react';
import { House as HomeIcon, CalendarBlank as Calendar, ChatCircle as MessageSquare, List as Menu } from '@phosphor-icons/react';
import type { Page } from '@/App';
import { useAuth } from '@/auth/AuthContext';

interface BottomNavProps {
  activePage:   Page;
  onNavigate:   (page: Page) => void;
  onMenuOpen:   () => void;
  menuOpen:     boolean;
}

export const BottomNav = ({ activePage, onNavigate, onMenuOpen, menuOpen }: BottomNavProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const items: { id: Page; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'home',     label: 'Home',     icon: <HomeIcon      size={20} weight="fill" /> },
    { id: 'sessions', label: isAdmin ? 'Sessions HQ' : 'Sessions', icon: <Calendar size={20} weight="fill" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} weight="fill" />, badge: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-2 py-2.5 flex justify-around items-center z-40"
      style={{ background: 'rgba(10,10,10,0.97)', borderColor: 'rgba(200,200,200,0.08)' }}>
      {items.map((item) => {
        const isActive = activePage === item.id && !menuOpen;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors relative"
            style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.3)' }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-white" />
            )}
            {item.icon}
            {item.badge && !isActive && (
              <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-[#0A0A0A]" />
            )}
            <span className="text-[8px] font-bold tracking-wider uppercase">{item.label}</span>
          </button>
        );
      })}

      {/* Burger button */}
      <button
        onClick={onMenuOpen}
        className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors relative"
        style={{ color: menuOpen ? '#ffffff' : 'rgba(255,255,255,0.3)' }}
      >
        {menuOpen && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-white" />}
        <Menu size={20} weight="fill" />
        <span className="text-[8px] font-bold tracking-wider uppercase">More</span>
      </button>
    </div>
  );
};
