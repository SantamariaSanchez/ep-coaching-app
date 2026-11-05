// Cadre de diète : répartition des calories, protéines, glucides, lipides et
// fibres sur les repas de la journée, avec des sources adaptées au régime
// (omnivore, végétarien, végan, pescétarien), au budget et au côté pratique.
// Module PUR, testé. Ce n'est pas un plan prêt à servir : c'est le cadre que
// la coach remplit avec des aliments, et que le client peut suivre en
// flexible. Les chiffres viennent tous de lib/coaching-knowledge.ts.
//
// Sécurité : jamais de cadre chiffré quand la relation à l'alimentation est
// signalée (niveau « stop »), le plan strict n'est pas proposé non plus au
// niveau « watch » (approche sans pression, plan flexible).

import {
  NUTRITION_RULES,
  PLAN_STRUCTURE_RULES,
  PLANT_BASED_RULES,
  distributeProtein,
  proteinPerMealRange,
} from "@/lib/coaching-knowledge";
import { eatingSafetyLevel, type EatingRelation } from "@/lib/eating-safety";

export type DietType = "omnivore" | "vegetarien" | "vegan" | "pescetarien";
export type DietBudget = "serre" | "standard";

export interface DietFrameworkInput {
  targets: { calories: number; proteins: number; carbs: number; fats: number };
  weightKg: number;
  /** Repas par jour souhaités ; 4 par défaut, borné à 3 à 5. */
  mealsPerDay?: number | null;
  dietType?: DietType | null;
  budget?: DietBudget;
  /** Repas à emporter au travail, préparation à l'avance. */
  practical?: boolean;
  planPreference?: "fixe" | "flexible" | null;
  eatingRelation?: EatingRelation | null;
  /** Aliments détestés et restrictions déclarées (fiche client, texte libre) : écartés des listes de sources. */
  avoidText?: string | null;
  /** Aliments que le client aime déjà (texte libre) : mis en avant. */
  likedText?: string | null;
}

export interface DietFrameworkMeal {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface DietFramework {
  meals: DietFrameworkMeal[];
  fiberTotal: number;
  proteinPerMealG: { min: number; max: number };
  proteinSources: string[];
  carbSources: string[];
  fatSources: string[];
  plantSources: string[];
  tips: string[];
  /** Points de vigilance (végétarien et végan). */
  watch: { label: string; advice: string }[];
  warnings: string[];
}

const MEAL_NAMES: Record<number, string[]> = {
  3: ["Petit-déjeuner", "Déjeuner", "Dîner"],
  4: ["Petit-déjeuner", "Déjeuner", "Collation", "Dîner"],
  5: ["Petit-déjeuner", "Déjeuner", "Collation", "Dîner", "Collation du soir"],
};

// Part des calories par repas, du matin au soir.
const MEAL_SHARES: Record<number, number[]> = {
  3: [0.3, 0.4, 0.3],
  4: [0.25, 0.3, 0.15, 0.3],
  5: [0.22, 0.28, 0.12, 0.26, 0.12],
};

const PROTEIN_SOURCES: Record<DietType, { standard: string[]; serre: string[] }> = {
  omnivore: {
    standard: ["poulet", "dinde", "bœuf maigre", "poisson blanc", "saumon", "œufs", "fromage blanc", "skyr", "whey"],
    serre: ["œufs", "fromage blanc", "cuisses de poulet", "thon en boîte", "sardines en boîte", "lentilles", "pois chiches"],
  },
  pescetarien: {
    standard: ["poisson blanc", "saumon", "thon", "crevettes", "œufs", "fromage blanc", "skyr", "légumineuses"],
    serre: ["œufs", "thon en boîte", "sardines en boîte", "fromage blanc", "lentilles", "pois chiches"],
  },
  vegetarien: {
    standard: ["œufs", "fromage blanc", "skyr", "yaourt grec", "tofu", "tempeh", "lentilles", "pois chiches", "whey"],
    serre: ["œufs", "fromage blanc", "lentilles", "pois chiches", "haricots rouges", "tofu"],
  },
  vegan: {
    standard: ["tofu", "tempeh", "seitan", "soja texturé", "lentilles", "pois chiches", "edamame", "protéine de pois ou de soja"],
    serre: ["lentilles", "pois chiches", "haricots rouges", "tofu", "soja texturé", "flocons d'avoine", "pâtes complètes"],
  },
};

const CARB_SOURCES = {
  standard: ["riz", "pâtes", "pommes de terre", "flocons d'avoine", "pain complet", "quinoa", "patate douce", "fruits"],
  serre: ["riz", "pâtes", "pommes de terre", "flocons d'avoine", "pain complet", "bananes", "légumes surgelés"],
};

const FAT_SOURCES = {
  standard: ["huile d'olive", "avocat", "noix et amandes", "beurre de cacahuète", "œufs entiers", "poissons gras"],
  serre: ["huile de colza ou d'olive", "cacahuètes", "œufs entiers", "graines de tournesol"],
};

const PLANT_ONLY_FATS = ["huile d'olive", "avocat", "noix et amandes", "beurre de cacahuète", "graines de lin moulues", "graines de chia"];

/** Minuscules sans accents, pour comparer le texte du client aux noms d'aliments. */
function norm(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Mots que le client peut écrire (allergie, intolérance déclarée, dégoût) et
 * sources de départ qu'ils écartent. Ce n'est pas un diagnostic : on écarte
 * seulement de la liste de départ ce que le client dit ne pas manger ou ne
 * pas supporter, sans jamais conseiller de retirer un aliment de lui-même.
 */
const AVOID_RULES: { test: RegExp; sources: string[] }[] = [
  { test: /lactose|laitier|laitage|produits? laitiers?|lait\b/, sources: ["fromage blanc", "skyr", "yaourt grec", "whey"] },
  { test: /gluten|coeliaque|celiaque|ble\b/, sources: ["pâtes", "pain complet", "seitan", "pâtes complètes"] },
  { test: /arachide|cacahu/, sources: ["beurre de cacahuète", "cacahuètes"] },
  { test: /fruits? a coque|noix|amande/, sources: ["noix et amandes"] },
  { test: /oeufs?|œufs?/, sources: ["œufs", "œufs entiers"] },
  { test: /soja|soya/, sources: ["tofu", "tempeh", "soja texturé", "edamame", "protéine de pois ou de soja"] },
  { test: /poisson/, sources: ["poisson blanc", "saumon", "thon", "thon en boîte", "sardines en boîte", "poissons gras"] },
  { test: /crustace|fruits? de mer|crevette/, sources: ["crevettes"] },
  { test: /viande/, sources: ["poulet", "dinde", "bœuf maigre", "cuisses de poulet"] },
];

/** Garde les sources que le client ne dit pas éviter (nom cité tel quel ou famille déclarée). */
export function filterSources(list: string[], avoidText: string | null | undefined): string[] {
  if (!avoidText || !avoidText.trim()) return list;
  const text = norm(avoidText);
  const blocked = new Set<string>();
  for (const rule of AVOID_RULES) if (rule.test.test(text)) rule.sources.forEach((s) => blocked.add(s));
  return list.filter((src) => {
    if (blocked.has(src)) return false;
    const key = norm(src);
    return !text.split(/[,;\n\/]|\bet\b/).map((f) => f.trim()).some((f) => f.length >= 4 && (key.includes(f) || f.includes(key)));
  });
}

function likedList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split(/[,;\n]/).map((f) => f.trim()).filter((f) => f.length >= 3 && f.length <= 40).slice(0, 8);
}

function share(n: number): number[] {
  return MEAL_SHARES[n] ?? MEAL_SHARES[4];
}

/** Cadre de diète, ou null quand la relation à l'alimentation interdit tout chiffre. */
export function buildDietFramework(input: DietFrameworkInput): DietFramework | null {
  const safety = eatingSafetyLevel(input.eatingRelation);
  if (safety === "stop") return null;

  const wanted = Math.min(NUTRITION_RULES.mealsPerDay.max, Math.max(NUTRITION_RULES.mealsPerDay.min, Math.round(input.mealsPerDay ?? 4)));
  const dist = distributeProtein(input.targets.proteins, input.weightKg, wanted);
  // Trop de protéines par prise pour ce nombre de repas : on ajoute un repas (5 au maximum).
  const mealsN = Math.min(NUTRITION_RULES.mealsPerDay.max, Math.max(wanted, dist.meals));
  const dietType: DietType = input.dietType ?? "omnivore";
  const budget: DietBudget = input.budget ?? "standard";
  const { calories, proteins, fats } = input.targets;
  const names = MEAL_NAMES[mealsN];
  const shares = share(mealsN);
  const fiberTotal = Math.round((calories / 1000) * NUTRITION_RULES.fiberGPer1000Kcal);
  const perMealP = distributeProtein(proteins, input.weightKg, mealsN).perMealG;

  const meals: DietFrameworkMeal[] = names.map((name, idx) => {
    const cal = Math.round(calories * shares[idx]);
    const p = perMealP[idx % perMealP.length] ?? Math.round(proteins / mealsN);
    const f = Math.round(fats * shares[idx]);
    const carbs = Math.max(0, Math.round((cal - p * 4 - f * 9) / 4));
    return { name, calories: cal, proteins: p, carbs, fats: f, fiber: Math.round(fiberTotal * shares[idx]) };
  });

  const warnings: string[] = [];
  const plant = dietType === "vegetarien" || dietType === "vegan";
  if (plant && input.targets.proteins / input.weightKg < PLANT_BASED_RULES.proteinGPerKgFloor) {
    warnings.push(
      `Régime ${dietType === "vegan" ? "végan" : "végétarien"} : vise le haut de la fourchette de protéines (au moins ${PLANT_BASED_RULES.proteinGPerKgFloor} g/kg, soit ${Math.round(PLANT_BASED_RULES.proteinGPerKgFloor * input.weightKg)} g).`
    );
  }
  const range = proteinPerMealRange(input.weightKg);
  if (meals.some((m) => m.proteins > range.max + 1)) {
    warnings.push("Une prise de protéines dépasse le haut de la fourchette par repas : ajoute un repas ou une collation.");
  }

  const tips: string[] = [];
  tips.push(
    `${PLAN_STRUCTURE_RULES.sourcesPerDay.min} à ${PLAN_STRUCTURE_RULES.sourcesPerDay.max} sources de protéines différentes dans la journée, et autant pour les lipides, pour garder de la variété sans compliquer.`
  );
  tips.push(
    `Ajoute des options de fruits, de féculents et de protéines à chaque repas, et ${NUTRITION_RULES.fruitPortions.min} à ${NUTRITION_RULES.fruitPortions.max} portions de fruits et ${NUTRITION_RULES.vegPortions.min} à ${NUTRITION_RULES.vegPortions.max} de légumes par jour.`
  );
  if (budget === "serre") {
    tips.push("Budget serré : œufs, fromage blanc, légumineuses, conserves de poisson, féculents et légumes surgelés couvrent tout sans saumon ni produits chers à chaque repas.");
  } else {
    tips.push("Évite les aliments chers à tous les repas (le saumon, par exemple) : alterne avec des options plus économiques.");
  }
  if (input.practical) {
    tips.push("Repas pratiques : prépare 2 à 3 bases à l'avance (féculent, protéine cuite, légumes), emporte des repas qui se mangent froids ou se réchauffent vite, garde une collation sans préparation.");
  }
  if (input.planPreference === "flexible" || safety === "watch") {
    tips.push(
      `Plan souple : ${PLAN_STRUCTURE_RULES.flexibleMealsPerDay.min} à ${PLAN_STRUCTURE_RULES.flexibleMealsPerDay.max} repas flexibles par jour, repérés par des portions plutôt que pesés, sans culpabilité en cas d'écart.`
    );
  } else {
    tips.push("Plan fixe : garde toujours des options de fruits et de légumes pour que le client puisse adapter sans sortir du cadre.");
  }
  tips.push(`Fibres : environ ${fiberTotal} g par jour (${NUTRITION_RULES.fiberGPer1000Kcal} g pour 1000 kcal), à monter progressivement avec assez d'eau.`);

  const avoid = input.avoidText ?? null;
  const proteinSources = filterSources(PROTEIN_SOURCES[dietType][budget], avoid);
  const carbSources = filterSources(CARB_SOURCES[budget], avoid);
  const fatSources = filterSources(plant ? PLANT_ONLY_FATS.slice(0, budget === "serre" ? 4 : 6) : FAT_SOURCES[budget], avoid);
  if (avoid && avoid.trim()) {
    warnings.push("Sources écartées d'après la fiche (aliments détestés ou restrictions déclarées). Confirme avec le client, sans lui demander de retirer d'autres aliments sans avis médical.");
    if (proteinSources.length === 0) warnings.push("Aucune source de protéines de départ compatible : à compléter à la main avec ce que le client mange.");
  }
  const liked = likedList(input.likedText);
  if (liked.length > 0) tips.push(`Appuie-toi d'abord sur ce que le client aime déjà : ${liked.join(", ")}.`);

  return {
    meals,
    fiberTotal,
    proteinPerMealG: range,
    proteinSources,
    carbSources,
    fatSources,
    plantSources: plant ? filterSources(PROTEIN_SOURCES[dietType].standard.filter((x) => !["whey"].includes(x)), avoid) : [],
    tips,
    watch: plant
      ? PLANT_BASED_RULES.watch.map((w) => ({ label: w.label, advice: w.advice }))
      : [],
    warnings,
  };
}
