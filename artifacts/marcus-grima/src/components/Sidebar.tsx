import React from 'react';
import { Home as HomeIcon, Calendar, Dumbbell, UtensilsCrossed, MessageSquare, User, Zap, Trophy } from 'lucide-react';
import type { Page } from '@/App';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode; badge?: boolean }[] = [
  { id: 'home',     label: 'Home',     icon: <HomeIcon        size={18} /> },
  { id: 'sessions', label: 'Sessions', icon: <Calendar        size={18} /> },
  { id: 'workouts', label: 'Workouts', icon: <Dumbbell        size={18} /> },
  { id: 'meals',    label: 'Meals',    icon: <UtensilsCrossed size={18} /> },
  { id: 'messages',    label: 'Messages',    icon: <MessageSquare size={18} />, badge: true },
  { id: 'leaderboard',label: 'Leaderboard', icon: <Trophy        size={18} /> },
  { id: 'profile',    label: 'Profile',     icon: <User          size={18} /> },
];

export const Sidebar = ({ activePage, onNavigate }: SidebarProps) => {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-60 bg-[#080808] border-r border-white/5 z-40">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Marcus Grima logo"
            className="w-9 shrink-0 object-contain" />
          <div>
            <p className="text-sm font-bold tracking-[0.15em] text-foreground">MARCUS GRIMA</p>
            <p className="text-[9px] font-bold tracking-[0.2em] text-primary uppercase">Personal Trainer</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex items-center gap-3 px-4 py-3 w-full text-left transition-all ${
                isActive
                  ? 'bg-primary/15 text-foreground border-l-2 border-l-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/4'
              }`}
            >
              <span className={isActive ? 'text-primary' : ''}>{item.icon}</span>
              <span className="text-sm font-bold tracking-[0.1em] uppercase">{item.label}</span>
              {item.badge && !isActive && (
                <span className="ml-auto w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Book CTA */}
      <div className="px-3 py-6 border-t border-white/5">
        <button
          onClick={() => onNavigate('sessions')}
          className="w-full bg-primary hover:bg-primary/80 transition-colors px-4 py-3 flex items-center gap-3 text-primary-foreground group"
        >
          <Zap size={15} className="text-foreground/70 group-hover:text-foreground transition-colors" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">Book a Session</span>
        </button>
      </div>
    </aside>
  );
};
