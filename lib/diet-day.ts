// Ma diète du jour (2026-10-14) : calculs purs pour l'écran d'ouverture de
// la diète. Retour direct du fondateur : « quand je vais sur ma diète je veux
// savoir quoi : qu'est-ce que je mange, combien, comment, mes courses, quand
// je mange, s'il faut racheter des choses, si j'ai bien suivi ma diète ».
//
// - équivalents simples d'une quantité (« ≈ 2 œufs », « ≈ 1 c. à soupe ») ;
// - repas actuel ou prochain selon l'heure ;
// - taux de suivi d'une journée (cases « mangé ») ;
// - liste de courses agrégée sur N jours, groupée par rayon.

import { MEAL_SLOT_TIMES, timeToMinutes } from "@/lib/meal-slots";
import { SLOT_END, foodFamily, normalize, planItemsFor, slotRank, type VariantChoice } from "@/lib/nutrition-engine";
import type { DietPlanWithMeals, Food } from "@/utils/nutrition";

// ── Équivalents simples ──────────────────────────────────────────────────

// [mot-clé normalisé, grammes d'une pièce, singulier, pluriel]. Le premier
// mot-clé trouvé dans le nom gagne : les plus précis d'abord.
const PIECES: [string, number, string, string][] = [
  ["oeuf de caille", 10, "œuf de caille", "œufs de caille"],
  ["blanc d oeuf", 33, "blanc d'œuf", "blancs d'œuf"],
  ["blanc doeuf", 33, "blanc d'œuf", "blancs d'œuf"],
  ["jaune d oeuf", 18, "jaune d'œuf", "jaunes d'œuf"],
  ["oeuf", 60, "œuf", "œufs"],
  ["banane", 120, "banane", "bananes"],
  ["pomme de terre", 150, "pomme de terre", "pommes de terre"],
  ["patate douce", 200, "patate douce", "patates douces"],
  ["pomme", 150, "pomme", "pommes"],
  ["poire", 170, "poire", "poires"],
  ["orange", 150, "orange", "oranges"],
  ["clementine", 70, "clémentine", "clémentines"],
  ["mandarine", 70, "mandarine", "mandarines"],
  ["kiwi", 75, "kiwi", "kiwis"],
  ["peche", 150, "pêche", "pêches"],
  ["nectarine", 150, "nectarine", "nectarines"],
  ["abricot", 40, "abricot", "abricots"],
  ["avocat", 150, "avocat", "avocats"],
  ["tomate cerise", 15, "tomate cerise", "tomates cerises"],
  ["tomate", 100, "tomate", "tomates"],
  ["carotte", 80, "carotte", "carottes"],
  ["courgette", 250, "courgette", "courgettes"],
  ["yaourt", 125, "pot", "pots"],
  ["skyr", 150, "pot", "pots"],
  ["compote", 100, "gourde", "gourdes"],
  ["tranche de pain", 35, "tranche", "tranches"],
  ["pain de mie", 25, "tranche", "tranches"],
  ["galette de riz", 8, "galette", "galettes"],
  ["wrap", 60, "wrap", "wraps"],
  ["tortilla", 60, "tortilla", "tortillas"],
  ["steak hache", 125, "steak", "steaks"],
  ["blanc de poulet", 150, "blanc", "blancs"],
  ["filet de poulet", 150, "filet", "filets"],
  ["escalope", 120, "escalope", "escalopes"],
  ["pave de saumon", 125, "pavé", "pavés"],
  ["tranche de jambon", 40, "tranche", "tranches"],
  ["jambon", 40, "tranche", "tranches"],
  ["carre frais", 25, "carré", "carrés"],
  ["babybel", 20, "mini fromage", "mini fromages"],
];

// Cuillères : [mot-clé, grammes par cuillère à soupe].
const SPOONS: [string, number][] = [
  ["huile", 10],
  ["beurre de cacahuete", 15],
  ["beurre d amande", 15],
  ["puree d amande", 15],
  ["puree de cacahuete", 15],
  ["beurre", 10],
  ["miel", 20],
  ["sirop", 20],
  ["confiture", 20],
  ["creme fraiche", 15],
  ["sucre", 12],
  ["graines de chia", 12],
  ["graines", 10],
  ["cacao", 8],
  ["sauce", 15],
  ["ketchup", 15],
  ["moutarde", 10],
  ["mayonnaise", 15],
  ["pesto", 15],
];

function hasWord(text: string, key: string): boolean {
  return (` ${text}`).includes(` ${key}`);
}

function fmtHalf(n: number): string {
  const r = Math.round(n * 2) / 2;
  const whole = Math.floor(r);
  const half = r - whole >= 0.5;
  if (whole === 0 && half) return "½";
  return half ? `${whole} ½` : String(whole);
}

/**
 * Équivalent simple d'une quantité, quand il est fiable (sinon null) :
 * pièces (œufs, fruits, pots), cuillères (huile, beurre de cacahuète, miel),
 * paumes pour la viande et le poisson, cuillères à soupe bombées pour les
 * féculents cuits.
 */
export function simpleEquivalent(food: Pick<Food, "name" | "category">, grams: number): string | null {
  if (!Number.isFinite(grams) || grams <= 0) return null;
  const n = normalize(food.name).replace(/['’-]/g, " ").replace(/\s+/g, " ");
  for (const [key, g, one, many] of PIECES) {
    if (!hasWord(n, key)) continue;
    const count = grams / g;
    if (count < 0.4 || count > 20) return null;
    const r = Math.round(count * 2) / 2;
    return `≈ ${fmtHalf(count)} ${r > 1 ? many : one}`;
  }
  const fam = foodFamily(food);
  if (grams <= 80 && (fam === "gras" || fam === "sauce" || fam === "sucre" || fam === "autre")) {
    for (const [key, g] of SPOONS) {
      if (!hasWord(n, key)) continue;
      const tbsp = grams / g;
      if (tbsp < 0.45) {
        const tsp = Math.max(1, Math.round(tbsp * 3));
        return `≈ ${tsp} c. à café`;
      }
      return `≈ ${fmtHalf(tbsp)} c. à soupe`;
    }
  }
  if (fam === "feculent" && /flocon|avoine|muesli|granola/.test(n) && grams <= 150) {
    return `≈ ${Math.max(1, Math.round(grams / 10))} c. à soupe`;
  }
  if (fam === "feculent" && /\bcuit/.test(n) && grams >= 40 && grams <= 600) {
    return `≈ ${Math.max(1, Math.round(grams / 30))} c. à soupe bombées`;
  }
  if (fam === "proteine" && grams >= 50 && grams <= 400 && !hasWord(n, "oeuf")) {
    const palms = grams / 110;
    return `≈ ${fmtHalf(palms)} paume${palms > 1.25 ? "s" : ""} de main`;
  }
  if ((fam === "boisson" || /\blait\b/.test(n)) && grams >= 100 && grams <= 1000) {
    return `≈ ${fmtHalf(grams / 200)} verre${grams / 200 > 1.25 ? "s" : ""}`;
  }
  return null;
}

// Rendement à la cuisson (poids cuit / poids cru), pour acheter du cru
// quand le plan donne des grammes cuits.
const COOKED_YIELD: [RegExp, number][] = [
  [/\briz\b/, 2.6],
  [/\bpates?\b|spaghetti|penne|tagliatelle|coquillette|macaroni/, 2.3],
  [/quinoa|boulgour|semoule|ble\b|sarrasin|millet|orge/, 2.5],
  [/lentille|pois chiche|haricot|feve/, 2.5],
];

/** « ≈ 500 g cru » pour un féculent ou une légumineuse pesé cuit, sinon null. */
export function rawEquivalent(food: Pick<Food, "name">, grams: number): string | null {
  const n = normalize(food.name);
  if (!/\bcuit/.test(n) || grams <= 0) return null;
  for (const [re, y] of COOKED_YIELD) if (re.test(n)) return `≈ ${fmtGrams(Math.ceil(grams / y / 10) * 10)} cru`;
  return null;
}

/** Grammes lisibles : « 150 g », « 1,2 kg ». */
export function fmtGrams(g: number): string {
  if (g >= 1000) return `${(Math.round(g / 100) / 10).toLocaleString("fr-FR")} kg`;
  return `${Math.round(g)} g`;
}

// ── Heure des repas, repas actuel ou prochain ───────────────────────────

export function slotTime(slot: string): string {
  return MEAL_SLOT_TIMES[slot] ?? "12:00";
}

export type MealStatus = "mange" | "remplace" | "ecart" | "saute";

export const STATUS_SCORE: Record<MealStatus, number> = { mange: 1, remplace: 1, ecart: 0.5, saute: 0 };

export const STATUS_LABEL: Record<MealStatus, string> = {
  mange: "Mangé",
  remplace: "Remplacé",
  ecart: "Écart",
  saute: "Sauté",
};

export interface FocusMeal {
  slot: string;
  /** now : c'est l'heure ; next : à venir ; late : passé et pas encore coché. */
  when: "now" | "next" | "late";
}

/**
 * Repas à mettre en avant : le premier repas non coché encore à venir (en
 * cours si son heure approche à 45 min près), sinon le premier repas passé
 * resté sans réponse. null quand toute la journée est cochée.
 */
export function pickFocusMeal(slots: string[], status: Record<string, MealStatus | undefined>, hhmm: string): FocusMeal | null {
  const ordered = [...slots].sort((a, b) => slotRank(a) - slotRank(b));
  const open = ordered.filter((s) => !status[s]);
  if (open.length === 0) return null;
  const now = timeToMinutes(hhmm);
  const upcoming = open.find((s) => hhmm < (SLOT_END[s] ?? "23:59"));
  if (upcoming) {
    return { slot: upcoming, when: now >= timeToMinutes(slotTime(upcoming)) - 45 ? "now" : "next" };
  }
  return { slot: open[0], when: "late" };
}

// ── Taux de suivi ────────────────────────────────────────────────────────

export interface DayAdherence {
  /** 0 à 100, null sans aucune donnée. */
  pct: number | null;
  /** checks : cases cochées ; estime : d'après les calories notées. */
  basis: "checks" | "estime" | null;
  answered: number;
  total: number;
}

export function dayAdherence(input: {
  slots: string[];
  status: Record<string, MealStatus | undefined>;
  consumedKcal: number;
  targetKcal: number;
}): DayAdherence {
  const total = input.slots.length;
  const answered = input.slots.filter((s) => input.status[s]).length;
  if (total > 0 && answered > 0) {
    const score = input.slots.reduce((sum, s) => sum + (input.status[s] ? STATUS_SCORE[input.status[s]!] : 0), 0);
    return { pct: Math.round((score / total) * 100), basis: "checks", answered, total };
  }
  if (input.consumedKcal > 0 && input.targetKcal > 0) {
    const ratio = (input.consumedKcal / input.targetKcal) * 100;
    return { pct: Math.max(0, Math.round(100 - Math.abs(100 - ratio))), basis: "estime", answered, total };
  }
  return { pct: null, basis: null, answered, total };
}

// ── Liste de courses ─────────────────────────────────────────────────────

export const RAYONS = [
  "Fruits et légumes",
  "Boucherie et volaille",
  "Poissonnerie",
  "Crèmerie et œufs",
  "Épicerie salée",
  "Épicerie sucrée",
  "Boissons",
  "Compléments",
  "Autres",
] as const;
export type Rayon = (typeof RAYONS)[number];

export function rayonOf(food: Pick<Food, "name" | "category">): Rayon {
  const fam = foodFamily(food);
  const c = normalize(food.category ?? "");
  const n = normalize(food.name);
  if (fam === "legume" || fam === "fruit") return c.includes("seche") ? "Épicerie sucrée" : "Fruits et légumes";
  if (fam === "proteine") {
    if (c.includes("oeuf") || /\boeuf/.test(n)) return "Crèmerie et œufs";
    if (c.includes("poisson")) return "Poissonnerie";
    return "Boucherie et volaille";
  }
  if (fam === "laitier") return "Crèmerie et œufs";
  if (fam === "feculent" || fam === "legumineuse" || fam === "sauce" || fam === "gras") return "Épicerie salée";
  if (fam === "sucre") return "Épicerie sucrée";
  if (fam === "boisson") return "Boissons";
  if (fam === "poudre") return "Compléments";
  return "Autres";
}

export interface ShoppingLine {
  foodId: string;
  food: Food;
  grams: number;
  rayon: Rayon;
  /** Nombre de jours où l'aliment apparaît sur la période. */
  days: number;
}

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Besoins du plan sur `days` jours à partir de `start`, jour par jour (un
 * plan hebdo n'a pas les mêmes repas le lundi et le samedi), dans l'option
 * choisie pour chaque repas quand elle est connue (sinon l'option 1).
 */
export function aggregatePlan(
  plan: DietPlanWithMeals | null,
  start: string,
  days: number,
  choiceFor: (date: string) => VariantChoice = () => ({})
): ShoppingLine[] {
  if (!plan) return [];
  const map = new Map<string, ShoppingLine>();
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const seenToday = new Set<string>();
    for (const item of planItemsFor(plan, date, choiceFor(date))) {
      const line = map.get(item.food.id) ?? { foodId: item.food.id, food: item.food, grams: 0, rayon: rayonOf(item.food), days: 0 };
      line.grams += item.grams;
      if (!seenToday.has(item.food.id)) {
        line.days += 1;
        seenToday.add(item.food.id);
      }
      map.set(item.food.id, line);
    }
  }
  return [...map.values()].sort(
    (a, b) => RAYONS.indexOf(a.rayon) - RAYONS.indexOf(b.rayon) || a.food.name.localeCompare(b.food.name, "fr")
  );
}

/** Quantité à acheter arrondie vers le haut (10 g, ou 50 g au-delà de 500 g). */
export function roundUpForShopping(g: number): number {
  if (g <= 0) return 0;
  return g > 500 ? Math.ceil(g / 50) * 50 : Math.ceil(g / 10) * 10;
}

/** Recette de l'appli qui utilise le plus d'aliments du repas (au moins 2), pour la vue cuisine. */
export function matchRecipe<R extends { ingredients: string[] }>(recipes: R[], foods: Pick<Food, "name">[]): R | null {
  const keys = [...new Set(foods.map((f) => normalize(f.name).replace(/[(),].*$/, "").split(/\s+/)[0]).filter((k) => k.length >= 4))];
  if (keys.length < 2) return null;
  let best: R | null = null;
  let bestScore = 1;
  for (const r of recipes) {
    const text = normalize(r.ingredients.join(" "));
    let score = 0;
    for (const k of keys) if (text.includes(k)) score++;
    if (score > bestScore || (score === bestScore && best && r.ingredients.length < best.ingredients.length)) {
      if (score >= 2) {
        best = r;
        bestScore = score;
      }
    }
  }
  return best && bestScore >= Math.min(3, Math.max(2, Math.ceil(keys.length / 2))) ? best : null;
}
