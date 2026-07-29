// Moteur de personnalisation — même logique que lib/client-suggestions.ts :
// pas une IA, un jeu de règles simples et explicables, à partir des réponses
// au questionnaire d'onboarding. Sert à adapter l'accueil (ordre des
// fonctionnalités, messages de réassurance) au profil de la personne,
// sans jamais rien lui cacher définitivement.

export type ExperienceLevel = "debutant" | "intermediaire" | "confirme";
export type PrimaryGoal = "perte_poids" | "prise_muscle" | "performance" | "sante_bien_etre" | "remise_en_forme";
export type TrainingFrequency = "0" | "1-2" | "3-4" | "5+";
export type TracksNutrition = "jamais" | "parfois" | "toujours";
export type BiggestObstacle =
  | "manque_de_temps"
  | "manque_de_motivation"
  | "sais_pas_par_ou_commencer"
  | "deja_essaye_sans_resultat";

export interface MemberPreferences {
  experience_level: ExperienceLevel | null;
  primary_goal: PrimaryGoal | null;
  training_frequency: TrainingFrequency | null;
  tracks_nutrition: TracksNutrition | null;
  biggest_obstacle: BiggestObstacle | null;
}

export interface MythBuster {
  id: string;
  title: string;
  body: string;
}

export interface PersonalizationProfile {
  segment: ExperienceLevel;
  isBeginner: boolean;
  // Ordre de priorité des fonctionnalités (par href), le reste suit dans
  // l'ordre d'origine — voir reorderByPriority().
  priorityHrefs: string[];
  mythBusters: MythBuster[];
  welcomeSubtitle: string;
}

const BEGINNER_PRIORITY = [
  "/dashboard/client/recettes",
  "/dashboard/client/bilan",
  "/dashboard/client/ressources",
  "/dashboard/client/program",
  "/dashboard/client/nutrition",
];

const CONFIRMED_PRIORITY = [
  "/dashboard/client/program",
  "/dashboard/client/logbook",
  "/dashboard/client/nutrition",
  "/dashboard/client/roadmap",
  "/dashboard/client/photos",
];

export function derivePersonalization(prefs: MemberPreferences | null): PersonalizationProfile {
  const segment: ExperienceLevel = prefs?.experience_level ?? "intermediaire";
  const isBeginner = segment === "debutant";

  const mythBusters: MythBuster[] = [];

  if (isBeginner) {
    if (prefs?.tracks_nutrition === "jamais") {
      mythBusters.push({
        id: "tracking-utile",
        title: "\"Suivre mes calories, ça sert à rien\"",
        body: "Ce n'est pas fait pour te transformer en calculatrice à vie — juste pour comprendre, une fois, ce que tu manges vraiment. La plupart des gens sous-estiment ou surestiment leur apport de 20 à 30%. Deux semaines de journal alimentaire suffisent souvent à voir clair.",
      });
    }
    if (prefs?.biggest_obstacle === "sais_pas_par_ou_commencer") {
      mythBusters.push({
        id: "pas-besoin-parfait",
        title: "\"Je sais pas par où commencer\"",
        body: "Tu n'as pas besoin d'un programme parfait pour commencer. Un bilan quotidien + une recette + une séance suffisent la première semaine. Le reste se construit après.",
      });
    }
    if (prefs?.biggest_obstacle === "deja_essaye_sans_resultat") {
      mythBusters.push({
        id: "constance-vs-perfection",
        title: "\"J'ai déjà essayé, ça n'a jamais marché\"",
        body: "La régularité bat la perfection à tous les coups. Ce qui a probablement manqué, ce n'est pas la volonté : c'est un suivi simple qui montre les progrès avant qu'ils soient visibles dans le miroir.",
      });
    }
    if (prefs?.biggest_obstacle === "manque_de_motivation" || prefs?.biggest_obstacle === "manque_de_temps") {
      mythBusters.push({
        id: "petit-pas",
        title: "\"J'ai pas le temps / la motiv'\"",
        body: "3 séances de 30 min valent mieux qu'1 séance de 2h qu'on ne fait jamais. Commence petit, la régularité crée la motivation — pas l'inverse.",
      });
    }
  }

  const priorityHrefs = isBeginner ? BEGINNER_PRIORITY : CONFIRMED_PRIORITY;

  const welcomeSubtitle = isBeginner
    ? "Pas besoin d'être « sportif » pour être ici. On avance à ton rythme, avec du concret : des recettes simples, un bilan quotidien, et un programme qui s'adapte à toi."
    : segment === "confirme"
    ? "Programme, logbook, nutrition précise et suivi de progression : tout ce qu'il faut pour piloter ton entraînement sérieusement."
    : "Tout ce qui est listé ci-dessous, tu peux l'utiliser dès maintenant, en autonomie.";

  return { segment, isBeginner, priorityHrefs, mythBusters, welcomeSubtitle };
}

// Réordonne une liste d'items (avec `href`) selon priorityHrefs, en gardant
// l'ordre d'origine pour tout ce qui n'est pas explicitement priorisé.
export function reorderByPriority<T extends { href: string }>(items: T[], priorityHrefs: string[]): T[] {
  const rank = new Map(priorityHrefs.map((href, i) => [href, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.href) ? rank.get(a.href)! : priorityHrefs.length;
    const rb = rank.has(b.href) ? rank.get(b.href)! : priorityHrefs.length;
    return ra - rb;
  });
}
