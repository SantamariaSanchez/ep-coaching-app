// Moteur du tracker nutrition (demande directe 2026-09-27) : tout ce qui se
// calcule sans réseau, pour que le tracker n'ait jamais rien à faire à la
// main. Fonctions pures, testées par scripts/nutrition-engine.test.ts
// (npx tsx --tsconfig ./tsconfig.json scripts/nutrition-engine.test.ts).
//
// - le plan du jour (jour de la semaine, option choisie par repas) ;
// - les familles d'aliments (catégories de la base normalisées) ;
// - l'équivalence d'un aliment par un autre (même apport sur le macro qui
//   compte : protéines pour une viande, glucides pour un féculent...) ;
// - les aliments similaires à proposer en remplacement ;
// - le ré-équilibrage : quand un repas change, les quantités de ce qui
//   reste à manger se recalculent pour retomber sur les macros du jour ;
// - la recherche d'aliments classée (plan, récents, plus mangés).

import type { DietPlanMeal, DietPlanWithMeals, Food } from "@/utils/nutrition";
import { fuzzyScore } from "@/lib/fuzzy-search";

export interface Macros {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export const ZERO: Macros = { calories: 0, proteins: 0, carbs: 0, fats: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    proteins: a.proteins + b.proteins,
    carbs: a.carbs + b.carbs,
    fats: a.fats + b.fats,
  };
}

export function subMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories - b.calories,
    proteins: a.proteins - b.proteins,
    carbs: a.carbs - b.carbs,
    fats: a.fats - b.fats,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, ZERO);
}

type Per100 = Pick<Food, "calories_per_100" | "proteins_per_100" | "carbs_per_100" | "fats_per_100">;

export function macrosFor(food: Per100, grams: number): Macros {
  const r = grams / 100;
  return {
    calories: food.calories_per_100 * r,
    proteins: food.proteins_per_100 * r,
    carbs: food.carbs_per_100 * r,
    fats: food.fats_per_100 * r,
  };
}

// ── Créneaux ─────────────────────────────────────────────────────────────

export const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
] as const;

export type SlotKey = (typeof MEAL_SLOTS)[number]["key"];

/** Heure après laquelle un repas est considéré comme passé (HH:MM). */
export const SLOT_END: Record<string, string> = { breakfast: "10:00", morning: "11:30", lunch: "14:30", afternoon: "17:30", preworkout: "18:30", postworkout: "20:30", dinner: "23:59" };

/** Le repas est-il encore à venir à cette heure ? */
export function isSlotUpcoming(slot: string, hhmm: string): boolean {
  return hhmm < (SLOT_END[slot] ?? "23:59");
}

export function slotLabel(key: string): string {
  return MEAL_SLOTS.find((s) => s.key === key)?.label ?? key;
}

export function slotRank(key: string): number {
  const i = MEAL_SLOTS.findIndex((s) => s.key === key);
  return i === -1 ? MEAL_SLOTS.length : i;
}

// ── Plan du jour ─────────────────────────────────────────────────────────

const DOW = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

export function dowOf(date: string): (typeof DOW)[number] {
  return DOW[new Date(`${date}T12:00:00`).getDay()];
}

/** Choix d'option par créneau (variant_group), 1 par défaut. */
export type VariantChoice = Record<string, number>;

export interface PlanItem {
  planMealId: string;
  slot: string;
  food: Food;
  grams: number;
  variant: number;
}

/** Les aliments du plan pour une date, dans l'option choisie de chaque repas. */
export function planItemsFor(plan: DietPlanWithMeals | null, date: string, choice: VariantChoice = {}): PlanItem[] {
  if (!plan) return [];
  const weekly = plan.structure === "weekly";
  const dow = dowOf(date);
  const meals = plan.diet_plan_meals.filter((m) => (weekly ? m.day_of_week === dow : m.day_of_week == null || m.day_of_week === dow));
  // Plan hebdo sans rien pour ce jour-là : on retombe sur le premier jour
  // rempli plutôt que d'afficher une journée vide.
  const source = meals.length > 0 || !weekly ? meals : firstFilledDay(plan);
  const out: PlanItem[] = [];
  for (const m of source) {
    if (!m.foods) continue;
    const variant = m.variant_group ?? 1;
    const wanted = choice[m.meal_slot] ?? 1;
    const available = source.some((x) => x.meal_slot === m.meal_slot && (x.variant_group ?? 1) === wanted);
    if (variant !== (available ? wanted : 1)) continue;
    out.push({ planMealId: m.id, slot: m.meal_slot, food: m.foods, grams: Number(m.quantity_g), variant });
  }
  return out.sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
}

function firstFilledDay(plan: DietPlanWithMeals): DietPlanMeal[] {
  for (const d of ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]) {
    const list = plan.diet_plan_meals.filter((m) => m.day_of_week === d);
    if (list.length > 0) return list;
  }
  return [];
}

/** Options disponibles pour un créneau à cette date (1, 2, 3...). */
export function variantsFor(plan: DietPlanWithMeals | null, date: string, slot: string): number[] {
  if (!plan) return [];
  const weekly = plan.structure === "weekly";
  const dow = dowOf(date);
  let meals = plan.diet_plan_meals.filter((m) => (weekly ? m.day_of_week === dow : m.day_of_week == null || m.day_of_week === dow));
  if (meals.length === 0 && weekly) meals = firstFilledDay(plan);
  return [...new Set(meals.filter((m) => m.meal_slot === slot).map((m) => m.variant_group ?? 1))].sort((a, b) => a - b);
}

export function planTotals(items: PlanItem[]): Macros {
  return sumMacros(items.map((i) => macrosFor(i.food, i.grams)));
}

// ── Familles d'aliments ──────────────────────────────────────────────────

export type Family =
  | "proteine"
  | "poudre"
  | "laitier"
  | "feculent"
  | "legumineuse"
  | "legume"
  | "fruit"
  | "gras"
  | "sucre"
  | "sauce"
  | "boisson"
  | "plat"
  | "autre";

export const FAMILY_LABELS: Record<Family, string> = {
  proteine: "Viandes, poissons, œufs",
  poudre: "Protéines en poudre",
  laitier: "Laitiers",
  feculent: "Féculents",
  legumineuse: "Légumineuses",
  legume: "Légumes",
  fruit: "Fruits",
  gras: "Matières grasses",
  sucre: "Sucré",
  sauce: "Sauces, épices",
  boisson: "Boissons",
  plat: "Plats, fast food",
  autre: "Autres",
};

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .trim();
}

export function foodFamily(food: Pick<Food, "category" | "name">): Family {
  const c = normalize(food.category ?? "");
  const n = normalize(food.name);
  if (/poudre|complement|whey|proteines vege/.test(c) || /whey|isolate|proteine .*poudre|caseine/.test(n)) return "poudre";
  if (/viande|poisson|oeuf|charcuterie/.test(c)) return "proteine";
  if (/laitier/.test(c)) return "laitier";
  if (/legumineuse/.test(c)) return "legumineuse";
  if (/feculent|cereale/.test(c)) return "feculent";
  if (/legume/.test(c)) return "legume";
  if (/fruit/.test(c)) return "fruit";
  if (/matiere|oleagineux/.test(c)) return "gras";
  if (/sucre|sucrant|snack/.test(c)) return "sucre";
  if (/sauce|epice/.test(c)) return "sauce";
  if (/boisson/.test(c)) return "boisson";
  if (/fast/.test(c)) return "plat";
  return "autre";
}

/** Le macro qui définit l'aliment dans un repas, et donc son équivalence. */
export type Anchor = "proteins" | "carbs" | "fats" | "calories";

export function anchorOf(food: Food): Anchor {
  const fam = foodFamily(food);
  if (fam === "proteine") return "proteins";
  if (fam === "feculent" || fam === "legumineuse" || fam === "fruit" || fam === "sucre") return "carbs";
  if (fam === "gras") return "fats";
  if (fam === "poudre") {
    // Whey, caséine : protéines. Maltodextrine, crème de riz en poudre : glucides.
    return food.proteins_per_100 >= food.carbs_per_100 ? "proteins" : "carbs";
  }
  if (fam === "laitier") {
    // Skyr, fromage blanc : protéines. Crème, fromage gras : lipides.
    return food.proteins_per_100 * 4 >= food.fats_per_100 * 9 ? "proteins" : "fats";
  }
  if (fam === "legume" || fam === "sauce" || fam === "boisson") return "calories";
  // Famille inconnue : le macro qui apporte le plus de calories.
  const p = food.proteins_per_100 * 4;
  const c = food.carbs_per_100 * 4;
  const f = food.fats_per_100 * 9;
  if (p >= c && p >= f) return "proteins";
  if (c >= f) return "carbs";
  return "fats";
}

/** Arrondi lisible : au gramme sous 20 g (huile, miel), à 5 g au-dessus. */
export function roundGrams(g: number): number {
  if (!Number.isFinite(g) || g <= 0) return 0;
  if (g < 20) return Math.max(1, Math.round(g));
  return Math.round(g / 5) * 5;
}

/** Quantité de `to` qui apporte autant que `fromG` de `from` sur le macro clé. */
export function equivalentGrams(from: Food, fromG: number, to: Food): number {
  let anchor = anchorOf(from);
  if (anchor !== "calories" && anchorOf(to) !== anchor) {
    // Familles différentes (ex : banane remplacée par du skyr) : à calories égales.
    anchor = "calories";
  }
  const key = `${anchor}_per_100` as keyof Per100;
  const src = from[key] * fromG;
  const per = to[key];
  if (!per || per < 0.5 || !src) {
    const kcal = to.calories_per_100 || 1;
    return roundGrams(Math.min(2000, (from.calories_per_100 * fromG) / kcal));
  }
  return roundGrams(Math.min(2000, src / per));
}

// Profil d'un aliment : part de chaque macro dans ses calories.
function profile(f: Per100): [number, number, number] {
  const p = f.proteins_per_100 * 4;
  const c = f.carbs_per_100 * 4;
  const l = f.fats_per_100 * 9;
  const t = p + c + l || 1;
  return [p / t, c / t, l / t];
}

export interface Suggestion {
  food: Food;
  grams: number;
  macros: Macros;
}

/**
 * Aliments proches pour remplacer `food` (même famille, profil de macros le
 * plus proche), avec la quantité équivalente déjà calculée. `boost` fait
 * remonter les aliments déjà connus de la personne (plan, récents).
 */
export function similarFoods(food: Food, grams: number, foods: Food[], limit = 8, boost: Set<string> = new Set()): Suggestion[] {
  const fam = foodFamily(food);
  const [p0, c0, f0] = profile(food);
  const scored: { food: Food; score: number }[] = [];
  for (const f of foods) {
    if (f.id === food.id || f.calories_per_100 <= 0) continue;
    const sameFam = foodFamily(f) === fam;
    if (!sameFam && fam !== "autre") continue;
    const [p, c, l] = profile(f);
    const dist = Math.abs(p - p0) + Math.abs(c - c0) + Math.abs(l - f0);
    // Densité trop différente (flocons secs contre riz cuit) : moins pertinent.
    const density = Math.abs(Math.log((f.calories_per_100 + 1) / (food.calories_per_100 + 1)));
    // Même nom de base ("Bœuf haché 5%" pour "Boeuf hache 5%") : en tête.
    const sameBase = firstWord(f.name) === firstWord(food.name) ? 0.3 : 0;
    const score = dist + density * 0.15 - sameBase - (boost.has(f.id) ? 0.25 : 0) + (f.is_custom ? 0.05 : 0);
    scored.push({ food: f, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(({ food: f }) => {
    const g = equivalentGrams(food, grams, f);
    return { food: f, grams: g, macros: macrosFor(f, g) };
  });
}

function firstWord(name: string): string {
  return normalize(name).split(/[\s(,]/)[0] ?? "";
}

// ── Ré-équilibrage ───────────────────────────────────────────────────────

export interface Adjustable {
  key: string;
  food: Food;
  grams: number;
}

/**
 * Recalcule les quantités de ce qui reste à manger pour que la journée
 * retombe sur `target`, sachant `locked` (ce qui est déjà mangé ou choisi à
 * la main). Les aliments sont regroupés par macro clé (protéines, glucides,
 * lipides) et chaque groupe reçoit un même coefficient : on garde les
 * proportions du plan, on ne fait que re-grammer. Les légumes, sauces et
 * boissons ne bougent jamais.
 */
export function rebalance(adjustable: Adjustable[], locked: Macros, target: Macros, bounds: { min: number; max: number } = { min: 0, max: 3 }): Map<string, number> {
  const out = new Map<string, number>();
  const groups: Record<"proteins" | "carbs" | "fats", Adjustable[]> = { proteins: [], carbs: [], fats: [] };
  let fixedExtra = ZERO;
  for (const a of adjustable) {
    const anchor = anchorOf(a.food);
    if (anchor === "calories") {
      out.set(a.key, a.grams);
      fixedExtra = addMacros(fixedExtra, macrosFor(a.food, a.grams));
    } else {
      groups[anchor].push(a);
    }
  }
  const remaining = subMacros(target, addMacros(locked, fixedExtra));
  const keys = (["proteins", "carbs", "fats"] as const).filter((g) => groups[g].length > 0);
  if (keys.length === 0) return out;

  // Colonnes : apport de chaque groupe à ses quantités actuelles.
  const cols = keys.map((g) => sumMacros(groups[g].map((a) => macrosFor(a.food, a.grams))));
  // Lignes pondérées : chaque macro compte autant, les calories aussi.
  const rows: { w: number; get: (m: Macros) => number }[] = [
    { w: 1 / Math.max(target.proteins, 20), get: (m) => m.proteins },
    { w: 1 / Math.max(target.carbs, 20), get: (m) => m.carbs },
    { w: 1 / Math.max(target.fats, 10), get: (m) => m.fats },
    { w: 1 / Math.max(target.calories, 200), get: (m) => m.calories },
  ];
  const A = rows.map((r) => cols.map((c) => r.w * r.get(c)));
  const b = rows.map((r) => r.w * r.get(remaining));

  // Moindres carrés avec un léger rappel vers 1 (ne rien changer) : stable
  // même quand un groupe pèse peu, et aucun écart inutile.
  const n = keys.length;
  const lambda = 0.02;
  const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => A.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? lambda : 0)));
  const v = Array.from({ length: n }, (_, i) => A.reduce((s, row, k) => s + row[i] * b[k], 0) + lambda);
  const scale = solve(M, v).map((s) => Math.min(bounds.max, Math.max(bounds.min, Number.isFinite(s) ? s : 1)));

  keys.forEach((g, i) => {
    // Écart négligeable (moins de 4 %) : on ne touche à rien, pas de
    // 12,5 g qui devient 12 g pour rien.
    const k = Math.abs(scale[i] - 1) < 0.04 ? 1 : scale[i];
    for (const a of groups[g]) out.set(a.key, k === 1 ? a.grams : roundGrams(a.grams * k));
  });
  return out;
}

// ── Adapter la suite de la journée (2026-10-08) ──────────────────────────
// Retour direct du fondateur : « si je modifie une cerise le soir, c'est pas
// possible que ça modifie tout le plan et les aliments déjà mangés ». Règles :
// 1. le plan de base n'est jamais modifié, seul le journal du jour s'adapte ;
// 2. un petit écart (une banane, 20 g de crème de riz) ne change rien ;
// 3. seuls les repas à venir s'adaptent, jamais ceux déjà passés ;
// 4. l'écart est absorbé d'abord par le repas suivant (« le repas d'après
//    est plus garni »), en gardant ses proportions, puis par le suivant si
//    besoin, chaque repas restant entre 50 % et 160 % de sa quantité.

/** Écart du jour assez grand pour justifier d'adapter la suite ? */
export function isSignificantGap(gap: Macros, target: Macros): boolean {
  return (
    Math.abs(gap.calories) >= Math.max(150, target.calories * 0.06) ||
    Math.abs(gap.proteins) >= 20 ||
    Math.abs(gap.carbs) >= 30 ||
    Math.abs(gap.fats) >= 12
  );
}

/**
 * Nouvelles quantités des repas à venir (`upcoming`, rangés par repas dans
 * l'ordre de la journée) pour absorber l'écart entre `target` et ce qui est
 * déjà mangé ou choisi (`locked`). Rien ne change si l'écart est petit.
 */
export function adaptUpcoming(upcoming: { slot: string; items: Adjustable[] }[], locked: Macros, target: Macros): Map<string, number> {
  const out = new Map<string, number>();
  const planned = sumMacros(upcoming.flatMap((m) => m.items.map((a) => macrosFor(a.food, a.grams))));
  let gap = subMacros(target, addMacros(locked, planned));
  if (!isSignificantGap(gap, target)) return out;
  for (const meal of upcoming) {
    if (!meal.items.length) continue;
    const mealMacros = sumMacros(meal.items.map((a) => macrosFor(a.food, a.grams)));
    const res = rebalance(meal.items, ZERO, addMacros(mealMacros, gap), { min: 0.5, max: 1.6 });
    let after = ZERO;
    for (const a of meal.items) {
      const g = res.get(a.key) ?? a.grams;
      if (g !== a.grams) out.set(a.key, g);
      after = addMacros(after, macrosFor(a.food, g));
    }
    gap = subMacros(gap, subMacros(after, mealMacros));
    if (!isSignificantGap(gap, target)) break;
  }
  return out;
}

// Élimination de Gauss (système 1x1 à 3x3).
function solve(M: number[][], v: number[]): number[] {
  const n = v.length;
  const a = M.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    if (Math.abs(a[col][col]) < 1e-12) return new Array(n).fill(1);
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

// ── Recherche d'aliments ─────────────────────────────────────────────────

export interface SearchContext {
  /** Aliments du plan (tous jours confondus). */
  planIds: Set<string>;
  /** Aliments du plan pour le créneau en cours. */
  slotPlanIds?: Set<string>;
  /** Derniers aliments logués, du plus récent au plus ancien. */
  recentIds: string[];
  /** Nombre de fois où chaque aliment a été logué. */
  counts: Map<string, number>;
}

export type SearchFilter = "tout" | "plan" | "recents" | Family;

export function searchFoods(foods: Food[], query: string, ctx: SearchContext, filter: SearchFilter = "tout", limit = 40): Food[] {
  const q = normalize(query);
  const words = q.split(/\s+/).filter(Boolean);
  const recentRank = new Map(ctx.recentIds.map((id, i) => [id, i]));

  const scored: { food: Food; score: number }[] = [];
  for (const f of foods) {
    if (filter === "plan" && !ctx.planIds.has(f.id)) continue;
    if (filter === "recents" && !recentRank.has(f.id)) continue;
    if (filter !== "tout" && filter !== "plan" && filter !== "recents" && foodFamily(f) !== filter) continue;

    let score = 0;
    if (words.length > 0) {
      const name = normalize(f.name);
      const cat = normalize(f.category ?? "");
      let ok = true;
      for (const w of words) {
        if (name.startsWith(w)) score += 60;
        else if (new RegExp(`(^|[\\s(,'-])${escapeRe(w)}`).test(name)) score += 40;
        else if (name.includes(w)) score += 20;
        else if (cat.includes(w)) score += 8;
        // Faute de frappe ou pluriel (« bannane », « bananes ») : correspondance
        // approximative, classée après toutes les correspondances exactes.
        else if (fuzzyScore(name, w) >= 0) score += 6;
        else {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (name === q) score += 80;
      // Les noms courts et génériques ("Banane") avant les variantes longues.
      score -= Math.min(15, name.length / 4);
    }
    if (ctx.slotPlanIds?.has(f.id)) score += 45;
    if (ctx.planIds.has(f.id)) score += 30;
    const r = recentRank.get(f.id);
    if (r != null) score += Math.max(10, 28 - r);
    score += Math.min(25, (ctx.counts.get(f.id) ?? 0) * 3);
    scored.push({ food: f, score });
  }
  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "fr"));
  return scored.slice(0, limit).map((s) => s.food);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
