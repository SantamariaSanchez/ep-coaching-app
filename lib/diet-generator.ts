import type { Food } from "@/utils/nutrition";
import type { ClientIntake } from "@/utils/client-intake";
import { buildFoodWatchContext, checkFoodWatch, type FoodWatchContext } from "@/lib/food-watch-keywords";

// Génère un premier jet de journée alimentaire directement dans le
// constructeur (DietPlanManager) — pas une liste à part à retranscrire à la
// main. Approximatif par construction (chaque aliment est dimensionné sur
// UN macro cible, sans renégocier les autres) : le but est un point de
// départ réaliste et déjà conforme aux contraintes du client (régime,
// allergènes détectés, aliments détestés), pas un calcul parfait — les
// totaux réels du jour restent visibles et modifiables juste après dans
// l'éditeur, comme pour tout ajout manuel.

export interface MacroTargets {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export interface GeneratedMealItem {
  foodId: string;
  foodName: string;
  quantityG: number;
}

export interface GeneratedMeal {
  slotKey: string;
  items: GeneratedMealItem[];
}

// Nombre de repas -> créneaux utilisés, alignés sur MEAL_SLOTS de
// DietPlanManager. Dérivé de intake.meals_ideal quand disponible.
const MEAL_COUNT_SLOTS: Record<number, string[]> = {
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "lunch", "afternoon", "dinner"],
  5: ["breakfast", "morning", "lunch", "afternoon", "dinner"],
  6: ["breakfast", "morning", "lunch", "afternoon", "postworkout", "dinner"],
};

export function clampMealCount(n: number): number {
  return Math.max(3, Math.min(6, Math.round(n) || 4));
}

export function slotsForMealCount(n: number): string[] {
  return MEAL_COUNT_SLOTS[clampMealCount(n)];
}

const PROTEIN_KEYS = ["viande", "poisson", "oeuf", "laitier", "legumineuse", "protéine", "proteine"];
const CARB_KEYS = ["feculent", "féculent", "cereale", "céréale", "fruit"];
const FAT_KEYS = ["matiere grasse", "matière grasse", "oleagineux", "oléagineux"];
const VEG_KEYS = ["legume", "légume"];
// Catégories explicitement écartées des choix automatiques, même si elles
// matcheraient un des groupes ci-dessus par accident (ex. "Sucreries").
const AUTO_EXCLUDE_KEYS = ["sucrerie", "fast food", "sauce", "complement", "complément", "boisson", "epice", "épice"];

function categoryMatches(food: Food, keys: string[]): boolean {
  const cat = (food.category ?? "").toLowerCase();
  return keys.some((k) => cat.includes(k)) && !AUTO_EXCLUDE_KEYS.some((k) => cat.includes(k));
}

function isAllowedForDiet(food: Food, dietType: ClientIntake["diet_type"] | undefined): boolean {
  const cat = (food.category ?? "").toLowerCase();
  if (dietType === "vegan") return !["viande", "charcuterie", "poisson", "crustac", "laitier", "oeuf", "œuf"].some((k) => cat.includes(k));
  if (dietType === "vegetarien") return !["viande", "charcuterie", "poisson", "crustac"].some((k) => cat.includes(k));
  if (dietType === "pescetarien") return !["viande", "charcuterie"].some((k) => cat.includes(k));
  return true;
}

function gramsFor(food: Food, targetG: number, per100: number): number {
  if (!per100 || per100 <= 0 || targetG <= 0) return 100;
  const grams = (targetG / per100) * 100;
  return Math.max(20, Math.min(400, Math.round(grams / 5) * 5));
}

function pickCandidate(
  foods: Food[],
  keys: string[],
  dietType: ClientIntake["diet_type"] | undefined,
  watchCtx: FoodWatchContext,
  likedKeywords: string[],
  used: Set<string>
): Food | null {
  const pool = foods.filter(
    (f) =>
      categoryMatches(f, keys) &&
      isAllowedForDiet(f, dietType) &&
      checkFoodWatch(f, watchCtx).length === 0 &&
      !used.has(f.id)
  );
  if (pool.length === 0) return null;
  const liked = pool.filter((f) => likedKeywords.some((k) => f.name.toLowerCase().includes(k)));
  const shortlist = (liked.length > 0 ? liked : pool).slice(0, 6);
  return shortlist[Math.floor(Math.random() * shortlist.length)];
}

function generateMealItems(
  mealTargets: MacroTargets,
  foods: Food[],
  dietType: ClientIntake["diet_type"] | undefined,
  watchCtx: FoodWatchContext,
  likedKeywords: string[],
  usedIds: Set<string>
): GeneratedMealItem[] {
  const items: GeneratedMealItem[] = [];

  const protein = pickCandidate(foods, PROTEIN_KEYS, dietType, watchCtx, likedKeywords, usedIds);
  if (protein) {
    usedIds.add(protein.id);
    items.push({ foodId: protein.id, foodName: protein.name, quantityG: gramsFor(protein, mealTargets.proteins, protein.proteins_per_100) });
  }

  const carb = pickCandidate(foods, CARB_KEYS, dietType, watchCtx, likedKeywords, usedIds);
  if (carb) {
    usedIds.add(carb.id);
    items.push({ foodId: carb.id, foodName: carb.name, quantityG: gramsFor(carb, mealTargets.carbs, carb.carbs_per_100) });
  }

  // Source de lipides seulement si l'objectif du repas en laisse la place
  // (le protéique/glucidique choisi apporte déjà une partie des lipides).
  if (mealTargets.fats >= 8) {
    const fat = pickCandidate(foods, FAT_KEYS, dietType, watchCtx, likedKeywords, usedIds);
    if (fat) {
      usedIds.add(fat.id);
      items.push({ foodId: fat.id, foodName: fat.name, quantityG: gramsFor(fat, mealTargets.fats * 0.6, fat.fats_per_100) });
    }
  }

  const veg = pickCandidate(foods, VEG_KEYS, dietType, watchCtx, likedKeywords, usedIds);
  if (veg) {
    usedIds.add(veg.id);
    items.push({ foodId: veg.id, foodName: veg.name, quantityG: 120 });
  }

  return items;
}

export function generateDietDraft(
  targets: MacroTargets,
  foods: Food[],
  intake: ClientIntake | null | undefined,
  mealCount: number
): GeneratedMeal[] {
  const slots = slotsForMealCount(mealCount);
  const watchCtx = buildFoodWatchContext(intake);
  const likedKeywords = intake?.liked_foods
    ? intake.liked_foods.toLowerCase().split(/[,;\n.]+/).map((s) => s.trim()).filter((s) => s.length > 2)
    : [];
  const usedIds = new Set<string>();

  const perMeal: MacroTargets = {
    calories: targets.calories / slots.length,
    proteins: targets.proteins / slots.length,
    carbs: targets.carbs / slots.length,
    fats: targets.fats / slots.length,
  };

  return slots.map((slotKey) => ({
    slotKey,
    items: generateMealItems(perMeal, foods, intake?.diet_type, watchCtx, likedKeywords, usedIds),
  }));
}
