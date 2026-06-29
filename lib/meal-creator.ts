import type { Allergen, Diet, MealType, Phase, Temp } from "@/lib/recipes-data";
import type { Food } from "@/utils/nutrition";

// ── Curated picks per food-group, by exact name in the `foods` table ───────
// Kept small and curated (not the full 150+ item catalogue) so the wizard
// stays a handful of big, fast choices rather than an overwhelming dropdown —
// each name must match `foods.name` exactly so real macros can be looked up.

export type FoodGroupKey = "proteine" | "glucide" | "legume" | "matiere_grasse";

export const FOOD_GROUP_LABELS: Record<FoodGroupKey, string> = {
  proteine: "Protéine",
  glucide: "Glucide / féculent",
  legume: "Légume",
  matiere_grasse: "Matière grasse",
};

interface CuratedFood {
  name: string;
  diet: Diet[]; // diets this food is compatible with
  allergens: Allergen[];
}

export const CURATED_FOODS: Record<FoodGroupKey, CuratedFood[]> = {
  proteine: [
    { name: "Poulet (blanc)", diet: ["omnivore"], allergens: [] },
    { name: "Bœuf haché 5%", diet: ["omnivore"], allergens: [] },
    { name: "Dinde (blanc)", diet: ["omnivore"], allergens: [] },
    { name: "Saumon (frais)", diet: ["omnivore", "pescetarien"], allergens: ["poisson"] },
    { name: "Cabillaud", diet: ["omnivore", "pescetarien"], allergens: ["poisson"] },
    { name: "Thon (en conserve, eau)", diet: ["omnivore", "pescetarien"], allergens: ["poisson"] },
    { name: "Crevettes", diet: ["omnivore", "pescetarien"], allergens: ["crustaces"] },
    { name: "Œuf entier", diet: ["omnivore", "pescetarien", "vegetarien"], allergens: ["oeuf"] },
    { name: "Skyr nature", diet: ["omnivore", "pescetarien", "vegetarien"], allergens: ["lactose"] },
    { name: "Cottage cheese", diet: ["omnivore", "pescetarien", "vegetarien"], allergens: ["lactose"] },
    { name: "Tofu ferme", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["soja"] },
    { name: "Edamame", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["soja"] },
    { name: "Lentilles (cuites)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Pois chiches (cuits)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Haricots rouges (cuits)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Protéine végétale (pois/riz)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
  ],
  glucide: [
    { name: "Riz basmati (cuit)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Riz complet (cuit)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Patate douce (cuite)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Pomme de terre (vapeur)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Quinoa (cuit)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Avoine (flocons secs)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Pâtes complètes (cuites)", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["gluten"] },
    { name: "Pain complet", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["gluten"] },
  ],
  legume: [
    { name: "Brocoli", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Épinards", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Courgette", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Haricots verts", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Poivron rouge", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Carotte", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Chou-fleur", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Asperges", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
  ],
  matiere_grasse: [
    { name: "Huile d'olive", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Avocat", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
    { name: "Amandes", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["fruits-a-coque"] },
    { name: "Noix", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["fruits-a-coque"] },
    { name: "Beurre de cacahuète", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: ["arachide"] },
    { name: "Graines de chia", diet: ["omnivore", "pescetarien", "vegetarien", "vegan"], allergens: [] },
  ],
};

const MEAL_KCAL_TARGET: Record<MealType, Record<Phase, number>> = {
  "petit-dej": { deficit: 350, maintenance: 450, surplus: 550 },
  dejeuner: { deficit: 450, maintenance: 550, surplus: 700 },
  diner: { deficit: 400, maintenance: 500, surplus: 650 },
  collation: { deficit: 200, maintenance: 250, surplus: 320 },
  "post-training": { deficit: 350, maintenance: 400, surplus: 500 },
  dessert: { deficit: 150, maintenance: 200, surplus: 280 },
};

const TIME_LABELS = {
  rapide: "Rapide (< 15 min)",
  moyen: "Moyen (15-30 min)",
  long: "Pas de contrainte",
} as const;
export type PrepTime = keyof typeof TIME_LABELS;
export { TIME_LABELS };

export interface MealCreatorAnswers {
  meal: MealType;
  diet: Diet;
  phase: Phase;
  allergens: Allergen[];
  temp: Temp;
  prepTime: PrepTime;
  choices: Partial<Record<FoodGroupKey, string>>; // food name per group, "" = skip
}

export interface GeneratedRecipe {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
  tip: string;
  prepMinutes: number;
  allergens: Allergen[];
}

function baseName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function gramsFor(food: Food, targetGrams: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(targetGrams / 10) * 10));
}

const PHASE_TIPS: Record<Phase, string> = {
  deficit: "Astuce : si tu as encore faim, ajoute du volume avec plus de légumes plutôt que des calories.",
  maintenance: "Astuce : ajuste les portions à ±20g selon ton appétit du jour, l'équilibre global reste le même.",
  surplus: "Astuce : ajoute une portion de fruit ou un filet d'huile en plus si tu as encore faim après ce repas.",
};

export function generateRecipe(
  answers: MealCreatorAnswers,
  foods: Food[]
): GeneratedRecipe | null {
  const foodByName = new Map(foods.map((f) => [f.name, f]));
  const targetKcal = MEAL_KCAL_TARGET[answers.meal][answers.phase];

  const proteinName = answers.choices.proteine;
  const glucideName = answers.choices.glucide;
  const legumeName = answers.choices.legume;
  const fatName = answers.choices.matiere_grasse;

  if (!proteinName) return null;
  const proteinFood = foodByName.get(proteinName);
  if (!proteinFood) return null;

  const glucideFood = glucideName ? foodByName.get(glucideName) : null;
  const legumeFood = legumeName ? foodByName.get(legumeName) : null;
  const fatFood = fatName ? foodByName.get(fatName) : null;

  // ── Target split: 30% protein / 40% carbs / 30% fat of target kcal ──
  const targetProteinG = (targetKcal * 0.3) / 4;
  const targetCarbG = (targetKcal * 0.4) / 4;
  const targetFatG = (targetKcal * 0.3) / 9;

  const proteinGrams = gramsFor(
    proteinFood,
    proteinFood.proteins_per_100 > 0 ? (targetProteinG / proteinFood.proteins_per_100) * 100 : 150,
    80,
    300
  );
  const glucideGrams = glucideFood
    ? gramsFor(
        glucideFood,
        glucideFood.carbs_per_100 > 0 ? (targetCarbG / glucideFood.carbs_per_100) * 100 : 150,
        50,
        300
      )
    : 0;
  const legumeGrams = legumeFood ? 150 : 0;
  const fatGrams = fatFood
    ? gramsFor(fatFood, fatFood.fats_per_100 > 0 ? (targetFatG / fatFood.fats_per_100) * 100 : 20, 5, 200)
    : 0;

  function macrosOf(food: Food, grams: number) {
    return {
      kcal: Math.round((food.calories_per_100 * grams) / 100),
      protein: Math.round((food.proteins_per_100 * grams) / 100),
      carbs: Math.round((food.carbs_per_100 * grams) / 100),
      fat: Math.round((food.fats_per_100 * grams) / 100),
    };
  }

  const parts = [
    macrosOf(proteinFood, proteinGrams),
    ...(glucideFood ? [macrosOf(glucideFood, glucideGrams)] : []),
    ...(legumeFood ? [macrosOf(legumeFood, legumeGrams)] : []),
    ...(fatFood ? [macrosOf(fatFood, fatGrams)] : []),
  ];

  const totals = parts.reduce(
    (acc, p) => ({
      kcal: acc.kcal + p.kcal,
      protein: acc.protein + p.protein,
      carbs: acc.carbs + p.carbs,
      fat: acc.fat + p.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // ── Ingredients list ──
  const ingredients: string[] = [`${proteinGrams}g de ${proteinFood.name.toLowerCase()}`];
  if (glucideFood) ingredients.push(`${glucideGrams}g de ${glucideFood.name.toLowerCase()}`);
  if (legumeFood) ingredients.push(`${legumeGrams}g de ${legumeFood.name.toLowerCase()}`);
  if (fatFood) ingredients.push(`${fatGrams}g de ${fatFood.name.toLowerCase()}`);
  ingredients.push("Sel, poivre, épices au choix");

  // ── Steps (templated) ──
  const steps: string[] = [];
  if (glucideFood) {
    steps.push(`Cuire ${baseName(glucideFood.name).toLowerCase()} selon les instructions (ou réchauffer s'il est déjà cuit).`);
  }
  const proteinCategory = proteinFood.category ?? "";
  if (["Légumineuse"].includes(proteinCategory) || proteinFood.name === "Tofu ferme" || proteinFood.name === "Edamame") {
    steps.push(`Faire revenir ${baseName(proteinFood.name).toLowerCase()} 5-8 min à la poêle avec un peu d'assaisonnement.`);
  } else if (proteinFood.name === "Œuf entier") {
    steps.push("Cuire les œufs à ta façon (brouillés, à la poêle, durs) — 5-8 min.");
  } else if (["Skyr nature", "Cottage cheese"].includes(proteinFood.name)) {
    steps.push(`Servir ${baseName(proteinFood.name).toLowerCase()} tel quel, frais.`);
  } else {
    steps.push(`Cuire ${baseName(proteinFood.name).toLowerCase()} à la poêle ou au four, 10-15 min selon l'épaisseur.`);
  }
  if (legumeFood) {
    steps.push(
      answers.temp === "froid"
        ? `Préparer ${baseName(legumeFood.name).toLowerCase()} cru ou blanchi puis refroidi.`
        : `Cuire ${baseName(legumeFood.name).toLowerCase()} à la vapeur ou à la poêle 5-8 min.`
    );
  }
  if (fatFood) {
    if (["Huile d'olive"].includes(fatFood.name)) {
      steps.push(`Arroser le tout d'un filet de ${baseName(fatFood.name).toLowerCase()} avant de servir.`);
    } else {
      steps.push(`Ajouter ${baseName(fatFood.name).toLowerCase()} en accompagnement ou en topping.`);
    }
  }
  steps.push("Assaisonner à ta convenance et dresser le tout.");

  // ── Name ──
  const nameParts = [baseName(proteinFood.name)];
  if (glucideFood) nameParts.push(baseName(glucideFood.name).toLowerCase());
  if (legumeFood) nameParts.push(baseName(legumeFood.name).toLowerCase());
  const name =
    nameParts.length === 1
      ? nameParts[0]
      : nameParts.length === 2
      ? `${nameParts[0]}, ${nameParts[1]}`
      : `${nameParts[0]}, ${nameParts[1]} et ${nameParts[2]}`;

  const allergenSet = new Set<Allergen>();
  const allCurated = [proteinName, glucideName, legumeName, fatName].filter(Boolean) as string[];
  for (const group of Object.values(CURATED_FOODS)) {
    for (const item of group) {
      if (allCurated.includes(item.name)) item.allergens.forEach((a) => allergenSet.add(a));
    }
  }

  return {
    name,
    kcal: totals.kcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    ingredients,
    steps,
    tip: PHASE_TIPS[answers.phase],
    prepMinutes: answers.prepTime === "rapide" ? 15 : answers.prepTime === "moyen" ? 25 : 40,
    allergens: [...allergenSet],
  };
}
