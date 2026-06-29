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
