"use server";

import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateRoomSlug, isOneToOneType } from "@/lib/live-types";
import { notifyUser } from "@/lib/notify";
import { revalidatePath } from "next/cache";

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

  // Reconfirme que le créneau est toujours libre (protège contre une
  // double réservation quasi simultanée sur le même créneau).
  const { data: conflict } = await admin
    .from("live_events")
    .select("id")
    .eq("host_id", input.coachId)
    .eq("type", "1to1")
    .neq("status", "cancelled")
    .eq("starts_at", input.startsAt)
    .maybeSingle();
  if (conflict) return { error: "Ce créneau vient d'être réservé, choisis-en un autre." };

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
    body: `${myProfile?.full_name ?? "Un client"} a réservé un créneau.`,
    url: "/dashboard/coach/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/live");
  revalidatePath("/dashboard/coach/live");
  return { id: data.id };
}

// Réservation récurrente hebdomadaire ("Suivi hebdomadaire dédié") — crée
// plusieurs occurrences d'un coup (8 semaines), au choix du client. Les
// semaines en conflit sont simplement ignorées plutôt que de faire échouer
// toute la réservation.
export async function bookWeeklyCheckin(input: {
  coachId: string;
  startsAt: string;
  durationMinutes: number;
  weeks?: number;
}): Promise<{ error?: string; created?: number }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: myProfile } = await admin
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", guard.userId)
    .single();
  if (myProfile?.coach_id !== input.coachId) return { error: "Ce n'est pas ton coach." };

  const weeks = input.weeks ?? 8;
  let created = 0;
  const base = new Date(input.startsAt).getTime();

  for (let i = 0; i < weeks; i++) {
    const startsAt = new Date(base + i * 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: conflict } = await admin
      .from("live_events")
      .select("id")
      .eq("host_id", input.coachId)
      .neq("status", "cancelled")
      .eq("starts_at", startsAt)
      .maybeSingle();
    if (conflict) continue;

    const { error } = await admin.from("live_events").insert({
      host_id: input.coachId,
      title: `Suivi hebdo avec ${myProfile?.full_name ?? "un client"}`,
      type: "checkin_hebdo",
      invited_client_id: guard.userId,
      room_slug: generateRoomSlug(),
      starts_at: startsAt,
      duration_minutes: input.durationMinutes,
    });
    if (!error) created++;
  }

  if (created === 0) return { error: "Aucun créneau n'a pu être réservé (conflits)." };

  notifyUser(input.coachId, {
    type: "live_booked",
    title: "📅 Suivi hebdomadaire activé",
    body: `${myProfile?.full_name ?? "Un client"} a réservé un suivi hebdomadaire.`,
    url: "/dashboard/coach/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/live");
  revalidatePath("/dashboard/coach/live");
  return { created };
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
