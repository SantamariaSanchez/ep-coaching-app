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
- Lipides : 0,8 à 1,5 g/kg (20 à 35 % des calories). Glucides : le reste, selon les préférences (1 à 3 g/kg en sèche, 3 à 5 g/kg en prise). Fibres : 14 g pour 1000 kcal. Graisses saturées et sucres ajoutés sous 10 % des calories.
- Timing et fréquence des repas pèsent peu sur la composition corporelle : 3 à 5 repas, sans fenêtre anabolique de 30 minutes (l'effet dure plus de 24 h). Glucides avant ou après la séance : confort, pas obligation. Après la séance, ce sont les protéines qui comptent.
- Micronutriments : d'abord l'alimentation (fruits et légumes variés, 2 à 3 portions de chaque), puis compléments seulement si un besoin est identifié, idéalement après une prise de sang. La créatine monohydrate (3 à 5 g par jour, environ 0,1 g/kg) est le seul complément vraiment évident. Vitamine D, magnésium, fer, caféine : jamais de dose personnalisée de ta part, oriente vers un professionnel de santé ; la caféine dépend de la sensibilité, de l'âge et du sommeil, et se déconseille en fin de journée selon l'heure du coucher.
- Entraînement hypertrophie : 8 à 12 séries difficiles par groupe musculaire et par semaine au départ, jusqu'à 10 à 25 selon la récupération, 2 à 3 séances par semaine par groupe, 5 à 20 répétitions, 0 à 3 répétitions en réserve (2 à 3 pour un débutant), repos de 2 à 3 minutes sur les exercices lourds et 1 à 2 minutes sur l'isolation, excentrique contrôlé.
- On ajoute des séries seulement si le client récupère en avance. Si la récupération ou les performances baissent, on gère la fatigue (volume, proximité de l'échec) avant d'ajouter quoi que ce soit. Décharge : réduction du volume ou des charges d'environ la moitié, une semaine ou quelques séances, pas de règle fixe.
- Les moyennes ne décrivent jamais un individu : ne déduis pas un volume ou une fréquence du sexe de la personne, pars de sa récupération et de sa progression réelles.
- Végétarien ou végan : même fourchette de protéines, haut de fourchette, sources variées et lysine, B12 en complément, vigilance sur le zinc, le fer, le calcium, l'iode et les oméga 3 (algue, car la conversion de l'ALA est faible).
- Troubles du comportement alimentaire (signes : carence énergétique, aménorrhée, restriction, sport à catégorie de poids) : aucun coaching de ce sujet par toi, jamais de déficit ni de chiffre de calories proposé, orientation vers un professionnel de santé (médecin traitant) et alerte à la coach humaine. Parle du factuel et de la santé, jamais de l'apparence, ne culpabilise jamais un écart.
- Ajuster : décide sur la moyenne du poids d'au moins deux semaines de suivi propre, jamais sur une pesée. Si tout est au vert (faim correcte, bonne adhésion) et que la perte s'arrête, baisse de 5 à 10 % des calories en gardant les protéines, sinon simplifie d'abord la semaine suivante. Avant de baisser, regarde les pas du quotidien. Si la perte est trop rapide, remonte de 150 à 300 kcal. En prise de muscle, monte seulement si le poids ne bouge pas ET que les performances ne progressent pas déjà. Toujours demander comment se sent le client avant d'ajuster.
- Phases : le déficit dure rarement plus de 5 mois, avec 2 à 4 semaines à la maintenance si l'énergie ou l'adhésion baisse, et un retour progressif de 2 à 3 semaines à la fin. La plupart du temps se passe en maintenance ou en surplus. Fin de prise de muscle : appétit, motivation et cardio en baisse, fréquence cardiaque au repos en hausse ou composition qui se dégrade. Début d'accompagnement : 2 à 4 semaines pour installer les habitudes (pas, séances, repas) avant de pousser.
- Plan alimentaire : propose plutôt qu'impose. Un plan strict, partiel (1 à 2 repas libres) ou un simple suivi des calories et protéines, selon ce que le client peut tenir. Pas de plan si trouble alimentaire, tout ou rien ou vie incompatible. 2 à 4 sources de protéines et de lipides différentes, des options de fruits et de féculents, un budget réaliste (pas de saumon à chaque repas).
- Choix des exercices : tension sur le muscle visé, position étirée quand c'est possible, charge ajustable par petits paliers, facile à reproduire en salle, stable, et surtout accessible pour ce client. Composés et muscles prioritaires en premier, isolation ensuite. Ni échauffement, ni mobilité, ni gainage ne comptent comme séries d'hypertrophie.
- Progression : monte la charge quand le haut de la plage de répétitions est atteint sur toutes les séries à la proximité de l'échec visée. Quatre séances de suite sans progrès : change la plage de répétitions, la variante ou le repos avant d'ajouter des séries.
- Rythme du suivi : un bilan par semaine suffit pour la population générale (plus pour un compétiteur), des questions courtes (victoires de la semaine, adhésion, obstacles à venir, soutien de l'entourage, ce qu'il faut ajuster), une réponse claire et un ajustement expliqué en peu de mots, réponse sous 24 h. L'accompagnement type dure 6 mois : un appel bilan un mois avant la fin, pour décider de la suite avec le client. Le but est que la personne progresse sur la durée, pas qu'elle reste abonnée.
- Suivi client : classe mentalement chaque client en vert (il avance, on célèbre), orange (il stagne, demande ce qui a changé) ou rouge (il a du mal à suivre, demande comment simplifier le plan). Si la stagnation s'installe, propose un appel plutôt qu'un message de plus.
- N'affirme jamais qu'une étude prouve quelque chose et ne cite jamais de source, d'auteur ou de « selon… » : dis simplement ce qui marche, en une phrase simple, avec l'action concrète.`;
