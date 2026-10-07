// Inventaire de courses : le stock réel du placard et du frigo. Le stock
// baisse tout seul quand un repas est noté (déclencheur sur food_logs, voir
// supabase/migrations/20261007_pantry.sql). Ce module ne fait que des calculs
// purs, partagés par l'écran et les actions serveur.
import { normalizeForSearch } from "@/lib/fuzzy-search";

export type PantryUnit = "g" | "piece" | "ml";

export interface PantryItem {
  id: string;
  food_id: string | null;
  name: string;
  category: string;
  unit: PantryUnit;
  quantity: number;
  grams_per_unit: number | null;
  low_threshold: number | null;
  updated_at: string;
}

// Poids moyen d'une pièce pour les aliments qu'on achète à l'unité. Le premier
// mot-clé trouvé dans le nom gagne, l'utilisateur peut toujours corriger.
const PIECE_WEIGHTS: [string, number][] = [
  ["banane", 120], ["pomme de terre", 150], ["patate douce", 200], ["pomme", 150], ["poire", 170],
  ["orange", 150], ["clementine", 70], ["mandarine", 70], ["kiwi", 75], ["peche", 150], ["nectarine", 150],
  ["abricot", 40], ["mangue", 300], ["avocat", 150], ["citron", 100], ["pamplemousse", 300],
  ["oeuf de caille", 10], ["oeuf", 60], ["yaourt", 125], ["skyr", 150], ["compote", 100],
  ["tomate", 100], ["concombre", 300], ["courgette", 250], ["aubergine", 300], ["poivron", 150],
  ["carotte", 80], ["oignon", 100], ["echalote", 30], ["gousse d ail", 5], ["brocoli", 350], ["chou fleur", 600],
  ["salade", 300], ["laitue", 300], ["baguette", 250], ["tranche de pain", 35], ["wrap", 60], ["tortilla", 60],
  ["barre", 50], ["steak hache", 125], ["filet de poulet", 150], ["blanc de poulet", 150], ["pave de saumon", 125],
  ["boite de thon", 140], ["canette", 330], ["bouteille", 1000],
];

export function guessPieceWeight(name: string): number | null {
  const n = normalizeForSearch(name);
  for (const [key, g] of PIECE_WEIGHTS) if (n.includes(key)) return g;
  return null;
}

/** Unité naturelle proposée à l'ajout : à la pièce si on connaît le poids d'une pièce. */
export function suggestUnit(name: string, category?: string | null): PantryUnit {
  if (guessPieceWeight(name)) return "piece";
  const c = normalizeForSearch(category ?? "");
  if (c.includes("boisson") || normalizeForSearch(name).match(/\b(lait|jus|huile|sirop|eau)\b/)) return "ml";
  return "g";
}

/** Quantité de l'article exprimée en grammes (ou ml), pour comparer aux besoins du plan. */
export function toGrams(item: Pick<PantryItem, "unit" | "quantity" | "grams_per_unit">): number {
  return item.unit === "piece" ? item.quantity * (item.grams_per_unit ?? 100) : item.quantity;
}

export function fromGrams(grams: number, unit: PantryUnit, gramsPerUnit: number | null): number {
  return unit === "piece" ? grams / (gramsPerUnit ?? 100) : grams;
}

function trimNumber(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

export function formatQuantity(quantity: number, unit: PantryUnit): string {
  if (unit === "piece") {
    const n = Math.round(quantity * 2) / 2;
    return `${trimNumber(n)} ${n > 1 ? "pièces" : "pièce"}`;
  }
  if (unit === "ml") return quantity >= 1000 ? `${trimNumber(quantity / 1000)} L` : `${Math.round(quantity)} ml`;
  return quantity >= 1000 ? `${trimNumber(quantity / 1000)} kg` : `${Math.round(quantity)} g`;
}

/** Pas d'un appui sur + ou - : une pièce, ou 50 g / 100 ml. */
export function stepFor(unit: PantryUnit): number {
  return unit === "piece" ? 1 : unit === "ml" ? 100 : 50;
}

export type PantryStatus = "vide" | "bas" | "ok";

/**
 * État d'un article : vide, bientôt vide (sous le seuil choisi, ou moins de
 * deux jours de consommation au rythme du plan ou des habitudes), ou OK.
 */
export function statusOf(item: PantryItem, dailyGrams: number | undefined): { status: PantryStatus; daysLeft: number | null } {
  const grams = toGrams(item);
  const daysLeft = dailyGrams && dailyGrams > 0 ? grams / dailyGrams : null;
  if (item.quantity <= 0.0001) return { status: "vide", daysLeft: 0 };
  if (item.low_threshold != null && item.quantity <= item.low_threshold) return { status: "bas", daysLeft };
  if (daysLeft != null && daysLeft < 2) return { status: "bas", daysLeft };
  return { status: "ok", daysLeft };
}

export interface NeedItem {
  foodId: string;
  name: string;
  category: string;
  totalGrams: number;
}

export interface BuySuggestion {
  key: string;
  foodId: string | null;
  name: string;
  category: string;
  unit: PantryUnit;
  gramsPerUnit: number | null;
  /** Quantité à acheter, dans l'unité de l'article. */
  quantity: number;
  reason: "plan" | "stock";
}

/**
 * Ce qu'il faut racheter : pour chaque besoin de la semaine (plan ou
 * habitudes), ce qui manque par rapport au stock ; plus les articles du stock
 * vides ou sous leur seuil qui ne sont pas déjà dans les besoins.
 */
export function buildBuyList(items: PantryItem[], needs: NeedItem[]): BuySuggestion[] {
  const byFood = new Map(items.filter((i) => i.food_id).map((i) => [i.food_id as string, i]));
  const out: BuySuggestion[] = [];
  const covered = new Set<string>();
  for (const need of needs) {
    const item = byFood.get(need.foodId);
    const unit = item?.unit ?? suggestUnit(need.name, need.category);
    const gpu = item?.grams_per_unit ?? (unit === "piece" ? guessPieceWeight(need.name) : null);
    const missingGrams = need.totalGrams - (item ? toGrams(item) : 0);
    if (item) covered.add(item.id);
    if (missingGrams <= 0) continue;
    let qty = fromGrams(missingGrams, unit, gpu);
    qty = unit === "piece" ? Math.ceil(qty) : Math.ceil(qty / 50) * 50;
    if (qty <= 0) continue;
    out.push({ key: `need-${need.foodId}`, foodId: need.foodId, name: need.name, category: need.category, unit, gramsPerUnit: gpu, quantity: qty, reason: "plan" });
  }
  for (const item of items) {
    if (covered.has(item.id)) continue;
    const low = item.quantity <= 0.0001 || (item.low_threshold != null && item.quantity <= item.low_threshold);
    if (!low) continue;
    const target = Math.max((item.low_threshold ?? 0) * 2, item.unit === "piece" ? 3 : item.unit === "ml" ? 1000 : 500);
    const qty = Math.max(stepFor(item.unit), Math.ceil((target - item.quantity) / stepFor(item.unit)) * stepFor(item.unit));
    out.push({ key: `stock-${item.id}`, foodId: item.food_id, name: item.name, category: item.category, unit: item.unit, gramsPerUnit: item.grams_per_unit, quantity: qty, reason: "stock" });
  }
  return out;
}
