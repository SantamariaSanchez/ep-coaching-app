"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Lock, Plus, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import AddFoodSheet, { type PlanMealOption, type TrackerRecipe } from "@/components/nutrition/AddFoodSheet";
import ItemSheet from "@/components/nutrition/ItemSheet";
import { notifyGateRefresh } from "@/lib/gate-events";
import {
  MEAL_SLOTS,
  addMacros,
  macrosFor,
  planItemsFor,
  planTotals,
  rebalance,
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
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(245,237,237,0.07)" strokeWidth="6" />
          <circle cx="34" cy="34" r={r} fill="none" stroke={over ? "#f59e0b" : color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .4s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[13px] font-black text-white">{Math.round(value)}</span>
          <span className="text-[9px] text-[#F5EDED]/35">/{Math.round(target)}</span>
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/45">{label}</span>
    </div>
  );
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
    setDate(d);
    setError(null);
    setChoices((prev) => (prev[d] ? prev : { ...prev, [d]: readLS(`ep-variants:${planKey}:${d}`, {}) }));
    setOverrides((prev) => (prev[d] ? prev : { ...prev, [d]: readLS(`ep-flex:${planKey}:${d}`, {}) }));
    if (logsByDate[d]) return;
    setLoadingDay(true);
    getTrackerDay(d).then((res) => {
      setLoadingDay(false);
      setLogsByDate((prev) => (prev[d] ? prev : { ...prev, [d]: res.logs }));
    });
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
    const res = rebalance(free.map((i) => ({ key: i.planMealId, food: i.food, grams: i.grams })), locked, planTarget);
    const adjusted = free.map((i) => {
      const g = res.get(i.planMealId) ?? i.grams;
      return { ...i, grams: g, planGrams: i.grams, adjusted: g !== i.grams, overridden: false };
    });
    return [...pinned.map((p) => ({ ...p, adjusted: false })), ...adjusted].sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
  }, [mode, hasPlanToday, planItems, slotsWithLogs, dayOverrides, foodById, consumed, planTarget]);
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
    const later = dayLogs.filter((l) => slotRank(l.meal_slot ?? "") > slotRank(slot) && l.diet_plan_meal_id && l.food_id && l.foods);
    if (later.length === 0) return;
    const laterIds = new Set(later.map((l) => l.id));
    const locked = sumMacros(dayLogs.filter((l) => !laterIds.has(l.id)).map(logMacros));
    const res = rebalance(later.map((l) => ({ key: l.id, food: l.foods!, grams: Number(l.quantity_g) })), locked, planTarget);
    const changes = later.filter((l) => res.get(l.id) !== Number(l.quantity_g) && (res.get(l.id) ?? 0) > 0).map((l) => ({ id: l.id, quantityG: res.get(l.id)! }));
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
    setDayLogs(date, () => next);
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
    return <div className="h-64 rounded-2xl border border-[#890404]/20 bg-[#110000]/60 animate-pulse" aria-busy="true" />;
  }

  return (
    <div className="space-y-4">
      {/* Jour */}
      <div className="flex items-center gap-2">
        <button type="button" aria-label={tr("Jour précédent")} disabled={date <= minDate} onClick={() => goTo(shiftDate(date, -1))} className="w-9 h-9 rounded-lg border border-[#890404]/30 flex items-center justify-center text-[#F5EDED]/70 disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-black uppercase tracking-tight text-white first-letter:uppercase">{dayLabel}</p>
          {date !== today && (
            <button type="button" onClick={() => goTo(today)} className="text-[10px] font-bold uppercase tracking-widest text-[#ff6b6b]">
              {tr("Revenir à aujourd'hui")}
            </button>
          )}
        </div>
        <button type="button" aria-label={tr("Jour suivant")} disabled={date >= today} onClick={() => goTo(shiftDate(date, 1))} className="w-9 h-9 rounded-lg border border-[#890404]/30 flex items-center justify-center text-[#F5EDED]/70 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mode */}
      {plan && (
        <div className="rounded-xl border border-[#890404]/25 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 flex-1 truncate">
              {isOwnPlan ? tr("Mon plan") : tr("Plan de ton coach")} · {plan.name}
            </p>
            {!onChangeMode && <Lock size={11} className="text-[#F5EDED]/30" />}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                disabled={!onChangeMode || busy}
                onClick={() => changeMode(m.key)}
                className={`py-2 rounded-lg border text-[10.5px] font-black uppercase tracking-wider transition-colors ${
                  mode === m.key ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-[#ff6b6b]" : "border-[#890404]/25 text-[#F5EDED]/35"
                } ${onChangeMode ? "" : "cursor-default"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#F5EDED]/50 mt-2 leading-snug">{modeInfo.help}</p>
        </div>
      )}

      {/* Anneaux */}
      <div className="rounded-2xl border border-[#890404]/25 bg-[#110000]/80 p-4">
        <div className="flex justify-between">
          <Ring label="Calories" value={consumed.calories} target={target.calories} color="#E01E1E" />
          <Ring label="Protéines" value={consumed.proteins} target={target.proteins} color="#60a5fa" />
          <Ring label="Glucides" value={consumed.carbs} target={target.carbs} color="#facc15" />
          <Ring label="Lipides" value={consumed.fats} target={target.fats} color="#a78bfa" />
        </div>
        {mode === "flexible" && suggestions.length > 0 && (
          <p className="text-[11px] text-[#F5EDED]/55 mt-3 text-center">
            <Sparkles size={11} className="inline -mt-0.5 mr-1 text-[#ff6b6b]" />
            {tr("Avec les repas prévus :")}{" "}<b className="text-white">{Math.round(projected.calories)}{" "}{tr("kcal")}</b> · P {Math.round(projected.proteins)} · G {Math.round(projected.carbs)} · L {Math.round(projected.fats)}
          </p>
        )}
        {!hasPlanToday && target.calories === 0 && (
          <p className="text-[11px] text-[#F5EDED]/45 mt-3 text-center">{tr("Pas encore d'objectifs : ils s'affichent dès que ton plan ou tes besoins sont définis.")}</p>
        )}
      </div>

      {/* Jour passé vide en fixe : un tap pour dire "j'ai suivi le plan" */}
      {isFixedLike && hasPlanToday && logs.length === 0 && !loadingDay && (date !== today || prefilledToday) && (
        <button type="button" disabled={busy} onClick={() => fillSlots()} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 disabled:opacity-50">
          <Check size={14} className="inline -mt-0.5 mr-1.5" />
          {tr("J'ai suivi mon plan ce jour-là")}
        </button>
      )}

      {notice && <p className="text-xs text-emerald-300/90 text-center">{notice}</p>}
      {error && <p className="text-xs text-red-300 text-center">{error}</p>}

      {/* Repas */}
      {shownSlots.map((slot) => {
        const slotLogs = logs.filter((l) => (l.meal_slot ?? "breakfast") === slot);
        const slotSuggest = suggestions.filter((s) => s.slot === slot);
        const variants = variantsFor(plan, date, slot);
        const current = choice[slot] ?? 1;
        const kcal = slotLogs.length ? sumMacros(slotLogs.map(logMacros)).calories : sumMacros(slotSuggest.map((s) => macrosFor(s.food, s.grams))).calories;
        const planForSlot = planItems.filter((i) => i.slot === slot);
        return (
          <section key={slot} className="rounded-2xl border border-[#890404]/25 bg-[#110000]/70 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <p className="flex-1 text-[11px] font-black uppercase tracking-widest text-[#F5EDED]/70">{slotLabel(slot)}</p>
              {slotLogs.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <Check size={11} /> {Math.round(kcal)}{" "}{tr("kcal")}
                </span>
              ) : slotSuggest.length > 0 ? (
                <span className="text-[10px] font-bold text-[#F5EDED]/40">{tr("Prévu ·")}{" "}{Math.round(kcal)}{" "}{tr("kcal")}</span>
              ) : null}
            </div>

            {variants.length > 1 && (mode === "flexible" ? slotLogs.length === 0 : true) && (
              <div className="flex gap-1.5 px-4 pb-2">
                {variants.map((v) => (
                  <button key={v} type="button" disabled={busy} onClick={() => current !== v && chooseVariant(slot, v)} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${current === v ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-[#ff6b6b]" : "border-[#890404]/30 text-[#F5EDED]/45"}`}>
                    {v === 1 ? tr("Choix habituel") : `Option ${v}`}
                  </button>
                ))}
              </div>
            )}

            <div className="px-2">
              {slotLogs.map((l) => (
                <button key={l.id} type="button" onClick={() => setSheet({ kind: "log", logId: l.id })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] text-left">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-white truncate">{l.foods?.name ?? tr("Aliment")}</span>
                    <span className="block text-[10.5px] text-[#F5EDED]/40">
                      {Math.round(Number(l.quantity_g))} g · P {Math.round(l.proteins ?? 0)} · G {Math.round(l.carbs ?? 0)} · L {Math.round(l.fats ?? 0)}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#F5EDED]/70">{Math.round(l.calories ?? 0)}</span>
                </button>
              ))}

              {slotLogs.length === 0 &&
                slotSuggest.map((s) => (
                  <button key={s.planMealId} type="button" onClick={() => setSheet({ kind: "suggest", planMealId: s.planMealId })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] text-left opacity-80">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5EDED]/25 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-[#F5EDED]/80 truncate">
                        {s.food.name}
                        {s.overridden && <Shuffle size={11} className="inline ml-1.5 -mt-0.5 text-[#ff6b6b]" />}
                      </span>
                      <span className="block text-[10.5px] text-[#F5EDED]/40">
                        {s.grams} g
                        {s.adjusted && <span className="text-amber-300/80">{" "}{tr("· ajusté (plan")}{" "}{s.planGrams} g)</span>}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-[#F5EDED]/45">{Math.round(macrosFor(s.food, s.grams).calories)}</span>
                  </button>
                ))}

              {slotLogs.length === 0 && slotSuggest.length === 0 && (
                <p className="px-2 py-2 text-xs text-[#F5EDED]/35">
                  {isFixedLike && planForSlot.length > 0 ? tr("Repas retiré de ta journée.") : tr("Rien de logué pour l'instant.")}
                </p>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-3 pt-1.5">
              {mode === "flexible" && slotLogs.length === 0 && slotSuggest.length > 0 && (
                <button type="button" disabled={busy} onClick={() => eatSuggestions(slot)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E01E1E] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
                  <Check size={13} />{" "}{tr("J'ai mangé ça")}
                </button>
              )}
              {isFixedLike && slotLogs.length === 0 && planForSlot.length > 0 && (
                <button type="button" disabled={busy} onClick={() => fillSlots([slot])} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#890404]/40 text-[#F5EDED]/75 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50">
                  <RotateCcw size={12} />{" "}{tr("Remettre le repas du plan")}
                </button>
              )}
              <button type="button" onClick={() => setSheet({ kind: "add", slot })} className={`${mode === "flexible" && slotLogs.length === 0 && slotSuggest.length > 0 ? "" : "flex-1"} inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#890404]/40 text-[#F5EDED]/75 text-[11px] font-bold uppercase tracking-widest`}>
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
              <button key={s.key} type="button" onClick={() => setExtraSlots((p) => [...p, s.key])} className="px-3 py-1.5 rounded-full border border-dashed border-[#890404]/40 text-[11px] font-bold text-[#F5EDED]/50">
                + {s.label}
              </button>
            ))}
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
          hint={mode === "fixed_flexible" && date === today ? "Les repas suivants s'ajustent tout seuls pour tenir tes macros." : undefined}
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
          hint="Le reste de ta journée se recalcule tout seul."
          onSave={(next) => setOverride(sheetSuggest.planMealId, { foodId: next.food.id, grams: next.grams })}
          onRemove={() => setOverride(sheetSuggest.planMealId, { removed: true })}
          onClose={() => setSheet(null)}
        />
      )}

      {mode === "flexible" && Object.keys(dayOverrides).length > 0 && (
        <button type="button" onClick={() => { setOverrides((p) => ({ ...p, [date]: {} })); writeLS(`ep-flex:${planKey}:${date}`, {}); }} className="w-full text-[11px] font-bold text-[#F5EDED]/45 underline">
          {tr("Revenir aux repas du plan pour")}{" "}{date === today ? tr("aujourd'hui") : tr("ce jour")}
        </button>
      )}
    </div>
  );
}
