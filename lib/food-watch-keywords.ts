import type { ClientIntake } from "@/utils/client-intake";
import { ALLERGEN_LABELS, DIET_LABELS, type Allergen, type Diet } from "@/lib/recipes-data";

// Avant : le "mot-clé" pour un allergène était le libellé lui-même ("gluten",
// "lactose"...) comparé au NOM de l'aliment — ça ne matche quasiment jamais
// en pratique (aucun aliment ne s'appelle littéralement "Pain (gluten)"), ce
// qui donnait une fausse impression de contrôle sans jamais rien détecter
// de réel. Ici, une vraie liste d'aliments courants par allergène — reste
// une heuristique (substring sur le nom), pas une base de données INCI
// certifiée, d'où le ton "à vérifier" partout, jamais "sans risque".
const ALLERGEN_FOOD_KEYWORDS: Record<Allergen, string[]> = {
  gluten: ["blé", "ble", "pain", "pâtes", "pates", "farine", "semoule", "couscous", "orge", "seigle", "pizza", "biscuit", "gâteau", "gateau", "céréale", "cereale", "avoine", "panure", "chapelure"],
  lactose: ["lait", "fromage", "yaourt", "yogourt", "crème", "creme", "beurre", "whey", "lactosérum", "lactoserum", "mozzarella", "parmesan", "camembert", "ricotta", "chèvre", "chevre", "comté", "comte"],
  oeuf: ["œuf", "oeuf", "mayonnaise"],
  "fruits-a-coque": ["noix", "amande", "noisette", "cajou", "pistache", "pécan", "pecan", "macadamia"],
  poisson: ["poisson", "saumon", "thon", "cabillaud", "truite", "sardine", "maquereau", "anchois", "colin", "merlu", "bar", "dorade", "églefin", "eglefin"],
  crustaces: ["crevette", "crabe", "homard", "langoustine", "langouste", "crustacé", "crustace", "gambas"],
  soja: ["soja", "tofu", "edamame", "tempeh", "miso"],
  arachide: ["cacahuète", "cacahuete", "arachide"],
};

// Catégories (champ Food.category, texte libre — "Viandes"/"Viande rouge"/
// "Poissons"/"Poisson"... d'où le substring plutôt qu'une égalité stricte)
// à écarter selon le régime déclaré. Écarte toujours viande + poisson dès
// "pescétarien" et plus strict, ajoute laitier/œuf pour le vegan.
const MEAT_ISH = ["viande", "charcuterie"];
const FISH_ISH = ["poisson", "crustacé", "crustace"];
const ANIMAL_EXTRA = ["laitier", "œuf", "oeuf"];

function excludedCategoryKeywords(diet: Diet | null): string[] {
  if (diet === "vegan") return [...MEAT_ISH, ...FISH_ISH, ...ANIMAL_EXTRA];
  if (diet === "vegetarien") return [...MEAT_ISH, ...FISH_ISH];
  if (diet === "pescetarien") return [...MEAT_ISH];
  return [];
}

export interface FoodWatchContext {
  allergens: Allergen[];
  dislikedKeywords: string[];
  excludedCategoryKeywords: string[];
  dietLabel: string | null;
  // Valeur brute derrière dietLabel — gardée à part pour comparer aux tags
  // réels d'un aliment (food.diet_tags) sans avoir à re-dériver la clé
  // depuis son libellé affiché.
  diet: Diet | null;
}

export function buildFoodWatchContext(intake: ClientIntake | null | undefined): FoodWatchContext {
  if (!intake) return { allergens: [], dislikedKeywords: [], excludedCategoryKeywords: [], dietLabel: null, diet: null };
  const dislikedKeywords = intake.disliked_foods
    ? intake.disliked_foods.toLowerCase().split(/[,;\n.]+/).map((s) => s.trim()).filter((s) => s.length > 2)
    : [];
  const diet = (intake.diet_type ?? null) as Diet | null;
  return {
    allergens: intake.allergens ?? [],
    dislikedKeywords,
    excludedCategoryKeywords: excludedCategoryKeywords(diet),
    dietLabel: diet && diet !== "omnivore" ? DIET_LABELS[diet] : null,
    diet: diet && diet !== "omnivore" ? diet : null,
  };
}

export function hasFoodWatchContext(ctx: FoodWatchContext): boolean {
  return ctx.allergens.length > 0 || ctx.dislikedKeywords.length > 0 || ctx.excludedCategoryKeywords.length > 0;
}

// Résumé pour le bandeau affiché avant même de chercher un aliment — liste
// ce qui est surveillé, sans attendre qu'un aliment matche pour prévenir.
export function summarizeFoodWatchContext(ctx: FoodWatchContext): string {
  const parts: string[] = [];
  if (ctx.allergens.length > 0) parts.push(`allergènes : ${ctx.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}`);
  if (ctx.dietLabel) parts.push(`régime ${ctx.dietLabel.toLowerCase()}`);
  if (ctx.dislikedKeywords.length > 0) parts.push(`aliments détestés : ${ctx.dislikedKeywords.join(", ")}`);
  return parts.join(" · ");
}

// Un seul aliment peut matcher plusieurs raisons (ex. "Yaourt" = lactose +
// détesté) — toutes remontées plutôt que la première trouvée, pour que le
// coach voie tout d'un coup au lieu de re-matcher au fil de la saisie.
export function checkFoodWatch(
  food: { name: string; category: string | null; diet_tags?: string[] | null; allergens?: string[] | null },
  ctx: FoodWatchContext
): string[] {
  const name = food.name.toLowerCase();
  const category = (food.category ?? "").toLowerCase();
  const reasons: string[] = [];

  // Tag réel par aliment (migration 20260922_foods_diet_tags_allergens) —
  // prioritaire sur l'heuristique par mot-clé quand il existe : confirmé,
  // pas juste "probable". Retombe sur le substring uniquement pour les
  // aliments pas encore vérifiés (food.allergens null).
  if (food.allergens) {
    for (const allergen of ctx.allergens) {
      if (food.allergens.includes(allergen)) {
        reasons.push(`allergène ${ALLERGEN_LABELS[allergen].toLowerCase()} confirmé`);
      }
    }
  } else {
    for (const allergen of ctx.allergens) {
      const hit = ALLERGEN_FOOD_KEYWORDS[allergen].find((k) => name.includes(k));
      if (hit) reasons.push(`allergène ${ALLERGEN_LABELS[allergen].toLowerCase()} probable (« ${hit} »)`);
    }
  }

  if (ctx.dietLabel) {
    if (food.diet_tags) {
      if (ctx.diet && !food.diet_tags.includes(ctx.diet)) {
        reasons.push(`non compatible régime ${ctx.dietLabel.toLowerCase()} (vérifié)`);
      }
    } else {
      const hit = ctx.excludedCategoryKeywords.find((k) => category.includes(k));
      if (hit) reasons.push(`non compatible régime ${ctx.dietLabel.toLowerCase()}`);
    }
  }

  const dislikedHit = ctx.dislikedKeywords.find((k) => name.includes(k) || k.includes(name));
  if (dislikedHit) reasons.push(`détesté par le client (« ${dislikedHit} »)`);

  return reasons;
}
