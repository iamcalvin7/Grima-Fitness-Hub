/* ── Daily challenges & points ─────────────────────────────────────────────
   Points:  1 pt per 100 steps  |  1 pt per 10 kcal  |  50 pts per challenge
─────────────────────────────────────────────────────────────────────────── */

export interface Challenge {
  name: string;
  desc: string;
  pts:  number;
  emoji: string;
  img:  string;
  kcal: number;
  mins: number;
}

export const CHALLENGES: Challenge[] = [
  { name: 'Recovery',  desc: '10 min foam rolling',           pts: 50, emoji: '🧘', kcal: 45,  mins: 10,
    img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=85' },
  { name: 'Push-ups',  desc: '3 sets of 20 push-ups',         pts: 50, emoji: '💪', kcal: 120, mins: 15,
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=85' },
  { name: 'Plank',     desc: 'Hold a 60-second plank',        pts: 50, emoji: '🏋️', kcal: 60,  mins: 5,
    img: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=600&q=85' },
  { name: 'Hydration', desc: 'Drink 3 litres of water today', pts: 50, emoji: '💧', kcal: 0,   mins: 0,
    img: 'https://images.unsplash.com/photo-1502740479091-635887520276?w=600&q=85' },
  { name: 'Stretch',   desc: '10 min full-body stretching',   pts: 50, emoji: '🤸', kcal: 50,  mins: 10,
    img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=85' },
  { name: 'Squats',    desc: '30 bodyweight squats',          pts: 50, emoji: '🦵', kcal: 90,  mins: 12,
    img: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=85' },
  { name: 'Walk',      desc: '15-min outdoor walk',           pts: 50, emoji: '🚶', kcal: 80,  mins: 15,
    img: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=85' },
];

/* Three challenges for today, rotating with the weekday */
export function getTodayChallenges(): Challenge[] {
  const d = new Date().getDay();
  return [0, 1, 2].map(i => CHALLENGES[(d + i) % CHALLENGES.length]);
}

export function getTodayChallenge(): Challenge {
  return CHALLENGES[new Date().getDay()];
}

export function challengeKey(name: string) {
  return `mg_challenge_${new Date().toDateString()}_${name}`;
}

export function isChallengeDone(name: string): boolean {
  return localStorage.getItem(challengeKey(name)) === 'done';
}

export function completeChallengeByName(name: string) {
  localStorage.setItem(challengeKey(name), 'done');
}

export function countChallengesDone(): number {
  return getTodayChallenges().filter(c => isChallengeDone(c.name)).length;
}

/* Legacy single-challenge helpers (kept for compatibility) */
export function todayKey() {
  return `mg_challenge_${new Date().toDateString()}`;
}

export function isChallengeComplete(): boolean {
  return countChallengesDone() > 0 || localStorage.getItem(todayKey()) === 'done';
}

export function completeChallenge() {
  localStorage.setItem(todayKey(), 'done');
}

/* Simulated daily stats (fixed for demo) */
const STEPS_TODAY = 8432;
const CALS_TODAY  = 647;

export function getTodayPoints(challengesDone: boolean | number) {
  const stepPts = Math.floor(STEPS_TODAY / 100);   // 84
  const calPts  = Math.floor(CALS_TODAY  / 10);    // 64
  const count   = typeof challengesDone === 'number' ? challengesDone : (challengesDone ? 1 : 0);
  const chalPts = count * 50;                      // 50 pts per completed challenge (0–150)
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

export function buildLeaderboard(challengeDone: boolean | number, userInitials: string, userName: string): LeaderEntry[] {
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
