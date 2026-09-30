// Personnalisation "Mon appli" (demande directe 2026-09-29) : quelques
// questions à l'arrivée (et modifiables à tout moment dans Paramètres), pour
// que chacun n'ait que ce qu'il utilise vraiment : suivis du corps, champs du
// bilan, outils du coach. Fichier partagé serveur/client (aucun import
// serveur) ; la lecture en base est dans lib/app-setup-server.ts.
//
// Règle de base : un module absent de la configuration est ACTIF. Quelqu'un
// qui n'a pas encore répondu garde l'appli complète, rien ne disparaît sans
// qu'il l'ait choisi.

export type ModuleKey =
  // Suivi du corps
  | "poids"
  | "mensurations"
  | "masse_grasse"
  | "photos"
  // Bilan quotidien
  | "sommeil"
  | "stress"
  | "digestion"
  | "faim"
  | "pas"
  | "cycle"
  // Forme du jour (optionnel)
  | "energie"
  | "humeur"
  | "hydratation"
  | "courbatures"
  | "cardio_repos"
  // Pratique
  | "entrainement"
  | "nutrition"
  | "mindset"
  | "competition"
  // Coach
  | "coaching_clients"
  | "contenu"
  | "stats_reseaux"
  | "formations_vente"
  | "lives"
  | "business"
  | "equipe";

export type Modules = Partial<Record<ModuleKey, boolean>>;

export interface AppSetup {
  answers: Record<string, unknown>;
  modules: Modules;
  completed: boolean;
}

export const EMPTY_SETUP: AppSetup = { answers: {}, modules: {}, completed: false };

/** Modules désactivés par défaut (nouveautés qu'on ne force sur personne). */
const OFF_BY_DEFAULT: ModuleKey[] = ["masse_grasse", "competition", "energie", "humeur", "hydratation", "courbatures", "cardio_repos"];

export function isOn(setup: AppSetup | null | undefined, key: ModuleKey): boolean {
  const v = setup?.modules?.[key];
  if (typeof v === "boolean") return v;
  return !OFF_BY_DEFAULT.includes(key);
}

// ── Questionnaire ───────────────────────────────────────────────────────

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

export interface SetupQuestion {
  key: string;
  title: string;
  subtitle?: string;
  multi: boolean;
  options: ChoiceOption[];
  /** Traduit la réponse en modules actifs/inactifs. */
  toModules?: (answer: string[]) => Modules;
  /** Question affichée seulement si... */
  showIf?: (answers: Record<string, unknown>) => boolean;
}

const has = (a: string[], v: string) => a.includes(v);

/** Questions "suivi perso" : membres, clients, et l'espace Moi des coachs. */
export const MEMBER_QUESTIONS: SetupQuestion[] = [
  {
    key: "corps",
    title: "Qu'est-ce que tu veux suivre sur ton corps ?",
    subtitle: "Coche tout ce qui t'intéresse, tu pourras changer plus tard.",
    multi: true,
    options: [
      { value: "poids", label: "Mon poids", hint: "Pesée du matin" },
      { value: "mensurations", label: "Mes mensurations", hint: "Tour de taille, bras, cuisses..." },
      { value: "masse_grasse", label: "Mon taux de masse grasse", hint: "Balance, pince, DEXA..." },
      { value: "photos", label: "Des photos de progression" },
    ],
    toModules: (a) => ({ poids: has(a, "poids"), mensurations: has(a, "mensurations"), masse_grasse: has(a, "masse_grasse"), photos: has(a, "photos") }),
  },
  {
    key: "bilan",
    title: "Dans ton bilan du jour, qu'est-ce qui te parle ?",
    subtitle: "Seuls ces champs te seront demandés.",
    multi: true,
    options: [
      { value: "sommeil", label: "Mon sommeil", hint: "Durée et qualité" },
      { value: "pas", label: "Mes pas" },
      { value: "stress", label: "Mon stress" },
      { value: "digestion", label: "Ma digestion" },
      { value: "faim", label: "Ma faim" },
    ],
    toModules: (a) => ({ sommeil: has(a, "sommeil"), pas: has(a, "pas"), stress: has(a, "stress"), digestion: has(a, "digestion"), faim: has(a, "faim") }),
  },
  {
    key: "forme",
    title: "Tu veux aller plus loin dans ton suivi ?",
    subtitle: "Optionnel : ajoute ce qui t'aide vraiment à comprendre ta forme.",
    multi: true,
    options: [
      { value: "energie", label: "Mon énergie", hint: "Note de 1 à 5" },
      { value: "humeur", label: "Mon moral", hint: "Note de 1 à 5" },
      { value: "hydratation", label: "Mon hydratation", hint: "Litres d'eau bus" },
      { value: "courbatures", label: "Mes courbatures", hint: "Récupération musculaire" },
      { value: "cardio_repos", label: "Mon cardio au repos", hint: "FC de repos et VFC (montre, bague)" },
    ],
    toModules: (a) => ({ energie: has(a, "energie"), humeur: has(a, "humeur"), hydratation: has(a, "hydratation"), courbatures: has(a, "courbatures"), cardio_repos: has(a, "cardio_repos") }),
  },
  {
    key: "entrainement",
    title: "Comment tu t'entraînes ?",
    multi: false,
    options: [
      { value: "salle", label: "En salle, avec un programme" },
      { value: "maison", label: "À la maison ou dehors, avec un programme" },
      { value: "sans", label: "Pas d'entraînement suivi pour l'instant" },
    ],
    toModules: (a) => ({ entrainement: !has(a, "sans") }),
  },
  {
    key: "nutrition",
    title: "Et ta nutrition ?",
    multi: false,
    options: [
      { value: "tracker", label: "Je veux suivre ce que je mange", hint: "Calories et macros" },
      { value: "plan", label: "Je suis un plan alimentaire" },
      { value: "sans", label: "Pas de suivi nutrition pour l'instant" },
    ],
    toModules: (a) => ({ nutrition: !has(a, "sans") }),
  },
  {
    key: "extras",
    title: "Autre chose à suivre ?",
    multi: true,
    options: [
      { value: "cycle", label: "Mon cycle menstruel" },
      { value: "mindset", label: "Mon mental", hint: "Habitudes, journal" },
      { value: "competition", label: "Je prépare une compétition" },
    ],
    toModules: (a) => ({ cycle: has(a, "cycle"), mindset: has(a, "mindset"), competition: has(a, "competition") }),
  },
];

export const COACH_PLATFORMS: ChoiceOption[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "threads", label: "Threads" },
];

export const CAREER_MODES: ChoiceOption[] = [
  { value: "independant", label: "À mon compte", hint: "Mes propres clients, ma marque" },
  { value: "marque", label: "Pour une marque de coaching", hint: "Ex. dans l'équipe EP Coaching" },
  { value: "avec_coach", label: "Avec un autre coach", hint: "En binôme ou pour un coach plus établi" },
  { value: "entreprise", label: "Mon entreprise, avec une équipe", hint: "Je recrute et je manage" },
];

/** Questions coach : façon de travailler, objectifs, plateformes. */
export const COACH_QUESTIONS: SetupQuestion[] = [
  {
    key: "career_mode",
    title: "Comment tu travailles en ce moment ?",
    subtitle: "Ça peut évoluer, tu changes quand tu veux.",
    multi: false,
    options: CAREER_MODES,
    toModules: (a) => ({ equipe: has(a, "entreprise") }),
  },
  {
    key: "objectifs",
    title: "Tes objectifs du moment ?",
    subtitle: "L'appli met en avant les outils qui vont avec.",
    multi: true,
    options: [
      { value: "coacher", label: "Coacher des clients en individuel" },
      { value: "contenu", label: "Créer du contenu et grossir mon audience" },
      { value: "formations", label: "Vendre des formations" },
      { value: "lives", label: "Animer des lives et des groupes" },
      { value: "business", label: "Structurer mon business", hint: "Offre, ventes, pub, compta" },
      { value: "equipe", label: "Recruter et manager une équipe" },
    ],
    toModules: (a) => ({
      coaching_clients: has(a, "coacher"),
      contenu: has(a, "contenu"),
      stats_reseaux: has(a, "contenu"),
      formations_vente: has(a, "formations"),
      lives: has(a, "lives"),
      business: has(a, "business"),
      ...(has(a, "equipe") ? { equipe: true } : {}),
    }),
  },
  {
    key: "plateformes",
    title: "Sur quelles plateformes tu publies ?",
    subtitle: "Le Studio et tes stats ne montreront que celles-là.",
    multi: true,
    options: COACH_PLATFORMS,
    showIf: (ans) => Array.isArray(ans.objectifs) && (ans.objectifs as string[]).includes("contenu"),
  },
  {
    key: "clients_count",
    title: "Combien de clients tu suis ?",
    multi: false,
    options: [
      { value: "0", label: "Pas encore" },
      { value: "1-10", label: "1 à 10" },
      { value: "11-30", label: "11 à 30" },
      { value: "31+", label: "Plus de 30" },
    ],
    showIf: (ans) => Array.isArray(ans.objectifs) && (ans.objectifs as string[]).includes("coacher"),
  },
  {
    key: "suivi_perso",
    title: "Toi aussi, tu suis ton propre physique dans l'appli ?",
    subtitle: "Ton espace Moi : bilan, nutrition, entraînement.",
    multi: false,
    options: [
      { value: "oui", label: "Oui, je me suis moi-même" },
      { value: "non", label: "Non, l'appli me sert à coacher" },
    ],
  },
];

/** Calcule les modules à partir des réponses (questions visibles seulement). */
export function modulesFromAnswers(questions: SetupQuestion[], answers: Record<string, unknown>): Modules {
  const out: Modules = {};
  for (const q of questions) {
    if (q.showIf && !q.showIf(answers)) continue;
    const raw = answers[q.key];
    const arr = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? [raw] : null;
    if (!arr || !q.toModules) continue;
    Object.assign(out, q.toModules(arr));
  }
  return out;
}

// ── Modules -> menu ─────────────────────────────────────────────────────
// Rubriques du menu masquées quand un module est coupé (segments relatifs à
// /dashboard/client ou /dashboard/coach). Le contenu reste accessible par
// son adresse : on allège le menu, on ne verrouille rien.

const MEMBER_SEGMENTS: Partial<Record<ModuleKey, string[]>> = {
  photos: ["photos"],
  sommeil: ["tracking"],
  pas: ["steps"],
  cycle: ["cycle"],
  entrainement: ["program", "logbook"],
  nutrition: ["nutrition"],
  mindset: ["mindset"],
};

const COACH_SEGMENTS: Partial<Record<ModuleKey, string[]>> = {
  contenu: ["studio", "masterclass"],
  stats_reseaux: ["stats-reseaux"],
  lives: ["live"],
  business: ["business/pilotage", "business/ads", "admin/ventes"],
};

export function hiddenSegments(setup: AppSetup | null, space: "client" | "coach"): Set<string> {
  const hidden = new Set<string>();
  if (!setup?.completed) return hidden;
  const personal = space === "client" ? "" : "moi/";
  for (const [key, segs] of Object.entries(MEMBER_SEGMENTS)) {
    if (!isOn(setup, key as ModuleKey)) for (const s of segs ?? []) hidden.add(`${personal}${s}`);
  }
  if (space === "coach") {
    for (const [key, segs] of Object.entries(COACH_SEGMENTS)) {
      if (!isOn(setup, key as ModuleKey)) for (const s of segs ?? []) hidden.add(s);
    }
    // Coach qui ne se suit pas lui-même : tout l'espace Moi disparaît du menu.
    if (setup.answers.suivi_perso === "non") hidden.add("moi/*");
  }
  return hidden;
}

/** Plateformes de publication choisies par un coach (toutes si non renseigné). */
export function coachPlatforms(setup: AppSetup | null): string[] {
  const p = setup?.answers?.plateformes;
  return Array.isArray(p) && p.length ? (p as string[]) : COACH_PLATFORMS.map((o) => o.value);
}
