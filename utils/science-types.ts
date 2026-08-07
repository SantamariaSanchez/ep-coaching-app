// Types et constantes purs (sans import serveur) pour la section Science —
// séparés de utils/science.ts pour rester importables depuis des composants
// client sans entraîner next/headers dans le bundle navigateur.

export type ScienceArticleType =
  | "meta_analyse"
  | "revue_systematique"
  | "essai_clinique"
  | "etude_observationnelle"
  | "autre";

export interface ScienceArticle {
  id: string;
  pmid: string;
  doi: string | null;
  title: string;
  title_fr: string | null;
  abstract: string | null;
  authors: string | null;
  journal: string | null;
  pub_date: string | null;
  article_type: ScienceArticleType | null;
  topic: string;
  summary_fr: string | null;
  url: string;
  pmc_id: string | null;
  is_actualite: boolean;
  is_auto: boolean;
  created_at: string;
}

export const SCIENCE_TOPICS = [
  "Hypertrophie & Musculation",
  "Force & Performance",
  "Nutrition & Composition corporelle",
  "Supplémentation",
  "Récupération & Sommeil",
  "Hormones & Santé",
  "Perte de graisse",
  "Féminin & Spécificités",
] as const;

export const ARTICLE_TYPE_LABELS: Record<ScienceArticleType, string> = {
  meta_analyse: "Méta-analyse",
  revue_systematique: "Revue systématique",
  essai_clinique: "Essai clinique",
  etude_observationnelle: "Étude observationnelle",
  autre: "Autre",
};

export interface ScienceStudy {
  id: string;
  title: string;
  hypothesis: string | null;
  protocol: string | null;
  status: "idee" | "en_cours" | "terminee";
  /** Objectif cible fixé par le coach (pas le compteur réel d'inscrits). */
  participant_count: number | null;
  start_date: string | null;
  end_date: string | null;
  results: string | null;
  created_at: string;
  updated_at: string;
  /** Nombre réel de membres inscrits (table science_study_participants). */
  joined_count: number;
  /** L'utilisateur courant a-t-il rejoint cette étude. */
  is_joined: boolean;
}

export const STUDY_STATUS_LABELS: Record<ScienceStudy["status"], string> = {
  idee: "Idée",
  en_cours: "En cours",
  terminee: "Terminée",
};

// Suggestion de type à partir du titre (mots-clés standards des titres
// PubMed) — jamais écrit en base tel quel, juste la valeur pré-sélectionnée
// dans le formulaire d'import/édition, que le coach garde ou change. Le
// cron quotidien insère "autre" faute de mieux ; ceci lui donne un point de
// départ plus juste sans jamais décider à la place du coach (même logique
// que getEquipmentType côté salles).
export function guessArticleType(title: string): ScienceArticleType {
  const t = title.toLowerCase();
  if (/meta-analys|meta analys/.test(t)) return "meta_analyse";
  if (/systematic review/.test(t)) return "revue_systematique";
  if (/randomi[sz]ed controlled trial|randomi[sz]ed.{0,20}trial|\brct\b/.test(t)) return "essai_clinique";
  if (/cohort study|cross-sectional|observational study|prospective study/.test(t)) return "etude_observationnelle";
  return "autre";
}
