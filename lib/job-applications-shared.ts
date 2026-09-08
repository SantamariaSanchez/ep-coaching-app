// Données de candidature partagées entre client et serveur (formulaire
// public /carrieres, action submitApplication). Séparé de lib/job-
// applications.ts qui importe createAdminClient (service role) : ce fichier-là
// ne doit jamais être chargé côté navigateur, celui-ci si.

// Lien de réservation direct pour l'entretien de recrutement (20 min), une
// fois la candidature envoyée avec les réponses de qualification. null tant
// que le créneau Calendly n'existe pas encore côté compte
// calendly.com/peccoux-manu (création tentée via l'intégration MCP, refusée
// en "Permission Denied" — scope insuffisant sur le connecteur). À créer
// manuellement dans Calendly (Entretien de recrutement, ~20 min, appel
// sortant, même modèle que "| Appel Découverte |"), puis coller l'URL ici :
// dès qu'elle est renseignée, le formulaire de candidature propose la
// réservation immédiate au lieu d'attendre un email.
export const CAREERS_INTERVIEW_BOOKING_URL: string | null = null;

export const APPLICATION_STATUSES = ["nouvelle", "en_discussion", "refusee", "acceptee"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Questions de qualification posées à la candidature (voir /carrieres) —
// mêmes questions quel que soit le poste : ce qui distingue un candidat
// aligné d'une candidature générique tient moins au poste qu'à la démarche
// elle-même. `key` sert de clé dans la colonne jsonb `answers`.
export const QUALIFYING_QUESTIONS = [
  {
    key: "motivation",
    label: "Pourquoi ce poste chez EP Coaching, précisément ?",
    placeholder: "Pas une lettre de motivation générique : ce qui te parle ici, concrètement.",
    required: true,
  },
  {
    key: "availability",
    label: "Combien de temps par semaine peux-tu vraiment y consacrer ?",
    placeholder: "Ex : 5h/semaine, en soirée et le week-end",
    required: true,
  },
  {
    key: "experience",
    label: "Une expérience liée à ce poste, même petite ?",
    placeholder: "Coaching, vente, création de contenu... ou pourquoi tu penses pouvoir le faire sans",
    required: false,
  },
  {
    key: "link",
    label: "Un lien vers ton travail (Instagram, portfolio, CV...)",
    placeholder: "https://...",
    required: false,
  },
] as const;
export type QualifyingAnswerKey = (typeof QUALIFYING_QUESTIONS)[number]["key"];
export type QualifyingAnswers = Partial<Record<QualifyingAnswerKey, string>>;

export interface JobApplication {
  id: string;
  owner_id: string;
  role_key: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: ApplicationStatus;
  notes: string | null;
  answers: QualifyingAnswers | null;
  created_at: string;
}
