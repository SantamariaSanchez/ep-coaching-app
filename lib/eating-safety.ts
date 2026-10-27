// Dépistage de la relation à l'alimentation, avant tout chiffre de déficit.
//
// Politique d'accompagnement d'Emmanuel (décision produit, pas une règle
// médicale générale) : une personne qui a un trouble du comportement
// alimentaire (TCA) n'est pas prise en coaching nutritionnel, elle est
// orientée vers un professionnel de santé. L'appli ne diagnostique jamais :
// elle pose la question, n'affiche aucun déficit chiffré quand la réponse
// est « actuellement » ou « je ne sais pas », prévient la coach et oriente.
// Parler du factuel et de la santé, jamais de l'apparence ni de culpabilité.
//
// Module pur (aucun import) : testé dans lib/__tests__/eating-safety.test.ts.

export type EatingRelation = "non" | "passe" | "actuel" | "incertain";

/** clear : rien à signaler. watch : la coach est prévenue, pas de déficit agressif. stop : aucun déficit chiffré. */
export type EatingSafetyLevel = "clear" | "watch" | "stop";

export const EATING_RELATION_VALUES: readonly EatingRelation[] = ["non", "passe", "actuel", "incertain"];

export const EATING_RELATION_QUESTION =
  "Est-ce que tu as, ou as-tu déjà eu, un trouble du comportement alimentaire (anorexie, boulimie, hyperphagie) ou une relation très compliquée à la nourriture ?";

export const EATING_RELATION_OPTIONS: { value: EatingRelation; label: string }[] = [
  { value: "non", label: "Non" },
  { value: "passe", label: "Oui, par le passé" },
  { value: "actuel", label: "Oui, actuellement" },
  { value: "incertain", label: "Je ne sais pas" },
];

/** Libellés du questionnaire d'onboarding (radio) vers la valeur stockée. */
export const EATING_RELATION_BY_LABEL: Record<string, EatingRelation> = Object.fromEntries(
  EATING_RELATION_OPTIONS.map((o) => [o.label, o.value])
);

export function parseEatingRelation(raw: unknown): EatingRelation | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if ((EATING_RELATION_VALUES as readonly string[]).includes(v)) return v as EatingRelation;
  return EATING_RELATION_BY_LABEL[v] ?? null;
}

export function eatingSafetyLevel(relation: EatingRelation | null | undefined): EatingSafetyLevel {
  if (relation === "actuel" || relation === "incertain") return "stop";
  if (relation === "passe") return "watch";
  return "clear";
}

/** Un déficit chiffré n'est jamais proposé en niveau « stop ». */
export function deficitAllowed(level: EatingSafetyLevel): boolean {
  return level !== "stop";
}

export const EATING_STOP_TITLE = "On ne te propose pas de chiffres pour l'instant";

export const EATING_STOP_MESSAGE =
  "Ta santé passe avant tout objectif. Pour ce sujet, la bonne personne est un professionnel de santé : parles-en à ton médecin traitant, il saura t'orienter. Si tu es en détresse, le 3114 (numéro national de prévention, gratuit, 24 h sur 24) est là pour toi. Je reste là pour l'entraînement et le reste quand ce sera le bon moment pour toi.";

export const EATING_WATCH_MESSAGE =
  "Merci de ta confiance. On avancera sans pression sur les chiffres, avec une approche simple et sans culpabilité, et ta coach en est informée.";

/** Texte de notification pour la coach (jamais d'interprétation clinique). */
export function eatingCoachAlert(level: EatingSafetyLevel, clientName: string): { title: string; body: string } | null {
  if (level === "stop") {
    return {
      title: `${clientName} signale un trouble alimentaire`,
      body: "Réponse « actuellement » ou « je ne sais pas ». Aucun déficit chiffré ne lui est proposé. Orienter vers un professionnel de santé, parler du factuel et de la santé, jamais de l'apparence.",
    };
  }
  if (level === "watch") {
    return {
      title: `${clientName} a déjà eu un trouble alimentaire`,
      body: "Avance sans pression sur les chiffres, privilégie la maintenance et les habitudes, ne culpabilise jamais un écart.",
    };
  }
  return null;
}
