import type { LiveExercise, SegmentDraft, SetDetails } from "@/lib/live-session";
import type { StrengthExtra } from "@/lib/training-styles";

// Types partagés de la séance en cours (components/client/SessionView.tsx et
// les briques de components/client/session/).

export interface PrevWeight {
  weight: number | null;
  reps: string | null;
  rir: number | null;
  /** Détail d'une série à technique, la dernière fois (jsonb brut). */
  details?: unknown;
}

export interface LibraryTip {
  instructions: string | null;
  video_url: string | null;
}

export interface SetState {
  localId: string;
  setNumber: number;
  weightKg: string;
  repsActual: string;
  rirActual: string;
  standardizationScore: string;
  /** Sous-séries d'une technique (myo-reps, rest-pause, dégressive, cluster). */
  segs?: SegmentDraft[];
  /** Reps partielles après l'échec (technique « partielles »). */
  partials?: string;
  /** Poids du corps / lest / assistance choisi en séance (sinon déduit du nom). */
  mode?: StrengthExtra["mode"];
  /** Assistance (élastique, machine) en kg retirés. */
  assistKg?: string;
  /** Étape de skill (« Advanced tuck »). */
  step?: string;
  /** RPE de la série (6 à 10). */
  rpe?: string;
  /** Tentative de compétition : barre validée (true) ou ratée (false). */
  made?: boolean;
  validated: boolean;
  isPR: boolean;
  dbId: string | null;
  restDuration: number | null;
  hasVideo: boolean;
  /** Vidéo déjà envoyée au coach dans la messagerie. */
  videoSentAt?: string | null;
  // Enregistrement en base en cours : bloque un second envoi du même set
  // (double-tap sur « Valider ») qui créait une deuxième ligne.
  saving?: boolean;
  // Validée à l'écran mais l'enregistrement a échoué (réseau coupé en
  // salle) : avertissement visible, nouvel essai automatique au retour du
  // réseau, et la saisie survit à la fermeture de l'appli (LivePlan).
  saveFailed?: boolean;
  /** Série corrigée après coup : la revalider ne relance pas de repos. */
  wasValidated?: boolean;
}

export interface ExerciseState {
  /** Clé stable pour toute la séance, voir exerciseKey (lib/live-session.ts). */
  key: string;
  exercise: LiveExercise;
  sets: SetState[];
  clientNotes: string;
}

export type VideoStatus = "uploading" | "sending" | "uploaded" | "sent" | "error";

export interface VideoState {
  status: VideoStatus;
  /** 0-1 pendant l'envoi du fichier, null si inconnu. */
  progress: number | null;
  error?: string;
  /** L'envoi au coach a été demandé (à refaire après un nouvel essai). */
  sendToCoach: boolean;
}

export type { SetDetails };
