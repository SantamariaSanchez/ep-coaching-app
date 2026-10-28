// Moteur de tracking : à partir de TOUT ce qu'on sait d'une personne, décide
// QUOI suivre, À QUELLE FRÉQUENCE, avec QUEL niveau de détail et QUAND la
// solliciter. Le coach n'a pas à régler chaque paramètre : l'écosystème
// (onboarding, « Mon appli », fiche, historique d'engagement) le fait, le
// client change de niveau en 1 tap, le coach voit le niveau et le POURQUOI et
// peut l'ajuster (suggestion, jamais de modification automatique du plan).
//
// Module PUR (aucun import serveur), règles simples et lisibles, pas de boîte
// noire : chaque point de score vient avec sa phrase d'explication.
//
// Statut des règles (voir « Mastermind, cahier des charges ») :
//   - Données suivies au quotidien (poids, sommeil, énergie, digestion, séance,
//     pas, adhésion ; FC de repos facultative « selon le profil »), tableur peu
//     fourni pour un débutant : enseignement du mentor (niveau 5).
//   - Un bilan hebdomadaire suffit en population générale, davantage pour un
//     compétiteur, au cas par cas : enseignement du mentor (niveau 5).
//   - Ajuster sur une tendance de poids d'au moins deux semaines, jamais sur une
//     pesée : enseignement du mentor ; pas de rétention d'eau interprétée dans
//     la fenêtre lutéale : enseignement, aucune règle d'entraînement par phase.
//   - Relation à l'alimentation signalée : aucun chiffre de déficit, orientation
//     vers un professionnel (décision produit d'Emmanuel, lib/eating-safety.ts).
//   - Les trois niveaux Simple / Standard / Avancé, les seuils de score, le
//     nombre de pesées par semaine et les heures de rappel : DÉCISIONS PRODUIT
//     (hypothèses de travail, pas des faits scientifiques), à réviser avec les
//     données réelles d'adhésion.
//   - AUCUNE règle liée à l'âge ou au statut de mineur : la thermodynamique est
//     une affaire de dépense et d'apport. L'âge n'est volontairement pas une
//     entrée de ce module (voir le test dédié).

import type { Modules } from "@/lib/app-setup";
import { eatingSafetyLevel, type EatingRelation, type EatingSafetyLevel } from "@/lib/eating-safety";

export type TrackingLevel = "simple" | "standard" | "avance";
export const TRACKING_LEVELS: readonly TrackingLevel[] = ["simple", "standard", "avance"];
export const TRACKING_LEVEL_LABEL: Record<TrackingLevel, string> = { simple: "Simple", standard: "Standard", avance: "Avancé" };
export const TRACKING_LEVEL_HINT: Record<TrackingLevel, string> = {
  simple: "Le strict utile : quelques données, quelques secondes.",
  standard: "Un suivi complet et léger : poids, sommeil, énergie, pas.",
  avance: "Suivi fin : tendances, macros, récupération, indicateurs de fatigue.",
};

export function isTrackingLevel(v: unknown): v is TrackingLevel {
  return v === "simple" || v === "standard" || v === "avance";
}

/** Parcours déclaré (question « phases déjà vécues » de Mon appli et de l'onboarding). */
export type HistoryFlag = "prise_muscle" | "deficit" | "peak_week" | "competition";
export const HISTORY_FLAGS: readonly HistoryFlag[] = ["prise_muscle", "deficit", "peak_week", "competition"];
export type TrainingYears = "jamais" | "moins_1" | "1_3" | "plus_3";
export const TRAINING_YEARS: readonly TrainingYears[] = ["jamais", "moins_1", "1_3", "plus_3"];

export type BilanField =
  | "poids"
  | "seance"
  | "pas"
  | "energie"
  | "sommeil"
  | "digestion"
  | "stress"
  | "humeur"
  | "faim"
  | "courbatures"
  | "hydratation"
  | "sommeil_qualite"
  | "horaires_sommeil"
  | "cardio_repos";

export type WeighMode = "off" | "weekly" | "few" | "daily";
export type NutritionDetail = "habits" | "calories" | "macros";
export type SleepDetail = "off" | "hours" | "full";
export type EffortScale = "none" | "rir" | "rir_rpe";
export type Cadence = "off" | "monthly" | "biweekly" | "weekly";
export type CheckinDepth = "short" | "standard" | "full";
export type Tone = "encourageant" | "neutre" | "technique";
export type HomeMetric = "seance" | "poids_tendance" | "poids_moyenne" | "pas" | "regularite" | "macros" | "sommeil" | "fatigue" | "performances" | "photos" | "competition";

export interface TrackingInput {
  gender?: "Homme" | "Femme" | "Autre" | null;
  /** Objectif principal du quiz (member_preferences). */
  goal?: "perte_poids" | "prise_muscle" | "performance" | "sante_bien_etre" | "remise_en_forme" | null;
  experience?: "debutant" | "intermediaire" | "confirme" | null;
  /** Pratiques cochées dans « Mon appli » (musculation, perte_gras, bodybuilding_compet, force...). */
  practices?: string[];
  history?: HistoryFlag[];
  years?: TrainingYears | null;
  /** Séances par semaine visées (quiz) ou déclarées (fiche). */
  sessionsPerWeek?: number | null;
  trainingFrequency?: "0" | "1-2" | "3-4" | "5+" | null;
  tracksNutrition?: "jamais" | "parfois" | "toujours" | null;
  obstacle?: "manque_de_temps" | "manque_de_motivation" | "sais_pas_par_ou_commencer" | "deja_essaye_sans_resultat" | null;
  /** Blessure ou douleur déclarée (fiche), sans en dire plus. */
  hasInjury?: boolean;
  eatingRelation?: EatingRelation | null;
  /** Montre ou bague connectée : sommeil et FC importés sans saisie. */
  hasWearable?: boolean;
  /** Le suivi du cycle est un module choisi (jamais imposé). */
  /** La personne a coupé le suivi du poids dans Mon appli. */
  weighDisabled?: boolean;
  cycleOptIn?: boolean;
  /** Préparation de compétition en cours ou module compétition actif. */
  competitionPrep?: boolean;
  /** Semaines avant la compétition (null : pas de date). */
  weeksToCompetition?: number | null;
  /** Phase de coaching en cours, si connue. */
  phase?: string | null;
  coached?: boolean;
  /** Semaines depuis le début (accompagnement ou inscription). */
  weeksSinceStart?: number | null;
  /** Jours avec bilan sur les 14 derniers jours (0 à 14), null si inconnu. */
  bilanDays14?: number | null;
  /** Jours avec bilan sur les 28 derniers jours (0 à 28), null si inconnu. */
  bilanDays28?: number | null;
  /** Heures visées (profil), "HH:MM". */
  wakeTime?: string | null;
  bedTime?: string | null;
  /** Niveau choisi par la personne ou par le coach. */
  override?: { level: TrackingLevel; by: "client" | "coach" } | null;
}

export interface TrackingProfile {
  level: TrackingLevel;
  autoLevel: TrackingLevel;
  source: "auto" | "client" | "coach";
  score: number;
  /** Pourquoi ce niveau (phrases lisibles, vue coach et client). */
  reasons: string[];
  /** Garde-fous appliqués (sécurité, relation à l'alimentation). */
  safeguards: string[];
  eatingSafety: EatingSafetyLevel;
  weighIn: { mode: WeighMode; perWeek: number; days: number[]; trend: boolean; weeklyAverage: boolean };
  nutrition: { detail: NutritionDetail; showNumbers: boolean };
  /** Champs du bilan du jour, dans l'ordre d'affichage. */
  bilan: { fields: BilanField[]; minimum: BilanField[]; sleep: SleepDetail; targetSeconds: number };
  /** Les trois infos qui suffisent un jour chargé. */
  minimumViable: BilanField[];
  /** Ce qui bloque l'appli tant que ce n'est pas fait (volontairement rare). */
  gate: { morning: boolean; meal: boolean; evening: boolean };
  training: { effort: EffortScale; executionScore: boolean; painCheck: boolean };
  photos: { cadence: Cadence; pose: boolean };
  measurements: { cadence: Cadence };
  checkin: { depth: CheckinDepth; perWeek: 1 | 2 };
  cycle: "off" | "offer" | "on";
  competition: { planning: boolean; peakWeekReminders: boolean };
  reminders: { morning: string | null; evening: string | null; maxPerDay: 1 | 2 | 3; weighDaysOnly: boolean };
  homeMetrics: HomeMetric[];
  tone: Tone;
  /** Modules « Mon appli » proposés par le moteur (jamais écrits sans l'accord de la personne). */
  modules: Modules;
  /** Allègement ou renfort proposé d'après l'adhésion récente, à valider (jamais appliqué seul). */
  suggestion: { level: TrackingLevel; reason: string } | null;
}

const PERF_PRACTICES = ["force", "halterophilie", "hybride", "crossfit", "hyrox", "course", "calisthenics"];

function clampMinutes(hhmm: string | null | undefined, fallback: number): number {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return fallback;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fmt(min: number): string {
  const m = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Score et raisons : chaque règle ajoute ou retire des points avec sa phrase. */
export function scoreTracking(input: TrackingInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const add = (pts: number, why: string) => {
    score += pts;
    reasons.push(why);
  };
  const practices = input.practices ?? [];
  const history = new Set(input.history ?? []);

  if (input.experience === "confirme") add(2, "Tu t'entraînes sérieusement depuis des années");
  else if (input.experience === "intermediaire") add(1, "Tu t'entraînes depuis un moment");
  else if (input.experience === "debutant") add(-2, "Tu débutes : on garde l'essentiel pour que ça reste facile");

  if (input.years === "plus_3") add(1, "Plus de 3 ans d'entraînement");
  else if (input.years === "jamais") add(-1, "Pas d'entraînement régulier jusqu'ici");

  if (practices.includes("bodybuilding_compet") || history.has("competition")) add(2, "Tu as déjà fait ou tu prépares de la compétition");
  else if (practices.some((p) => PERF_PRACTICES.includes(p))) add(1, "Une pratique orientée performance");

  const histPts = Math.min(
    3,
    (history.has("peak_week") ? 2 : 0) + (history.has("prise_muscle") ? 1 : 0) + (history.has("deficit") ? 1 : 0)
  );
  if (histPts > 0) {
    const bits = [history.has("prise_muscle") && "prise de muscle", history.has("deficit") && "déficit", history.has("peak_week") && "peak week"].filter(Boolean);
    add(histPts, `Phases déjà vécues et suivies : ${bits.join(", ")}`);
  }

  if (input.tracksNutrition === "toujours") add(1, "Tu suis déjà tes calories et tes macros");
  else if (input.tracksNutrition === "jamais" && input.experience !== "confirme") add(-1, "Le suivi nutritionnel ne t'a jamais parlé : on y va doucement");

  if ((input.sessionsPerWeek ?? 0) >= 5 || input.trainingFrequency === "5+") add(1, "5 séances par semaine ou plus");
  else if (input.trainingFrequency === "0" || input.sessionsPerWeek === 0) add(-1, "Tu reprends une activité : un suivi léger d'abord");

  if (input.obstacle === "manque_de_temps") add(-1, "Le temps est ton frein principal : suivi le plus court possible");
  else if (input.obstacle === "sais_pas_par_ou_commencer") add(-1, "Tu ne sais pas par où commencer : on simplifie");

  if (input.goal === "sante_bien_etre" || input.goal === "remise_en_forme") add(-1, "Objectif bien-être et reprise en douceur");

  // Adhésion réelle : le suivi doit rester tenable (jamais l'inverse).
  const settled = (input.weeksSinceStart ?? 0) >= 3;
  if (settled && input.bilanDays14 != null && input.bilanDays14 <= 3) add(-1, "Le suivi a été difficile à tenir ces derniers jours : on allège");

  return { score, reasons };
}

const AVANCE_AT = 5;
const SIMPLE_AT = -1;

export function levelFromScore(score: number): TrackingLevel {
  if (score >= AVANCE_AT) return "avance";
  if (score <= SIMPLE_AT) return "simple";
  return "standard";
}

const FIELDS: Record<TrackingLevel, BilanField[]> = {
  simple: ["poids", "seance", "energie", "pas"],
  standard: ["poids", "seance", "energie", "sommeil", "pas", "digestion"],
  avance: ["poids", "seance", "sommeil", "energie", "pas", "digestion", "stress", "faim", "humeur", "courbatures", "hydratation", "cardio_repos", "sommeil_qualite", "horaires_sommeil"],
};

export function deriveTrackingProfile(input: TrackingInput): TrackingProfile {
  const { score, reasons } = scoreTracking(input);
  const eating = eatingSafetyLevel(input.eatingRelation ?? null);
  const safeguards: string[] = [];

  let autoLevel = levelFromScore(score);
  if (reasons.length === 0) reasons.push("On ne te connaît pas encore assez : suivi standard, ajusté dès que tu réponds à quelques questions");
  // Garde-fou : un signal sur la relation à l'alimentation plafonne le niveau
  // choisi automatiquement (jamais l'inverse), sans commentaire sur le corps.
  if (eating === "stop" && autoLevel !== "simple") {
    autoLevel = "simple";
    safeguards.push("Suivi allégé : pas de chiffres sur l'alimentation, l'entraînement et le bien-être d'abord");
  } else if (eating === "watch" && autoLevel === "avance") {
    autoLevel = "standard";
    safeguards.push("Suivi sans pression sur les chiffres");
  }

  const override = input.override ?? null;
  const level = override?.level ?? autoLevel;
  const source: TrackingProfile["source"] = override ? override.by : "auto";
  if (override) reasons.unshift(override.by === "coach" ? "Niveau fixé par ton coach" : "Niveau choisi par toi");

  const coachDecided = source === "coach";
  const practices = input.practices ?? [];
  const compet = !!input.competitionPrep || practices.includes("bodybuilding_compet");
  const fatLoss = input.goal === "perte_poids" || input.goal === "remise_en_forme" || practices.includes("perte_gras");
  const woman = input.gender === "Femme";

  // ── Pesée ────────────────────────────────────────────────────────────
  let weighMode = "daily" as WeighMode;
  let weighDays: number[];
  if (eating === "stop") {
    weighMode = "weekly";
    weighDays = [1];
  } else if (eating === "watch" && !coachDecided) {
    weighMode = "weekly";
    weighDays = [1];
    safeguards.push("Une pesée par semaine, sans pesée quotidienne");
  } else if (level === "simple") {
    weighMode = "few";
    weighDays = fatLoss ? [1, 3, 5] : [1, 4];
  } else {
    weighMode = "daily";
    weighDays = [1, 2, 3, 4, 5, 6, 7];
  }
  if (input.weighDisabled) {
    weighMode = "off" as WeighMode;
    weighDays = [];
  }
  const weighIn = {
    mode: weighMode,
    perWeek: weighDays.length,
    days: weighDays,
    // Tendance toujours affichée plutôt qu'une pesée isolée.
    trend: weighMode !== "weekly",
    weeklyAverage: level !== "simple" && weighMode === "daily",
  };

  // ── Nutrition ────────────────────────────────────────────────────────
  let nutritionDetail: NutritionDetail = level === "avance" ? "macros" : level === "standard" ? "calories" : "habits";
  if (level === "standard" && input.tracksNutrition === "jamais") nutritionDetail = "habits";
  let showNumbers = nutritionDetail !== "habits";
  if (eating === "stop") {
    nutritionDetail = "habits";
    showNumbers = false;
    safeguards.push("Aucun déficit ni objectif chiffré affiché");
  } else if (eating === "watch" && !coachDecided && nutritionDetail === "macros") {
    nutritionDetail = "calories";
  }

  // ── Bilan du jour ────────────────────────────────────────────────────
  let fields = [...FIELDS[level]];
  if (weighMode === "off") fields = fields.filter((f) => f !== "poids");
  if (input.hasWearable) fields = fields.filter((f) => f !== "horaires_sommeil");
  if (eating === "stop") fields = fields.filter((f) => f !== "faim");
  const sleep: SleepDetail = !fields.includes("sommeil") ? "off" : level === "avance" ? "full" : "hours";
  const minimum: BilanField[] = level === "simple" ? ["poids", "energie", "seance"] : ["poids", "sommeil", "energie"];
  const minimumViable = minimum.filter((f) => fields.includes(f)).slice(0, 3);
  if (minimumViable.length < 3) for (const f of fields) if (minimumViable.length < 3 && !minimumViable.includes(f)) minimumViable.push(f);

  // ── Rappels : à l'heure de la personne, jamais intrusifs ─────────────
  const wake = clampMinutes(input.wakeTime, 7 * 60);
  const bed = clampMinutes(input.bedTime, 22 * 60 + 30);
  const morning = fmt(Math.min(11 * 60, Math.max(6 * 60 + 30, wake + 60)));
  const evening = fmt(Math.min(22 * 60 + 30, Math.max(19 * 60 + 30, bed - 75)));
  const reminders: TrackingProfile["reminders"] =
    level === "simple"
      ? { morning: weighMode === "off" ? null : morning, evening: null, maxPerDay: 1, weighDaysOnly: true }
      : level === "standard"
        ? { morning, evening: null, maxPerDay: 2, weighDaysOnly: weighMode !== "daily" }
        : { morning, evening, maxPerDay: 3, weighDaysOnly: false };

  // ── Garde (écran bloquant) : l'exception, pas la règle ────────────────
  const gate = {
    morning: level !== "simple" && weighMode === "daily" && fields.includes("poids"),
    meal: level === "avance" && nutritionDetail === "macros",
    evening: level === "avance",
  };

  // ── Entraînement ─────────────────────────────────────────────────────
  const rpeWorld = practices.some((p) => ["force", "halterophilie"].includes(p));
  const effort: EffortScale = level === "simple" ? "none" : level === "avance" || rpeWorld ? "rir_rpe" : "rir";

  // ── Photos, mensurations, bilan hebdo ────────────────────────────────
  const photos: TrackingProfile["photos"] = {
    cadence: compet || level === "avance" ? "weekly" : level === "standard" ? "biweekly" : "monthly",
    pose: compet,
  };
  const measurements: TrackingProfile["measurements"] = {
    cadence: compet ? "weekly" : level === "avance" ? "biweekly" : "monthly",
  };
  const checkin: TrackingProfile["checkin"] = {
    depth: level === "simple" ? "short" : level === "standard" ? "standard" : "full",
    // Plus de bilans pour un compétiteur en prépa, à décider avec le coach.
    perWeek: compet && input.coached && (input.weeksToCompetition ?? 99) <= 12 ? 2 : 1,
  };

  // ── Cycle : seulement si la personne le souhaite ─────────────────────
  const cycle: TrackingProfile["cycle"] = !woman || eating === "stop" ? "off" : input.cycleOptIn ? "on" : level === "simple" ? "off" : "offer";

  const competition = {
    planning: compet || (input.history ?? []).includes("competition"),
    peakWeekReminders: compet && input.weeksToCompetition != null && input.weeksToCompetition <= 1,
  };

  // ── Ce qu'on met en avant sur l'accueil ──────────────────────────────
  let homeMetrics: HomeMetric[];
  if (level === "simple") homeMetrics = ["seance", "poids_tendance", "pas", "regularite"];
  else if (level === "standard") homeMetrics = input.goal === "prise_muscle" || input.goal === "performance" ? ["seance", "poids_tendance", "performances", "sommeil", "pas"] : ["poids_tendance", "seance", "pas", "sommeil", "regularite"];
  else homeMetrics = compet ? ["competition", "poids_moyenne", "macros", "sommeil", "fatigue", "photos"] : ["poids_moyenne", "macros", "sommeil", "fatigue", "performances"];
  if (nutritionDetail === "habits") homeMetrics = homeMetrics.filter((m) => m !== "macros");

  const tone: Tone = level === "simple" || eating !== "clear" ? "encourageant" : level === "avance" ? "technique" : "neutre";

  // ── Modules « Mon appli » suggérés ───────────────────────────────────
  const has = (f: BilanField) => fields.includes(f);
  const modules: Modules = {
    poids: weighMode !== "off",
    sommeil: has("sommeil"),
    pas: has("pas"),
    stress: has("stress"),
    digestion: has("digestion"),
    faim: has("faim"),
    energie: has("energie"),
    humeur: has("humeur"),
    courbatures: has("courbatures"),
    hydratation: has("hydratation"),
    cardio_repos: has("cardio_repos"),
    entrainement: true,
    nutrition: true,
    photos: true,
    mensurations: true,
    masse_grasse: level === "avance",
    competition: compet,
    cycle: cycle === "on",
  };

  // ── Suggestion d'ajustement d'après l'adhésion (jamais appliquée seule) ─
  const settled = (input.weeksSinceStart ?? 0) >= 3;
  let suggestion: TrackingProfile["suggestion"] = null;
  if (settled && input.bilanDays14 != null) {
    if (level !== "simple" && input.bilanDays14 <= 3) {
      suggestion = { level: level === "avance" ? "standard" : "simple", reason: `Seulement ${input.bilanDays14} bilans sur 14 jours : un suivi plus léger sera plus facile à tenir.` };
    } else if (level === "simple" && autoLevel === "simple" && input.experience !== "debutant" && (input.bilanDays28 ?? 0) >= 25 && eating === "clear") {
      suggestion = { level: "standard", reason: "Bilans réguliers depuis 4 semaines : tu peux ajouter le sommeil et la digestion si tu veux." };
    }
  }

  return {
    level,
    autoLevel,
    source,
    score,
    reasons,
    safeguards,
    eatingSafety: eating,
    weighIn,
    nutrition: { detail: nutritionDetail, showNumbers },
    bilan: { fields, minimum, sleep, targetSeconds: level === "simple" ? 10 : level === "standard" ? 20 : 45 },
    minimumViable,
    gate,
    training: { effort, executionScore: level === "avance", painCheck: !!input.hasInjury },
    photos,
    measurements,
    checkin,
    cycle,
    competition,
    reminders,
    homeMetrics,
    tone,
    modules,
    suggestion,
  };
}

/** Jour de pesée (1 = lundi ... 7 = dimanche) ? */
export function isWeighDay(profile: Pick<TrackingProfile, "weighIn">, isoDow: number): boolean {
  return profile.weighIn.mode !== "off" && profile.weighIn.days.includes(isoDow);
}

/** Champs du bilan visibles : ceux du niveau, moins les modules que la personne a coupés. */
export function visibleBilanFields(profile: Pick<TrackingProfile, "bilan">, enabled: (f: BilanField) => boolean): BilanField[] {
  return profile.bilan.fields.filter(enabled);
}

/** Module « Mon appli » qui porte chaque champ du bilan. */
export const FIELD_MODULE: Record<BilanField, keyof Modules> = {
  poids: "poids",
  seance: "entrainement",
  pas: "pas",
  energie: "energie",
  sommeil: "sommeil",
  digestion: "digestion",
  stress: "stress",
  humeur: "humeur",
  faim: "faim",
  courbatures: "courbatures",
  hydratation: "hydratation",
  sommeil_qualite: "sommeil",
  horaires_sommeil: "sommeil",
  cardio_repos: "cardio_repos",
};

/**
 * L'énergie (ressenti en une question) est la seule donnée de « Forme du
 * jour » proposée d'office aux niveaux Simple et Standard : son module est
 * désactivé par défaut dans « Mon appli », mais ici elle fait partie du
 * niveau, sauf si la personne l'a coupée explicitement.
 */
export function fieldEnabled(modules: Modules | undefined, f: BilanField): boolean {
  const v = modules?.[FIELD_MODULE[f]];
  if (typeof v === "boolean") return v;
  // Non renseigné : les champs « forme » sont off par défaut dans Mon appli,
  // mais le niveau les amène (energie), les autres suivent le niveau aussi.
  return true;
}

/** Résumé lisible de ce qui est suivi (fiche coach, page de réglage). */
export function describeTracking(p: TrackingProfile): string[] {
  const out: string[] = [];
  out.push(
    p.weighIn.mode === "off" ? "Poids : non suivi"
    : p.weighIn.mode === "weekly" ? "Poids : 1 fois par semaine"
    : p.weighIn.mode === "few" ? `Poids : ${p.weighIn.perWeek} fois par semaine, avec tendance`
    : p.weighIn.weeklyAverage ? "Poids : chaque matin, moyenne hebdomadaire et tendance" : "Poids : chaque matin, avec tendance"
  );
  out.push(p.nutrition.detail === "habits" ? "Alimentation : repas cochés, pas de chiffres" : p.nutrition.detail === "calories" ? "Alimentation : calories et protéines" : "Alimentation : calories et macros précises");
  out.push(`Bilan du jour : ${p.bilan.fields.length} données, environ ${p.bilan.targetSeconds} secondes`);
  out.push(p.training.effort === "none" ? "Séances : poids et répétitions, sans RIR" : p.training.effort === "rir" ? "Séances : RIR par série" : "Séances : RIR et RPE par série");
  out.push(`Photos : ${CADENCE_LABEL[p.photos.cadence]}${p.photos.pose ? ", poses de compétition" : ""}`);
  out.push(`Bilan de la semaine : ${p.checkin.depth === "short" ? "court (3 questions)" : p.checkin.depth === "standard" ? "standard" : "complet"}${p.checkin.perWeek === 2 ? ", 2 fois par semaine" : ""}`);
  out.push(p.reminders.maxPerDay === 1 ? "Rappels : 1 par jour au maximum" : `Rappels : ${p.reminders.maxPerDay} par jour au maximum`);
  return out;
}

export const CADENCE_LABEL: Record<Cadence, string> = { off: "aucune", monthly: "chaque mois", biweekly: "toutes les 2 semaines", weekly: "chaque semaine" };

/**
 * Disposition du bilan du jour : champs principaux (niveau ∩ modules non
 * coupés) et champs en plus (modules explicitement activés mais hors niveau).
 * Rien n'est perdu : ce que le niveau n'affiche pas reste à un tap.
 */
export function bilanLayout(profile: TrackingProfile, modules: Modules | undefined): { fields: BilanField[]; extraFields: BilanField[]; minimum: BilanField[] } {
  const fields = profile.bilan.fields.filter((f) => fieldEnabled(modules, f));
  const extra = FIELDS.avance.filter((f) => !fields.includes(f) && modules?.[FIELD_MODULE[f]] === true);
  const minimum = profile.minimumViable.filter((f) => fields.includes(f));
  return { fields, extraFields: extra, minimum: minimum.length ? minimum : fields.slice(0, 3) };
}

const DOW_FR = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
/** Prochain jour de pesée après aujourd'hui, en toutes lettres (null si pesée quotidienne ou aucune). */
export function nextWeighDayLabel(profile: Pick<TrackingProfile, "weighIn">, isoDow: number): string | null {
  const { mode, days } = profile.weighIn;
  if (mode === "off" || mode === "daily" || !days.length) return null;
  for (let k = 1; k <= 7; k++) {
    const d = ((isoDow - 1 + k) % 7) + 1;
    if (days.includes(d)) return DOW_FR[d];
  }
  return null;
}
