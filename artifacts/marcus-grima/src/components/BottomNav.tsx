import React from 'react';
import { Home as HomeIcon, Calendar, MessageSquare, User, Menu } from 'lucide-react';
import type { Page } from '@/App';

interface BottomNavProps {
  activePage:   Page;
  onNavigate:   (page: Page) => void;
  onMenuOpen:   () => void;
  menuOpen:     boolean;
}

export const BottomNav = ({ activePage, onNavigate, onMenuOpen, menuOpen }: BottomNavProps) => {
  const items: { id: Page; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'home',     label: 'Home',     icon: <HomeIcon      size={20} className="stroke-[2.5px]" /> },
    { id: 'sessions', label: 'Sessions', icon: <Calendar      size={20} className="stroke-[2px]" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} className="stroke-[2px]" />, badge: true },
    { id: 'profile',  label: 'Profile',  icon: <User          size={20} className="stroke-[2px]" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/96 backdrop-blur-md border-t border-white/8 px-2 py-2.5 flex justify-around items-center z-40">
      {items.map((item) => {
        const isActive = activePage === item.id && !menuOpen;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors relative ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.badge && !isActive && (
              <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-[#0A0A0A]" />
            )}
            <span className="text-[8px] font-bold tracking-wider uppercase">{item.label}</span>
          </button>
        );
      })}

      {/* Burger button */}
      <button
        onClick={onMenuOpen}
        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors relative ${
          menuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Menu size={20} className="stroke-[2px]" />
        <span className="text-[8px] font-bold tracking-wider uppercase">More</span>
      </button>
    </div>
  );
};
