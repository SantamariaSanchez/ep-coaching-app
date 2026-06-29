// Contenu statique du module Psychologie / Mindset — pas de DB nécessaire
// pour les textes, seuls le profil, les logs d'habitudes et le journal sont
// persistés (voir utils/mindset.ts).

export type ProfileType = "competiteur" | "pratiquant" | "debutant";
export type Environment = "etudiant" | "salarie" | "independant" | "parent" | "autre";
export type ObstacleKey =
  | "motivation"
  | "stress"
  | "image_corporelle"
  | "discipline"
  | "social"
  | "temps";

export const PROFILE_TYPES: { key: ProfileType; label: string; description: string }[] = [
  {
    key: "competiteur",
    label: "Compétiteur",
    description: "Tu prépares ou vises une compétition (bodybuilding, powerlifting, autre). Exigence, planification fine, gestion de la pression.",
  },
  {
    key: "pratiquant",
    label: "Pratiquant régulier",
    description: "Tu t'entraînes sérieusement pour progresser, sans objectif de compétition. Constance et plaisir sur la durée.",
  },
  {
    key: "debutant",
    label: "Découverte / reprise",
    description: "Tu débutes ou reprends après une pause. Construire des bases solides et des habitudes durables.",
  },
];

export const ENVIRONMENTS: { key: Environment; label: string }[] = [
  { key: "etudiant", label: "Étudiant" },
  { key: "salarie", label: "Salarié(e) temps plein" },
  { key: "independant", label: "Indépendant(e) / horaires irréguliers" },
  { key: "parent", label: "Parent" },
  { key: "autre", label: "Autre" },
];

export const OBSTACLES: { key: ObstacleKey; label: string }[] = [
  { key: "motivation", label: "Tenir la motivation sur la durée" },
  { key: "stress", label: "Gérer le stress / la charge mentale" },
  { key: "image_corporelle", label: "Mon rapport à mon image / mon reflet" },
  { key: "discipline", label: "Rester discipliné(e) (nutrition, sommeil, séances)" },
  { key: "social", label: "Le regard ou le manque de soutien de l'entourage" },
  { key: "temps", label: "Manquer de temps" },
];

// ── Quiz ──────────────────────────────────────────────────────────────────────

export type QuizAxis = "motivation" | "stress" | "body_image" | "discipline";

export interface QuizOption {
  value: string;
  label: string;
  score?: number; // 1 (faible) → 4 (fort), utilisé pour les questions "scored"
}

export interface QuizQuestion {
  key: string;
  question: string;
  type: "profile" | "environment" | "obstacle" | "scored";
  axis?: QuizAxis;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "profile_type",
    type: "profile",
    question: "Quel est ton objectif principal en ce moment ?",
    options: [
      { value: "competiteur", label: "Performer en compétition" },
      { value: "pratiquant", label: "Progresser sérieusement, sans compétition" },
      { value: "debutant", label: "Découvrir ou reprendre en main mon corps" },
    ],
  },
  {
    key: "environment",
    type: "environment",
    question: "Qu'est-ce qui décrit le mieux ton quotidien ?",
    options: [
      { value: "etudiant", label: "Étudiant" },
      { value: "salarie", label: "Salarié(e) à temps plein" },
      { value: "independant", label: "Indépendant(e), horaires irréguliers" },
      { value: "parent", label: "Parent" },
      { value: "autre", label: "Autre situation" },
    ],
  },
  {
    key: "motivation",
    type: "scored",
    axis: "motivation",
    question: "Quand ta motivation est au plus bas, que se passe-t-il le plus souvent ?",
    options: [
      { value: "a", label: "Je m'entraîne quand même, la motivation suit l'action", score: 4 },
      { value: "b", label: "Je m'entraîne un peu moins, mais je continue", score: 3 },
      { value: "c", label: "Je repousse la séance à un autre jour", score: 2 },
      { value: "d", label: "Je saute complètement la séance", score: 1 },
    ],
  },
  {
    key: "stress",
    type: "scored",
    axis: "stress",
    question: "Face à une semaine stressante ou un imprévu, ta nutrition et tes séances...",
    options: [
      { value: "a", label: "Restent stables, je m'adapte sans tout lâcher", score: 4 },
      { value: "b", label: "Sont un peu moins bien suivies, mais je m'en sors", score: 3 },
      { value: "c", label: "Partent vite en vrille", score: 2 },
      { value: "d", label: "Je laisse tout tomber jusqu'à ce que ça se calme", score: 1 },
    ],
  },
  {
    key: "body_image",
    type: "scored",
    axis: "body_image",
    question: "Quand tu regardes ton reflet ou tes photos de progression, tu te sens plutôt...",
    options: [
      { value: "a", label: "Serein(e), factuel — je vois ce qu'il y a à voir", score: 4 },
      { value: "b", label: "Plutôt neutre, ça dépend du jour", score: 3 },
      { value: "c", label: "Souvent critique envers moi-même", score: 2 },
      { value: "d", label: "Très anxiogène, je préfère éviter", score: 1 },
    ],
  },
  {
    key: "discipline",
    type: "scored",
    axis: "discipline",
    question: "Sur la durée (plusieurs semaines), tiens-tu tes engagements (nutrition, sommeil, séances) ?",
    options: [
      { value: "a", label: "Oui, sans trop d'efforts — c'est devenu une routine", score: 4 },
      { value: "b", label: "La plupart du temps, avec des écarts gérés", score: 3 },
      { value: "c", label: "Par à-coups, en dents de scie", score: 2 },
      { value: "d", label: "Difficilement, je recommence souvent à zéro", score: 1 },
    ],
  },
  {
    key: "main_obstacle",
    type: "obstacle",
    question: "Si tu devais nommer UN obstacle principal aujourd'hui, ce serait...",
    options: [
      { value: "motivation", label: "Tenir la motivation sur la durée" },
      { value: "stress", label: "Gérer le stress / la charge mentale" },
      { value: "image_corporelle", label: "Mon rapport à mon image" },
      { value: "discipline", label: "Rester discipliné(e)" },
      { value: "social", label: "Le regard ou le manque de soutien de l'entourage" },
      { value: "temps", label: "Manquer de temps" },
    ],
  },
];

export interface QuizResult {
  profile_type: ProfileType;
  environment: Environment;
  main_obstacle: ObstacleKey;
  motivation_score: number;
  stress_score: number;
  body_image_score: number;
  discipline_score: number;
}

export function computeQuizResult(answers: Record<string, string>): QuizResult | null {
  const profile_type = answers.profile_type as ProfileType;
  const environment = answers.environment as Environment;
  const main_obstacle = answers.main_obstacle as ObstacleKey;
  if (!profile_type || !environment || !main_obstacle) return null;

  function axisScore(key: string): number {
    const q = QUIZ_QUESTIONS.find((q) => q.key === key);
    const opt = q?.options.find((o) => o.value === answers[key]);
    return Math.round(((opt?.score ?? 2.5) / 4) * 100);
  }

  return {
    profile_type,
    environment,
    main_obstacle,
    motivation_score: axisScore("motivation"),
    stress_score: axisScore("stress"),
    body_image_score: axisScore("body_image"),
    discipline_score: axisScore("discipline"),
  };
}

// ── Habitudes ─────────────────────────────────────────────────────────────────

export interface HabitDef {
  key: string;
  label: string;
  icon: string; // nom d'icône lucide-react, résolu côté composant
  category: "sommeil" | "nutrition" | "stress" | "discipline" | "social" | "recuperation";
  description: string;
}

export const HABITS: HabitDef[] = [
  { key: "sleep_schedule", label: "Coucher à heure fixe", icon: "Moon", category: "sommeil", description: "±30 min autour de la même heure chaque soir, week-end compris." },
  { key: "screen_cutoff", label: "Écrans coupés 30 min avant de dormir", icon: "Smartphone", category: "sommeil", description: "Remplace le scroll par lecture, étirements ou respiration." },
  { key: "intention_seance", label: "1 intention avant chaque séance", icon: "Target", category: "discipline", description: "Une phrase simple : ce que tu veux accomplir aujourd'hui, pas plus." },
  { key: "meal_prep", label: "Repas préparés à l'avance", icon: "Utensils", category: "nutrition", description: "Anticiper 1 à 2 jours pour ne pas dépendre de la motivation du moment." },
  { key: "gratitude", label: "3 choses positives de la journée", icon: "Sparkles", category: "stress", description: "Liées ou non au sport — entraîner le regard à voir ce qui va bien." },
  { key: "social_limit", label: "Limiter la comparaison réseaux sociaux", icon: "EyeOff", category: "social", description: "Plage horaire dédiée plutôt que scroll en continu, surtout après une séance." },
  { key: "weekly_review", label: "Bilan hebdo (3 minutes)", icon: "ClipboardList", category: "discipline", description: "Qu'est-ce qui a marché cette semaine ? Qu'est-ce qui doit changer ?" },
  { key: "breathing", label: "5 min de respiration / calme", icon: "Wind", category: "stress", description: "Avant le coucher ou avant une séance stressante (compétition, retard de prog)." },
  { key: "hydration_wake", label: "Hydratation au réveil", icon: "GlassWater", category: "recuperation", description: "Un grand verre d'eau avant le café — simple, mais souvent oublié." },
  { key: "mobility", label: "5 min de mobilité / étirements", icon: "Activity", category: "recuperation", description: "Hors séance, pour la récupération et le ressenti corporel." },
  { key: "bag_ready", label: "Sac de sport prêt la veille", icon: "Backpack", category: "discipline", description: "Supprime une friction du matin qui peut faire sauter la séance." },
  { key: "single_priority", label: "1 priorité non négociable du jour", icon: "Flag", category: "discipline", description: "Un seul engagement que rien ne fait sauter, même un jour chargé." },
];

// ── Conseils / Tips ───────────────────────────────────────────────────────────

export type TipCategory =
  | "motivation"
  | "stress"
  | "image_corporelle"
  | "discipline"
  | "social"
  | "alimentation"
  | "competition"
  | "recuperation";

export interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  body: string;
  profiles?: ProfileType[];
  environments?: Environment[];
}

export const TIPS: Tip[] = [
  // Motivation
  { id: "mot-1", category: "motivation", title: "Agis avant de te sentir motivé", body: "La motivation suit souvent l'action, pas l'inverse. Démarre une version minimale de la séance (5 min) — la suite vient presque toujours." },
  { id: "mot-2", category: "motivation", title: "Vise la séance, pas la performance", body: "Le jour où la motivation est basse, l'objectif devient simplement 'être présent', pas 'battre un record'. Ça suffit à garder la série intacte." },
  { id: "mot-3", category: "motivation", title: "Reconnecte-toi à ton pourquoi", body: "Note en une phrase pourquoi tu t'entraînes (santé, confiance, performance, transformation). Relis-la les jours de doute.", profiles: ["debutant", "pratiquant"] },
  { id: "mot-4", category: "motivation", title: "La motivation de compétition est cyclique", body: "Il est normal d'être à fond à 12 semaines de l'échéance et plus émoussé en intersaison. Planifie des phases de récupération mentale, pas seulement physique.", profiles: ["competiteur"] },

  // Stress
  { id: "str-1", category: "stress", title: "Sépare l'entraînement du reste de la journée", body: "Un rituel court avant la séance (musique, marche jusqu'à la salle, changement de tenue) signale au cerveau qu'on change de mode — utile pour évacuer le stress du travail/études." },
  { id: "str-2", category: "stress", title: "Le sport comme exutoire, pas comme punition", body: "S'entraîner « parce qu'on est énervé » peut être sain une fois, dangereux en habitude (blessure, épuisement). Vérifie que tu écoutes aussi la fatigue, pas seulement l'émotion." },
  { id: "str-3", category: "stress", title: "Anticipe les semaines difficiles", body: "Examens, deadlines, enfant malade : prévois une version 'mode survie' de ton programme (2 séances courtes, nutrition simplifiée) plutôt que tout ou rien.", environments: ["etudiant", "parent", "salarie"] },
  { id: "str-4", category: "stress", title: "Le stress de compétition se prépare", body: "Simule les conditions (horaires, public, tenue) en amont. L'inconnu génère plus de stress que la difficulté elle-même.", profiles: ["competiteur"] },

  // Image corporelle
  { id: "img-1", category: "image_corporelle", title: "Mesure-toi avec des données, pas avec un miroir un matin difficile", body: "Photos, mensurations et poids moyennés sur 7 jours racontent une histoire plus fiable qu'un reflet ponctuel influencé par le sommeil, la digestion ou la lumière." },
  { id: "img-2", category: "image_corporelle", title: "La dysmorphie musculaire existe aussi en musculation", body: "Se sentir 'jamais assez gros/sec/défini' malgré des progrès réels est fréquent chez les pratiquants assidus. Si ça affecte ton quotidien, en parler (coach, proche, professionnel) n'est pas un échec." },
  { id: "img-3", category: "image_corporelle", title: "Limite les comptes qui nourrissent la comparaison", body: "Les corps mis en avant sur les réseaux sont souvent un instant choisi (lumière, pump, déshydratation temporaire) — pas un état permanent, même pour les athlètes affichés." },
  { id: "img-4", category: "image_corporelle", title: "Le physique de compétition n'est pas le physique du quotidien", body: "Le shape de stage (très sec, très pompé) est temporaire par construction. L'attendre toute l'année mène à la frustration permanente.", profiles: ["competiteur"] },

  // Discipline
  { id: "dis-1", category: "discipline", title: "Réduis la friction plutôt que d'augmenter la volonté", body: "Sac prêt, repas préparés, séance planifiée dans l'agenda : la discipline tient plus à l'environnement qu'à un effort de volonté permanent." },
  { id: "dis-2", category: "discipline", title: "Les séries de 'jamais raté' sont fragiles", body: "Viser '100% parfait' casse au premier imprévu et démoralise. Vise plutôt 80-90% de constance sur le mois — plus réaliste, plus durable." },
  { id: "dis-3", category: "discipline", title: "Un raté n'efface pas les progrès précédents", body: "Une semaine ratée pèse statistiquement très peu sur des mois de constance. Le risque n'est pas l'écart, c'est l'abandon qui suit l'écart." },

  // Social
  { id: "soc-1", category: "social", title: "Explique ton objectif simplement à ton entourage", body: "Beaucoup de frictions sociales viennent d'un manque d'info, pas de mauvaise volonté. Une phrase claire ('je m'entraîne 4x/semaine pour X') évite bien des incompréhensions." },
  { id: "soc-2", category: "social", title: "Trouve au moins un pair", body: "Un partenaire d'entraînement, un groupe, une communauté en ligne : le soutien social est l'un des facteurs les plus prédictifs de la constance à long terme." },
  { id: "soc-3", category: "social", title: "Le regard des autres sur ton physique ne t'appartient pas", body: "Remarques bienveillantes ou non, elles disent souvent plus sur celui qui les fait que sur toi. Ton objectif reste le tien." },

  // Alimentation / mindset
  { id: "ali-1", category: "alimentation", title: "Sépare 'manger pour la performance' de 'manger pour gérer une émotion'", body: "Les deux sont légitimes, mais les confondre brouille le suivi. Si tu manges sous stress, nomme-le : ce n'est pas un échec nutritionnel, c'est une info sur ton état." },
  { id: "ali-2", category: "alimentation", title: "Aucun aliment n'est une erreur", body: "Un écart au plan est une donnée, pas une faute. Le mindset 'tout est permis avec modération' tient mieux sur la durée que le tout-ou-rien." },

  // Récupération
  { id: "rec-1", category: "recuperation", title: "Le repos fait partie de l'entraînement", body: "Le surentraînement mental (culpabiliser de se reposer) freine autant les progrès qu'un manque d'assiduité. Une séance sautée pour dormir est souvent un bon calcul." },
  { id: "rec-2", category: "recuperation", title: "Surveille les signaux de surcharge", body: "Irritabilité inhabituelle, sommeil dégradé, motivation en chute libre malgré le repos : ce sont des signaux d'alerte à prendre au sérieux, pas une faiblesse de caractère." },

  // Compétition
  { id: "cmp-1", category: "competition", title: "Prépare ta tête à l'après-compétition", body: "Le 'blues post-compète' (perte de repère, relâchement brutal) est fréquent. Planifier la semaine suivante (repos actif, objectifs à moyen terme) amortit la chute.", profiles: ["competiteur"] },
  { id: "cmp-2", category: "competition", title: "Le jour J ne définit pas ta valeur d'athlète", body: "Un classement est une donnée parmi d'autres (juges, catégorie, jour précis). Le travail accompli pour y arriver reste acquis, quel que soit le résultat.", profiles: ["competiteur"] },
];

export function getTipsFor(profile_type: ProfileType | null, environment: Environment | null): Tip[] {
  return TIPS.filter((t) => {
    const profileOk = !t.profiles || !profile_type || t.profiles.includes(profile_type);
    const envOk = !t.environments || !environment || t.environments.includes(environment);
    return profileOk && envOk;
  });
}

// ── Citations du jour ─────────────────────────────────────────────────────────

export const DAILY_QUOTES: string[] = [
  "La discipline, c'est se souvenir de ce qu'on veut.",
  "Tu n'as pas besoin d'être motivé tous les jours, juste assez discipliné pour te montrer.",
  "Les séries qui comptent le plus sont celles du jour où tu n'avais pas envie.",
  "Le corps accomplit ce que l'esprit croit possible.",
  "On ne voit jamais ses propres progrès en direct — seulement en regardant en arrière.",
  "La constance bat l'intensité sur la durée, presque toujours.",
  "Une mauvaise séance vaut mieux qu'une séance sautée.",
  "Le physique se construit à la salle, le mental se construit dans les moments où tu n'as pas envie d'y aller.",
  "Comparer ton chapitre 3 au chapitre 20 de quelqu'un d'autre ne t'apprend rien d'utile.",
  "Le repos n'est pas l'opposé du progrès, il en fait partie.",
  "Chaque répétition imparfaite mais réalisée vaut plus que la répétition parfaite imaginée.",
  "Ton seul adversaire valable, c'est la version de toi d'il y a six mois.",
  "La progression n'est jamais linéaire — le plateau fait partie du chemin, pas une sortie de route.",
  "Ce que tu fais quand c'est difficile compte plus que ce que tu fais quand c'est facile.",
  "Un objectif sans système pour y arriver reste un souhait.",
  "La fierté du travail accompli dure plus longtemps que le compliment sur le physique.",
  "Tu n'as pas à être parfait, tu as juste à ne pas abandonner.",
  "Le miroir du matin ne raconte jamais toute l'histoire.",
  "Bâtir un corps, c'est bâtir une relation de confiance avec soi-même.",
  "La meilleure version de ton programme est celle que tu tiens vraiment.",
  "Les bases ennuyeuses, répétées, gagnent presque toujours contre les méthodes brillantes abandonnées après 2 semaines.",
  "Demande-toi : est-ce que cette pensée m'aide à avancer, ou juste à me juger ?",
  "L'échec d'aujourd'hui n'est qu'une donnée pour ajuster demain.",
  "Tu ne rates pas une séance, tu choisis simplement de la reporter — à toi de décider quand.",
  "Le respect de soi se construit dans les petites promesses qu'on se tient.",
  "On surestime ce qu'on peut faire en un jour, on sous-estime ce qu'on peut faire en un an de constance.",
  "Ce n'est pas le poids sur la barre qui définit ta valeur, c'est ta présence régulière sous la barre.",
  "Apprendre à se reposer sans culpabiliser est aussi une compétence d'athlète.",
];

export function getDailyQuote(date: Date = new Date()): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

// ── Journal ───────────────────────────────────────────────────────────────────

export interface JournalPrompt {
  key: string;
  label: string;
  prompt: string;
}

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  { key: "avant_seance", label: "Avant la séance", prompt: "Quelle est ton intention pour cette séance ? Qu'est-ce qui te rendrait fier(e) en sortant ?" },
  { key: "apres_seance", label: "Après la séance", prompt: "Comment t'es-tu senti(e) pendant la séance ? Qu'est-ce qui a bien fonctionné, qu'est-ce que tu ajusterais ?" },
  { key: "obstacle", label: "Face à un obstacle", prompt: "Qu'est-ce qui te freine en ce moment ? Si tu en parlais à un ami dans la même situation, que lui dirais-tu ?" },
  { key: "gratitude", label: "Gratitude", prompt: "Cite 3 choses, liées ou non au sport, pour lesquelles tu es reconnaissant(e) aujourd'hui." },
  { key: "bilan_semaine", label: "Bilan de semaine", prompt: "Qu'est-ce qui a marché cette semaine ? Qu'est-ce qui doit changer la semaine prochaine ?" },
  { key: "image_corporelle", label: "Rapport au corps", prompt: "Comment te sens-tu par rapport à ton corps aujourd'hui ? Est-ce une pensée factuelle ou une émotion du moment ?" },
  { key: "victoire", label: "Petite victoire", prompt: "Quelle petite victoire (sport ou non) as-tu eue récemment que tu n'as pas vraiment célébrée ?" },
];

export function getPromptOfDay(date: Date = new Date()): JournalPrompt {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
}
