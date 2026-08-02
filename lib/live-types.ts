// Pure types/constants, free of any supabase imports — safe to import from
// client components. utils/live-events.ts (server-only data fetching) also
// re-exports these for server-side callers.

export type LiveType =
  | "1to1"
  | "webinaire"
  | "qna"
  | "audit"
  | "checkin_hebdo"
  | "acces_direct"
  | "atelier";
export type LiveStatus = "scheduled" | "cancelled" | "ended";

// Types qui restent des échanges 1 pair (un seul client invité), par
// opposition aux lives de groupe (webinaire/qna/atelier) qui ont un RSVP.
export const ONE_TO_ONE_TYPES: LiveType[] = ["1to1", "audit", "checkin_hebdo", "acces_direct"];

export function isOneToOneType(type: LiveType): boolean {
  return ONE_TO_ONE_TYPES.includes(type);
}

const ALL_LIVE_TYPES: LiveType[] = [
  "1to1", "webinaire", "qna", "audit", "checkin_hebdo", "acces_direct", "atelier",
];

export function isLiveType(value: string): value is LiveType {
  return (ALL_LIVE_TYPES as string[]).includes(value);
}

export interface LiveEvent {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  type: LiveType;
  invited_client_id: string | null;
  invited_client_name: string | null;
  room_slug: string;
  starts_at: string;
  duration_minutes: number;
  status: LiveStatus;
  created_at: string;
  /** Notes du coach écrites après coup — compense l'absence de rediff, et
   * sert aussi de livrable pour un audit stratégique (ex. plan C.A.R.V.). */
  recap: string | null;
  /** Intervenant invité pour un atelier (spécialiste externe), le cas échéant. */
  guest_name: string | null;
  /** Nombre de clients ayant confirmé leur présence (lives de groupe uniquement). */
  rsvp_count?: number;
  /** Le client courant a-t-il confirmé sa présence ? */
  has_rsvped?: boolean;
}

export const LIVE_TYPE_LABELS: Record<LiveType, string> = {
  "1to1": "Appel 1:1",
  webinaire: "Webinaire / Présentation",
  qna: "Live Q&A",
  audit: "Audit stratégique",
  checkin_hebdo: "Suivi hebdomadaire",
  acces_direct: "Accès direct",
  atelier: "Atelier expert",
};

// Comment chaque type se réserve concrètement, pour piloter l'UI (quel
// composant de réservation afficher) sur les pages dédiées /live/[type] :
//  - self-service        : le client choisit un créneau libre du coach (SlotPicker)
//  - recurring-self-service : idem, mais réserve une série de 8 séances hebdo
//  - coach-scheduled      : c'est le coach qui programme, le client consulte/RSVP
//  - flash-request        : le client envoie une demande, le coach programme ou refuse
export type LiveBookingMode =
  | "self-service"
  | "recurring-self-service"
  | "coach-scheduled"
  | "flash-request";

export interface LiveTypeInfo {
  tagline: string;
  description: string;
  format: string;
  cadence: string;
  includes: string[];
  bookingMode: LiveBookingMode;
  defaultDuration: number;
}

export const LIVE_TYPE_INFO: Record<LiveType, LiveTypeInfo> = {
  "1to1": {
    tagline: "Appel individuel classique",
    description:
      "Un échange individuel avec ton coach en visio, pour faire le point, ajuster ton programme ou répondre à tes questions du moment.",
    format: "Visio, en tête-à-tête",
    cadence: "À la demande, selon les disponibilités de ton coach",
    includes: [
      "Échange en direct par visio avec ton coach",
      "Un créneau que tu choisis toi-même",
      "Salon accessible 10 minutes avant le début",
    ],
    bookingMode: "self-service",
    defaultDuration: 30,
  },
  audit: {
    tagline: "Bilan stratégique approfondi",
    description:
      "Un bilan approfondi de ta progression et de ta stratégie (entraînement, nutrition, organisation). Ton coach prépare une analyse complète et t'en restitue les conclusions en direct.",
    format: "Visio, format long",
    cadence: "Programmé par ton coach, sur demande ou à une étape clé de ton accompagnement",
    includes: [
      "Analyse complète de ta progression",
      "Restitution en direct avec ton coach",
      "Des notes écrites remises après la séance",
    ],
    bookingMode: "coach-scheduled",
    defaultDuration: 60,
  },
  checkin_hebdo: {
    tagline: "Suivi récurrent chaque semaine",
    description:
      "Un rendez-vous récurrent, chaque semaine au même créneau, pour garder le cap : ajustements, motivation, réponses à tes questions.",
    format: "Visio, en tête-à-tête, format court",
    cadence: "Chaque semaine, réservé sur 8 semaines en une fois",
    includes: [
      "Un créneau fixe chaque semaine",
      "8 séances réservées en un seul geste",
      "Continuité du suivi d'une semaine à l'autre",
    ],
    bookingMode: "recurring-self-service",
    defaultDuration: 30,
  },
  acces_direct: {
    tagline: "Call stratégique ou point rapide",
    description:
      "Un accès facilité à ton coach en dehors des rendez-vous classiques : un call stratégique programmé, ou une réponse rapide sur une décision clé via un point flash.",
    format: "Visio, programmé ou en point flash court",
    cadence: "Call programmé + demandes ponctuelles de point flash",
    includes: [
      "Un call stratégique programmé avec ton coach",
      "La possibilité de demander un point flash (15 min, décision clé)",
      "Une réponse rapide sans attendre le prochain rendez-vous",
    ],
    bookingMode: "flash-request",
    defaultDuration: 15,
  },
  atelier: {
    tagline: "Formation en direct, invité possible",
    description:
      "Une session de formation en direct, parfois animée avec un intervenant invité, sur un sujet précis : technique, nutrition, mindset. Un vrai temps d'apprentissage collectif.",
    format: "Visio de groupe, avec contenu et exercices",
    cadence: "Programmé par ton coach, ponctuellement",
    includes: [
      "Contenu pédagogique dédié à un sujet précis",
      "Intervenant expert invité, selon les sessions",
      "Questions/réponses en direct",
    ],
    bookingMode: "coach-scheduled",
    defaultDuration: 60,
  },
  webinaire: {
    tagline: "Présentation ouverte au groupe",
    description:
      "Une présentation en direct ouverte à tous les clients suivis par ton coach, sur un thème donné : nouveauté, méthode, actualité.",
    format: "Visio de groupe, présentation structurée",
    cadence: "Programmé par ton coach, selon l'actualité",
    includes: [
      "Présentation structurée par ton coach",
      "Chat pour poser tes questions en direct",
      "Ouvert à tous les clients suivis par ton coach",
    ],
    bookingMode: "coach-scheduled",
    defaultDuration: 45,
  },
  qna: {
    tagline: "Questions/réponses en direct",
    description:
      "Un format libre où tu poses tes questions en direct à ton coach, sans ordre du jour imposé : entraînement, nutrition, organisation, tout y passe.",
    format: "Visio de groupe, format libre",
    cadence: "Programmé par ton coach, régulièrement",
    includes: [
      "Questions libres, sans thème imposé",
      "Réponses en direct de ton coach",
      "Ouvert à tous les clients suivis par ton coach",
    ],
    bookingMode: "coach-scheduled",
    defaultDuration: 45,
  },
};

export function generateRoomSlug(): string {
  return `epcoaching-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

// Même fenêtre que useJoinWindow (components/live/LiveEventCard.tsx) — le
// bouton "Rejoindre" n'est affiché que dans cette fenêtre, mais rien ne
// vérifiait côté serveur qu'on ne rentre pas directement par l'URL en
// dehors de la fenêtre (avant l'heure, ou bien après que l'appel soit fini).
export function isWithinJoinWindow(event: Pick<LiveEvent, "starts_at" | "duration_minutes">): boolean {
  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  const joinOpensAt = start - 10 * 60 * 1000;
  const joinClosesAt = start + event.duration_minutes * 60 * 1000 + 30 * 60 * 1000;
  return now >= joinOpensAt && now <= joinClosesAt;
}
