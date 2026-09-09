import type { DietPlanWithMeals, FoodLogWithFood } from "@/utils/nutrition";

export interface ShoppingListItem {
  foodId: string;
  name: string;
  category: string;
  totalGrams: number;
}

// Ordre d'affichage façon rayons de supermarché plutôt qu'alphabétique brut.
export const CATEGORY_ORDER = [
  "Viandes", "Poissons", "Oeufs", "Laitiers",
  "Feculents", "Cereales", "Legumineuses",
  "Legumes", "Fruits",
  "Oleagineux", "Sauces",
  "Boissons", "Sucreries", "Complements", "Divers",
];

// Deux sources possibles selon le plan du client :
// - Plan structuré (fixed / fixed_flexible) : on descend des quantités
//   exactes du plan, extrapolées sur 7 jours si la structure est "daily".
// - Pas de plan structuré (flexible, le cas le plus courant) : dérivé de ce
//   que le client a réellement mangé récemment — seuls les aliments loggés
//   au moins 2 fois sur la période comptent, pour ne pas polluer la liste
//   avec un aliment mangé une fois par hasard.
export function buildShoppingList(
  activePlan: DietPlanWithMeals | null,
  historyLogs: FoodLogWithFood[],
  days = 7
): { items: ShoppingListItem[]; source: "plan" | "habitudes" } {
  const totals = new Map<string, { name: string; category: string; grams: number }>();
  const hasStructuredPlan =
    !!activePlan && activePlan.mode !== "flexible" && activePlan.diet_plan_meals.length > 0;

  if (hasStructuredPlan && activePlan) {
    const multiplier = activePlan.structure === "daily" ? days : 1;
    // Bug réel confirmé sur son propre plan (82 lignes en variant_group=2,
    // deux options réelles pour un même créneau, ex. "riz 100g" en Option 1
    // ET en Option 2) : sans ce filtre, la liste de courses additionnait
    // LES DEUX options comme si les deux étaient mangées la même semaine,
    // doublant la quantité de tout aliment présent dans plusieurs options —
    // alors qu'un seul choix est réellement fait chaque jour (voir le même
    // raisonnement dans ClientNutritionView, checkedMap/visibleMeals). Sans
    // connaître le choix réel jour par jour ici (fonction pure, pas de state
    // client), l'Option 1 ("Choix habituel", même convention que
    // variant ?? 1 partout ailleurs) sert de référence par défaut.
    for (const meal of activePlan.diet_plan_meals) {
      if ((meal.variant_group ?? 1) !== 1) continue;
      const food = meal.foods;
      if (!food) continue;
      const existing = totals.get(food.id) ?? { name: food.name, category: food.category ?? "Divers", grams: 0 };
      existing.grams += meal.quantity_g * multiplier;
      totals.set(food.id, existing);
    }
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const perFood = new Map<string, { name: string; category: string; grams: number; count: number }>();
    for (const log of historyLogs) {
      if (!log.food_id || !log.foods) continue;
      if (log.logged_at < cutoffStr) continue;
      const existing = perFood.get(log.food_id) ?? {
        name: log.foods.name,
        category: log.foods.category ?? "Divers",
        grams: 0,
        count: 0,
      };
      existing.grams += log.quantity_g;
      existing.count += 1;
      perFood.set(log.food_id, existing);
    }
    for (const [id, v] of perFood) {
      if (v.count < 2) continue;
      totals.set(id, v);
    }
  }

  const items = [...totals.entries()]
    .map(([foodId, v]) => ({
      foodId,
      name: v.name,
      category: v.category,
      totalGrams: Math.round(v.grams / 10) * 10,
    }))
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.name.localeCompare(b.name, "fr");
    });

  return { items, source: hasStructuredPlan ? "plan" : "habitudes" };
}

// Idées de sources d'aliments par macro — pour varier en mode flexible,
// sans dépendre uniquement de ce qui a déjà été loggé.
export const FOOD_IDEAS: { key: "proteine" | "glucide" | "lipide"; label: string; items: string[] }[] = [
  {
    key: "proteine",
    label: "Sources de protéines",
    items: [
      "Poulet, dinde", "Bœuf, veau maigre", "Poisson blanc (cabillaud, colin)",
      "Poisson gras (saumon, maquereau)", "Œufs", "Skyr / fromage blanc 0%",
      "Cottage cheese", "Tofu, tempeh", "Lentilles, pois chiches, haricots rouges",
      "Protéine en poudre (whey ou végétale)",
    ],
  },
  {
    key: "glucide",
    label: "Sources de glucides",
    items: [
      "Riz (blanc, basmati, complet)", "Pâtes (blanches ou complètes)",
      "Pomme de terre, patate douce", "Quinoa, boulgour", "Avoine (flocons)",
      "Pain complet", "Fruits frais (banane, pomme, baies)", "Légumineuses",
    ],
  },
  {
    key: "lipide",
    label: "Sources de lipides",
    items: [
      "Huile d'olive", "Avocat", "Amandes, noix, noisettes",
      "Beurre de cacahuète (naturel)", "Graines (chia, lin, courge)",
      "Poissons gras", "Fromage (avec modération)",
    ],
  },
];
