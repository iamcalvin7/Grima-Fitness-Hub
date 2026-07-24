/* ── Daily challenges & points ─────────────────────────────────────────────
   Points:  1 pt per 100 steps  |  1 pt per 10 kcal  |  50 pts per challenge
─────────────────────────────────────────────────────────────────────────── */

export interface Challenge {
  name: string;
  desc: string;
  pts:  number;
  emoji: string;
}

export const CHALLENGES: Challenge[] = [
  { name: 'Rest & Recovery',   desc: '10 min foam rolling',           pts: 50, emoji: '🧘' },
  { name: 'Push-up Burst',     desc: '3 sets of 20 push-ups',         pts: 50, emoji: '💪' },
  { name: 'Plank Hold',        desc: 'Hold a 60-second plank',        pts: 50, emoji: '🏋️' },
  { name: 'Hydration Goal',    desc: 'Drink 3 litres of water today', pts: 50, emoji: '💧' },
  { name: 'Thursday Stretch',  desc: '10 min full-body stretching',   pts: 50, emoji: '🤸' },
  { name: 'Squat Challenge',   desc: '30 bodyweight squats',          pts: 50, emoji: '🦵' },
  { name: 'Active Walk',       desc: '15-min outdoor walk',           pts: 50, emoji: '🚶' },
];

export function getTodayChallenge(): Challenge {
  return CHALLENGES[new Date().getDay()];
}

export function todayKey() {
  return `mg_challenge_${new Date().toDateString()}`;
}

export function isChallengeComplete(): boolean {
  return localStorage.getItem(todayKey()) === 'done';
}

export function completeChallenge() {
  localStorage.setItem(todayKey(), 'done');
}

/* Simulated daily stats (fixed for demo) */
const STEPS_TODAY = 8432;
const CALS_TODAY  = 647;

export function getTodayPoints(challengeDone: boolean) {
  const stepPts = Math.floor(STEPS_TODAY / 100);   // 84
  const calPts  = Math.floor(CALS_TODAY  / 10);    // 64
  const chalPts = challengeDone ? 50 : 0;
  return { steps: stepPts, calories: calPts, challenge: chalPts, total: stepPts + calPts + chalPts };
}

/* Leaderboard ─────────────────────────────────────────────────────────────
   weekPts = past 6 days (Mon–Sat) of simulated points, not including today
──────────────────────────────────────────────────────────────────────────*/
export interface LeaderEntry {
  id:       string;
  name:     string;
  role:     'trainer' | 'client' | 'you';
  weekPts:  number;   // past days + today
  todayPts: number;   // today only
  avatar:   string;
}

const OTHERS: Omit<LeaderEntry, 'weekPts' | 'todayPts'>[] = [
  { id: 'marcus', name: 'Marcus',   role: 'trainer', avatar: 'MG' },
  { id: 'jake',   name: 'Jake R.',  role: 'client',  avatar: 'JR' },
  { id: 'sophie', name: 'Sophie T.',role: 'client',  avatar: 'ST' },
  { id: 'tom',    name: 'Tom K.',   role: 'client',  avatar: 'TK' },
  { id: 'emma',   name: 'Emma L.',  role: 'client',  avatar: 'EL' },
  { id: 'chris',  name: 'Chris M.', role: 'client',  avatar: 'CM' },
];

// today-only points for the simulated players
const OTHER_TODAY: Record<string, number> = {
  marcus: 205,
  jake:   162,
  sophie: 148,
  tom:    130,
  emma:   98,
  chris:  74,
};

const OTHER_PAST: Record<string, number> = {
  marcus: 1175,
  jake:   988,
  sophie: 832,
  tom:    590,
  emma:   512,
  chris:  406,
};

export function buildLeaderboard(challengeDone: boolean, userInitials: string, userName: string): LeaderEntry[] {
  const me = getTodayPoints(challengeDone);
  const userPastPts = 770; // simulated past 6 days for the real user

  const entries: LeaderEntry[] = [
    ...OTHERS.map(o => ({
      ...o,
      weekPts:  OTHER_PAST[o.id] + OTHER_TODAY[o.id],
      todayPts: OTHER_TODAY[o.id],
    })),
    {
      id:       'you',
      name:     userName,
      role:     'you' as const,
      avatar:   userInitials,
      weekPts:  userPastPts + me.total,
      todayPts: me.total,
    },
  ];

  return entries.sort((a, b) => b.weekPts - a.weekPts);
}
