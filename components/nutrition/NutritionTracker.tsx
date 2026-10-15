"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Lock, Plus, RotateCcw, Shuffle, SlidersHorizontal, Sparkles } from "lucide-react";
import DietToday, { type DayMeal, type WeekDay } from "@/components/nutrition/DietToday";
import CookMode, { readCookSession, type CookItem, type CookSession } from "@/components/nutrition/CookMode";
import { dayAdherence, slotTime, type MealStatus } from "@/lib/diet-day";
import { getMealChecks, setMealCheck, type MealChecks } from "@/app/dashboard/client/nutrition/meal-check-actions";
import AddFoodSheet, { type PlanMealOption, type TrackerRecipe } from "@/components/nutrition/AddFoodSheet";
import ItemSheet from "@/components/nutrition/ItemSheet";
import { notifyGateRefresh } from "@/lib/gate-events";
import {
  MEAL_SLOTS,
  addMacros,
  macrosFor,
  planItemsFor,
  planTotals,
  adaptUpcoming,
  isSlotUpcoming,
  slotLabel,
  slotRank,
  sumMacros,
  variantsFor,
  type Macros,
  type PlanItem,
  type SearchContext,
  type VariantChoice,
} from "@/lib/nutrition-engine";
import {
  addTrackerItems,
  deleteTrackerLogs,
  fillDayFromPlanAction,
  getTrackerDay,
  logPortion,
  updateTrackerLogs,
} from "@/app/dashboard/client/nutrition/tracker-actions";
import type { DietMode, DietPlanWithMeals, Food, FoodLogWithFood, NutritionProfile } from "@/utils/nutrition";
import type { SavedMeal } from "@/utils/saved-meals";

// Tracker nutrition (refonte demandée le 2026-09-27). Une seule surface pour
// loguer, construite autour du plan alimentaire :
// - FIXE : la journée est déjà remplie avec le plan, rien à faire. Au bilan,
//   "diète suivie" suffit.
// - FLEXIBLE : le plan sert de guide. Chaque repas non logué propose ses
//   aliments, et leurs quantités se recalculent en direct selon ce qui a déjà
//   été mangé pour tomber pile sur les macros du jour.
// - FIXE-FLEXIBLE : déjà rempli comme le fixe, mais chaque aliment se
//   remplace par un équivalent, et changer une quantité ré-équilibre tout
//   seul les repas suivants.

const MODES: { key: DietMode; label: string; help: string }[] = [
  { key: "fixed", label: "Fixe", help: "Ta journée est déjà remplie avec ton plan. Rien à loguer, au bilan tu confirmes juste que tu l'as suivi." },
  { key: "fixed_flexible", label: "Fixe-flexible", help: "Déjà rempli avec ton plan. Remplace un aliment ou change une quantité : le reste de ta journée s'ajuste tout seul." },
  { key: "flexible", label: "Flexible", help: "Ton plan te guide repas par repas. Mange autre chose ou plus, les quantités des repas suivants se recalculent pour tenir tes macros." },
];

type Override = { foodId: string; grams: number } | { removed: true };
type SheetState =
  | { kind: "add"; slot: string }
  | { kind: "log"; logId: string }
  | { kind: "suggest"; planMealId: string }
  | null;

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const noopSubscribe = () => () => {};
const CHECKS_KEY = "ep-meal-checks";
const DETAIL_KEY = "ep-diet-detail-open";
const WEEK_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function weekOf(today: string): string[] {
  const d = new Date(`${today}T12:00:00`);
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  const out: string[] = [];
  for (let i = 1; i <= 7; i++) out.push(shiftDate(today, i - dow));
  return out;
}

function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const logMacros = (l: FoodLogWithFood): Macros => ({ calories: l.calories ?? 0, proteins: l.proteins ?? 0, carbs: l.carbs ?? 0, fats: l.fats ?? 0 });

function Ring({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target * 1.05;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[68px] h-[68px]">
        <svg width="68" height="68" className="block -rotate-90">
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(var(--ep-ink-rgb),0.07)" strokeWidth="6" />
          <circle cx="34" cy="34" r={r} fill="none" stroke={over ? "#f59e0b" : color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .4s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[13px] font-black text-(--ep-strong)">{Math.round(value)}</span>
          <span className="text-[9px] text-(--ep-ink)/35">/{Math.round(target)}</span>
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{label}</span>
    </div>
  );
}

// Heure actuelle (HH:MM), pour savoir quels repas sont encore à venir.
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Regroupe par repas, dans l'ordre de la journée.
function groupBySlot(items: { slot: string; key: string; food: Food; grams: number }[]): { slot: string; items: { key: string; food: Food; grams: number }[] }[] {
  const order = [...new Set(items.map((i) => i.slot))].sort((a, b) => slotRank(a) - slotRank(b));
  return order.map((slot) => ({ slot, items: items.filter((i) => i.slot === slot).map(({ key, food, grams }) => ({ key, food, grams })) }));
}

export default function NutritionTracker({
  today,
  initialLogs,
  historyLogs,
  foods: initialFoods,
  plan,
  mode: initialMode,
  profile,
  recipes,
  savedMeals,
  isOwnPlan,
  onChangeMode,
  createCustomFood,
}: {
  today: string;
  initialLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  foods: Food[];
  plan: DietPlanWithMeals | null;
  mode: DietMode;
  profile: NutritionProfile | null;
  recipes: TrackerRecipe[];
  savedMeals: SavedMeal[];
  isOwnPlan: boolean;
  onChangeMode?: (mode: DietMode) => Promise<{ error?: string }>;
  createCustomFood: (params: {
    name: string;
    category: string;
    calories_per_100: number;
    proteins_per_100: number;
    carbs_per_100: number;
    fats_per_100: number;
    fibers_per_100: number;
  }) => Promise<{ food?: Food; error?: string }>;
}) {
  const tr = useT();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // ?jour=AAAA-MM-JJ : ouvert depuis le bilan d'un jour passé.
  const jour = useSearchParams().get("jour");
  const startDate = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) && jour <= today && jour >= shiftDate(today, -30) ? jour : today;
  const [date, setDate] = useState(startDate);
  const [mode, setMode] = useState<DietMode>(plan ? initialMode : "flexible");
  const [foods, setFoods] = useState<Food[]>(initialFoods);
  const [logsByDate, setLogsByDate] = useState<Record<string, FoodLogWithFood[]>>(() => {
    const map: Record<string, FoodLogWithFood[]> = {};
    for (const l of historyLogs) (map[l.logged_at] ??= []).push(l);
    map[today] = initialLogs;
    return map;
  });
  const planKey = plan?.id ?? "none";
  // Préférences par jour gardées sur l'appareil : option choisie par repas,
  // remplacements prévus en flexible. Lues au premier rendu, le tracker ne
  // s'affiche qu'une fois monté (voir `mounted` plus bas), donc aucun écart
  // avec le rendu serveur.
  const [choices, setChoices] = useState<Record<string, VariantChoice>>(() => ({ [startDate]: readLS(`ep-variants:${planKey}:${startDate}`, {}) }));
  const [overrides, setOverrides] = useState<Record<string, Record<string, Override>>>(() => ({ [startDate]: readLS(`ep-flex:${planKey}:${startDate}`, {}) }));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Cases « mangé » (2026-10-14) : gardées sur l'appareil pour un affichage
  // immédiat, puis relues en base (table meal_checks, voir
  // meal-check-actions.ts) qui fait foi dès qu'elle existe.
  const [checks, setChecks] = useState<MealChecks>(() => readLS(CHECKS_KEY, {}));
  const [cook, setCook] = useState<{ slot: string; initial: CookSession | null } | null>(() => {
    const s = typeof window === "undefined" ? null : readCookSession(today);
    return s ? { slot: s.slot, initial: s } : null;
  });
  const [replaceTarget, setReplaceTarget] = useState<{ slot: string; key: string } | null>(null);
  const [showDetail, setShowDetail] = useState<boolean>(() => readLS(DETAIL_KEY, false));

  const choice = useMemo(() => choices[date] ?? {}, [choices, date]);
  const dayOverrides = useMemo(() => overrides[date] ?? {}, [overrides, date]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const logs = useMemo(() => logsByDate[date] ?? [], [logsByDate, date]);
  const setDayLogs = useCallback((d: string, fn: (prev: FoodLogWithFood[]) => FoodLogWithFood[]) => {
    setLogsByDate((prev) => ({ ...prev, [d]: fn(prev[d] ?? []) }));
  }, []);

  // Changer de jour : préférences de ce jour, et son journal s'il n'est pas
  // déjà chargé (au-delà des 30 derniers jours, ou jour vide).
  function goTo(d: string) {
    const from = date;
    setDate(d);
    setError(null);
    setChoices((prev) => (prev[d] ? prev : { ...prev, [d]: readLS(`ep-variants:${planKey}:${d}`, {}) }));
    setOverrides((prev) => (prev[d] ? prev : { ...prev, [d]: readLS(`ep-flex:${planKey}:${d}`, {}) }));
    if (logsByDate[d]) return;
    setLoadingDay(true);
    // Jour en erreur jamais affiché ni mis en cache comme « vide » : sinon
    // la journée apparaissait sans ses repas, sans moyen de recharger, et
    // « Remplir avec mon plan » y ajoutait des doublons. On reste sur le jour
    // d'avant avec le message d'erreur ; retaper le jour relance le
    // chargement. Réseau coupé : le chargement ne reste plus bloqué.
    const fail = (message: string) => {
      setLoadingDay(false);
      setDate((cur) => (cur === d ? from : cur));
      setError(message);
    };
    getTrackerDay(d)
      .then((res) => {
        if (res.error) return fail(res.error);
        setLoadingDay(false);
        setLogsByDate((prev) => (prev[d] ? prev : { ...prev, [d]: res.logs }));
      })
      .catch(() => fail("Connexion perdue, réessaie."));
  }

  // ── Plan du jour ───────────────────────────────────────────────────────
  const planItems = useMemo(() => planItemsFor(plan, date, choice), [plan, date, choice]);
  const planTarget = useMemo(() => planTotals(planItems), [planItems]);
  const hasPlanToday = planItems.length > 0;
  const target: Macros = hasPlanToday
    ? planTarget
    : {
        calories: profile?.calories_target ?? 0,
        proteins: profile?.proteins_target ?? 0,
        carbs: profile?.carbs_target ?? 0,
        fats: profile?.fats_target ?? 0,
      };
  const consumed = useMemo(() => sumMacros(logs.map(logMacros)), [logs]);
  const slotsWithLogs = useMemo(() => new Set(logs.map((l) => l.meal_slot ?? "")), [logs]);
  const isFixedLike = mode === "fixed" || mode === "fixed_flexible";

  // Remplissage automatique du jour en fixe / fixe-flexible (une seule fois
  // par jour et par appareil, et seulement si la journée est vide : un repas
  // retiré exprès ne revient jamais tout seul).
  const prefillTried = useRef<Set<string>>(new Set());
  const [prefilledToday, setPrefilledToday] = useState(() => readLS(`ep-prefilled:${planKey}:${today}`, false));
  useEffect(() => {
    if (!plan || !isFixedLike || date !== today || !logsByDate[date] || logs.length > 0) return;
    const flag = `ep-prefilled:${planKey}:${date}`;
    if (prefillTried.current.has(flag) || readLS(flag, false)) return;
    prefillTried.current.add(flag);
    writeLS(flag, true);
    fillDayFromPlanAction(date, { onlyIfEmpty: true, choice }).then((res) => {
      setPrefilledToday(true);
      if (res.inserted.length > 0) {
        setDayLogs(date, (prev) => [...prev, ...res.inserted]);
        setNotice("Ta journée est remplie avec ton plan.");
        notifyGateRefresh();
      }
    });
  }, [plan, isFixedLike, date, today, logs.length, logsByDate, planKey, choice, setDayLogs]);

  // ── Flexible : suggestions du plan, ré-équilibrées en direct ──────────
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const suggestions = useMemo(() => {
    if (mode !== "flexible" || !hasPlanToday) return [] as (PlanItem & { planGrams: number; adjusted: boolean; overridden: boolean })[];
    const open = planItems.filter((i) => !slotsWithLogs.has(i.slot));
    const pinned: (PlanItem & { planGrams: number; overridden: boolean })[] = [];
    const free: PlanItem[] = [];
    for (const i of open) {
      const o = dayOverrides[i.planMealId];
      if (o && "removed" in o) continue;
      if (o && "foodId" in o) {
        const f = foodById.get(o.foodId);
        if (f) {
          pinned.push({ ...i, food: f, grams: o.grams, planGrams: i.grams, overridden: true });
          continue;
        }
      }
      free.push(i);
    }
    const locked = addMacros(consumed, sumMacros(pinned.map((p) => macrosFor(p.food, p.grams))));
    // Seuls les repas encore à venir s'adaptent, et seulement si l'écart du
    // jour est réel (pas pour une banane en plus), en commençant par le
    // prochain repas (voir adaptUpcoming).
    const hhmm = nowHHMM();
    const upcomingFree = date === today ? free.filter((i) => isSlotUpcoming(i.slot, hhmm)) : free;
    const passedFree = free.filter((i) => !upcomingFree.includes(i));
    const lockedAll = addMacros(locked, sumMacros(passedFree.map((i) => macrosFor(i.food, i.grams))));
    const res = adaptUpcoming(groupBySlot(upcomingFree.map((i) => ({ slot: i.slot, key: i.planMealId, food: i.food, grams: i.grams }))), lockedAll, planTarget);
    const adjusted = free.map((i) => {
      const g = res.get(i.planMealId) ?? i.grams;
      return { ...i, grams: g, planGrams: i.grams, adjusted: g !== i.grams, overridden: false };
    });
    return [...pinned.map((p) => ({ ...p, adjusted: false })), ...adjusted].sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
  }, [mode, hasPlanToday, planItems, slotsWithLogs, dayOverrides, foodById, consumed, planTarget, date, today]);
  const projected = useMemo(() => addMacros(consumed, sumMacros(suggestions.map((s) => macrosFor(s.food, s.grams)))), [consumed, suggestions]);

  // ── Contexte de recherche : plan, récents, habitudes ──────────────────
  const ctxBase = useMemo(() => {
    const all = Object.values(logsByDate)
      .flat()
      .sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
    const recentIds: string[] = [];
    const counts = new Map<string, number>();
    const lastQty = new Map<string, number>();
    for (const l of all) {
      if (!l.food_id) continue;
      if (!recentIds.includes(l.food_id) && recentIds.length < 25) recentIds.push(l.food_id);
      counts.set(l.food_id, (counts.get(l.food_id) ?? 0) + 1);
      if (!lastQty.has(l.food_id)) lastQty.set(l.food_id, Number(l.quantity_g));
    }
    const planIds = new Set((plan?.diet_plan_meals ?? []).map((m) => m.food_id));
    return { recentIds, counts, lastQty, planIds };
  }, [logsByDate, plan]);

  const ctxFor = useCallback(
    (slot: string | null): SearchContext => ({
      planIds: ctxBase.planIds,
      slotPlanIds: slot ? new Set(planItems.filter((i) => i.slot === slot).map((i) => i.food.id)) : undefined,
      recentIds: ctxBase.recentIds,
      counts: ctxBase.counts,
    }),
    [ctxBase, planItems]
  );

  // Food absent de la liste (aliment perso créé ailleurs) : on le garde.
  const rememberFoods = useCallback((list: FoodLogWithFood[]) => {
    const extra = list.map((l) => l.foods).filter((f): f is Food => !!f);
    if (extra.length === 0) return;
    setFoods((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      const add = extra.filter((f) => !ids.has(f.id));
      return add.length ? [...add, ...prev] : prev;
    });
  }, []);

  // ── Ré-équilibrage fixe-flexible (aujourd'hui seulement) ──────────────
  async function rebalanceAfter(slot: string, dayLogs: FoodLogWithFood[]) {
    if (mode !== "fixed_flexible" || date !== today || !hasPlanToday) return;
    // Repas suivants ET pas encore passés à l'heure qu'il est : un repas du
    // matin n'est jamais retouché à 17 h, et le plan de base ne bouge jamais.
    const hhmm = nowHHMM();
    const later = dayLogs.filter((l) => slotRank(l.meal_slot ?? "") > slotRank(slot) && isSlotUpcoming(l.meal_slot ?? "", hhmm) && l.diet_plan_meal_id && l.food_id && l.foods);
    if (later.length === 0) return;
    const laterIds = new Set(later.map((l) => l.id));
    const locked = sumMacros(dayLogs.filter((l) => !laterIds.has(l.id)).map(logMacros));
    const res = adaptUpcoming(groupBySlot(later.map((l) => ({ slot: l.meal_slot ?? "", key: l.id, food: l.foods!, grams: Number(l.quantity_g) }))), locked, planTarget);
    const changes = later.filter((l) => res.has(l.id) && res.get(l.id) !== Number(l.quantity_g) && (res.get(l.id) ?? 0) > 0).map((l) => ({ id: l.id, quantityG: res.get(l.id)! }));
    if (changes.length === 0) return;
    const out = await updateTrackerLogs(changes);
    if (out.error) return setError(out.error);
    const byId = new Map(out.logs.map((l) => [l.id, l]));
    setDayLogs(date, (prev) => prev.map((l) => byId.get(l.id) ?? l));
    setNotice(`Journée ré-équilibrée : ${changes.length} aliment${changes.length > 1 ? "s" : ""} ajusté${changes.length > 1 ? "s" : ""} dans les repas suivants.`);
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch {
      setError("Connexion perdue, réessaie.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────
  async function addFoods(slot: string, items: { food: Food; grams: number; planMealId?: string | null }[]) {
    const res = await run(() => addTrackerItems(items.map((i) => ({ foodId: i.food.id, quantityG: i.grams, planMealId: i.planMealId ?? null })), slot, date));
    if (!res) return;
    if (res.error) return setError(res.error);
    rememberFoods(res.logs);
    const next = [...logs, ...res.logs];
    // Mise à jour fonctionnelle : plusieurs repas peuvent être cochés d'affilée.
    setDayLogs(date, (prev) => [...prev, ...res.logs]);
    setSheet(null);
    notifyGateRefresh();
    await rebalanceAfter(slot, next);
  }

  async function addPortion(slot: string, input: Parameters<typeof logPortion>[0]) {
    const res = await run(() => logPortion(input, slot, date));
    if (!res) return;
    if (res.error) return setError(res.error);
    rememberFoods(res.logs);
    const next = [...logs, ...res.logs];
    setDayLogs(date, () => next);
    setSheet(null);
    notifyGateRefresh();
    await rebalanceAfter(slot, next);
  }

  async function saveLog(log: FoodLogWithFood, next: { food: Food; grams: number }) {
    const res = await run(() => updateTrackerLogs([{ id: log.id, foodId: next.food.id, quantityG: next.grams }]));
    if (!res) return;
    if (res.error) return setError(res.error);
    const updated = res.logs[0];
    const nextLogs = logs.map((l) => (l.id === log.id && updated ? updated : l));
    setDayLogs(date, () => nextLogs);
    setSheet(null);
    await rebalanceAfter(log.meal_slot ?? "", nextLogs);
  }

  async function removeLog(log: FoodLogWithFood) {
    const res = await run(() => deleteTrackerLogs([log.id]));
    if (!res) return;
    if (res.error) return setError(res.error);
    const nextLogs = logs.filter((l) => l.id !== log.id);
    setDayLogs(date, () => nextLogs);
    setSheet(null);
    notifyGateRefresh();
    await rebalanceAfter(log.meal_slot ?? "", nextLogs);
  }

  async function fillSlots(slots?: string[], useChoice: VariantChoice = choice) {
    const res = await run(() => fillDayFromPlanAction(date, { onlyIfEmpty: false, choice: useChoice, slots }));
    if (!res) return;
    if (res.error) return setError(res.error);
    setDayLogs(date, (prev) => [...prev, ...res.inserted]);
    notifyGateRefresh();
    if (res.inserted.length > 0) setNotice(slots ? "Repas remis comme dans ton plan." : "Journée remplie avec ton plan.");
  }

  async function eatSuggestions(slot: string) {
    const items = suggestions.filter((s) => s.slot === slot && s.grams > 0);
    if (items.length === 0) return;
    await addFoods(slot, items.map((s) => ({ food: s.food, grams: s.grams, planMealId: s.planMealId })));
    // Les remplacements prévus de ce repas sont consommés.
    const o = { ...dayOverrides };
    for (const s of items) delete o[s.planMealId];
    setOverrides((prev) => ({ ...prev, [date]: o }));
    writeLS(`ep-flex:${planKey}:${date}`, o);
  }

  function setOverride(planMealId: string, value: Override | null) {
    const o = { ...dayOverrides };
    if (value) o[planMealId] = value;
    else delete o[planMealId];
    setOverrides((prev) => ({ ...prev, [date]: o }));
    writeLS(`ep-flex:${planKey}:${date}`, o);
    setSheet(null);
  }

  async function chooseVariant(slot: string, variant: number) {
    const nextChoice = { ...choice, [slot]: variant };
    setChoices((prev) => ({ ...prev, [date]: nextChoice }));
    writeLS(`ep-variants:${planKey}:${date}`, nextChoice);
    if (!isFixedLike) return;
    // Fixe : on remplace le repas logué par l'autre option du plan.
    const slotLogs = logs.filter((l) => l.meal_slot === slot);
    if (slotLogs.length > 0) {
      const del = await run(() => deleteTrackerLogs(slotLogs.map((l) => l.id)));
      if (!del || del.error) return setError(del?.error ?? "Erreur.");
      setDayLogs(date, (prev) => prev.filter((l) => l.meal_slot !== slot));
    }
    await fillSlots([slot], nextChoice);
  }

  async function changeMode(next: DietMode) {
    if (!onChangeMode || next === mode) return;
    const prev = mode;
    setMode(next);
    const res = await onChangeMode(next);
    if (res.error) {
      setMode(prev);
      setError(res.error);
    }
  }

  // ── Ma diète du jour : cases « mangé », écarts, semaine (2026-10-14) ───
  const weekDates = useMemo(() => weekOf(today), [today]);

  useEffect(() => {
    let alive = true;
    const from = [weekDates[0], shiftDate(today, -13)].sort()[0];
    getMealChecks(from, today)
      .then((res) => {
        if (!alive || res.local) return;
        setChecks((prev) => {
          const next: MealChecks = {};
          for (const [d, v] of Object.entries(prev)) if (d < from || d > today) next[d] = v;
          return { ...next, ...res.checks };
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [today, weekDates]);

  useEffect(() => {
    const min = shiftDate(today, -21);
    const pruned: MealChecks = {};
    for (const [d, v] of Object.entries(checks)) if (d >= min) pruned[d] = v;
    writeLS(CHECKS_KEY, pruned);
  }, [checks, today]);

  /** Statut de chaque repas d'un jour : case cochée, sinon « mangé » si le repas est noté en flexible. */
  const statusFor = useCallback(
    (d: string, dayLogs: FoodLogWithFood[]): Record<string, MealStatus | undefined> => {
      const out: Record<string, MealStatus | undefined> = { ...(checks[d] ?? {}) };
      if (mode === "flexible") for (const l of dayLogs) out[l.meal_slot ?? "breakfast"] ??= "mange";
      return out;
    },
    [checks, mode]
  );

  const planSlots = useMemo(() => [...new Set(planItems.map((i) => i.slot))].sort((a, b) => slotRank(a) - slotRank(b)), [planItems]);
  const dayStatus = useMemo(() => statusFor(date, logs), [statusFor, date, logs]);

  const displayItems = useCallback(
    (slot: string): (CookItem & { logId?: string; planMealId?: string })[] => {
      const slotLogs = logs.filter((l) => (l.meal_slot ?? "breakfast") === slot && l.foods);
      const noteOf = (id: string | null | undefined) => (id ? plan?.diet_plan_meals.find((m) => m.id === id)?.notes ?? null : null);
      if (slotLogs.length) return slotLogs.map((l) => ({ key: `log:${l.id}`, food: l.foods!, grams: Number(l.quantity_g), logId: l.id, planMealId: l.diet_plan_meal_id ?? undefined, note: noteOf(l.diet_plan_meal_id) }));
      if (mode === "flexible") {
        const sug = suggestions.filter((x) => x.slot === slot && x.grams > 0);
        if (sug.length) return sug.map((x) => ({ key: `plan:${x.planMealId}`, food: x.food, grams: x.grams, planMealId: x.planMealId, note: noteOf(x.planMealId) }));
      }
      return planItems.filter((i) => i.slot === slot).map((i) => ({ key: `plan:${i.planMealId}`, food: i.food, grams: i.grams, planMealId: i.planMealId, note: noteOf(i.planMealId) }));
    },
    [logs, mode, suggestions, planItems, plan]
  );

  const dayMeals: DayMeal[] = useMemo(
    () =>
      planSlots.map((slot) => {
        const items = displayItems(slot);
        return { slot, label: slotLabel(slot), time: slotTime(slot), items, macros: sumMacros(items.map((i) => macrosFor(i.food, i.grams))) };
      }),
    [planSlots, displayItems]
  );

  const adherence = useMemo(
    () => dayAdherence({ slots: planSlots, status: dayStatus, consumedKcal: date === today ? 0 : consumed.calories, targetKcal: planTarget.calories }),
    [planSlots, dayStatus, consumed.calories, planTarget.calories, date, today]
  );

  const week: WeekDay[] = useMemo(
    () =>
      weekDates.map((d, i) => {
        const future = d > today;
        if (future || !plan) return { date: d, letter: WEEK_LETTERS[i], pct: null, basis: null, isToday: d === today, isSelected: d === date, future };
        const items = planItemsFor(plan, d, choices[d] ?? readLS(`ep-variants:${planKey}:${d}`, {}));
        const slots = [...new Set(items.map((x) => x.slot))];
        const dayLogs = logsByDate[d] ?? [];
        const a = dayAdherence({
          slots,
          status: statusFor(d, dayLogs),
          // Aujourd'hui, la journée pré-remplie ne prouve pas ce qui est mangé.
          consumedKcal: d === today ? 0 : sumMacros(dayLogs.map(logMacros)).calories,
          targetKcal: planTotals(items).calories,
        });
        return { date: d, letter: WEEK_LETTERS[i], pct: a.pct, basis: a.basis, isToday: d === today, isSelected: d === date, future };
      }),
    [weekDates, today, plan, choices, planKey, logsByDate, statusFor, date]
  );
  const weekAvg = useMemo(() => {
    const vals = week.filter((d) => d.pct != null).map((d) => d.pct!);
    return vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null;
  }, [week]);

  async function saveCheck(d: string, slot: string, st: MealStatus | null) {
    const prev = checks[d]?.[slot];
    setChecks((c) => {
      const day = { ...(c[d] ?? {}) };
      if (st) day[slot] = st;
      else delete day[slot];
      return { ...c, [d]: day };
    });
    const res = await setMealCheck(d, slot, st).catch(() => ({ error: "Connexion perdue, réessaie." }) as { error?: string; local?: boolean });
    if (res.error) {
      setError(res.error);
      setChecks((c) => {
        const day = { ...(c[d] ?? {}) };
        if (prev) day[slot] = prev;
        else delete day[slot];
        return { ...c, [d]: day };
      });
      return;
    }
    notifyGateRefresh();
  }

  /** Coche un repas ; s'il n'est pas encore dans le journal, il y est ajouté tel que prévu. */
  async function markMeal(slot: string, st: MealStatus | null) {
    if (st === "mange" && !logs.some((l) => (l.meal_slot ?? "breakfast") === slot)) {
      if (mode === "flexible" && suggestions.some((x) => x.slot === slot && x.grams > 0)) await eatSuggestions(slot);
      else if (planItems.some((i) => i.slot === slot)) await fillSlots([slot]);
    }
    await saveCheck(date, slot, st);
  }

  async function toggleMeal(slot: string) {
    if (!dayStatus[slot]) return markMeal(slot, "mange");
    // Décocher en flexible retire ce que la case avait ajouté (aliments du plan).
    if (mode === "flexible") {
      const fromPlan = logs.filter((l) => (l.meal_slot ?? "breakfast") === slot && l.diet_plan_meal_id);
      if (fromPlan.length) {
        const del = await run(() => deleteTrackerLogs(fromPlan.map((l) => l.id)));
        if (!del || del.error) return setError(del?.error ?? "Erreur.");
        const ids = new Set(fromPlan.map((l) => l.id));
        setDayLogs(date, (prev) => prev.filter((l) => !ids.has(l.id)));
      }
    }
    await saveCheck(date, slot, null);
  }

  async function clearSlotLogs(slot: string, onlyPlan: boolean) {
    const list = logs.filter((l) => (l.meal_slot ?? "breakfast") === slot && (!onlyPlan || l.diet_plan_meal_id));
    if (list.length === 0) return true;
    const del = await run(() => deleteTrackerLogs(list.map((l) => l.id)));
    if (!del || del.error) {
      setError(del?.error ?? "Erreur.");
      return false;
    }
    const ids = new Set(list.map((l) => l.id));
    setDayLogs(date, (prev) => prev.filter((l) => !ids.has(l.id)));
    notifyGateRefresh();
    return true;
  }

  async function skipMeal(slot: string) {
    if (!(await clearSlotLogs(slot, false))) return;
    await saveCheck(date, slot, "saute");
  }

  async function ateOther(slot: string) {
    if (!(await clearSlotLogs(slot, true))) return;
    await saveCheck(date, slot, "ecart");
    setSheet({ kind: "add", slot });
  }

  async function replaceItem(slot: string, key: string, next: { food: Food; grams: number }) {
    setReplaceTarget(null);
    const items = displayItems(slot);
    const target = items.find((i) => i.key === key);
    if (!target) return;
    if (target.logId) {
      const log = logs.find((l) => l.id === target.logId);
      if (log) await saveLog(log, next);
    } else {
      await addFoods(
        slot,
        items.map((i) => (i.key === key ? { food: next.food, grams: next.grams, planMealId: i.planMealId ?? null } : { food: i.food, grams: i.grams, planMealId: i.planMealId ?? null }))
      );
    }
    await saveCheck(date, slot, "remplace");
  }

  const replaceItemData = replaceTarget ? displayItems(replaceTarget.slot).find((i) => i.key === replaceTarget.key) : undefined;
  const cookMeal = cook ? dayMeals.find((m) => m.slot === cook.slot) ?? null : null;

  // ── Affichage ──────────────────────────────────────────────────────────
  const slotKeys = useMemo(() => {
    const keys = new Set<string>([...planItems.map((i) => i.slot), ...logs.map((l) => l.meal_slot ?? "breakfast")]);
    if (keys.size === 0) ["breakfast", "lunch", "afternoon", "dinner"].forEach((k) => keys.add(k));
    return [...keys].sort((a, b) => slotRank(a) - slotRank(b));
  }, [planItems, logs]);
  const otherSlots = MEAL_SLOTS.filter((s) => !slotKeys.includes(s.key));
  const [extraSlots, setExtraSlots] = useState<string[]>([]);
  const shownSlots = [...new Set([...slotKeys, ...extraSlots])].sort((a, b) => slotRank(a) - slotRank(b));

  const minDate = shiftDate(today, -30);
  const dayLabel = date === today ? "Aujourd'hui" : date === shiftDate(today, -1) ? "Hier" : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
  const modeInfo = MODES.find((m) => m.key === mode) ?? MODES[2];

  const planMealsToday: PlanMealOption[] = useMemo(() => {
    if (!plan) return [];
    const out: PlanMealOption[] = [];
    for (const s of MEAL_SLOTS) {
      for (const v of variantsFor(plan, date, s.key)) {
        const items = planItemsFor(plan, date, { [s.key]: v }).filter((i) => i.slot === s.key);
        if (items.length) out.push({ key: `${s.key}-${v}`, label: v > 1 ? `${s.label} · option ${v}` : s.label, items });
      }
    }
    return out;
  }, [plan, date]);

  const planMealsOther: PlanMealOption[] = useMemo(() => {
    if (!plan || plan.structure !== "weekly") return [];
    const seen = new Set(planMealsToday.map((m) => m.items.map((i) => `${i.food.id}:${i.grams}`).sort().join("|")));
    const out: PlanMealOption[] = [];
    for (let d = 1; d <= 6; d++) {
      const other = shiftDate(date, d);
      for (const s of MEAL_SLOTS) {
        for (const v of variantsFor(plan, other, s.key)) {
          const items = planItemsFor(plan, other, { [s.key]: v }).filter((i) => i.slot === s.key);
          const sig = items.map((i) => `${i.food.id}:${i.grams}`).sort().join("|");
          if (!items.length || seen.has(sig)) continue;
          seen.add(sig);
          const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(new Date(`${other}T12:00:00`));
          out.push({ key: `${other}-${s.key}-${v}`, label: `${s.label} du ${day}`, items });
        }
      }
    }
    return out.slice(0, 30);
  }, [plan, date, planMealsToday]);

  const defaultGrams = useCallback(
    (slot: string) => (food: Food) =>
      planItems.find((i) => i.slot === slot && i.food.id === food.id)?.grams ??
      planItems.find((i) => i.food.id === food.id)?.grams ??
      ctxBase.lastQty.get(food.id) ??
      100,
    [planItems, ctxBase]
  );

  const sheetLog = sheet?.kind === "log" ? logs.find((l) => l.id === sheet.logId) : undefined;
  const sheetSuggest = sheet?.kind === "suggest" ? suggestions.find((s) => s.planMealId === sheet.planMealId) : undefined;

  if (!mounted) {
    return <div className="h-64 rounded-2xl border border-(--ep-line)/20 bg-(--ep-s5)/60 animate-pulse" aria-busy="true" />;
  }

  return (
    <div className="space-y-4">
      {/* Jour */}
      <div className="flex items-center gap-2">
        <button type="button" aria-label={tr("Jour précédent")} disabled={date <= minDate} onClick={() => goTo(shiftDate(date, -1))} className="w-9 h-9 rounded-lg border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/70 disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-black uppercase tracking-tight text-(--ep-strong) first-letter:uppercase">{dayLabel}</p>
          {date !== today && (
            <button type="button" onClick={() => goTo(today)} className="text-[10px] font-bold uppercase tracking-widest text-(--ep-accent-hi2)">
              {tr("Revenir à aujourd'hui")}
            </button>
          )}
        </div>
        <button type="button" aria-label={tr("Jour suivant")} disabled={date >= today} onClick={() => goTo(shiftDate(date, 1))} className="w-9 h-9 rounded-lg border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/70 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {notice && <p role="status" className="text-xs text-(--ep-ok) text-center">{tr(notice)}</p>}
      {error && <p role="alert" className="text-xs text-(--ep-bad) text-center">{tr(error)}</p>}

      {/* Ma diète du jour : repas du moment, cases « mangé », semaine */}
      {hasPlanToday && (
        <DietToday
          isToday={date === today}
          dayLabel={dayLabel}
          meals={dayMeals}
          status={dayStatus}
          adherence={adherence}
          week={week}
          weekAvg={weekAvg}
          busy={busy}
          onToggle={toggleMeal}
          onSetStatus={(slot, st) => (st ? markMeal(slot, st) : toggleMeal(slot))}
          onCook={(slot) => setCook({ slot, initial: null })}
          onReplace={(slot, key) => setReplaceTarget({ slot, key })}
          onAteOther={ateOther}
          onSkip={skipMeal}
          onSelectDay={goTo}
          onMarkPast={async (slots) => {
            for (const slot of slots) await markMeal(slot, "mange");
          }}
        />
      )}

      {hasPlanToday && (
        <button
          type="button"
          aria-expanded={showDetail}
          onClick={() => {
            setShowDetail((v) => {
              writeLS(DETAIL_KEY, !v);
              return !v;
            });
          }}
          className="w-full min-h-[48px] rounded-2xl border border-(--ep-line)/25 px-4 flex items-center gap-2 text-sm font-bold text-(--ep-ink)/70"
        >
          <SlidersHorizontal size={15} className="text-(--ep-ink)/40" />
          <span className="flex-1 text-left">{tr("Macros, ajouts et options")}</span>
          <ChevronDown size={16} className={`text-(--ep-ink)/40 transition-transform ${showDetail ? "rotate-180" : ""}`} />
        </button>
      )}

      {(showDetail || !hasPlanToday) && (
      <div className="space-y-4">
      {/* Mode */}
      {plan && (
        <div className="rounded-xl border border-(--ep-line)/25 bg-(--ep-shade)/25 p-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 flex-1 truncate">
              {isOwnPlan ? tr("Mon plan") : tr("Plan de ton coach")} · {plan.name}
            </p>
            {!onChangeMode && <Lock size={11} className="text-(--ep-ink)/30" />}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                disabled={!onChangeMode || busy}
                onClick={() => changeMode(m.key)}
                className={`py-2 rounded-lg border text-[10.5px] font-black uppercase tracking-wider transition-colors ${
                  mode === m.key ? "bg-(--ep-accent)/15 border-(--ep-accent)/50 text-(--ep-accent-hi2)" : "border-(--ep-line)/25 text-(--ep-ink)/35"
                } ${onChangeMode ? "" : "cursor-default"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-(--ep-ink)/50 mt-2 leading-snug">{modeInfo.help}</p>
        </div>
      )}

      {/* Anneaux */}
      <div className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s5)/80 p-4">
        <div className="flex justify-between">
          <Ring label={tr("Calories")} value={consumed.calories} target={target.calories} color="var(--ep-accent)" />
          <Ring label={tr("Protéines")} value={consumed.proteins} target={target.proteins} color="var(--ep-info)" />
          <Ring label={tr("Glucides")} value={consumed.carbs} target={target.carbs} color="var(--ep-yellow)" />
          <Ring label={tr("Lipides")} value={consumed.fats} target={target.fats} color="var(--ep-violet)" />
        </div>
        {mode === "flexible" && suggestions.length > 0 && (
          <p className="text-[11px] text-(--ep-ink)/55 mt-3 text-center">
            <Sparkles size={11} className="inline -mt-0.5 mr-1 text-(--ep-accent-hi2)" />
            {tr("Avec les repas prévus :")}{" "}<b className="text-(--ep-strong)">{Math.round(projected.calories)}{" "}{tr("kcal")}</b> · P {Math.round(projected.proteins)} · G {Math.round(projected.carbs)} · L {Math.round(projected.fats)}
          </p>
        )}
        {!hasPlanToday && target.calories === 0 && (
          <p className="text-[11px] text-(--ep-ink)/45 mt-3 text-center">{tr("Pas encore d'objectifs : ils s'affichent dès que ton plan ou tes besoins sont définis.")}</p>
        )}
      </div>

      {/* Jour passé vide en fixe : un tap pour dire "j'ai suivi le plan" */}
      {isFixedLike && hasPlanToday && logs.length === 0 && !loadingDay && (date !== today || prefilledToday) && (
        <button type="button" disabled={busy} onClick={() => fillSlots()} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 disabled:opacity-50">
          <Check size={14} className="inline -mt-0.5 mr-1.5" />
          {tr("J'ai suivi mon plan ce jour-là")}
        </button>
      )}

      {/* Repas */}
      {shownSlots.map((slot) => {
        const slotLogs = logs.filter((l) => (l.meal_slot ?? "breakfast") === slot);
        const slotSuggest = suggestions.filter((s) => s.slot === slot);
        const variants = variantsFor(plan, date, slot);
        const current = choice[slot] ?? 1;
        const kcal = slotLogs.length ? sumMacros(slotLogs.map(logMacros)).calories : sumMacros(slotSuggest.map((s) => macrosFor(s.food, s.grams))).calories;
        const planForSlot = planItems.filter((i) => i.slot === slot);
        return (
          <section key={slot} className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s5)/70 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <p className="flex-1 text-[11px] font-black uppercase tracking-widest text-(--ep-ink)/70">{slotLabel(slot)}</p>
              {slotLogs.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <Check size={11} /> {Math.round(kcal)}{" "}{tr("kcal")}
                </span>
              ) : slotSuggest.length > 0 ? (
                <span className="text-[10px] font-bold text-(--ep-ink)/40">{tr("Prévu ·")}{" "}{Math.round(kcal)}{" "}{tr("kcal")}</span>
              ) : null}
            </div>

            {variants.length > 1 && (mode === "flexible" ? slotLogs.length === 0 : true) && (
              <div className="flex gap-1.5 px-4 pb-2">
                {variants.map((v) => (
                  <button key={v} type="button" disabled={busy} onClick={() => current !== v && chooseVariant(slot, v)} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${current === v ? "bg-(--ep-accent)/15 border-(--ep-accent)/50 text-(--ep-accent-hi2)" : "border-(--ep-line)/30 text-(--ep-ink)/45"}`}>
                    {v === 1 ? tr("Choix habituel") : `Option ${v}`}
                  </button>
                ))}
              </div>
            )}

            <div className="px-2">
              {slotLogs.map((l) => (
                <button key={l.id} type="button" onClick={() => setSheet({ kind: "log", logId: l.id })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-(--ep-hi)/[0.03] text-left">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-(--ep-strong) truncate">{l.foods?.name ?? tr("Aliment")}</span>
                    <span className="block text-[10.5px] text-(--ep-ink)/40">
                      {Math.round(l.calories ?? 0)} kcal · P {Math.round(l.proteins ?? 0)} · G {Math.round(l.carbs ?? 0)} · L {Math.round(l.fats ?? 0)}
                    </span>
                  </span>
                  {/* Les grammes en gros (2026-10-08) : avant, le chiffre en gras
                      à droite était les kcal sans unité, lu comme des grammes
                      (« 15 » pour 100 g de légumes verts). */}
                  <span className="text-sm font-black text-(--ep-strong) tabular-nums whitespace-nowrap">{Math.round(Number(l.quantity_g) * 10) / 10} g</span>
                </button>
              ))}

              {slotLogs.length === 0 &&
                slotSuggest.map((s) => (
                  <button key={s.planMealId} type="button" onClick={() => setSheet({ kind: "suggest", planMealId: s.planMealId })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-(--ep-hi)/[0.03] text-left opacity-80">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--ep-ink)/25 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-(--ep-ink)/80 truncate">
                        {s.food.name}
                        {s.overridden && <Shuffle size={11} className="inline ml-1.5 -mt-0.5 text-(--ep-accent-hi2)" />}
                      </span>
                      <span className="block text-[10.5px] text-(--ep-ink)/40">
                        {Math.round(macrosFor(s.food, s.grams).calories)} kcal
                        {s.adjusted && <span className="text-amber-300/80">{" "}{tr("· ajusté (plan")}{" "}{s.planGrams} g)</span>}
                      </span>
                    </span>
                    <span className="text-sm font-black text-(--ep-ink)/80 tabular-nums whitespace-nowrap">{s.grams} g</span>
                  </button>
                ))}

              {slotLogs.length === 0 && slotSuggest.length === 0 && (
                <p className="px-2 py-2 text-xs text-(--ep-ink)/35">
                  {isFixedLike && planForSlot.length > 0 ? tr("Repas retiré de ta journée.") : tr("Rien de logué pour l'instant.")}
                </p>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-3 pt-1.5">
              {mode === "flexible" && slotLogs.length === 0 && slotSuggest.length > 0 && (
                <button type="button" disabled={busy} onClick={() => eatSuggestions(slot)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
                  <Check size={13} />{" "}{tr("J'ai mangé ça")}
                </button>
              )}
              {isFixedLike && slotLogs.length === 0 && planForSlot.length > 0 && (
                <button type="button" disabled={busy} onClick={() => fillSlots([slot])} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50">
                  <RotateCcw size={12} />{" "}{tr("Remettre le repas du plan")}
                </button>
              )}
              <button type="button" onClick={() => setSheet({ kind: "add", slot })} className={`${mode === "flexible" && slotLogs.length === 0 && slotSuggest.length > 0 ? "" : "flex-1"} inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 text-[11px] font-bold uppercase tracking-widest`}>
                <Plus size={13} /> {mode === "flexible" && slotLogs.length === 0 && slotSuggest.length > 0 ? tr("Autre") : tr("Ajouter")}
              </button>
            </div>
          </section>
        );
      })}

      {otherSlots.filter((s) => !extraSlots.includes(s.key)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {otherSlots
            .filter((s) => !extraSlots.includes(s.key))
            .map((s) => (
              <button key={s.key} type="button" onClick={() => setExtraSlots((p) => [...p, s.key])} className="px-3 py-1.5 rounded-full border border-dashed border-(--ep-line)/40 text-[11px] font-bold text-(--ep-ink)/50">
                + {s.label}
              </button>
            ))}
        </div>
      )}

      {mode === "flexible" && Object.keys(dayOverrides).length > 0 && (
        <button type="button" onClick={() => { setOverrides((p) => ({ ...p, [date]: {} })); writeLS(`ep-flex:${planKey}:${date}`, {}); }} className="w-full min-h-[44px] text-[11px] font-bold text-(--ep-ink)/45 underline">
          {tr("Revenir aux repas du plan pour")}{" "}{date === today ? tr("aujourd'hui") : tr("ce jour")}
        </button>
      )}
      </div>
      )}

      {/* Panneaux */}
      {sheet?.kind === "add" && (
        <AddFoodSheet
          slot={sheet.slot}
          date={date}
          foods={foods}
          ctx={ctxFor(sheet.slot)}
          defaultGrams={defaultGrams(sheet.slot)}
          planMealsToday={planMealsToday}
          planMealsOther={planMealsOther}
          recipes={recipes}
          savedMeals={savedMeals}
          busy={busy}
          error={error}
          onAddFoods={(items) => addFoods(sheet.slot, items)}
          onAddPortion={(input) => addPortion(sheet.slot, input)}
          onCreateFood={async (f) => {
            const res = await createCustomFood({
              name: f.name,
              category: f.category ?? "Divers",
              calories_per_100: f.calories_per_100,
              proteins_per_100: f.proteins_per_100,
              carbs_per_100: f.carbs_per_100,
              fats_per_100: f.fats_per_100,
              fibers_per_100: f.fibers_per_100 ?? 0,
            });
            if (res.food) setFoods((prev) => [res.food!, ...prev]);
            return res.food ?? null;
          }}
          onClose={() => {
            setSheet(null);
            setError(null);
          }}
        />
      )}

      {sheetLog && sheetLog.foods && (
        <ItemSheet
          title={`${slotLabel(sheetLog.meal_slot ?? "")} · ${dayLabel}`}
          food={sheetLog.foods}
          grams={Number(sheetLog.quantity_g)}
          planGrams={planItems.find((i) => i.planMealId === sheetLog.diet_plan_meal_id)?.grams ?? null}
          foods={foods}
          ctx={ctxFor(sheetLog.meal_slot)}
          allowSwap={mode !== "fixed"}
          hint={mode === "fixed_flexible" && date === today ? tr("Petit écart : rien ne bouge. Gros changement ou repas sauté : seuls les repas à venir s'ajustent. Ton plan ne change jamais.") : undefined}
          busy={busy}
          onSave={(next) => saveLog(sheetLog, next)}
          onRemove={() => removeLog(sheetLog)}
          onClose={() => setSheet(null)}
        />
      )}

      {sheetSuggest && (
        <ItemSheet
          title={`${slotLabel(sheetSuggest.slot)} · prévu`}
          food={sheetSuggest.food}
          grams={sheetSuggest.grams}
          planGrams={sheetSuggest.planGrams}
          foods={foods}
          ctx={ctxFor(sheetSuggest.slot)}
          allowSwap
          hint={tr("Seuls les repas à venir s'ajustent si l'écart est important. Ton plan ne change jamais.")}
          onSave={(next) => setOverride(sheetSuggest.planMealId, { foodId: next.food.id, grams: next.grams })}
          onRemove={() => setOverride(sheetSuggest.planMealId, { removed: true })}
          onClose={() => setSheet(null)}
        />
      )}

      {replaceTarget && replaceItemData && (
        <ItemSheet
          title={`${slotLabel(replaceTarget.slot)} · ${tr("remplacement")}`}
          food={replaceItemData.food}
          grams={replaceItemData.grams}
          planGrams={replaceItemData.grams}
          foods={foods}
          ctx={ctxFor(replaceTarget.slot)}
          allowSwap
          hint={tr("Choisis ce que tu as mangé à la place : la quantité équivalente est déjà calculée.")}
          busy={busy}
          onSave={(next) => replaceItem(replaceTarget.slot, replaceTarget.key, next)}
          onRemove={() => {
            const target = replaceItemData;
            setReplaceTarget(null);
            if (target.logId) {
              const log = logs.find((l) => l.id === target.logId);
              if (log) removeLog(log);
            }
          }}
          onClose={() => setReplaceTarget(null)}
        />
      )}

      {cook && cookMeal && (
        <CookMode
          date={date}
          slot={cook.slot}
          title={cookMeal.label}
          time={cookMeal.time}
          items={displayItems(cook.slot)}
          initial={cook.initial}
          onClose={() => setCook(null)}
          onDone={() => {
            const slot = cook.slot;
            setCook(null);
            if (dayStatus[slot] !== "mange") markMeal(slot, "mange");
          }}
        />
      )}
    </div>
  );
}
