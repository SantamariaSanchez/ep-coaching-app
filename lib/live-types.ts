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
