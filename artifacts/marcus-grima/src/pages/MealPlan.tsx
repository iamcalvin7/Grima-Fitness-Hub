import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, Plus, Minus, ChevronLeft,
  Clock, RotateCcw, SlidersHorizontal, ChevronDown,
  Zap, Flame, Wheat, Droplets, Check, X, UtensilsCrossed,
} from 'lucide-react';
import { MEALS, type Meal } from '@/data/meals';

/* ── Types ───────────────────────────────────────────────────────────────── */

type GoalType = 'protein' | 'calories' | 'custom';
type SortMode = 'best' | 'protein' | 'calories' | 'time';
type View =
  | { kind: 'search' }
  | { kind: 'detail'; mealId: string }
  | { kind: 'saved' }
  | { kind: 'daily' };

interface Goals {
  protein: number;
  calories: number;
  carbs: number;
  fats: number;
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const DEFAULT_GOALS: Goals = { protein: 50, calories: 500, carbs: 50, fats: 20 };

const DIFFICULTY_COLOUR = { Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400' };

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function mealImg(meal: Meal) {
  return `${import.meta.env.BASE_URL}meals/${meal.id}.${meal.imageExt}`;
}

function score(meal: Meal, goalType: GoalType, goals: Goals): number {
  if (goalType === 'protein') {
    // Meals with enough protein first, then ranked by excess (closest wins)
    if (meal.protein < goals.protein) return -1000 + meal.protein;
    return 1000 - (meal.protein - goals.protein);
  }
  if (goalType === 'calories') {
    // Meals under the calorie cap, closest to cap wins
    if (meal.calories > goals.calories) return -1000 - (meal.calories - goals.calories);
    return 1000 - (goals.calories - meal.calories);
  }
  // Custom: sum of normalised closeness across all 4 macros
  const proteinScore = meal.protein >= goals.protein ? 100 : (meal.protein / goals.protein) * 100;
  const calScore = meal.calories <= goals.calories ? 100 : (goals.calories / meal.calories) * 100;
  const carbScore = Math.max(0, 100 - Math.abs(meal.carbs - goals.carbs) * 2);
  const fatScore = Math.max(0, 100 - Math.abs(meal.fats - goals.fats) * 3);
  return proteinScore + calScore + carbScore + fatScore;
}

function filterAndSort(meals: Meal[], goalType: GoalType, goals: Goals, sort: SortMode): Meal[] {
  const scored = meals.map(m => ({ meal: m, score: score(m, goalType, goals) }));
  if (sort === 'best') scored.sort((a, b) => b.score - a.score);
  else if (sort === 'protein') scored.sort((a, b) => b.meal.protein - a.meal.protein);
  else if (sort === 'calories') scored.sort((a, b) => a.meal.calories - b.meal.calories);
  else scored.sort((a, b) => (a.meal.prepMinutes + a.meal.cookMinutes) - (b.meal.prepMinutes + b.meal.cookMinutes));
  return scored.map(s => s.meal);
}

/* ── Macro bar ───────────────────────────────────────────────────────────── */

function MacroBadge({ label, value, unit, colour }: { label: string; value: number; unit: string; colour: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-base font-bold leading-none ${colour}`}>{value}{unit}</span>
      <span className="text-[9px] font-bold tracking-widest text-foreground/40 uppercase mt-0.5">{label}</span>
    </div>
  );
}

function MacroRow({ meal }: { meal: Meal }) {
  return (
    <div className="flex gap-4 justify-around py-3 border-t border-white/6">
      <MacroBadge label="Protein"  value={meal.protein}  unit="g"    colour="text-purple-400" />
      <MacroBadge label="Calories" value={meal.calories} unit="kcal" colour="text-orange-400" />
      <MacroBadge label="Carbs"    value={meal.carbs}    unit="g"    colour="text-yellow-400" />
      <MacroBadge label="Fats"     value={meal.fats}     unit="g"    colour="text-blue-400"   />
    </div>
  );
}

/* ── Stepper ─────────────────────────────────────────────────────────────── */

function Stepper({
  label, value, unit, step = 5, min = 5, max = 500, hint,
  onChange,
}: {
  label: string; value: number; unit: string; step?: number; min?: number; max?: number;
  hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-bold tracking-wider mb-3">{label}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 rounded-sm border border-white/15 hover:border-primary/50 hover:bg-primary/10 flex items-center justify-center text-foreground/60 hover:text-foreground transition-all"
        >
          <Minus size={16} />
        </button>
        <div className="flex items-baseline gap-1.5 min-w-[80px] justify-center">
          <span className="text-3xl font-bold">{value}</span>
          <span className="text-sm font-bold text-foreground/40">{unit}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-10 h-10 rounded-sm border border-white/15 hover:border-primary/50 hover:bg-primary/10 flex items-center justify-center text-foreground/60 hover:text-foreground transition-all"
        >
          <Plus size={16} />
        </button>
      </div>
      {hint && <p className="text-xs text-foreground/40 mt-2">{hint}</p>}
    </div>
  );
}

/* ── Meal card ───────────────────────────────────────────────────────────── */

function MealCard({
  meal, isBest, isSaved, isInPlan,
  onView, onSave, onAddToPlan,
}: {
  meal: Meal; isBest: boolean; isSaved: boolean; isInPlan: boolean;
  onView: () => void; onSave: () => void; onAddToPlan: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111111] border border-white/6 rounded-sm overflow-hidden"
    >
      {/* Top: photo + info */}
      <div className="flex gap-0">
        {/* Photo */}
        <div className="relative w-36 shrink-0 self-stretch bg-[#0D0D0D]">
          <img src={mealImg(meal)} alt={meal.name} className="w-full h-full object-cover" loading="lazy" />
          {isBest && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
              <Flame size={10} className="text-primary-foreground" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Best Match</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-bold leading-tight">{meal.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-foreground/45">
                <Clock size={10} /> {meal.prepMinutes + meal.cookMinutes} min
              </span>
              <span className={`text-[10px] font-semibold ${DIFFICULTY_COLOUR[meal.difficulty]}`}>
                {meal.difficulty}
              </span>
            </div>
            <p className="text-[10px] text-foreground/50 mt-1 leading-snug line-clamp-2">{meal.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {meal.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 bg-primary/10 text-primary/80 border border-primary/15 rounded-full">
                {t}
              </span>
            ))}
          </div>

          {/* Macros compact */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { v: meal.protein,  u: 'g',    l: 'Protein',  c: 'text-purple-400' },
              { v: meal.calories, u: 'kcal', l: 'Cals',     c: 'text-orange-400' },
              { v: meal.carbs,    u: 'g',    l: 'Carbs',    c: 'text-yellow-400' },
              { v: meal.fats,     u: 'g',    l: 'Fats',     c: 'text-blue-400'   },
            ].map(m => (
              <div key={m.l} className="bg-[#0A0A0A] rounded-sm p-1.5 text-center border border-white/4">
                <p className={`text-xs font-bold leading-none ${m.c}`}>{m.v}{m.u === 'kcal' ? '' : ''}</p>
                <p className="text-[7px] font-bold tracking-widest text-foreground/30 uppercase mt-0.5">{m.l}</p>
              </div>
            ))}
          </div>

          {/* Ingredient emojis */}
          <div className="flex items-center gap-0.5">
            {meal.ingredients.slice(0, 5).map(ing => (
              <span key={ing.name} title={ing.name} className="text-lg leading-none">{ing.emoji}</span>
            ))}
            {meal.ingredients.length > 5 && (
              <span className="text-[10px] font-bold text-foreground/40 ml-1">+{meal.ingredients.length - 5}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex border-t border-white/6">
        <button
          onClick={onView}
          className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase text-foreground/50 hover:text-foreground hover:bg-white/3 transition-colors border-r border-white/6"
        >
          View Details
        </button>
        <button
          onClick={onSave}
          className={`flex items-center justify-center gap-1.5 px-4 py-3 border-r border-white/6 transition-colors ${
            isSaved ? 'text-primary bg-primary/8' : 'text-foreground/50 hover:text-foreground hover:bg-white/3'
          }`}
        >
          {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
            {isSaved ? 'Saved' : 'Save'}
          </span>
        </button>
        <button
          onClick={onAddToPlan}
          className={`flex items-center justify-center gap-1.5 px-4 py-3 transition-colors ${
            isInPlan
              ? 'text-green-400 bg-green-400/8'
              : 'bg-primary/90 hover:bg-primary text-primary-foreground'
          }`}
        >
          {isInPlan ? <Check size={14} /> : <Plus size={14} />}
          <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
            {isInPlan ? 'Added' : 'Add to Plan'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

/* ── Meal detail view ────────────────────────────────────────────────────── */

function MealDetail({
  meal, isSaved, isInPlan,
  onBack, onSave, onAddToPlan,
}: {
  meal: Meal; isSaved: boolean; isInPlan: boolean;
  onBack: () => void; onSave: () => void; onAddToPlan: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      {/* Hero image */}
      <div className="relative w-full bg-[#0D0D0D]" style={{ height: 260 }}>
        <img src={mealImg(meal)} alt={meal.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/30" />
        <button
          onClick={onBack}
          className="absolute top-5 left-5 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={onSave}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
              isSaved ? 'bg-primary/80 text-primary-foreground' : 'bg-black/50 text-white/70 hover:text-white'
            }`}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      <div className="px-5 md:px-8">
        {/* Title + meta */}
        <div className="pt-5 pb-4 border-b border-white/6">
          <h1 className="text-xl font-bold tracking-wider leading-tight">{meal.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-foreground/50">
              <Clock size={12} /> {meal.prepMinutes + meal.cookMinutes} min total
            </span>
            <span className={`text-xs font-semibold ${DIFFICULTY_COLOUR[meal.difficulty]}`}>{meal.difficulty}</span>
            <span className="flex items-center gap-1.5 text-xs text-foreground/50">
              <Clock size={12} /> Prep: {meal.prepMinutes}m · Cook: {meal.cookMinutes}m
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {meal.tags.map(t => (
              <span key={t} className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 bg-primary/10 text-primary/80 border border-primary/20 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Macros */}
        <MacroRow meal={meal} />

        {/* Description */}
        <p className="text-sm text-foreground/60 leading-relaxed py-4 border-b border-white/6">{meal.description}</p>

        {/* Ingredients */}
        <div className="py-5 border-b border-white/6">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-4">Ingredients</h2>
          <div className="grid grid-cols-1 gap-2">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#111] border border-white/5 rounded-sm p-3">
                <span className="text-2xl leading-none w-8 text-center">{ing.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{ing.name}</p>
                  <p className="text-[10px] text-foreground/45 font-medium">{ing.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="py-5">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-4">Method</h2>
          <div className="space-y-4">
            {meal.instructions.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed flex-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 px-5 md:px-8 py-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent pt-8">
        <button
          onClick={onAddToPlan}
          className={`w-full py-4 font-bold tracking-[0.15em] uppercase text-sm flex items-center justify-center gap-2 transition-all ${
            isInPlan
              ? 'bg-green-600/20 border border-green-500/30 text-green-400'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {isInPlan ? <><Check size={16} /> Added to Daily Plan</> : <><Plus size={16} /> Add to Daily Plan</>}
        </button>
      </div>
    </div>
  );
}

/* ── Saved meals view ────────────────────────────────────────────────────── */

function SavedView({
  savedIds, dailyIds,
  onBack, onView, onRemove, onAddToPlan,
}: {
  savedIds: Set<string>; dailyIds: Set<string>;
  onBack: () => void; onView: (id: string) => void;
  onRemove: (id: string) => void; onAddToPlan: (id: string) => void;
}) {
  const saved = MEALS.filter(m => savedIds.has(m.id));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-wider">SAVED MEALS</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark size={40} className="text-foreground/15 mb-4" />
            <p className="text-foreground/40 text-sm">No saved meals yet.</p>
            <p className="text-foreground/30 text-xs mt-1">Tap the bookmark icon on any meal to save it.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {saved.map(meal => (
              <div key={meal.id} className="bg-[#111] border border-white/6 rounded-sm flex items-center gap-4 p-3">
                <div className="w-16 h-16 rounded-sm overflow-hidden shrink-0">
                  <img src={mealImg(meal)} alt={meal.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight">{meal.name}</p>
                  <p className="text-[10px] text-foreground/40 mt-1">
                    {meal.protein}g protein · {meal.calories} kcal
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onView(meal.id)} className="px-3 py-2 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-foreground/50 hover:text-foreground hover:border-white/20 transition-colors rounded-sm">
                    View
                  </button>
                  <button
                    onClick={() => onAddToPlan(meal.id)}
                    className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-colors ${
                      dailyIds.has(meal.id)
                        ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                        : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                    }`}
                  >
                    {dailyIds.has(meal.id) ? '✓' : '+'}
                  </button>
                  <button onClick={() => onRemove(meal.id)} className="p-2 text-foreground/30 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Daily plan view ─────────────────────────────────────────────────────── */

function DailyPlanView({
  dailyIds,
  onBack, onView, onRemove,
}: {
  dailyIds: Set<string>;
  onBack: () => void; onView: (id: string) => void; onRemove: (id: string) => void;
}) {
  const meals = MEALS.filter(m => dailyIds.has(m.id));
  const totals = meals.reduce(
    (acc, m) => ({ protein: acc.protein + m.protein, calories: acc.calories + m.calories, carbs: acc.carbs + m.carbs, fats: acc.fats + m.fats }),
    { protein: 0, calories: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors mb-6 text-sm font-bold tracking-wider uppercase">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-wider">DAILY PLAN</h1>
          <div className="w-10 h-0.5 bg-primary mt-3" />
        </div>

        {/* Daily totals */}
        {meals.length > 0 && (
          <div className="bg-[#111] border border-primary/15 rounded-sm p-4 mb-5">
            <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-3">Daily Totals</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Protein', value: totals.protein, unit: 'g', colour: 'text-purple-400' },
                { label: 'Calories', value: totals.calories, unit: 'kcal', colour: 'text-orange-400' },
                { label: 'Carbs', value: totals.carbs, unit: 'g', colour: 'text-yellow-400' },
                { label: 'Fats', value: totals.fats, unit: 'g', colour: 'text-blue-400' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className={`text-lg font-bold ${m.colour}`}>{m.value}<span className="text-xs font-bold text-foreground/30 ml-0.5">{m.unit === 'kcal' ? 'kcal' : 'g'}</span></p>
                  <p className="text-[8px] font-bold tracking-widest text-foreground/30 uppercase">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UtensilsCrossed size={40} className="text-foreground/15 mb-4" />
            <p className="text-foreground/40 text-sm">Your daily plan is empty.</p>
            <p className="text-foreground/30 text-xs mt-1">Add meals from the search results.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal, idx) => (
              <div key={meal.id} className="bg-[#111] border border-white/6 rounded-sm overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div className="w-12 h-12 rounded-sm overflow-hidden shrink-0">
                    <img src={mealImg(meal)} alt={meal.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">{meal.name}</p>
                    <p className="text-[10px] text-foreground/40 mt-0.5">
                      {meal.protein}g protein · {meal.calories} kcal · {meal.prepMinutes + meal.cookMinutes} min
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => onView(meal.id)} className="px-2.5 py-1.5 border border-white/10 text-[9px] font-bold tracking-widest uppercase text-foreground/40 hover:text-foreground hover:border-white/20 transition-colors rounded-sm">
                      View
                    </button>
                    <button onClick={() => onRemove(meal.id)} className="p-1.5 text-foreground/25 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Root MealPlan component
══════════════════════════════════════════════════════════════════════════ */

export const MealPlan = () => {
  const [view, setView]           = useState<View>({ kind: 'search' });
  const [goalType, setGoalType]   = useState<GoalType>('protein');
  const [goals, setGoals]         = useState<Goals>(DEFAULT_GOALS);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortMode, setSortMode]   = useState<SortMode>('best');
  const [showSort, setShowSort]   = useState(false);
  const [savedIds, setSavedIds]   = useState<Set<string>>(new Set());
  const [dailyIds, setDailyIds]   = useState<Set<string>>(new Set());

  const results = useMemo(
    () => hasSearched ? filterAndSort(MEALS, goalType, goals, sortMode) : [],
    [hasSearched, goalType, goals, sortMode]
  );

  const toggleSave = useCallback((id: string) => {
    setSavedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const togglePlan = useCallback((id: string) => {
    setDailyIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const reset = () => {
    setGoalType('protein');
    setGoals(DEFAULT_GOALS);
    setHasSearched(false);
    setSortMode('best');
  };

  const setGoal = (key: keyof Goals, val: number) =>
    setGoals(prev => ({ ...prev, [key]: val }));

  // ── Detail navigation (can be reached from search, saved, or daily)
  const backFromDetail = () => setView({ kind: 'search' });

  if (view.kind === 'detail') {
    const meal = MEALS.find(m => m.id === view.mealId)!;
    return (
      <MealDetail
        meal={meal}
        isSaved={savedIds.has(meal.id)}
        isInPlan={dailyIds.has(meal.id)}
        onBack={backFromDetail}
        onSave={() => toggleSave(meal.id)}
        onAddToPlan={() => togglePlan(meal.id)}
      />
    );
  }

  if (view.kind === 'saved') {
    return (
      <SavedView
        savedIds={savedIds} dailyIds={dailyIds}
        onBack={() => setView({ kind: 'search' })}
        onView={id => setView({ kind: 'detail', mealId: id })}
        onRemove={id => toggleSave(id)}
        onAddToPlan={id => togglePlan(id)}
      />
    );
  }

  if (view.kind === 'daily') {
    return (
      <DailyPlanView
        dailyIds={dailyIds}
        onBack={() => setView({ kind: 'search' })}
        onView={id => setView({ kind: 'detail', mealId: id })}
        onRemove={id => togglePlan(id)}
      />
    );
  }

  /* ── Search view ── */
  const SORT_LABELS: Record<SortMode, string> = {
    best: 'Best Match', protein: 'Most Protein', calories: 'Lowest Calories', time: 'Quickest',
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-28 md:pb-12">
      <div className="px-5 md:px-8 pt-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">MEAL PLAN</h1>
            <p className="text-xs text-foreground/40 mt-1">Find meals that match your nutritional goals.</p>
          </div>
          <div className="flex gap-2">
            {dailyIds.size > 0 && (
              <button
                onClick={() => setView({ kind: 'daily' })}
                className="flex items-center gap-2 px-3 py-2 border border-white/10 hover:border-white/20 transition-colors text-[10px] font-bold tracking-widest uppercase text-foreground/60 hover:text-foreground"
              >
                <UtensilsCrossed size={13} />
                Plan ({dailyIds.size})
              </button>
            )}
            <button
              onClick={() => setView({ kind: 'saved' })}
              className="flex items-center gap-2 px-3 py-2 border border-white/10 hover:border-white/20 transition-colors text-[10px] font-bold tracking-widest uppercase text-foreground/60 hover:text-foreground"
            >
              <Bookmark size={13} />
              Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ''}
            </button>
          </div>
        </div>

        {/* ── Step 1: Goal setter ── */}
        <div className="bg-[#111111] border border-white/6 rounded-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">1</span>
              </div>
              <h2 className="text-sm font-bold tracking-wider">Set Your Goal</h2>
            </div>
            <button onClick={reset} className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-foreground/40 hover:text-primary transition-colors">
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          {/* Goal type selector */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([
              { type: 'protein' as GoalType,  label: 'Protein',  sub: 'Focus on protein intake', icon: <Zap size={16} /> },
              { type: 'calories' as GoalType, label: 'Calories', sub: 'Set a calorie target',    icon: <Flame size={16} /> },
              { type: 'custom' as GoalType,   label: 'Custom',   sub: 'Set macros manually',     icon: <SlidersHorizontal size={16} /> },
            ]).map(({ type, label, sub, icon }) => (
              <button
                key={type}
                onClick={() => setGoalType(type)}
                className={`flex flex-col items-start gap-1 p-3 border rounded-sm transition-all text-left ${
                  goalType === type
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-white/8 bg-[#0D0D0D] text-foreground/50 hover:border-white/15'
                }`}
              >
                <span className={goalType === type ? 'text-primary' : 'text-foreground/30'}>{icon}</span>
                <span className="text-xs font-bold">{label}</span>
                <span className="text-[9px] text-foreground/40 leading-tight">{sub}</span>
              </button>
            ))}
          </div>

          {/* Goal inputs */}
          <AnimatePresence mode="wait">
            {goalType === 'protein' && (
              <motion.div key="protein" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex gap-4 items-start">
                  <Stepper
                    label="Protein Goal" value={goals.protein} unit="g" step={5} min={10} max={300}
                    hint={`At least ${goals.protein}g of protein`}
                    onChange={v => setGoal('protein', v)}
                  />
                  <div className="flex-1 bg-[#0D0D0D] border border-white/6 rounded-sm p-3 ml-2">
                    <p className="text-[9px] font-bold tracking-widest text-primary/70 uppercase mb-1">ⓘ Why protein?</p>
                    <p className="text-[10px] text-foreground/50 leading-relaxed">
                      Supports muscle growth, recovery and keeps you full longer.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {goalType === 'calories' && (
              <motion.div key="calories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex gap-4 items-start">
                  <Stepper
                    label="Calorie Target" value={goals.calories} unit="kcal" step={50} min={200} max={1200}
                    hint={`Max ${goals.calories} kcal per meal`}
                    onChange={v => setGoal('calories', v)}
                  />
                  <div className="flex-1 bg-[#0D0D0D] border border-white/6 rounded-sm p-3 ml-2">
                    <p className="text-[9px] font-bold tracking-widest text-primary/70 uppercase mb-1">ⓘ Calorie target</p>
                    <p className="text-[10px] text-foreground/50 leading-relaxed">
                      Find meals that fit within your daily calorie budget.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {goalType === 'custom' && (
              <motion.div key="custom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <Stepper label="Protein"  value={goals.protein}  unit="g"    step={5}  min={10} max={300} onChange={v => setGoal('protein', v)} />
                  <Stepper label="Calories" value={goals.calories} unit="kcal" step={50} min={200} max={1200} onChange={v => setGoal('calories', v)} />
                  <Stepper label="Carbs"    value={goals.carbs}    unit="g"    step={5}  min={5}  max={300} onChange={v => setGoal('carbs', v)} />
                  <Stepper label="Fats"     value={goals.fats}     unit="g"    step={2}  min={2}  max={100} onChange={v => setGoal('fats', v)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Find Meals button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setHasSearched(true)}
            className="w-full mt-5 bg-primary hover:bg-primary/90 py-4 text-primary-foreground font-bold tracking-[0.15em] uppercase text-sm transition-colors"
          >
            Find Meals
          </motion.button>
        </div>

        {/* ── Step 2: Results ── */}
        {hasSearched && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">2</span>
                </div>
                <h2 className="text-sm font-bold tracking-wider">Meal Suggestions</h2>
                <span className="text-xs text-foreground/30">({results.length})</span>
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowSort(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 border border-white/10 hover:border-white/20 transition-colors text-[10px] font-bold tracking-widest uppercase text-foreground/50"
                >
                  <SlidersHorizontal size={11} />
                  {SORT_LABELS[sortMode]}
                  <ChevronDown size={11} />
                </button>
                <AnimatePresence>
                  {showSort && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 bg-[#1A1A1A] border border-white/10 rounded-sm overflow-hidden z-20 w-40 shadow-xl"
                    >
                      {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
                        <button
                          key={s}
                          onClick={() => { setSortMode(s); setShowSort(false); }}
                          className={`w-full text-left px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                            s === sortMode ? 'text-primary bg-primary/10' : 'text-foreground/50 hover:text-foreground hover:bg-white/4'
                          }`}
                        >
                          {SORT_LABELS[s]}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-4">
              {results.map((meal, idx) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  isBest={idx === 0}
                  isSaved={savedIds.has(meal.id)}
                  isInPlan={dailyIds.has(meal.id)}
                  onView={() => setView({ kind: 'detail', mealId: meal.id })}
                  onSave={() => toggleSave(meal.id)}
                  onAddToPlan={() => togglePlan(meal.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
