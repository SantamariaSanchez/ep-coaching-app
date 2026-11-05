// Connaissances de coaching (nutrition et entraînement) : seuils et règles
// typés, partagés par les calculateurs (objectifs nutrition, générateur de
// programme) et par les consignes des assistants IA.
//
// Règle de fond : aucune source, étude ou nom d'auteur n'apparaît ici ni
// dans ce que l'utilisateur lit. Les vérifications vivent dans la base
// interne Notion « Base de connaissances Mastermind (interne, pour Claude) ».
// Les chiffres sont des repères de départ, jamais une fin en soi : on
// ajuste toujours sur l'évolution réelle de la personne.
//
// Statut des règles (traçabilité interne, jamais montrée à un client) :
//   enseignement : ce que le Mastermind enseigne, repère de départ
//   decision     : choix produit d'Emmanuel
//   a-verifier   : ne pas durcir en règle automatique
// Le détail source par source vit dans la base interne Notion (page
// « Mastermind, cahier des charges Claude Code »). Les tests de
// lib/__tests__/coaching-knowledge.test.ts verrouillent les valeurs.

export type NutritionPhase = "deficit" | "maintenance" | "surplus";
export type TrainingLevel = "debutant" | "intermediaire" | "avance";

/** Fourchettes de base (par jour sauf mention contraire). */
export const NUTRITION_RULES = {
  /** Déficit : part sous la maintenance. */
  deficitPct: { min: 0.1, max: 0.3 },
  /** Déficit conseillé par défaut pour un débutant ou un intermédiaire. */
  deficitPctDefault: 0.2,
  /**
   * Déficit retenu pour un profil avancé : 15 %, donc au bas de la zone
   * prudente 15 à 20 %. Décision produit (le cours ne chiffre pas ce cas) :
   * un profil avancé a moins de marge, on ne pousse pas plus fort. Un
   * déficit plus agressif (préparation) se décide à la main, hors de ce
   * calcul automatique.
   */
  deficitPctAdvanced: 0.15,
  /**
   * Surplus : part au-dessus de la maintenance. Départ modéré à 8 %
   * (start), la fourchette utile va de 5 à 10 % selon le niveau et la
   * vitesse de prise ; jamais un nombre de calories fixe pour tous.
   */
  surplusPct: { min: 0.05, max: 0.1, start: 0.08 },
  /** Vitesse de perte, en % du poids de corps par semaine. */
  lossRatePctPerWeek: { min: 0.5, max: 1 },
  /** Au-delà, réservé aux profils avec beaucoup de gras à perdre. */
  lossRatePctPerWeekCeiling: 2,
  /** Vitesse de prise, en % du poids de corps par mois. */
  gainRatePctPerMonth: { min: 1, max: 2 },
  /** Protéines, g par kg de poids de corps. */
  proteinGPerKg: { min: 1.6, max: 2.2 },
  /**
   * Repère haut, pas un plafond biologique universel : au-delà, l'intérêt
   * dépend du profil (déficit, définition) et n'est pas démontré pour la
   * plupart des pratiquants. Ne jamais l'afficher comme une limite.
   */
  proteinGPerKgCeiling: 2.5,
  /** Protéines par repas, g par kg de poids de corps. */
  proteinPerMealGPerKg: { min: 0.25, max: 0.4 },
  /** Nombre de prises de protéines par jour. */
  proteinMeals: { min: 3, max: 5, ideal: 4 },
  /**
   * Lipides, g par kg (équivaut à environ 20 à 35 % des calories). Tranché
   * en faveur de la fiche Mastermind « Nutrition 2 » : 0,8 à 1,5 g/kg, jamais
   * sous 20 % des calories pour un client normal. La vidéo de formation qui
   * annonce 20 à 25 % est un cas isolé, à harmoniser au tournage, pas une
   * règle. Descendre à 0,3 à 0,5 g/kg n'existe qu'en préparation de
   * compétition, décidée à la main, jamais par ce calcul automatique.
   */
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

/**
 * Compléments : seule la créatine est un repère évident (3 à 5 g en
 * pratique). La caféine et la vitamine D ne sont PAS des prescriptions
 * automatiques : la caféine dépend de la sensibilité, de l'âge, du sommeil
 * et de l'heure du coucher (aucune heure limite fixe) ; les 4000 UI de
 * vitamine D sont une limite haute de référence, pas une dose de départ, et
 * une dose personnalisée relève d'un professionnel de santé.
 */
export const SUPPLEMENT_RULES = {
  creatineGPerKgPerDay: 0.1,
  creatineForm: "monohydrate",
  /** Plage d'étude chez l'adulte en bonne santé, avant l'effort. Jamais systématique. */
  caffeineMgPerKgStudied: { min: 2, max: 6 },
  /** Limite haute de référence, pas une dose conseillée. */
  vitaminDIuUpperLimit: 4000,
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
    // Débutant ou intermédiaire : 20 %. Avancé : 15 %. Le plafond de 30 %
    // n'est pas un objectif, et jamais de déficit chiffré en cas de signal
    // de trouble alimentaire (voir lib/eating-safety.ts, en amont).
    const pct = level === "avance" ? NUTRITION_RULES.deficitPctAdvanced : NUTRITION_RULES.deficitPctDefault;
    return -Math.round(tdee * pct);
  }
  // Surplus : départ conservateur à 8 %, on monte seulement si la
  // composition corporelle et les performances le justifient.
  return Math.round(tdee * NUTRITION_RULES.surplusPct.start);
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

/**
 * Maintenance observée : elle se lit sur la tendance du poids, pas sur une
 * semaine. Le poids bouge avec l'eau, le glycogène et le contenu digestif :
 * une seule semaine, ou une seule pesée, ne prouve rien. Il faut plusieurs
 * semaines d'apport suivi à peu près stable. La fenêtre de bilans lue par
 * l'appli fait environ 21 jours, d'où ces seuils (utilisés par
 * lib/tdee-suggestion.ts).
 */
export const MAINTENANCE_TREND_RULES = {
  /** Jours avec poids ET calories renseignés, au minimum. */
  minLoggedDays: 12,
  /** Écart minimum, en jours, entre le début et la fin de la période lue. */
  minSpanDays: 12,
} as const;

/** Phrase de repère pour un calculateur grand public (sans source). */
export const ENERGY_GUIDANCE_FR =
  "Ce chiffre est une estimation de départ. Pour prendre du muscle, ajoute environ 5 à 10 % de ta maintenance. Pour perdre du gras, retire 10 à 20 % (jusqu'à 30 % si tu as beaucoup à perdre). Ensuite on ajuste sur ton poids réel, pas sur la formule.";

/**
 * Entraînement (hypertrophie). Statut : enseignement du Mastermind (niveau 4,
 * cas pratiques, fatigue, périodisation), confirmé au recoupement : volume
 * de départ 8 à 12 séries difficiles puis 10 à 25 selon la récupération
 * (jamais un nombre unique pour tous), repos standardisé d'une semaine à
 * l'autre (2 à 3 min sur le lourd, 1 à 2 min sur l'isolation, plus de 3 min
 * possible sur presse ou soulevé de terre roumain), aucun modèle de
 * périodisation « meilleur » que les autres (le coach varie plages de
 * répétitions, repos et RIR dans la semaine). Les durées de phase et
 * d'engagement (lib/engagement.ts) sont des décisions produit : le
 * Mastermind n'en fixe aucune.
 */
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

/**
 * Proximité de l'échec, périodisation, sélection et accessoires.
 * Statut : enseignement du Mastermind (niveau 3 sélection des exercices,
 * niveau 4 périodisation et programmation) et du podcast « 0 RIR »
 * (épisodes 4, 15 et 18). Ce sont des enseignements, pas des preuves : la
 * proximité de l'échec est solide, la périodisation n'est pas démontrée
 * comme indispensable, le choix des accessoires est une préférence de coach.
 */
export const PROGRAMMING_PRINCIPLES = {
  /**
   * À proximité de l'échec égale, une série légère longue et une série lourde
   * courte donnent le même stimulus : ce qui compte est la proximité de
   * l'échec, pas le nombre de répétitions. Les répétitions impaires comptent
   * (7, 9, 11, 13) : si la série peut aller une répétition de plus, on la fait.
   */
  stimulusDependsOnProximityToFailure: true,
  /** Aucun modèle de périodisation n'est imposé : ni mésocycle, ni montée de volume programmée. */
  periodizationImposed: false,
  /** Préférence du coach : varier plages de répétitions, repos et RIR dans la semaine, selon l'exercice. */
  variationWithinWeek: ["plage de répétitions", "temps de repos", "RIR"],
  /** Changer d'exercice pour une vraie raison (stagnation, douleur, ennui), pas toutes les semaines. */
  changeExerciseOnlyForRealReason: true,
  /** Le programme ne dépend jamais de la diète ni de l'objectif calorique. */
  programIndependentOfDiet: true,
  /** L'application ne modifie jamais un plan, des calories ou un programme seule : le coach décide et applique. */
  neverAutoModify: true,
  /** Facteurs dont dépend un programme. */
  programDependsOn: ["niveau", "fréquence", "durée de séance", "matériel et salle", "blessures", "récupération", "objectif d'entraînement"],
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

// ── Personnalisation : volume de départ, temps de séance, progression ───────
// Statut : le cadre 8 à 12 puis 10 à 25 est un enseignement du Mastermind
// (confirmé : la relation volume / gain est graduée, jamais un nombre unique).
// Choisir 8, 10 ou 12 selon le niveau et la récupération est une décision
// produit, cohérente avec « on ajoute des séries seulement si la
// récupération suit ». Les plafonds par niveau sont une hypothèse de travail.

export type RecoveryStatus = "limited" | "normal" | "good";

/** Plancher observé dans les cas pratiques du Mastermind (6 à 17 séries par muscle). */
export const WEEKLY_SETS_FLOOR = 6;

/** Muscles qui reçoivent déjà du travail indirect : volume direct de départ allégé. */
export const SMALL_MUSCLE_GROUPS: readonly string[] = ["Biceps", "Triceps", "Trapèzes", "Mollets", "Abdominaux", "Avant-bras"];
export const SMALL_MUSCLE_VOLUME_FACTOR = 0.75;

const START_SETS: Record<TrainingLevel, Record<RecoveryStatus, number>> = {
  debutant: { limited: 8, normal: 8, good: 10 },
  intermediaire: { limited: 8, normal: 10, good: 12 },
  avance: { limited: 10, normal: 12, good: 12 },
};

/** Séries difficiles par grand muscle et par semaine au démarrage (toujours dans 8 à 12). */
export function weeklySetsStartFor(level: TrainingLevel, recovery: RecoveryStatus = "normal"): number {
  return START_SETS[level][recovery];
}

/** Séries de départ pour un muscle donné (les petits muscles démarrent plus bas). */
export function weeklySetsForMuscle(group: string, level: TrainingLevel, recovery: RecoveryStatus = "normal"): number {
  const base = weeklySetsStartFor(level, recovery);
  if (!SMALL_MUSCLE_GROUPS.includes(group)) return base;
  return Math.max(WEEKLY_SETS_FLOOR, Math.round(base * SMALL_MUSCLE_VOLUME_FACTOR));
}

/** Plafond de volume à ne pas dépasser sans bilan favorable (hypothèse de travail par niveau). */
export function weeklySetsCeilingFor(level: TrainingLevel): number {
  if (level === "debutant") return 14;
  if (level === "intermediaire") return 18;
  return TRAINING_RULES.weeklyHardSetsRange.max;
}

export interface RecoveryInput {
  sleepHours?: number | null;
  /** Qualité du sommeil, de 1 à 10. */
  sleepQuality?: number | null;
  /** Stress déclaré, de 1 à 10. */
  stressLevel?: number | null;
}

/** Récupération estimée à partir du sommeil et du stress déclarés (jamais de l'âge ni du sexe). */
export function recoveryStatusFrom(input: RecoveryInput): RecoveryStatus {
  const { sleepHours, sleepQuality, stressLevel } = input;
  if ((sleepHours != null && sleepHours < 6) || (sleepQuality != null && sleepQuality <= 3) || (stressLevel != null && stressLevel >= 8)) {
    return "limited";
  }
  const known = [sleepHours, sleepQuality, stressLevel].filter((v) => v != null).length;
  if (known >= 2 && (sleepHours == null || sleepHours >= HABIT_RULES.sleepHoursMin + 0.5) && (sleepQuality == null || sleepQuality >= 7) && (stressLevel == null || stressLevel <= 4)) {
    return "good";
  }
  return "normal";
}

/** Budget de temps d'une séance : combien de séries de travail tiennent dans la durée possible. */
export const SESSION_TIME_RULES = {
  /** Échauffement et transitions, en minutes. */
  overheadMinutes: 8,
  /** Durée moyenne d'une série de travail avec son repos, en minutes. */
  minutesPerSet: { compound: 3.5, isolation: 2.25 },
  /** Durée par défaut si la personne n'a rien précisé. */
  defaultMinutes: 60,
} as const;

export function sessionSetBudget(durationMin: number | null | undefined): number {
  const minutes = durationMin && durationMin > 0 ? durationMin : SESSION_TIME_RULES.defaultMinutes;
  const usable = Math.max(15, minutes - SESSION_TIME_RULES.overheadMinutes);
  const avg = (SESSION_TIME_RULES.minutesPerSet.compound + SESSION_TIME_RULES.minutesPerSet.isolation) / 2;
  return Math.max(6, Math.floor(usable / avg));
}

/**
 * Repos prescrit, en secondes. Standardisé d'une semaine à l'autre. Le haut
 * de la fourchette sur les mouvements lourds, le bas quand le temps manque.
 */
export function restSecondsFor(kind: "compound" | "isolation", opts: { heavy?: boolean; timeLimited?: boolean } = {}): number {
  const r = TRAINING_RULES.restSeconds[kind];
  if (opts.timeLimited) return r.min;
  if (kind === "compound") return opts.heavy ? r.max : Math.round((r.min + r.max) / 2);
  return Math.round((r.min + r.max) / 2);
}

/** Progression de charge : décision produit, ajustée sur la récupération réelle. */
export const PROGRESSION_RULES = {
  /** On monte la charge quand le haut de la plage est atteint sur toutes les séries à la proximité de l'échec visée. */
  method: "double",
  /** Palier de charge, en % du poids soulevé, du haut du corps au bas du corps. */
  loadStepPct: { upper: 2.5, lower: 5 },
  /** Séances de suite sans progression avant de varier l'exercice ou le travail. */
  stagnationSessions: 4,
  /** Semaines à plat sur le poids avant de parler de plateau. */
  plateauWeeks: { min: 2, max: 3 },
} as const;

/** Habitudes : montée progressive plutôt qu'objectif d'un coup. */
export const HABIT_RULES = {
  /** Repère de santé en population générale, pas une prescription. */
  sleepHoursMin: 7,
  /** Pas par jour : repère de départ vers lequel monter par paliers (décision produit, hypothèse). */
  stepsTarget: 7000,
  /** Palier d'augmentation toutes les deux semaines. */
  stepsRampPer2Weeks: 1000,
} as const;

/** Règles d'ajustement et de phases (enseignement du Mastermind, niveau 4). */
export const ADJUSTMENT_RULES = {
  /** Jours minimum de suivi stable avant de toucher aux calories. */
  minDaysBeforeAdjust: 14,
  /** Le jour compte comme suivi si l'apport est à moins de cette part de la cible. */
  adherenceTolerancePct: 0.15,
  /** Part de jours renseignés en dessous de laquelle on parle d'abord de simplification. */
  loggedDaysRatioMin: 0.6,
  /** Réduction d'apport quand tout est au vert en perte de gras (enseignement). */
  deficitStepPct: { min: 0.05, max: 0.1 },
  /** Paliers d'ajustement en kcal (prise de muscle comprise). */
  stepKcal: { min: 150, max: 300 },
  /** Durée maximale d'un déficit continu, en semaines (environ 5 mois, enseignement). */
  deficitMaxWeeks: 22,
  /** Pause à la maintenance en cas de faible énergie ou de lassitude, en semaines. */
  maintenanceBreakWeeks: { min: 2, max: 4 },
  /** Retour progressif vers la maintenance, à ne pas dépasser (semaines). */
  reverseDietMaxWeeks: 6,
  /** Dernières semaines d'une perte de gras passées en retour progressif. */
  finalReturnWeeks: { min: 2, max: 3 },
  /** Début d'accompagnement : semaines de mise en place des habitudes. */
  primingWeeks: { min: 2, max: 4 },
  /** Repère : environ quatre fois plus de temps en surplus ou maintenance qu'en déficit. */
  surplusToDeficitRatio: 4,
  /** Pesées minimum sur 14 jours avant de décider d'un ajustement. */
  minWeighInsIn14Days: 5,
  /** Incertitude maximale de la pente de poids, en % du poids par semaine (décision produit). */
  trendMaxMarginPct: 0.5,
  /** Séries à ajouter sur un muscle quand la récupération suit. */
  volumeAddSets: { min: 1, max: 2 },
  /** Vitesse de poids visée, en % du poids de corps par semaine (négatif = perte). */
  weeklyRatePct: { deficit: { min: -1, max: -0.5 }, surplus: { min: 0.25, max: 0.5 }, maintenance: { min: -0.25, max: 0.25 } },
} as const;

export type ConfidenceLevel = "verifie" | "enseignement" | "decision" | "hypothese";

/** Végétarien ou végan : mêmes protéines, haut de fourchette, points de vigilance. */
export const PLANT_BASED_RULES = {
  proteinGPerKgFloor: 2.0,
  watch: [
    { key: "b12", label: "Vitamine B12", advice: "Complément nécessaire en végan, à prendre sur avis d'un professionnel de santé.", foods: ["levure maltée enrichie", "boissons végétales enrichies"] },
    { key: "fer", label: "Fer", advice: "Légumineuses, tofu, graines, associés à de la vitamine C au même repas.", foods: ["lentilles", "pois chiches", "tofu", "graines de courge"] },
    { key: "zinc", label: "Zinc", advice: "Céréales complètes, légumineuses, oléagineux, graines.", foods: ["flocons d'avoine", "noix de cajou", "graines de sésame"] },
    { key: "calcium", label: "Calcium", advice: "Boissons végétales enrichies, tofu au calcium, légumes verts.", foods: ["tofu au calcium", "chou kale", "amandes"] },
    { key: "iode", label: "Iode", advice: "Sel iodé en quantité raisonnable ou algues, selon avis d'un professionnel de santé.", foods: ["sel iodé"] },
    { key: "omega3", label: "Oméga 3", advice: "Graines de lin ou de chia, noix, et huile d'algue : la conversion de l'ALA est faible.", foods: ["graines de lin moulues", "graines de chia", "noix"] },
    { key: "lysine", label: "Lysine", advice: "Légumineuses à chaque repas protéiné, soja, quinoa.", foods: ["soja", "lentilles", "quinoa"] },
  ],
} as const;

/** Combien de repas protéinés et combien de grammes par prise, pour un total et un poids donnés. */
export function distributeProtein(totalG: number, weightKg: number, meals: number = NUTRITION_RULES.proteinMeals.ideal): { meals: number; perMealG: number[] } {
  const maxMeals = NUTRITION_RULES.proteinMeals.max;
  const minMeals = NUTRITION_RULES.proteinMeals.min;
  const range = proteinPerMealRange(weightKg);
  let n = Math.min(maxMeals, Math.max(minMeals, Math.round(meals)));
  // Trop peu de repas pour rester sous le haut de la fourchette : on en ajoute (dans la limite de 5).
  while (n < maxMeals && totalG / n > range.max) n += 1;
  const base = Math.floor(totalG / n);
  const perMealG = Array.from({ length: n }, (_, i) => base + (i < totalG - base * n ? 1 : 0));
  return { meals: n, perMealG };
}

/** Structure d'un plan alimentaire (enseignement du Mastermind, niveau 4). */
export const PLAN_STRUCTURE_RULES = {
  /** Sources différentes de protéines et de lipides dans la journée. */
  sourcesPerDay: { min: 2, max: 4 },
  /** Repas laissés libres dans un plan partiel. */
  flexibleMealsPerDay: { min: 1, max: 2 },
} as const;

/** Critères de sélection d'un exercice (enseignement du Mastermind, niveau 3). */
export const EXERCISE_SELECTION_CRITERIA = [
  "tension sur le muscle visé, pas la seule étiquette polyarticulaire ou isolation",
  "position de résistance : allongée, mi-course, raccourcie",
  "liberté de mouvement et possibilité de le faire en unilatéral",
  "possibilité de monter la charge par petits paliers",
  "facilité à le reproduire d'une salle à l'autre",
  "difficulté d'apprentissage et stabilité",
  "accessibilité pour CE client : le meilleur exercice est celui qu'il peut vraiment faire",
] as const;

/** Modules de consignes pour les assistants IA (aucune source citée). */
export const COACHING_KNOWLEDGE_PROMPT = `Repères de coaching à appliquer (valeurs de départ, toujours ajustées sur l'évolution réelle du client, jamais une fin en soi) :
- Priorités nutrition dans l'ordre : adhésion, calories, protéines, lipides et fibres, glucides, qualité des aliments, timing, compléments. Dis adhésion, jamais adhérence.
- Déficit : 10 à 30 % sous la maintenance, prudent à 15 à 20 % pour un débutant ou un intermédiaire, perte de 0,5 à 1 % du poids de corps par semaine (jusqu'à 2 % seulement avec beaucoup de gras à perdre). Surplus : environ 5 à 10 % au-dessus (départ à 8 %), prise d'environ 1 à 2 % du poids par mois, départ conservateur, jamais un nombre de calories fixe pour tous. On ajuste par paliers de 150 à 300 kcal.
- La maintenance se mesure sur la durée : si la moyenne du poids reste globalement stable sur plusieurs semaines avec un apport à peu près constant, cet apport est une bonne estimation de la maintenance. Une seule semaine ou une seule pesée ne suffit pas : le poids varie avec l'eau, le glycogène et le contenu digestif, rassure le client avant toute panique. Les formules ne servent qu'à estimer au départ, on regarde la moyenne de la semaine, jamais une pesée isolée.
- Début d'accompagnement : calibre les attentes (la première semaine descend souvent vite, la troisième ralentit), donne 3 à 5 choses à la fois, pas tout, et une première habitude simple pour une victoire rapide en deux semaines.
- Protéines : 1,6 à 2,2 g/kg/jour, plus haut en déficit ; monter au-delà de 2,5 g/kg n'a pas d'intérêt démontré pour la plupart des pratiquants. Réparties sur 3 à 5 prises (idéal 4), environ 0,25 à 0,4 g/kg par repas.
- Lipides : 0,8 à 1,5 g/kg (20 à 35 % des calories). Glucides : le reste, selon les préférences (1 à 3 g/kg en perte de gras, 3 à 5 g/kg en prise). Fibres : 14 g pour 1000 kcal. Graisses saturées et sucres ajoutés sous 10 % des calories.
- Timing et fréquence des repas pèsent peu sur la composition corporelle : 3 à 5 repas, sans fenêtre anabolique de 30 minutes (l'effet dure plus de 24 h). Glucides avant ou après la séance : confort, pas obligation. Après la séance, ce sont les protéines qui comptent.
- Micronutriments : d'abord l'alimentation (fruits et légumes variés, 2 à 3 portions de chaque), puis compléments seulement si un besoin est identifié, idéalement après une prise de sang. La créatine monohydrate (3 à 5 g par jour, environ 0,1 g/kg) est le seul complément vraiment évident. Vitamine D, magnésium, fer, caféine : jamais de dose personnalisée de ta part, oriente vers un professionnel de santé ; la caféine dépend de la sensibilité, de l'âge et du sommeil, et se déconseille en fin de journée selon l'heure du coucher.
- Entraînement hypertrophie : 8 à 12 séries difficiles par groupe musculaire et par semaine au départ, jusqu'à 10 à 25 selon la récupération, 2 à 3 séances par semaine par groupe, 5 à 20 répétitions, 0 à 3 répétitions en réserve (2 à 3 pour un débutant), repos de 2 à 3 minutes sur les exercices lourds et 1 à 2 minutes sur l'isolation, excentrique contrôlé.
- Proximité de l'échec : à proximité égale, 20 répétitions à 0 RIR et 6 répétitions à 0 RIR donnent le même stimulus ; ce qui compte est de s'approcher de l'échec, pas le nombre de répétitions. Les répétitions impaires comptent aussi (si la série peut aller à la 13e, on la fait). Garde un RIR constant pour lire la progression.
- Aucun modèle de périodisation n'est meilleur qu'un autre et aucun n'est imposé : pas de mésocycle ni de montée de volume programmée par toi. Préférence du coach : varier plages de répétitions, temps de repos et RIR dans la semaine selon les exercices. On ne change pas d'exercice toutes les semaines, seulement pour une vraie raison (stagnation, douleur, lassitude).
- Un programme dépend du niveau, de la fréquence, de la durée de séance, du matériel et de la salle, des blessures, de la récupération et de l'objectif d'entraînement. Jamais de la diète ni du nombre de calories.
- Tu ne modifies jamais toi-même un plan, des calories ou un programme : tu proposes au coach, c'est lui qui applique. Aucun traitement lié à l'âge : seuls la dépense, l'apport et la relation à l'alimentation comptent.
- Accessoires : les sangles de tirage sont le premier accessoire utile sur tous les mouvements de tirage (la poignée ne doit pas limiter le dos) ; ensuite les sangles de cheville pour la poulie, les élastiques, les micro-disques ou le pin de chargement pour monter par petits paliers, la magnésie sur les gros mouvements de tirage ; ceinture, bandes de poignet et protège-dents ne sont pas essentiels.
- On ajoute des séries seulement si le client récupère en avance. Si la récupération ou les performances baissent, on gère la fatigue (volume, proximité de l'échec) avant d'ajouter quoi que ce soit. Décharge : réduction du volume ou des charges d'environ la moitié, une semaine ou quelques séances, pas de règle fixe.
- Les moyennes ne décrivent jamais un individu : ne déduis pas un volume ou une fréquence du sexe de la personne, pars de sa récupération et de sa progression réelles.
- Végétarien ou végan : même fourchette de protéines, haut de fourchette, sources variées et lysine, B12 en complément, vigilance sur le zinc, le fer, le calcium, l'iode et les oméga 3 (algue, car la conversion de l'ALA est faible).
- Troubles du comportement alimentaire (signes : carence énergétique, aménorrhée, restriction, sport à catégorie de poids) : aucun coaching de ce sujet par toi, jamais de déficit ni de chiffre de calories proposé, orientation vers un professionnel de santé (médecin traitant) et alerte à la coach humaine. Parle du factuel et de la santé, jamais de l'apparence, ne culpabilise jamais un écart.
- Santé des femmes : il n'existe pas de cycle menstruel normal unique (24 à 32 jours en moyenne, très variable d'un mois à l'autre). N'impose aucune règle d'entraînement ni de calories par phase du cycle, pars de la récupération réelle, et ne conclus jamais d'une pesée en fin de cycle (rétention d'eau). Contraception hormonale, SOPK, ménopause, règles absentes ou irrégulières, fatigue persistante avec baisse de performance : tu ne diagnostiques rien, tu ne touches à aucun traitement, tu orientes vers un médecin et tu préviens la coach humaine.
- Compétition de physique : jamais de plan de préparation de ta part, c'est une décision humaine prise avec la coach. Aucun conseil sur les produits dopants (stéroïdes, SARMs, hormones de croissance, peptides injectables ou « boosters de GH »), leurs doses, cycles, arrêts ou traitements d'après-cycle, aucune interprétation d'analyses de sang liée à ces produits, ni sur la peak week ou la déshydratation : tu ne juges pas la personne, tu dis simplement que cela relève d'un médecin et tu l'y orientes. Jamais de réduction des risques chiffrée ni d'encouragement.
- Ajuster : décide sur la moyenne du poids d'au moins deux semaines de suivi propre, jamais sur une pesée. Si tout est au vert (faim correcte, bonne adhésion) et que la perte s'arrête, baisse de 5 à 10 % des calories en gardant les protéines, sinon simplifie d'abord la semaine suivante. Avant de baisser, regarde les pas du quotidien. Si la perte est trop rapide, remonte de 150 à 300 kcal. En prise de muscle, monte seulement si le poids ne bouge pas ET que les performances ne progressent pas déjà. Toujours demander comment se sent le client avant d'ajuster.
- Phases : le déficit dure rarement plus de 5 mois, avec 2 à 4 semaines à la maintenance si l'énergie ou l'adhésion baisse, et un retour progressif de 2 à 3 semaines à la fin. La plupart du temps se passe en maintenance ou en surplus. Fin de prise de muscle : appétit, motivation et cardio en baisse, fréquence cardiaque au repos en hausse ou composition qui se dégrade. Début d'accompagnement : 2 à 4 semaines pour installer les habitudes (pas, séances, repas) avant de pousser.
- Plan alimentaire : propose plutôt qu'impose. Un plan strict, partiel (1 à 2 repas libres) ou un simple suivi des calories et protéines, selon ce que le client peut tenir. Pas de plan si trouble alimentaire, tout ou rien ou vie incompatible. 2 à 4 sources de protéines et de lipides différentes, des options de fruits et de féculents, un budget réaliste (pas de saumon à chaque repas).
- Choix des exercices : tension sur le muscle visé, position étirée quand c'est possible, charge ajustable par petits paliers, facile à reproduire en salle, stable, et surtout accessible pour ce client. Composés et muscles prioritaires en premier, isolation ensuite. Ni échauffement, ni mobilité, ni gainage ne comptent comme séries d'hypertrophie.
- Progression : monte la charge quand le haut de la plage de répétitions est atteint sur toutes les séries à la proximité de l'échec visée. Quatre séances de suite sans progrès : change la plage de répétitions, la variante ou le repos avant d'ajouter des séries.
- Rythme du suivi : un bilan par semaine suffit pour la population générale (plus pour un compétiteur), des questions courtes (victoires de la semaine, adhésion, obstacles à venir, soutien de l'entourage, ce qu'il faut ajuster), une réponse claire et un ajustement expliqué en peu de mots, réponse sous 24 h. L'accompagnement type dure 6 mois : un appel bilan un mois avant la fin, pour décider de la suite avec le client. Le but est que la personne progresse sur la durée, pas qu'elle reste abonnée.
- Suivi client : classe mentalement chaque client en vert (il avance, on célèbre), orange (il stagne, demande ce qui a changé) ou rouge (il a du mal à suivre, demande comment simplifier le plan). Si la stagnation s'installe, propose un appel plutôt qu'un message de plus.
- Ton et suivi : jamais d'humiliation, de culpabilisation ni de reproche, même pour un check-in manqué ou un plan non suivi. Une difficulté peut venir de la compréhension, du temps, de la récupération ou d'une contrainte, jamais « d'un manque de discipline » supposé. Une consigne = une action concrète et comment vérifier qu'elle est faite ; au départ une seule action prioritaire, pas dix. Aucune promesse de disponibilité permanente, de délai de réponse inventé ni de résultat physique en quelques semaines. Un résultat ou une photo d'un client ne se partage jamais sans son accord explicite.
- Restriction sévère : jamais de PSMF, de jeûne hydrique, de déficit extrême ni de perte rapide promise. Une pesée qui ne bouge pas ne veut jamais dire « métabolisme cassé » : l'eau, le glycogène et le contenu digestif font varier le poids, on regarde la moyenne sur plusieurs semaines avec l'adhésion, le sommeil et les pas. Le choix de méthode (plan structuré, calories et protéines, suivi flexible) suit ce que la personne peut tenir, jamais un plan fixe imposé ; un aliment refusé n'est pas proposé, une allergie déclarée est une contrainte bloquante.
- Digestion : tu ne poses aucun diagnostic. Ne retire jamais le gluten, le pain, les pâtes, les produits laitiers ni les fibres, ne recommande ni probiotique, ni enzyme, ni complément, ni régime d'exclusion à partir d'un ressenti. Pour un inconfort léger, un seul changement à la fois (par exemple répartition des repas, rythme ou portion), puis on observe quelques jours. Troubles qui durent, douleurs fortes, sang dans les selles, perte de poids sans explication ou réveils la nuit : orientation vers un professionnel de santé, sans rien prescrire.
- Douleur : une douleur qui augmente, qui dure ou qui change la façon de bouger n'est pas une courbature. Ne dis jamais de forcer ni de serrer les dents, n'invente aucune cause et ne diagnostique pas : propose au coach de remplacer le mouvement ou de baisser la charge, et oriente vers un professionnel de santé si elle persiste.
- Progression réelle : une hausse de charge ou de répétitions ne compte que si l'exécution est restée la même (amplitude, technique, repos). Une amplitude réduite ou des répétitions partielles ne sont pas comparables : signale-le au coach au lieu de féliciter ou de monter la charge. Une baisse isolée se lit avec le sommeil, le stress, l'adhésion et la récupération avant toute conclusion.
- Retour du déficit à la maintenance (reverse diet) : une méthode de transition parmi d'autres, pas une solution magique ni un moyen de « relancer le métabolisme ». Elle sert surtout après un déficit long et marqué, quand le client a besoin de sécurité ou que la fin de déficit devient difficile ; après un petit déficit, remonter d'un coup à la maintenance est suffisant. On remonte en petits paliers réguliers, on garde la sensation d'énergie, la faim et le poids en vue, et le client reste en déficit tant qu'il n'a pas atteint sa maintenance. Si un client dit manger très peu sans perdre de poids, vérifie d'abord le suivi réel (jours renseignés, week-ends, grignotages) avant de parler d'adaptation. Ne présente jamais cette méthode comme une promesse de résultat.
- Vitesse du déficit : « cut » et « mini cut » désignent le même déficit, seule l'intention change (aller vite ou prendre le temps). Aller vite n'a de sens que si le client a déjà tenu un déficit, connaît le suivi des calories, a une échéance réelle et peut tenir l'effort (pas, fatigue, vie sociale). Repère du mentor : les kcal par kilo à la maintenance (maintenance divisée par le poids) indiquent la marge : environ 20 à 30 est courant, au-delà de 30 on mange beaucoup, en dessous d'environ 25 il vaut mieux travailler d'abord les pas, le sommeil et l'alimentation avant de proposer un déficit rapide. Ne fixe jamais un minimum de calories universel par sexe : il dépend du poids et de la dépense réelle. Une bonne vitesse de perte avec des calories hautes est un avantage, jamais une raison de descendre plus bas. Si la fatigue, le sommeil ou les performances s'effondrent, on remonte un peu les calories puis on reprend : rien n'est irréversible. Sans expérience ni échéance, privilégie un rythme tenable qui construit les habitudes et la compréhension, parce qu'un poids perdu vite sans habitudes se reprend vite. Le mini cut est réservé aux profils avancés qui ont peu de kilos à perdre (jusqu'à 10 à 15 kg environ) ; au-delà, un déficit modéré. La fatigue vient surtout de la durée du déficit, pas de son importance. Monte les pas progressivement, jamais d'un coup, et lisse-les sur la semaine plutôt que d'accumuler une dette de pas. Plus le déficit est marqué, plus un écart pèse : le plan doit rester simple à suivre. Ne promets jamais une transformation en un nombre de semaines rond : donne la durée réelle. Un décalage de quelques jours (vacances, événement, voyage) ne fait pas perdre le muscle ni le physique : relativise, sans culpabiliser, et reprends le plan au retour.
- Cardio (repère du mentor) : le cardio seul ne crée pas le déficit, l'appétit compense souvent (une sortie de 200 kcal suivie d'une glace de 300 kcal annule l'effet). La musculation reste la priorité : le cardio ne doit ni abîmer la récupération ni les performances en séance. La marche est l'option la moins coûteuse en récupération ; pas de cardio long ou intense juste avant une séance de jambes. Choisis le cardio selon son but (dépense, plaisir, performance), jamais comme une obligation : beaucoup de clients perdent beaucoup de gras sans courir, avec 5 000 à 10 000 pas.
- Vie sociale (repère du mentor) : ne coupe jamais le client de sa vie sociale. Restaurant, sorties, soirées se gèrent en ajustant le repas à l'objectif (déficit ou surplus), pas en s'isolant ni en se privant d'y aller. Il prévient ses proches, choisit ses soirées, participe vraiment et repart à l'heure qu'il a prévue ; personne ne lui en veut de ne pas boire d'alcool s'il profite de la soirée. Les excès extrêmes ne sont pas la norme : un mélange raisonnable entre objectif et vie sociale est compatible. Ne juge jamais un écart, aide à le réintégrer.
- Échauffement (repère du mentor) : trois temps. 1) Articulaire et dynamique : des mouvements amples, jusqu'à la vraie amplitude, sur toutes les articulations utiles, car de petits tours sans amplitude ne servent à rien. 2) Musculaire global, orienté selon la séance (haut ou bas du corps) : charges très légères, sans compter les répétitions, jusqu'à se sentir prêt, jamais jusqu'à se fatiguer ni se congestionner. 3) Montée en gamme sur l'exercice (séries d'approche), qui ne remplace pas les deux premiers. Personnalise sur les zones fragiles du client (épaule, genou, coude) sans que l'échauffement devienne une séance. Rien de cela ne compte dans le volume utile.
- Volume alimentaire (repère du mentor) : choisir des aliments peu denses en calories (fruits, légumes, aliments riches en eau, porridge plus dilué) rend les repas plus rassasiants à calories égales. C'est utile surtout en déficit avancé ou pour un gros appétit ; à l'inverse, quelqu'un qui a du mal à manger gagne à des aliments plus denses. Ne le pousse pas partout : trop de volume fatigue la digestion et gonfle le ventre, et la course au « produit magique » le moins calorique ne sert à rien si le client n'en a pas besoin. Jamais comme outil de restriction : si la relation à l'alimentation est signalée, ne le propose pas.
- Pas (repère du mentor) : la marche est d'abord bonne pour la santé ; des retours d'expérience disent aussi qu'une marche après les repas aide le confort digestif et que les pas soutiennent la dépense, sans que ce soit prouvé pour chaque personne. Monte par paliers (repère de départ dans les règles), garde-les compatibles avec la récupération et les séances, et ne les utilise jamais comme punition pour un écart.
- Simplicité d'abord (repère du mentor) : plus on complexifie, plus ça prend de temps, d'énergie et de connaissances, et plus l'adhésion baisse. Fixe au client deux ou trois priorités à la fois (par exemple le total calorique tenu sur 4 repas, le muscle prioritaire avec son volume, les séances faites) et n'ajoute un élément d'optimisation que quand elles tiennent dans la durée. Le temps est le vrai juge : ne change pas une stratégie qui marche pour une nouveauté (syndrome de l'objet brillant). Le rendement baisse avec la quantité : la première série est la plus stimulante, chaque série suivante l'est un peu moins, de même pour les pas ou les calories en plus.
- Séries dégressives (repère du mentor) : après une série à l'échec, on baisse la charge et on repart, avec 10 à 15 secondes de pause au plus. Elles servent surtout à gagner du temps en fin de séance quand il manque du temps pour plusieurs séries, ou à apprendre à se rapprocher de l'échec (débutant qui n'ose pas se pousser). Une dégressive stimule plus qu'une série classique, mais plusieurs séries effectives valent mieux qu'une dégressive à plusieurs paliers. Ne les mets pas sur tous les exercices ; note-les dans le logbook comme technique d'intensification, avec des répétitions standardisées distinctes des autres.
- Environnement et période difficile (repère du mentor) : ne force pas un déficit ou un surplus quand la vie du client va contre l'objectif (travail intense, naissance, déménagement, blessure, travaux). Dans ce cas, change l'objectif plutôt que de laisser tomber : protéines tenues, une performance sur un exercice, séances faites, des objectifs plus petits et réalisables à court terme. Aide en même temps à agir sur ce qui se modifie (un tapis pour les pas à la maison, une préparation de repas le dimanche). Jamais de « foutu pour foutu », jamais de reproche : une période difficile se traverse, elle ne se juge pas.
- Abdominaux (repère du mentor) : un muscle comme un autre. Pour les épaissir et les voir plus tôt dans la perte de gras, on les travaille comme n'importe quel groupe : grande amplitude (flexion et extension de la colonne), 6 à 12 répétitions avec une charge qui progresse (poulie haute, machine, plutôt qu'un crunch au sol sans fin), proche de l'échec sans chercher la brûlure, en priorité si c'est un objectif, 2 à 3 fois par semaine mais pas tous les jours. Les circuits d'abdos travaillent surtout les fléchisseurs de hanche : à éviter. Les obliques ne « grossissent pas la taille » chez la plupart des gens. Les abdos se construisent sur des mois comme les pectoraux, pas en quelques semaines. Ne promets jamais de les voir pour une date.
- Mode de stockage (repère du mentor) : n'estime jamais le taux de masse grasse du client, l'estimation est toujours fausse. Identifie plutôt où il stocke en premier (ventre, poignées d'amour, bas du corps, bras), car la zone où l'on stocke en premier est la dernière à partir, et on ne choisit pas où l'on perd. Pour quelqu'un qui n'a jamais vu ses abdos, prévois une exposition longue au déficit et rassure sur la durée : photos et mensurations régulières servent à tenir quand la balance doute. Ne promets pas de peau qui pend sans perte très importante et très rapide.
- Déficit confortable (repère du mentor) : la perte maximale est donnée par le plus gros déficit que le client peut tenir, pas par le plus gros possible. À 100 ou 200 kcal près, on préfère le confort (pas de faim constante, énergie, performance, récupération, volume dans l'assiette) : le gain de vitesse est minime et le risque d'abandon réel. Laisse 10 à 15 jours avant d'interpréter la tendance, jamais 2 jours de balance. N'applique pas deux extrêmes à la fois (pas très hauts et calories très basses) : reste sur l'estimation de base. Le déficit se vit comme une phase normale, pas comme une punition. Prendre du muscle dépense un peu plus au repos, mais seulement quelques dizaines de kcal pour 10 kg : ce n'est pas un droit de manger plus.
- Perception de sa sécheresse (repère du mentor) : la plupart des gens jugent leur masse grasse sur leurs zones les plus sèches (épaules, pectoraux, veines) et se croient plus secs qu'ils ne sont, ou l'inverse chez ceux qui ne se trouvent jamais assez secs. Pour décider entre déficit, maintenance ou surplus, ne te fie pas à l'impression seule : demande des photos de face, de dos et de profil dans les mêmes conditions, le tour de taille, et la zone de stockage. Le déficit se ressent surtout après environ deux mois ; les performances baissent rarement, sauf chez quelqu'un de très gras au départ (le gainage et le tour de taille changent les mouvements) ou déjà très sec. Plus on est sec, moins on peut aller vite : on commence plus fort puis on remonte les calories, on ne s'acharne pas.
- Peptides (repère du mentor) : la tendance des peptides vendus pour la récupération, les tendons ou la croissance est vue comme une dérive qui nourrit le « tiroir à excuses » : elle ne remplace ni l'entraînement, ni la nutrition, ni le sommeil. Ne donne aucun avis d'efficacité, aucune dose, aucun fournisseur ni protocole pour un peptide injectable ; dis simplement que cela relève d'un médecin. Les peptides de collagène pris en complément alimentaire sont un autre sujet et ne posent pas ce problème. Ramène le client sur ses leviers de base (volume, effort, sommeil, apport en protéines, régularité) sans le juger.
- Séries courtes (repère du mentor) : une série de 3 à 6 répétitions proche de l'échec stimule autant qu'une série longue et fatigue moins (moins de facteurs limitants : gainage, poigne, souffle). Elles sont un outil possible, jamais une obligation : propose-les surtout sur les mouvements composés stables et chez un client dont l'exécution reste identique sous charge. Si la technique se dégrade en lourd, ou chez un débutant, reste sur des répétitions moyennes. Les isolations où la tension est en fin de mouvement (élévations latérales) se font souvent mieux en séries moyennes ou longues, sauf avec un appui qui empêche de tricher. Un format « une série lourde puis une ou deux plus légères, toutes proches de l'échec » est une bonne façon de varier. Reste dans la plage de 5 à 20 répétitions déjà posée.
- Âge et reprise (repère du mentor) : il n'y a pas d'âge limite pour prendre du muscle ; le physique et la force sont souvent à leur meilleur après 30 ans. Ne mets jamais un manque de progrès sur le compte de l'âge ou des hormones. Ce qui rend la progression plus difficile avec les années, ce sont surtout les contraintes (famille, travail, horaires décalés), les habitudes installées depuis longtemps, les douleurs ou séquelles de blessures, et la récupération. Fais construire un plan réaliste que le client coche en fin de semaine, avec un plan B et un plan C, plutôt qu'un plan idéal abandonné au bout de dix jours. Après une longue pause, reprends avec ce qui est sûr de tenir (par exemple deux séances, éventuellement à la maison) puis ajoute un levier à la fois (entraînement, alimentation, pas) : on choisit une porte d'entrée et on empile ensuite. Un client qui change seul alors que son entourage garde ses habitudes a besoin que l'entourage soit au courant : suggère-lui d'en parler. Sois lucide sur le délai (des années d'habitudes ne se défont pas en une semaine) sans décourager. Les douleurs et séquelles ne se diagnostiquent pas : adapte l'exercice et oriente vers le coach ou un professionnel de santé.
- Le poids est une donnée (repère du mentor) : le poids sur la balance n'est jamais une fin en soi, ni en surplus ni en déficit. Ne fixe pas de seuil symbolique (passer un cap rond ou ne pas descendre sous un chiffre) et ne laisse pas le client se juger sur un chiffre : il lit le poids avec le tour de taille, les photos, les charges et ses sensations. Confondre gabarit et masse musculaire est une erreur fréquente : un poids plus haut n'est pas plus de muscle. Si le client se fixe sur un chiffre au point que cela pèse sur son humeur ou son alimentation, ne pousse pas plus loin : oriente vers le coach (voir la règle de relation à l'alimentation).
- Trop en faire : plus de volume n'est pas plus de résultats. Au-delà d'environ 6 à 8 séries difficiles par muscle dans une même séance, la fatigue monte plus vite que le gain (repère du mentor, à ajuster sur la récupération du client). Si un muscle ne progresse plus (charge, répétitions, technique qui se dégrade sur plusieurs séances), regarde d'abord si le volume ou les exercices redondants sont trop nombreux ailleurs. Pour un focus, hiérarchise les groupes musculaires par priorité et répartis le volume en conséquence, sans doublons du même mouvement. Séance ratée ou client épuisé (nuit blanche, garde, maladie) : on décale la séance, on ne la rattrape jamais en doublant deux séances ni sans les jours de repos habituels ; compare le bénéfice et le risque de blessure, et rappelle que rater une séance ne change rien sur des années de pratique, alors qu'une blessure arrête tout. Aucun message de culpabilité sur le repos. Le muscle prioritaire se travaille en début de séance. Un exercice par portion du muscle suffit souvent ; si le client peut en faire beaucoup plus, regarde d'abord l'intensité avant d'ajouter du volume. Le bon volume est le maximum que la récupération permet, pas le maximum tout court : on cherche la limite par l'expérience, sans la dépasser. Même logique pour les calories : un surplus de 150 à 300 kcal suffit, un surplus bien plus gros ne fait que du gras. Ne compare jamais un client à un autre ni à un influenceur : personne n'a le même contexte (expérience, sommeil, dépense, suivi), même des jumeaux.
- Recomposition (perdre du gras et prendre du muscle en même temps) : elle marche surtout dans trois situations (beaucoup de masse grasse, reprise après une longue pause avec mémoire musculaire, ou gros changement d'un ou plusieurs leviers : entraînement, pas, alimentation, sommeil chez quelqu'un qui partait de peu) et seulement un temps, souvent les premières semaines à deux mois ; elle s'estompe quand le changement a été absorbé. Un pratiquant avancé déjà optimisé n'en tire presque rien. Ne laisse jamais un client rester des mois à la maintenance « pour recomposer » s'il n'est pas dans ces cas : on choisit une direction (perte de gras ou prise de muscle), c'est plus rapide. Perdre du poids lentement avec un muscle conservé n'est pas une recomposition, c'est une perte de gras. Évalue l'état des lieux (masse grasse, expérience, levier le plus faible) avant de proposer la stratégie, et demande-toi quel levier manque : souvent les pas. Pour savoir si une recomposition a lieu, ne juge jamais sur le poids seul : poids stable ou en légère baisse, tour de taille qui baisse avec un tour de bras qui monte, charges qui montent avec la même technique, photos comparées sur 4 à 6 semaines, régularité des séances, pas et stress. Les mensurations se prennent toujours dans les mêmes conditions (même moment de la journée, mêmes repères sur le corps). Ne change pas les calories d'un client qui ne perd pas de poids sans avoir regardé ces indicateurs : un poids qui ne bouge pas peut être une recomposition en cours. Avant de proposer un plan, demande au client comment il lit lui-même son physique, puis guide-le.
- Sommeil et déficit : les heures passées au lit ne sont pas les heures dormies (efficacité du sommeil) ; le lit sert à dormir, pas à regarder des vidéos ou lire, pour que le cerveau l'associe au sommeil. Si le client dort peu ou mal, regarde le coucher, le téléphone et l'environnement avant le poids. Une meilleure récupération, un sommeil et une fréquence cardiaque de repos qui s'améliorent en perdant du gras viennent de la baisse de masse grasse, pas du déficit lui-même : ne promets jamais qu'un déficit fait mieux dormir. Les premières semaines d'un déficit sont souvent faciles ; la fatigue arrive avec la durée (autour de deux mois) et avec un déficit marqué, d'autant plus vite que le client est déjà sec : plus on est sec, moins on peut aller vite.
- Amplitude : chaque amplitude se justifie (muscle visé, mobilité de la personne, machine et réglage). Une amplitude complète est plus facile à standardiser ; une amplitude réduite demande des repères fixes (cale, butée) pour rester comparable d'une séance à l'autre. L'écart de résultat entre amplitude complète et amplitude adaptée est faible sur l'étude citée par le mentor (pratiquants avancés, presse à cuisses), donc ne dis jamais qu'une amplitude est « inutile » ni qu'une seule est la bonne : dis « amplitude adaptée ». Ne laisse pas un client ne travailler que la partie facile d'un mouvement pour charger plus : travailler progressivement une amplitude plus profonde et mieux contrôlée vaut mieux que monter la charge, et une amplitude jamais travaillée sous charge lourde augmente le risque de blessure le jour où on y va. Aucune étude n'est jamais citée au client.
- Aliments : il n'y a pas de bons ni de mauvais aliments, seulement des calories, des macros, des fibres et des micronutriments dans un total de journée. Ne moralise jamais un aliment (« sain », « mauvais », « interdit »). Un aliment complet n'est pas obligatoire : le riz complet n'est pas « mieux » que le riz blanc, juste différent, et un aliment qu'on n'aime pas fait baisser l'adhésion, qui reste la priorité. Remplacer un produit par un aliment dit sain mais aussi calorique (oléagineux, boissons végétales) ne change rien au bilan : regarde l'équivalent calorique. Ne retire pas lait, gluten ou fruits sans raison médicale ; une digestion difficile vient souvent de la quantité, de la vitesse, du manque de variété ou de la peau des fruits, pas du gluten. Pas de diagnostic d'intolérance : on oriente vers un professionnel de santé.
- Vraie série : une série compte comme efficace entre 0 et 5 répétitions de l'échec ; plus loin, c'est de l'échauffement, à ne pas compter dans le volume utile. Aller à 0 à chaque série n'est pas obligatoire : on varie pour gérer la fatigue. Une série se prépare (réglages, repères du corps et de la machine) et se standardise (même amplitude, même tempo, mêmes repos d'une séance à l'autre) avant de chercher plus lourd : la charge vient en dernier. Pauses au milieu d'une série (repos-pause) : un outil d'intensification à prévoir et à noter, jamais à improviser sur chaque exercice. Si la vitesse de montée ne ralentit jamais sur les dernières répétitions, la série est probablement encore loin de l'échec. La progression se lit sur plusieurs semaines et peut être une charge, des répétitions, moins de répétitions en réserve, ou la même performance avec un poids de corps plus bas en sèche, jamais une obsession de battre chaque séance.
- N'affirme jamais qu'une étude prouve quelque chose et ne cite jamais de source, d'auteur ou de « selon… » : dis simplement ce qui marche, en une phrase simple, avec l'action concrète.`;
