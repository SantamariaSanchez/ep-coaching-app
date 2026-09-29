import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { LiveEvent } from "@/lib/live-types";
import { todayInParis } from "@/lib/dates";
import {
  addDaysToDateStr, isoWeekdayOfDateStr, hhmmToMinutes, minutesToHhmm, parisWallClockToIso,
} from "@/lib/live-time";

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

const UPCOMING_LOOKBACK_MS = 6 * 60 * 60 * 1000;

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
    // Borne basse : un live "scheduled" que l'hôte n'a jamais clôturé avec
    // "Terminer" restait indéfiniment dans les "à venir" (et apparaissait en
    // double avec les passés). 6 h couvrent un live encore en cours, même
    // long ; au delà, il relève de getPastLiveEventsForClient.
    const since = new Date(Date.now() - UPCOMING_LOOKBACK_MS).toISOString();
    const { data } = await admin
      .from("live_events")
      .select("*")
      .eq("status", "scheduled")
      .gte("starts_at", since)
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

// Les deux requêtes ci-dessus se chevauchent volontairement (un live en
// cours depuis plus de 30 min est à la fois "à venir" et "passé") : sans
// dédoublonnage, la même carte s'affichait deux fois, avec la même key React.
// La version "à venir" est prioritaire (elle porte l'état du RSVP à jour).
export function mergeLiveEvents(upcoming: LiveEvent[], past: LiveEvent[]): LiveEvent[] {
  const seen = new Set<string>();
  const merged: LiveEvent[] = [];
  for (const event of [...upcoming, ...past]) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged;
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

// Réservation en libre-service d'un créneau de disponibilité : renvoie les
// créneaux libres des N prochains jours, en heure de Paris, en soustrayant
// TOUT ce que le coach a déjà au planning (1:1, suivi hebdo, audit, point
// flash, atelier, webinaire...). Avant, seuls les 1:1 étaient soustraits :
// un client pouvait réserver par-dessus un audit ou un webinaire.
export interface AvailabilitySlot {
  startsAt: string; // ISO
  durationMinutes: number;
}

// Plus longue durée proposable pour un live (2 h dans LiveScheduler) plus
// une marge : un live commencé jusqu'à 4 h avant un instant peut encore
// l'occuper.
const MAX_LIVE_LOOKBACK_MS = 4 * 60 * 60 * 1000;
// Délai minimal entre la réservation et le début du créneau.
const MIN_BOOKING_NOTICE_MS = 60 * 60 * 1000;

type AdminClient = ReturnType<typeof createAdminClient>;

interface BusyRange {
  start: number;
  end: number;
}

async function getHostBusyRanges(
  admin: AdminClient,
  hostId: string,
  fromMs: number,
  toMs: number
): Promise<BusyRange[]> {
  const { data, error } = await admin
    .from("live_events")
    .select("starts_at, duration_minutes")
    .eq("host_id", hostId)
    .neq("status", "cancelled")
    .gte("starts_at", new Date(fromMs - MAX_LIVE_LOOKBACK_MS).toISOString())
    .lt("starts_at", new Date(toMs).toISOString());
  // Lecture impossible : on ne prétend jamais qu'un créneau est libre sans
  // l'avoir vérifié. L'appelant ne propose alors aucun créneau, ou refuse
  // la réservation, plutôt que de risquer un doublon.
  if (error) throw error;
  return ((data ?? []) as { starts_at: string; duration_minutes: number }[]).map((b) => {
    const start = new Date(b.starts_at).getTime();
    return { start, end: start + b.duration_minutes * 60 * 1000 };
  });
}

function overlapsAny(start: number, end: number, ranges: BusyRange[]): boolean {
  return ranges.some((b) => start < b.end && end > b.start);
}

/**
 * Le coach a-t-il déjà un live (non annulé, quel que soit le type) qui
 * chevauche [startIso, startIso + durée] ? Sert à la réservation récurrente,
 * dont les dernières semaines sortent de l'horizon des créneaux calculés.
 * Lève une erreur si la lecture échoue (jamais de "libre" par défaut).
 */
export async function hasHostConflict(
  admin: AdminClient,
  hostId: string,
  startIso: string,
  durationMinutes: number
): Promise<boolean> {
  const start = new Date(startIso).getTime();
  const end = start + durationMinutes * 60 * 1000;
  const busy = await getHostBusyRanges(admin, hostId, start, end);
  return overlapsAny(start, end, busy);
}

export async function getAvailableSlotsForCoach(coachId: string, daysAhead = 14): Promise<AvailabilitySlot[]> {
  try {
    const admin = createAdminClient();
    const { data: rules } = await admin
      .from("coach_availability")
      .select("day_of_week, start_time, end_time, slot_duration_minutes")
      .eq("coach_id", coachId);
    if (!rules || rules.length === 0) return [];

    const nowMs = Date.now();
    const earliest = nowMs + MIN_BOOKING_NOTICE_MS;
    const today = todayInParis();
    // +1 jour : le dernier jour de l'horizon est couvert en entier.
    const horizonMs = nowMs + (daysAhead + 1) * 24 * 60 * 60 * 1000;
    const busy = await getHostBusyRanges(admin, coachId, nowMs, horizonMs);

    // Dédoublonnage par instant : deux règles qui se chevauchent (ou l'heure
    // qui n'existe pas au passage à l'heure d'été) ne doivent jamais
    // proposer deux fois le même créneau.
    const slotsByStart = new Map<string, AvailabilitySlot>();

    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
      // Jours calendaires de Paris, jamais le getDay() du serveur (UTC).
      const dateStr = addDaysToDateStr(today, dayOffset);
      const isoWeekday = isoWeekdayOfDateStr(dateStr); // 1=lundi...7=dimanche

      for (const rule of rules as {
        day_of_week: number;
        start_time: string;
        end_time: string;
        slot_duration_minutes: number;
      }[]) {
        if (rule.day_of_week !== isoWeekday) continue;
        const step = rule.slot_duration_minutes;
        if (!step || step <= 0) continue;

        // On avance en minutes "murales" de Paris, puis chaque début est
        // converti en instant réel : 04:00 reste 04:00 à Paris, été comme
        // hiver, quel que soit le fuseau du serveur.
        const ruleStart = hhmmToMinutes(rule.start_time);
        const ruleEnd = hhmmToMinutes(rule.end_time);
        for (let minute = ruleStart; minute + step <= ruleEnd; minute += step) {
          const startIso = parisWallClockToIso(dateStr, minutesToHhmm(minute));
          if (!startIso) continue;
          const slotStart = new Date(startIso).getTime();
          const slotEnd = slotStart + step * 60 * 1000;
          if (slotStart < earliest) continue; // au moins 1h de délai
          if (overlapsAny(slotStart, slotEnd, busy)) continue;
          if (!slotsByStart.has(startIso)) {
            slotsByStart.set(startIso, { startsAt: startIso, durationMinutes: step });
          }
        }
      }
    }

    return [...slotsByStart.values()].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  } catch (e) {
    console.error("getAvailableSlotsForCoach error:", e);
    return [];
  }
}

/**
 * Le créneau demandé fait-il bien partie des créneaux libres calculés à
 * l'instant ? La réservation n'accepte plus n'importe quel horaire ni
 * n'importe quelle durée envoyés par le navigateur, et refuse tout
 * chevauchement avec un live déjà au planning du coach.
 */
export async function isSlotStillAvailable(
  coachId: string,
  startsAt: string,
  durationMinutes: number
): Promise<boolean> {
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return false;
  const slots = await getAvailableSlotsForCoach(coachId);
  return slots.some(
    (s) => new Date(s.startsAt).getTime() === target && s.durationMinutes === durationMinutes
  );
}
