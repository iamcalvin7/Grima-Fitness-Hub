import React from 'react';
import { Home as HomeIcon, Calendar, MessageSquare, User } from 'lucide-react';

export const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#0A0A0A] border-t border-white/10 px-6 py-4 flex justify-between items-center z-40 pb-safe">
      <button className="flex flex-col items-center justify-center gap-1 text-primary">
        <HomeIcon size={22} className="stroke-[2.5px]" />
        <span className="text-[10px] font-bold tracking-widest uppercase">Home</span>
      </button>
      <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Calendar size={22} className="stroke-[2px]" />
        <span className="text-[10px] font-bold tracking-widest uppercase">Sessions</span>
      </button>
      <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors relative">
        <MessageSquare size={22} className="stroke-[2px]" />
        <span className="absolute top-0 right-1 w-2 h-2 bg-primary rounded-full border border-[#0A0A0A]" />
        <span className="text-[10px] font-bold tracking-widest uppercase">Messages</span>
      </button>
      <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <User size={22} className="stroke-[2px]" />
        <span className="text-[10px] font-bold tracking-widest uppercase">Profile</span>
      </button>
    </div>
  );
};
