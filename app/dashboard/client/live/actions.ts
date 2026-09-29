"use server";

import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateRoomSlug, isOneToOneType } from "@/lib/live-types";
import { notifyUser } from "@/lib/notify";
import { hasHostConflict, isSlotStillAvailable } from "@/utils/live-events";
import {
  addDaysToDateStr, formatLiveDateTime, formatLiveTime, formatParis, parisDateKey, parisHhmm,
  parisWallClockToIso,
} from "@/lib/live-time";
import { revalidatePath } from "next/cache";

const SLOT_TAKEN_ERROR = "Ce créneau n'est plus disponible, choisis-en un autre.";
const DEFAULT_WEEKLY_OCCURRENCES = 8;
const MAX_WEEKLY_OCCURRENCES = 12;

// Confirmer/annuler sa présence à un live de groupe (webinaire/qna) — pas
// disponible sur un 1:1, qui n'a qu'un seul invité déjà déterminé.
export async function toggleRsvp(eventId: string): Promise<{ error?: string; rsvped?: boolean }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("live_events")
    .select("id, type, host_id, status")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || isOneToOneType(event.type) || event.status !== "scheduled") {
    return { error: "Live introuvable." };
  }

  const { data: myProfile } = await admin
    .from("profiles")
    .select("coach_id")
    .eq("id", guard.userId)
    .single();
  if (myProfile?.coach_id !== event.host_id) return { error: "Accès non autorisé." };

  const { data: existing } = await admin
    .from("live_event_rsvps")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("client_id", guard.userId)
    .maybeSingle();

  if (existing) {
    await admin.from("live_event_rsvps").delete().eq("event_id", eventId).eq("client_id", guard.userId);
    revalidatePath("/dashboard/client/live");
    revalidatePath("/dashboard/coach/live");
    return { rsvped: false };
  }

  await admin.from("live_event_rsvps").insert({ event_id: eventId, client_id: guard.userId });
  revalidatePath("/dashboard/client/live");
  revalidatePath("/dashboard/coach/live");
  return { rsvped: true };
}

// Réservation en libre-service d'un créneau 1:1 dans les disponibilités du
// coach — crée directement le live_event, sans que le coach ait à le
// programmer lui-même.
export async function bookAvailabilitySlot(input: {
  coachId: string;
  startsAt: string;
  durationMinutes: number;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: myProfile } = await admin
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", guard.userId)
    .single();
  if (myProfile?.coach_id !== input.coachId) return { error: "Ce n'est pas ton coach." };

  // Recalcule les créneaux libres et exige une correspondance exacte
  // (horaire ET durée). Avant, seule une égalité stricte avec un autre 1:1
  // était testée : un audit ou un webinaire au même moment laissait passer
  // la réservation, un créneau décalé de 15 min chevauchait sans être vu,
  // et n'importe quel horaire hors disponibilités envoyé par le navigateur
  // était accepté tel quel.
  if (!(await isSlotStillAvailable(input.coachId, input.startsAt, input.durationMinutes))) {
    return { error: SLOT_TAKEN_ERROR };
  }

  const { data, error } = await admin
    .from("live_events")
    .insert({
      host_id: input.coachId,
      title: `1:1 avec ${myProfile?.full_name ?? "un client"}`,
      type: "1to1",
      invited_client_id: guard.userId,
      room_slug: generateRoomSlug(),
      starts_at: input.startsAt,
      duration_minutes: input.durationMinutes,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Erreur lors de la réservation." };

  notifyUser(input.coachId, {
    type: "live_booked",
    title: "📅 Nouveau 1:1 réservé",
    body: `${myProfile?.full_name ?? "Un client"} a réservé un créneau : ${formatLiveDateTime(input.startsAt)}.`,
    url: "/dashboard/coach/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/live");
  revalidatePath("/dashboard/coach/live");
  return { id: data.id };
}

// Réservation récurrente hebdomadaire ("Suivi hebdomadaire dédié") : crée
// plusieurs occurrences d'un coup (8 semaines), au choix du client. Les
// semaines en conflit sont ignorées plutôt que de faire échouer toute la
// réservation, et renvoyées au client pour qu'il sache lesquelles manquent.
export async function bookWeeklyCheckin(input: {
  coachId: string;
  startsAt: string;
  durationMinutes: number;
  weeks?: number;
}): Promise<{ error?: string; created?: number; skipped?: string[]; failed?: string[] }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: myProfile } = await admin
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", guard.userId)
    .single();
  if (myProfile?.coach_id !== input.coachId) return { error: "Ce n'est pas ton coach." };

  // La première séance doit être un vrai créneau libre des disponibilités,
  // comme une réservation simple : sinon n'importe quel horaire (et
  // n'importe quelle durée) envoyé par le navigateur partait en série.
  if (!(await isSlotStillAvailable(input.coachId, input.startsAt, input.durationMinutes))) {
    return { error: SLOT_TAKEN_ERROR };
  }

  const requested = Number.isFinite(input.weeks) ? Math.floor(input.weeks as number) : DEFAULT_WEEKLY_OCCURRENCES;
  const weeks = Math.min(MAX_WEEKLY_OCCURRENCES, Math.max(1, requested));

  // Même heure "murale" de Paris chaque semaine : on avance de 7 jours
  // calendaires puis on reconvertit. Ajouter 7 x 24 h en millisecondes
  // faisait glisser d'une heure toutes les séances après le passage à
  // l'heure d'hiver (18:00 devenait 17:00 dès le 25 octobre).
  const firstDate = parisDateKey(input.startsAt);
  const hhmm = parisHhmm(input.startsAt);

  let created = 0;
  const skipped: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < weeks; i++) {
    const startsAt = parisWallClockToIso(addDaysToDateStr(firstDate, 7 * i), hhmm);
    if (!startsAt) continue;

    // Chevauchement réel avec N'IMPORTE QUEL live du coach (audit, atelier,
    // point flash...), pas seulement une égalité stricte d'horaire.
    let conflict: boolean;
    try {
      conflict = await hasHostConflict(admin, input.coachId, startsAt, input.durationMinutes);
    } catch (e) {
      console.error("bookWeeklyCheckin conflict check error:", e);
      failed.push(startsAt);
      continue;
    }
    if (conflict) {
      skipped.push(startsAt);
      continue;
    }

    const { error } = await admin.from("live_events").insert({
      host_id: input.coachId,
      title: `Suivi hebdo avec ${myProfile?.full_name ?? "un client"}`,
      type: "checkin_hebdo",
      invited_client_id: guard.userId,
      room_slug: generateRoomSlug(),
      starts_at: startsAt,
      duration_minutes: input.durationMinutes,
    });
    if (error) {
      console.error("bookWeeklyCheckin insert error:", error);
      failed.push(startsAt);
    } else {
      created++;
    }
  }

  if (created === 0) {
    return {
      error: failed.length > 0
        ? "La réservation n'a pas pu être enregistrée, réessaie dans un instant."
        : "Aucune séance n'a pu être réservée : ces horaires sont déjà pris chez ton coach.",
    };
  }

  notifyUser(input.coachId, {
    type: "live_booked",
    title: "📅 Suivi hebdomadaire activé",
    body: `${myProfile?.full_name ?? "Un client"} a réservé un suivi hebdo : ${created} séance${created > 1 ? "s" : ""}, chaque ${formatParis(input.startsAt, { weekday: "long" })} à ${formatLiveTime(input.startsAt)}.`,
    url: "/dashboard/coach/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/live");
  revalidatePath("/dashboard/coach/live");
  return { created, skipped, failed };
}

// ── Accès direct : demande de point flash (15 min, décision clé) ────────
export async function requestFlashCall(reason: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  if (!reason.trim()) return { error: "Explique brièvement la décision à prendre." };

  const admin = createAdminClient();
  const { data: myProfile } = await admin
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", guard.userId)
    .single();
  if (!myProfile?.coach_id) return { error: "Aucun coach rattaché." };

  const { error } = await admin.from("live_flash_requests").insert({
    client_id: guard.userId,
    coach_id: myProfile.coach_id,
    reason: reason.trim(),
  });
  if (error) return { error: "Erreur lors de la demande." };

  notifyUser(myProfile.coach_id, {
    type: "flash_request",
    title: "⚡ Demande de point flash",
    body: `${myProfile.full_name ?? "Un client"} : ${reason.trim().slice(0, 60)}`,
    url: "/dashboard/coach/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/live");
  return { success: true };
}
