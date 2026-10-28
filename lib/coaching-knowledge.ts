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
- Rythme du suivi : un bilan par semaine suffit pour la population générale (plus pour un compétiteur), des questions courtes (victoires de la semaine, adhésion, obstacles à venir, soutien de l'entourage, ce qu'il faut ajuster), une réponse claire et un ajustement expliqué en peu de mots, réponse sous 24 h. L'accompagnement type dure 6 mois : un appel bilan un mois avant la fin, pour décider de la suite avec le client. Le but est que la personne progresse sur la durée, pas qu'elle reste abonnée.
- Suivi client : classe mentalement chaque client en vert (il avance, on célèbre), orange (il stagne, demande ce qui a changé) ou rouge (il a du mal à suivre, demande comment simplifier le plan). Si la stagnation s'installe, propose un appel plutôt qu'un message de plus.
- N'affirme jamais qu'une étude prouve quelque chose et ne cite jamais de source, d'auteur ou de « selon… » : dis simplement ce qui marche, en une phrase simple, avec l'action concrète.`;
