import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { LiveEvent } from "@/lib/live-types";

export type { LiveType, LiveStatus, LiveEvent } from "@/lib/live-types";
export { LIVE_TYPE_LABELS, generateRoomSlug } from "@/lib/live-types";

async function attachInvitedNames(events: Record<string, unknown>[], admin: ReturnType<typeof createAdminClient>) {
  const clientIds = [...new Set(events.map((e) => e.invited_client_id).filter(Boolean) as string[])];
  if (clientIds.length === 0) return events.map((e) => ({ ...e, invited_client_name: null }));
  const { data: clients } = await admin.from("profiles").select("id, full_name").in("id", clientIds);
  const nameMap: Record<string, string> = {};
  for (const c of (clients ?? []) as { id: string; full_name: string | null }[]) {
    nameMap[c.id] = c.full_name ?? "Client";
  }
  return events.map((e) => ({
    ...e,
    invited_client_name: e.invited_client_id ? nameMap[e.invited_client_id as string] ?? null : null,
  }));
}

// All events visible to a given client: group events (webinaire/qna) hébergés
// par SON coach, plus les 1:1 spécifiquement adressés à lui — jamais les
// group events d'un autre coach de la plateforme.
export async function getUpcomingLiveEventsForClient(clientId: string, coachId: string | null): Promise<LiveEvent[]> {
  try {
    const admin = createAdminClient();
    // Sans coach attribué (cas limite), on ne montre que les 1:1 adressés
    // au client — jamais les group events, faute de savoir lesquels sont
    // "les siens".
    const groupClause = coachId ? `and(type.neq.1to1,host_id.eq.${coachId})` : "type.eq.__none__";
    const { data } = await admin
      .from("live_events")
      .select("*")
      .eq("status", "scheduled")
      .or(`${groupClause},invited_client_id.eq.${clientId}`)
      .order("starts_at", { ascending: true });

    if (!data) return [];
    return (await attachInvitedNames(data, admin)) as LiveEvent[];
  } catch {
    return [];
  }
}

// Lives passés (terminés explicitement par l'hôte, ou dont l'horaire +
// marge est simplement écoulé) — pas de rediff vidéo (pas d'enregistrement
// disponible sur ce plan Jitsi gratuit), juste un historique.
export async function getPastLiveEventsForClient(clientId: string, coachId: string | null, limit = 15): Promise<LiveEvent[]> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const groupClause = coachId ? `and(type.neq.1to1,host_id.eq.${coachId})` : "type.eq.__none__";
    const { data } = await admin
      .from("live_events")
      .select("*")
      .or(`status.eq.ended,starts_at.lt.${cutoff}`)
      .neq("status", "cancelled")
      .or(`${groupClause},invited_client_id.eq.${clientId}`)
      .order("starts_at", { ascending: false })
      .limit(limit);

    if (!data) return [];
    return (await attachInvitedNames(data, admin)) as LiveEvent[];
  } catch {
    return [];
  }
}

// Un coach ne doit voir que les lives qu'il héberge lui-même — jamais ceux
// d'un autre coach, même s'ils partagent la même plateforme.
export async function getAllLiveEventsForCoach(hostId: string): Promise<LiveEvent[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("live_events")
      .select("*")
      .eq("host_id", hostId)
      .order("starts_at", { ascending: true });

    if (!data) return [];
    return (await attachInvitedNames(data, admin)) as LiveEvent[];
  } catch {
    return [];
  }
}

export async function getLiveEventById(id: string): Promise<LiveEvent | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("live_events").select("*").eq("id", id).single();
    if (!data) return null;
    return { ...data, invited_client_name: null } as LiveEvent;
  } catch {
    return null;
  }
}
