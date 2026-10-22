// Connaissances de coaching (nutrition et entraînement) : seuils et règles
// typés, partagés par les calculateurs (objectifs nutrition, générateur de
// programme) et par les consignes des assistants IA.
//
// Règle de fond : aucune source, étude ou nom d'auteur n'apparaît ici ni
// dans ce que l'utilisateur lit. Les vérifications vivent dans la base
// interne Notion « Base de connaissances Mastermind (interne, pour Claude) ».
// Les chiffres sont des repères de départ, jamais une fin en soi : on
// ajuste toujours sur l'évolution réelle de la personne.

export type NutritionPhase = "deficit" | "maintenance" | "surplus";
export type TrainingLevel = "debutant" | "intermediaire" | "avance";

/** Fourchettes de base (par jour sauf mention contraire). */
export const NUTRITION_RULES = {
  /** Déficit : part sous la maintenance. */
  deficitPct: { min: 0.1, max: 0.3 },
  /** Déficit conseillé par défaut pour un débutant ou un intermédiaire. */
  deficitPctDefault: 0.2,
  /** Surplus : part au-dessus de la maintenance. */
  surplusPct: { min: 0.08, max: 0.1 },
  /** Vitesse de perte, en % du poids de corps par semaine. */
  lossRatePctPerWeek: { min: 0.5, max: 1 },
  /** Au-delà, réservé aux profils avec beaucoup de gras à perdre. */
  lossRatePctPerWeekCeiling: 2,
  /** Vitesse de prise, en % du poids de corps par mois. */
  gainRatePctPerMonth: { min: 1, max: 2 },
  /** Protéines, g par kg de poids de corps. */
  proteinGPerKg: { min: 1.6, max: 2.2 },
  /** Au-delà de 2,5 g/kg, aucun bénéfice démontré. */
  proteinGPerKgCeiling: 2.5,
  /** Protéines par repas, g par kg de poids de corps. */
  proteinPerMealGPerKg: { min: 0.25, max: 0.4 },
  /** Nombre de prises de protéines par jour. */
  proteinMeals: { min: 3, max: 5, ideal: 4 },
  /** Lipides, g par kg (équivaut à environ 20 à 35 % des calories). */
  fatGPerKg: { min: 0.8, max: 1.5 },
  fatPctKcal: { min: 0.2, max: 0.35 },
  /** Fibres, g pour 1000 kcal. */
  fiberGPer1000Kcal: 14,
  /** Graisses saturées et sucres ajoutés, au maximum, en % des calories. */
  saturatedFatPctMax: 0.1,
  addedSugarPctMax: 0.1,
  /** Sodium maximum conseillé en population générale, mg par jour. */
  sodiumMgMax: 2300,
  /** Glucides, g par kg selon l'objectif. */
  carbsGPerKg: {
    deficit: { min: 1, max: 3 },
    surplus: { min: 3, max: 5 },
    health: { min: 1, max: 4 },
  },
  /** Repas par jour (au-delà de 5, aucun bénéfice démontré). */
  mealsPerDay: { min: 3, max: 5 },
  /** Fruits et légumes : portions par jour. */
  fruitPortions: { min: 2, max: 3 },
  vegPortions: { min: 2, max: 3 },
} as const;

/** Ordre des priorités nutritionnelles, de la base au détail. */
export const NUTRITION_PRIORITIES = [
  "Adhésion : rien d'autre ne compte si la personne ne tient pas son plan",
  "Calories : bilan énergétique (maintenance, déficit ou surplus)",
  "Protéines : quantité du jour puis répartition sur les repas",
  "Lipides et fibres",
  "Glucides : le reste des calories, ajusté selon les préférences",
  "Qualité des aliments : peu transformés, fruits et légumes variés",
  "Timing des repas",
  "Compléments",
] as const;

/** Compléments à faible risque et bien établis (doses indicatives). */
export const SUPPLEMENT_RULES = {
  creatineGPerKgPerDay: 0.1,
  creatineForm: "monohydrate",
  caffeineMgPerKg: { min: 3, max: 6 },
  caffeineAvoidAfterHour: 15,
  vitaminDIuPerDay: { min: 1000, max: 4000 },
} as const;

export interface MacroTargets {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  fiber: number;
}

/** Ajustement calorique de la phase, en kcal, à partir de la maintenance. */
export function phaseAdjustmentKcal(tdee: number, phase: NutritionPhase, level: TrainingLevel = "intermediaire"): number {
  if (phase === "maintenance") return 0;
  if (phase === "deficit") {
    // Débutant ou intermédiaire : on reste prudent, 15 à 20 %. Avancé et
    // déjà sec : 10 %. Le plafond de 30 % n'est pas un objectif.
    const pct = level === "avance" ? NUTRITION_RULES.deficitPct.min + 0.05 : NUTRITION_RULES.deficitPctDefault;
    return -Math.round(tdee * pct);
  }
  // Surplus : départ conservateur à 8 %, on monte seulement si la
  // composition corporelle et les performances le justifient.
  return Math.round(tdee * NUTRITION_RULES.surplusPct.min);
}

/** Protéines en g/kg selon la phase : plus haut en déficit pour protéger le muscle. */
export function proteinGPerKgFor(phase: NutritionPhase): number {
  if (phase === "deficit") return 2.2;
  if (phase === "surplus") return 1.8;
  return 2.0;
}

/** Lipides en g/kg selon la phase, jamais sous 20 % des calories. */
export function fatGPerKgFor(phase: NutritionPhase): number {
  return phase === "deficit" ? 0.9 : 1.0;
}

/** Objectifs journaliers : protéines et lipides d'abord, glucides = le reste. */
export function computeMacroTargets(params: { weightKg: number; tdee: number; phase: NutritionPhase; level?: TrainingLevel }): MacroTargets {
  const { weightKg: w, tdee, phase } = params;
  const calories = Math.round(tdee + phaseAdjustmentKcal(tdee, phase, params.level));
  const proteins = Math.round(proteinGPerKgFor(phase) * w);
  const fatsByWeight = fatGPerKgFor(phase) * w;
  const fatsFloor = (NUTRITION_RULES.fatPctKcal.min * calories) / 9;
  const fats = Math.round(Math.max(fatsByWeight, fatsFloor));
  const carbs = Math.max(0, Math.round((calories - proteins * 4 - fats * 9) / 4));
  const fiber = Math.round((calories / 1000) * NUTRITION_RULES.fiberGPer1000Kcal);
  return { calories, proteins, fats, carbs, fiber };
}

/** Fourchette de protéines par repas pour ce poids, en grammes. */
export function proteinPerMealRange(weightKg: number): { min: number; max: number } {
  return {
    min: Math.round(NUTRITION_RULES.proteinPerMealGPerKg.min * weightKg),
    max: Math.round(NUTRITION_RULES.proteinPerMealGPerKg.max * weightKg),
  };
}

/** Phrase de repère pour un calculateur grand public (sans source). */
export const ENERGY_GUIDANCE_FR =
  "Ce chiffre est une estimation de départ. Pour prendre du muscle, ajoute environ 8 à 10 % de ta maintenance. Pour perdre du gras, retire 10 à 20 % (jusqu'à 30 % si tu as beaucoup à perdre). Ensuite on ajuste sur ton poids réel, pas sur la formule.";

/** Entraînement (hypertrophie). */
export const TRAINING_RULES = {
  /** Séries difficiles par groupe musculaire et par semaine. */
  weeklyHardSetsStart: { min: 8, max: 12 },
  weeklyHardSetsRange: { min: 10, max: 25 },
  /** Fréquence par groupe musculaire, séances par semaine. */
  frequencyPerMuscle: { min: 2, max: 3, start: 2 },
  /** Répétitions : plage viable puis plage pratique. */
  repRangeViable: { min: 5, max: 30 },
  repRangePractical: { min: 5, max: 20 },
  /** Répétitions en réserve pendant une série de travail. */
  rirRange: { min: 0, max: 3 },
  /** Un débutant sous-estime sa proximité de l'échec : on vise 2 à 3. */
  rirBeginner: { min: 2, max: 3 },
  /** Repos entre séries, secondes. */
  restSeconds: { compound: { min: 120, max: 180 }, isolation: { min: 60, max: 120 } },
  /** Une série compte comme « difficile » à partir de 6 reps à moins de 3 reps de l'échec. */
  hardSetMinReps: 6,
  hardSetMaxRir: 3,
  /** Semaine de décharge : volume réduit d'environ la moitié, ou charges allégées. */
  deloadVolumeFactor: 0.5,
} as const;

/** Séries par exercice pour une séance, selon la fréquence hebdomadaire du groupe. */
export function setsPerSessionFor(weeklyAppearances: number, category: "compose" | "isolation" | null): number {
  const appearances = Math.max(1, weeklyAppearances);
  // Départ au bas de la fourchette 8 à 12 séries difficiles par groupe par
  // semaine, on ajoute ensuite seulement si la récupération suit.
  const perSession = Math.max(3, Math.round(10 / appearances));
  const isCompound = category !== "isolation";
  const share = isCompound ? Math.ceil(perSession * 0.6) : Math.floor(perSession * 0.4);
  return Math.min(5, Math.max(2, share));
}

/** Modules de consignes pour les assistants IA (aucune source citée). */
export const COACHING_KNOWLEDGE_PROMPT = `Repères de coaching à appliquer (valeurs de départ, toujours ajustées sur l'évolution réelle du client, jamais une fin en soi) :
- Priorités nutrition dans l'ordre : adhésion, calories, protéines, lipides et fibres, glucides, qualité des aliments, timing, compléments. Dis adhésion, jamais adhérence.
- Déficit : 10 à 30 % sous la maintenance, prudent à 15 à 20 % pour un débutant ou un intermédiaire, perte de 0,5 à 1 % du poids de corps par semaine (jusqu'à 2 % seulement avec beaucoup de gras à perdre). Surplus : 8 à 10 % au-dessus, prise d'environ 1 à 2 % du poids par mois, départ conservateur. On ajuste par paliers de 150 à 300 kcal.
- La maintenance se mesure : si le poids reste stable une semaine à 3000 kcal, c'est la maintenance. Les formules ne servent qu'à estimer au départ.
- Protéines : 1,6 à 2,2 g/kg/jour, plus haut en déficit, aucun bénéfice démontré au-delà de 2,5 g/kg. Réparties sur 3 à 5 prises (idéal 4), environ 0,25 à 0,4 g/kg par repas.
- Lipides : 0,8 à 1,5 g/kg (20 à 35 % des calories). Glucides : le reste, selon les préférences (1 à 3 g/kg en sèche, 3 à 5 g/kg en prise). Fibres : 14 g pour 1000 kcal. Graisses saturées et sucres ajoutés sous 10 % des calories.
- Timing et fréquence des repas pèsent peu sur la composition corporelle : 3 à 5 repas, sans fenêtre anabolique de 30 minutes (l'effet dure plus de 24 h). Glucides avant ou après la séance : confort, pas obligation. Après la séance, ce sont les protéines qui comptent.
- Micronutriments : d'abord l'alimentation (fruits et légumes variés, 2 à 3 portions de chaque), puis compléments ciblés. Créatine monohydrate (environ 0,1 g/kg/jour), vitamine D, oméga 3 sont les plus utiles. Caféine 3 à 6 mg/kg, pas après 15 h.
- Entraînement hypertrophie : 8 à 12 séries difficiles par groupe musculaire et par semaine au départ, jusqu'à 10 à 25 selon la récupération, 2 à 3 séances par semaine par groupe, 5 à 20 répétitions, 0 à 3 répétitions en réserve (2 à 3 pour un débutant), repos de 2 à 3 minutes sur les exercices lourds et 1 à 2 minutes sur l'isolation, excentrique contrôlé.
- On ajoute des séries seulement si le client récupère en avance. Si la récupération ou les performances baissent, on gère la fatigue (volume, proximité de l'échec) avant d'ajouter quoi que ce soit. Décharge : réduction du volume ou des charges d'environ la moitié, une semaine ou quelques séances, pas de règle fixe.
- Une femme peut souvent tolérer plus de fréquence et de volume, avec un effort moyen un peu plus haut, mais les moyennes ne décrivent jamais un individu.
- Végétarien ou végan : même fourchette de protéines, haut de fourchette, sources variées et lysine, B12 en complément, vigilance sur le zinc, le fer, le calcium, l'iode et les oméga 3 (algue, car la conversion de l'ALA est faible).
- Troubles du comportement alimentaire (signes : carence énergétique, aménorrhée, restriction, sport à catégorie de poids) : aucun coaching de ce sujet par toi, orientation vers un professionnel de santé et alerte à la coach humaine. Parle du factuel et de la santé, jamais de l'apparence.
- N'affirme jamais qu'une étude prouve quelque chose et ne cite jamais de source, d'auteur ou de « selon… » : dis simplement ce qui marche, en une phrase simple, avec l'action concrète.`;
