import type { Allergen, Diet, MealType, Phase, Temp } from "@/lib/recipes-data";
import type { Food } from "@/utils/nutrition";

// ── Groupes d'aliments, dérivés en direct du catalogue complet `foods` ─────
// (150+ entrées) plutôt que d'une petite liste figée à ~40 noms — beaucoup
// plus de variété, et toujours cohérent avec la bibliothèque réelle du
// coach (nouvel aliment ajouté à `foods` = immédiatement disponible ici).

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

// La catégorie de `foods` (Viandes, Poissons...) est plus fine que les 4
// groupes du wizard — cette table fait le pont. Sucreries/Boissons/
// Compléments/Divers ne rentrent dans aucun groupe (pas des ingrédients de
// base pour composer un repas) et sont volontairement exclues.
const CATEGORY_TO_GROUP: Record<string, FoodGroupKey> = {
  Viandes: "proteine",
  Poissons: "proteine",
  Oeufs: "proteine",
  Laitiers: "proteine",
  Legumineuses: "proteine",
  Feculents: "glucide",
  Cereales: "glucide",
  Fruits: "glucide",
  Legumes: "legume",
  Oleagineux: "matiere_grasse",
  Sauces: "matiere_grasse",
};

// Compatibilité régime/allergène au niveau de la catégorie (pas de tag par
// aliment dans `foods`) — approximation volontairement large plutôt que
// trop restrictive, pour ne pas cacher des aliments par excès de prudence.
const CATEGORY_DIET: Record<string, Diet[]> = {
  Viandes: ["omnivore"],
  Poissons: ["omnivore", "pescetarien"],
  Oeufs: ["omnivore", "pescetarien", "vegetarien"],
  Laitiers: ["omnivore", "pescetarien", "vegetarien"],
  Legumineuses: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Feculents: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Cereales: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Fruits: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Legumes: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Oleagineux: ["omnivore", "pescetarien", "vegetarien", "vegan"],
  Sauces: ["omnivore", "pescetarien", "vegetarien", "vegan"],
};

const CATEGORY_ALLERGENS: Record<string, Allergen[]> = {
  Poissons: ["poisson"],
  Laitiers: ["lactose"],
  Oleagineux: ["fruits-a-coque"],
  Oeufs: ["oeuf"],
};

// Construit les 4 groupes à partir du catalogue réel — remplace l'ancienne
// liste CURATED_FOODS figée.
export function buildFoodGroups(allFoods: Food[]): Record<FoodGroupKey, CuratedFood[]> {
  const out: Record<FoodGroupKey, CuratedFood[]> = {
    proteine: [], glucide: [], legume: [], matiere_grasse: [],
  };
  for (const food of allFoods) {
    const group = food.category ? CATEGORY_TO_GROUP[food.category] : undefined;
    if (!group) continue;
    out[group].push({
      name: food.name,
      diet: CATEGORY_DIET[food.category!] ?? ["omnivore"],
      allergens: CATEGORY_ALLERGENS[food.category!] ?? [],
    });
  }
  for (const key of Object.keys(out) as FoodGroupKey[]) {
    out[key].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }
  return out;
}

// ── Profil de répartition macro — auparavant toujours 30% P / 40% G / 30% L
// quel que soit ce que le client recherche, "riche en glucides" ou
// "riche en protéines" n'avait aucune influence sur la recette générée.
export type MacroProfile = "equilibre" | "riche_proteine" | "riche_glucide" | "faible_glucide" | "riche_lipide";

export const MACRO_PROFILE_LABELS: Record<MacroProfile, string> = {
  equilibre: "Équilibré",
  riche_proteine: "Riche en protéines",
  riche_glucide: "Riche en glucides",
  faible_glucide: "Faible en glucides",
  riche_lipide: "Riche en lipides",
};

export const MACRO_PROFILE_DESC: Record<MacroProfile, string> = {
  equilibre: "30% protéines / 40% glucides / 30% lipides",
  riche_proteine: "45% protéines / 30% glucides / 25% lipides",
  riche_glucide: "20% protéines / 55% glucides / 25% lipides",
  faible_glucide: "35% protéines / 15% glucides / 50% lipides",
  riche_lipide: "20% protéines / 25% glucides / 55% lipides",
};

const MACRO_SPLITS: Record<MacroProfile, { protein: number; carb: number; fat: number }> = {
  equilibre: { protein: 0.3, carb: 0.4, fat: 0.3 },
  riche_proteine: { protein: 0.45, carb: 0.3, fat: 0.25 },
  riche_glucide: { protein: 0.2, carb: 0.55, fat: 0.25 },
  faible_glucide: { protein: 0.35, carb: 0.15, fat: 0.5 },
  riche_lipide: { protein: 0.2, carb: 0.25, fat: 0.55 },
};

const MEAL_KCAL_TARGET: Record<MealType, Record<Phase, number>> = {
  "petit-dej": { deficit: 350, maintenance: 450, surplus: 550 },
  dejeuner: { deficit: 450, maintenance: 550, surplus: 700 },
  diner: { deficit: 400, maintenance: 500, surplus: 650 },
  collation: { deficit: 200, maintenance: 250, surplus: 320 },
  "pre-training": { deficit: 200, maintenance: 280, surplus: 350 },
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
  macroProfile: MacroProfile;
  allergens: Allergen[];
  temp: Temp;
  prepTime: PrepTime;
  choices: Partial<Record<FoodGroupKey, string[]>>; // food names per group, multi-select
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

function gramsFor(targetGrams: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(targetGrams / 10) * 10));
}

// Répartit un total macro cible entre plusieurs aliments d'un même groupe
// (multi-sélection) — chacun reçoit une part égale du besoin, converti en
// grammes via sa propre densité nutritionnelle.
function distributeGrams(
  items: Food[],
  totalTargetG: number,
  macroKey: "proteins_per_100" | "carbs_per_100" | "fats_per_100",
  fallbackPer100: number,
  min: number,
  max: number
): { food: Food; grams: number }[] {
  if (items.length === 0) return [];
  const perItemTarget = totalTargetG / items.length;
  return items.map((food) => {
    const per100 = food[macroKey];
    const targetGrams = per100 > 0 ? (perItemTarget / per100) * 100 : fallbackPer100;
    return { food, grams: gramsFor(targetGrams, min, max) };
  });
}

function groupLabel(items: Food[]): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return baseName(items[0].name).toLowerCase();
  if (items.length === 2) return `${baseName(items[0].name).toLowerCase()} & ${baseName(items[1].name).toLowerCase()}`;
  return `${baseName(items[0].name).toLowerCase()} & co`;
}

function cookingStep(food: Food, temp: Temp): string {
  const label = baseName(food.name).toLowerCase();
  if (["Légumineuses"].includes(food.category ?? "") || food.name === "Tofu ferme" || food.name === "Edamame") {
    return `Faire revenir ${label} 5-8 min à la poêle avec un peu d'assaisonnement.`;
  }
  if (food.name === "Œuf entier") return "Cuire les œufs à ta façon (brouillés, à la poêle, durs), 5-8 min.";
  if (["Skyr nature", "Cottage cheese"].includes(food.name)) return `Servir ${label} tel quel, frais.`;
  if (temp === "froid") return `Préparer ${label} froid ou à température ambiante.`;
  return `Cuire ${label} à la poêle ou au four, 10-15 min selon l'épaisseur.`;
}

// Plusieurs formulations par phase pour que l'astuce ne soit plus toujours
// identique d'une recette à l'autre — une seule était générée avant, ce qui
// donnait l'impression d'un générateur figé.
const PHASE_TIPS: Record<Phase, string[]> = {
  deficit: [
    "Astuce : si tu as encore faim, ajoute du volume avec plus de légumes plutôt que des calories.",
    "Astuce : bois un grand verre d'eau avant de manger, la faim et la soif se confondent souvent.",
    "Astuce : privilégie les aliments riches en fibres dans ce repas pour prolonger la satiété.",
    "Astuce : mange lentement, la sensation de satiété met 15-20 min à arriver au cerveau.",
    "Astuce : si le repas semble léger, double la portion de légumes plutôt que le féculent.",
  ],
  maintenance: [
    "Astuce : ajuste les portions à ±20g selon ton appétit du jour, l'équilibre global reste le même.",
    "Astuce : varie les sources de protéines d'un jour à l'autre pour couvrir plus de micronutriments.",
    "Astuce : ce repas se prépare bien en double pour le lendemain, ça fait gagner du temps.",
    "Astuce : garde toujours une portion de légumes, même en maintenance, pour la satiété et les fibres.",
  ],
  surplus: [
    "Astuce : ajoute une portion de fruit ou un filet d'huile en plus si tu as encore faim après ce repas.",
    "Astuce : en surplus, ne néglige pas les légumes, ils facilitent la digestion des plus grosses portions.",
    "Astuce : si tu peines à finir ce repas, fractionne-le en deux prises rapprochées.",
    "Astuce : privilégie des glucides denses (riz, pâtes, pain) pour atteindre tes calories sans trop de volume.",
  ],
};

function pickTip(phase: Phase): string {
  const pool = PHASE_TIPS[phase];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateRecipe(
  answers: MealCreatorAnswers,
  foods: Food[]
): GeneratedRecipe | null {
  const foodByName = new Map(foods.map((f) => [f.name, f]));
  const targetKcal = MEAL_KCAL_TARGET[answers.meal][answers.phase];

  function pickGroup(key: FoodGroupKey): Food[] {
    return (answers.choices[key] ?? [])
      .map((n) => foodByName.get(n))
      .filter((f): f is Food => !!f);
  }

  const proteinFoods = pickGroup("proteine");
  const glucideFoods = pickGroup("glucide");
  const legumeFoods = pickGroup("legume");
  const fatFoods = pickGroup("matiere_grasse");

  if (proteinFoods.length === 0) return null;

  // ── Répartition macro selon le profil choisi — avant, toujours 30/40/30
  // quel que soit ce que le client demandait (riche en glucides, en
  // protéines...), le choix n'avait aucun effet réel sur la recette.
  const split = MACRO_SPLITS[answers.macroProfile];
  const targetProteinG = (targetKcal * split.protein) / 4;
  const targetCarbG = (targetKcal * split.carb) / 4;
  const targetFatG = (targetKcal * split.fat) / 9;

  const proteinEntries = distributeGrams(proteinFoods, targetProteinG, "proteins_per_100", 150, 60, 300);
  const glucideEntries = distributeGrams(glucideFoods, targetCarbG, "carbs_per_100", 150, 40, 300);
  const legumePerItem = legumeFoods.length > 1 ? 100 : 150;
  const legumeEntries = legumeFoods.map((food) => ({ food, grams: legumePerItem }));
  const fatEntries = distributeGrams(fatFoods, targetFatG, "fats_per_100", 20, 5, 150);

  function macrosOf(food: Food, grams: number) {
    return {
      kcal: Math.round((food.calories_per_100 * grams) / 100),
      protein: Math.round((food.proteins_per_100 * grams) / 100),
      carbs: Math.round((food.carbs_per_100 * grams) / 100),
      fat: Math.round((food.fats_per_100 * grams) / 100),
    };
  }

  const allEntries = [...proteinEntries, ...glucideEntries, ...legumeEntries, ...fatEntries];
  const totals = allEntries.reduce(
    (acc, { food, grams }) => {
      const m = macrosOf(food, grams);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // ── Ingredients list ──
  const ingredients: string[] = allEntries.map(({ food, grams }) => `${grams}g de ${food.name.toLowerCase()}`);
  ingredients.push("Sel, poivre, épices au choix");

  // ── Steps (templated) ──
  const steps: string[] = [];
  for (const { food } of glucideEntries) {
    steps.push(`Cuire ${baseName(food.name).toLowerCase()} selon les instructions (ou réchauffer s'il est déjà cuit).`);
  }
  for (const { food } of proteinEntries) {
    steps.push(cookingStep(food, answers.temp));
  }
  for (const { food } of legumeEntries) {
    steps.push(
      answers.temp === "froid"
        ? `Préparer ${baseName(food.name).toLowerCase()} cru ou blanchi puis refroidi.`
        : `Cuire ${baseName(food.name).toLowerCase()} à la vapeur ou à la poêle 5-8 min.`
    );
  }
  for (const { food } of fatEntries) {
    if (food.name === "Huile d'olive") {
      steps.push(`Arroser le tout d'un filet de ${baseName(food.name).toLowerCase()} avant de servir.`);
    } else {
      steps.push(`Ajouter ${baseName(food.name).toLowerCase()} en accompagnement ou en topping.`);
    }
  }
  steps.push("Assaisonner à ta convenance et dresser le tout.");

  // ── Name ──
  const nameParts = [
    proteinFoods.length === 1 ? baseName(proteinFoods[0].name) : (groupLabel(proteinFoods) as string).replace(/^./, (c) => c.toUpperCase()),
  ];
  const glucideLabel = groupLabel(glucideFoods);
  const legumeLabel = groupLabel(legumeFoods);
  if (glucideLabel) nameParts.push(glucideLabel);
  if (legumeLabel) nameParts.push(legumeLabel);
  const name =
    nameParts.length === 1
      ? nameParts[0]
      : nameParts.length === 2
      ? `${nameParts[0]}, ${nameParts[1]}`
      : `${nameParts[0]}, ${nameParts[1]} et ${nameParts[2]}`;

  const allergenSet = new Set<Allergen>();
  const allChosenNames = new Set(allEntries.map(({ food }) => food.name));
  for (const group of Object.values(buildFoodGroups(foods))) {
    for (const item of group) {
      if (allChosenNames.has(item.name)) item.allergens.forEach((a) => allergenSet.add(a));
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
    tip: pickTip(answers.phase),
    prepMinutes: answers.prepTime === "rapide" ? 15 : answers.prepTime === "moyen" ? 25 : 40,
    allergens: [...allergenSet],
  };
}
