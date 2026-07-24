import React from 'react';
import { Home as HomeIcon, Calendar, Dumbbell, MessageSquare, User } from 'lucide-react';
import type { Page } from '@/App';

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export const BottomNav = ({ activePage, onNavigate }: BottomNavProps) => {
  const items: { id: Page; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'home',     label: 'Home',     icon: <HomeIcon     size={21} className="stroke-[2.5px]" /> },
    { id: 'sessions', label: 'Sessions', icon: <Calendar     size={21} className="stroke-[2px]" /> },
    { id: 'workouts', label: 'Workouts', icon: <Dumbbell     size={21} className="stroke-[2px]" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={21} className="stroke-[2px]" />, badge: true },
    { id: 'profile',  label: 'Profile',  icon: <User         size={21} className="stroke-[2px]" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/8 px-2 py-3 flex justify-around items-center z-40">
      {items.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors relative ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.badge && !isActive && (
              <span className="absolute top-0.5 right-1 w-2 h-2 bg-primary rounded-full border border-[#0A0A0A]" />
            )}
            <span className="text-[9px] font-bold tracking-widest uppercase">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
