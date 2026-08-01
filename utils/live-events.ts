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

// Ajoute le nombre de RSVP (lives de groupe) — et, si viewerId est fourni,
// si CE viewer a lui-même confirmé sa présence.
async function attachRsvps(
  events: Record<string, unknown>[],
  admin: ReturnType<typeof createAdminClient>,
  viewerId?: string
) {
  const eventIds = events.map((e) => e.id as string);
  if (eventIds.length === 0) return events.map((e) => ({ ...e, rsvp_count: 0, has_rsvped: false }));

  const { data: rsvps } = await admin
    .from("live_event_rsvps")
    .select("event_id, client_id")
    .in("event_id", eventIds);

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of (rsvps ?? []) as { event_id: string; client_id: string }[]) {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
    if (viewerId && r.client_id === viewerId) mine.add(r.event_id);
  }

  return events.map((e) => ({
    ...e,
    rsvp_count: counts[e.id as string] ?? 0,
    has_rsvped: mine.has(e.id as string),
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
    const withNames = await attachInvitedNames(data, admin);
    return (await attachRsvps(withNames, admin, clientId)) as LiveEvent[];
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
    const withNames = await attachInvitedNames(data, admin);
    return (await attachRsvps(withNames, admin, clientId)) as LiveEvent[];
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
    const withNames = await attachInvitedNames(data, admin);
    return (await attachRsvps(withNames, admin)) as LiveEvent[];
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

// Réservation en libre-service d'un créneau de disponibilité 1:1 — renvoie
// les créneaux libres des N prochains jours en soustrayant les créneaux déjà
// pris par un live_event de type 1to1 pour ce coach.
export interface AvailabilitySlot {
  startsAt: string; // ISO
  durationMinutes: number;
}

export async function getAvailableSlotsForCoach(coachId: string, daysAhead = 14): Promise<AvailabilitySlot[]> {
  try {
    const admin = createAdminClient();
    const { data: rules } = await admin
      .from("coach_availability")
      .select("day_of_week, start_time, end_time, slot_duration_minutes")
      .eq("coach_id", coachId);
    if (!rules || rules.length === 0) return [];

    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data: booked } = await admin
      .from("live_events")
      .select("starts_at, duration_minutes")
      .eq("host_id", coachId)
      .eq("type", "1to1")
      .neq("status", "cancelled")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", horizon.toISOString());

    const bookedRanges = ((booked ?? []) as { starts_at: string; duration_minutes: number }[]).map((b) => ({
      start: new Date(b.starts_at).getTime(),
      end: new Date(b.starts_at).getTime() + b.duration_minutes * 60 * 1000,
    }));

    const slots: AvailabilitySlot[] = [];
    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
      const day = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const isoWeekday = day.getDay() === 0 ? 7 : day.getDay(); // 1=lundi...7=dimanche

      for (const rule of rules as {
        day_of_week: number;
        start_time: string;
        end_time: string;
        slot_duration_minutes: number;
      }[]) {
        if (rule.day_of_week !== isoWeekday) continue;

        const [startH, startM] = rule.start_time.split(":").map(Number);
        const [endH, endM] = rule.end_time.split(":").map(Number);
        const dayStart = new Date(day);
        dayStart.setHours(startH, startM, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(endH, endM, 0, 0);

        for (
          let slotStart = dayStart.getTime();
          slotStart + rule.slot_duration_minutes * 60 * 1000 <= dayEnd.getTime();
          slotStart += rule.slot_duration_minutes * 60 * 1000
        ) {
          const slotEnd = slotStart + rule.slot_duration_minutes * 60 * 1000;
          if (slotStart < now.getTime() + 60 * 60 * 1000) continue; // au moins 1h de délai

          const overlaps = bookedRanges.some((b) => slotStart < b.end && slotEnd > b.start);
          if (!overlaps) {
            slots.push({ startsAt: new Date(slotStart).toISOString(), durationMinutes: rule.slot_duration_minutes });
          }
        }
      }
    }

    return slots.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  } catch {
    return [];
  }
}
