import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Barbell as Dumbbell, ForkKnife as UtensilsCrossed, CaretRight as ChevronRight, Crown, Trophy, SealPercent as BadgePercent, User, UsersThree as Users, Presentation } from '@phosphor-icons/react';
import type { Page } from '@/App';
import { useAuth } from '@/auth/AuthContext';

interface BurgerMenuProps {
  open:       boolean;
  onClose:    () => void;
  onNavigate: (page: Page) => void;
  activePage: Page;
}

const MENU_ITEMS: {
  id: Page;
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  badge?: string;
}[] = [
  {
    id:     'workouts',
    label:  'Workouts',
    sub:    'Programs, circuits & active sessions',
    icon:   <Dumbbell size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
  {
    id:     'meals',
    label:  'Meal Plans',
    sub:    'Recipes, macros & daily planning',
    icon:   <UtensilsCrossed size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
  {
    id:     'leaderboard',
    label:  'Leaderboard',
    sub:    'Compete for weekly points vs everyone',
    icon:   <Trophy size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
  {
    id:     'memberships',
    label:  'Memberships',
    sub:    'Session packages & pricing',
    icon:   <Crown size={26} weight="fill" />,
    accent: '#4ade80',
  },
  {
    id:     'offers',
    label:  'Members Offers',
    sub:    'Exclusive partner discounts for members',
    icon:   <BadgePercent size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
  {
    id:     'team',
    label:  'The Team',
    sub:    'Meet the coaches & get in touch',
    icon:   <Users size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
  {
    id:     'profile',
    label:  'Profile',
    sub:    'Your account, stats & settings',
    icon:   <User size={26} weight="fill" />,
    accent: '#E5E5E5',
  },
];

export function BurgerMenu({ open, onClose, onNavigate, activePage }: BurgerMenuProps) {
  const { user } = useAuth();
  const isStaff = user?.role === 'trainer' || user?.role === 'admin';

  const allItems = isStaff
    ? [
        ...MENU_ITEMS,
        {
          id: 'proposal' as Page,
          label: 'Project Proposal',
          sub: 'Full product roadmap and pitch deck',
          icon: <Presentation size={26} weight="fill" />,
          accent: '#4ade80',
          badge: undefined as string | undefined,
        },
      ]
    : MENU_ITEMS;

  const handleNav = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Panel — slides up from bottom, full-width */}
          <motion.div
            key="panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-[#0D0D0D] rounded-t-2xl md:hidden overflow-hidden flex flex-col max-h-[88dvh]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-5 shrink-0">
              <div>
                <p className="text-[10px] font-bold tracking-[0.25em] text-white/35 uppercase">Marcus Grima PT</p>
                <h2 className="text-lg font-black tracking-tight text-white mt-0.5">More</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Cards */}
            <div className="px-5 pb-10 flex flex-col gap-3 overflow-y-auto">
              {allItems.map((item, i) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full text-left flex items-center gap-4 p-5 rounded-2xl border transition-all
                      ${isActive
                        ? 'border-primary/40 bg-primary/8'
                        : 'border-white/8 bg-[#141414] hover:border-white/20'}`}
                  >
                    {/* Icon bubble */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: item.accent }}
                    >
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold tracking-wide text-white">{item.label}</p>
                        {item.badge && (
                          <span className="text-[8px] font-bold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 font-medium mt-0.5">{item.sub}</p>
                    </div>

                    <ChevronRight size={16} weight="bold" className="text-white/25 shrink-0" />
                  </button>
                );
              })}

              {/* Premium hint */}
              <div className="flex items-center gap-2 px-1 mt-2">
                <Crown size={11} weight="fill" className="text-amber-400/50" />
                <p className="text-[10px] text-white/20 font-semibold tracking-wide">
                  Premium workouts available inside
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
