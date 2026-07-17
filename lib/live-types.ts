// Pure types/constants, free of any supabase imports — safe to import from
// client components. utils/live-events.ts (server-only data fetching) also
// re-exports these for server-side callers.

export type LiveType = "1to1" | "webinaire" | "qna";
export type LiveStatus = "scheduled" | "cancelled" | "ended";

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
}

export const LIVE_TYPE_LABELS: Record<LiveType, string> = {
  "1to1": "Appel 1:1",
  webinaire: "Webinaire / Présentation",
  qna: "Live Q&A",
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
