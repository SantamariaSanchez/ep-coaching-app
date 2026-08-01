"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { generateRoomSlug, LIVE_TYPE_LABELS, type LiveType } from "@/lib/live-types";
import { notifyClientNewLiveEvent } from "@/app/actions/notifications";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { getClients } from "@/utils/auth";

export interface CreateLiveEventInput {
  title: string;
  description: string;
  type: LiveType;
  invitedClientId: string | null;
  startsAt: string; // ISO
  durationMinutes: number;
}

export async function createLiveEvent(
  input: CreateLiveEventInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.type === "1to1" && !input.invitedClientId) {
    return { error: "Choisis un client pour un appel 1:1." };
  }

  try {
    const admin = createAdminClient();
    const roomSlug = generateRoomSlug();

    const { data, error } = await admin
      .from("live_events")
      .insert({
        host_id: guard.userId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        type: input.type,
        invited_client_id: input.type === "1to1" ? input.invitedClientId : null,
        room_slug: roomSlug,
        starts_at: input.startsAt,
        duration_minutes: input.durationMinutes,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de la création." };

    // Notify the relevant audience — best effort, non-blocking.
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }).format(new Date(input.startsAt));

    if (input.type === "1to1" && input.invitedClientId) {
      const { data: client } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", input.invitedClientId)
        .single();
      if (client?.email) {
        notifyClientNewLiveEvent(client.email, client.full_name ?? "", input.title.trim(), input.startsAt).catch(() => {});
      }
      notifyUser(input.invitedClientId, {
        type: "live_scheduled",
        title: "📅 Appel programmé",
        body: `${input.title.trim()} : ${dateLabel}`,
        url: "/dashboard/client/live",
      }).catch(() => {});
    } else {
      // webinaire / qna — diffusion à tous les clients abonnés (le live
      // n'est pas visible des membres gratuits, pas la peine de les notifier).
      getClients(guard.userId)
        .then((clients) =>
          notifyUsers(
            clients.map((c) => c.id),
            {
              type: "live_scheduled",
              title: `📅 ${LIVE_TYPE_LABELS[input.type]} programmé`,
              body: `${input.title.trim()} : ${dateLabel}`,
              url: "/dashboard/client/live",
            }
          )
        )
        .catch(() => {});
    }

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export interface UpdateLiveEventInput {
  title: string;
  description: string;
  invitedClientId: string | null;
  startsAt: string; // ISO
  durationMinutes: number;
}

// Modifier un live existant (titre, horaire, durée, client invité) — jusqu'ici
// la seule option en cas d'erreur de saisie était d'annuler et de tout
// reprogrammer depuis zéro.
export async function updateLiveEvent(
  id: string,
  input: UpdateLiveEventInput
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  if (!input.title.trim()) return { error: "Le titre est requis." };

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("live_events")
      .select("type, title, invited_client_id")
      .eq("id", id)
      .eq("host_id", guard.userId)
      .single();

    if (!existing) return { error: "Live introuvable." };
    if (existing.type === "1to1" && !input.invitedClientId) {
      return { error: "Choisis un client pour un appel 1:1." };
    }

    const { error } = await admin
      .from("live_events")
      .update({
        title: input.title.trim(),
        description: input.description.trim() || null,
        invited_client_id: existing.type === "1to1" ? input.invitedClientId : null,
        starts_at: input.startsAt,
        duration_minutes: input.durationMinutes,
      })
      .eq("id", id)
      .eq("host_id", guard.userId);

    if (error) return { error: "Erreur lors de la mise à jour." };

    // Notifie l'audience concernée du changement — best effort.
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }).format(new Date(input.startsAt));
    const params = {
      type: "live_scheduled",
      title: "🔄 Live modifié",
      body: `${input.title.trim()} : ${dateLabel}`,
      url: "/dashboard/client/live",
    };
    if (existing.type === "1to1" && input.invitedClientId) {
      notifyUser(input.invitedClientId, params).catch(() => {});
    } else if (existing.type !== "1to1") {
      getClients(guard.userId)
        .then((clients) => notifyUsers(clients.map((c) => c.id), params))
        .catch(() => {});
    }

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function cancelLiveEvent(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { data: event } = await admin
      .from("live_events")
      .select("title, type, invited_client_id")
      .eq("id", id)
      .eq("host_id", guard.userId)
      .single();

    const { error } = await admin
      .from("live_events")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("host_id", guard.userId);

    if (error) return { error: "Erreur lors de l'annulation." };

    if (event) {
      const params = {
        type: "live_cancelled",
        title: "❌ Live annulé",
        body: event.title,
        url: "/dashboard/client/live",
      };
      if (event.type === "1to1" && event.invited_client_id) {
        notifyUser(event.invited_client_id, params).catch(() => {});
      } else {
        getClients(guard.userId)
          .then((clients) => notifyUsers(clients.map((c) => c.id), params))
          .catch(() => {});
      }
    }

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Marque le live comme terminé — distinct de "quitter l'appel" (qui ne
// concerne que le participant local). Utilisé par le bouton "Terminer le
// live", réservé à l'hôte, pour faire basculer l'événement dans les lives
// passés plutôt que de le laisser trainer indéfiniment en "à venir".
export async function endLiveEvent(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("live_events")
      .update({ status: "ended" })
      .eq("id", id)
      .eq("host_id", guard.userId);

    if (error) return { error: "Erreur lors de la clôture." };

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteLiveEvent(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("live_events")
      .delete()
      .eq("id", id)
      .eq("host_id", guard.userId);

    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Notes écrites par le coach après un live — seul moyen pour un client de
// s'y référer après coup, faute de rediff disponible sur ce plan Jitsi.
export async function updateLiveRecap(id: string, recap: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("live_events")
      .update({ recap: recap.trim() || null })
      .eq("id", id)
      .eq("host_id", guard.userId);

    if (error) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// ── Disponibilités 1:1 en libre-service ──────────────────────────────────

export interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export async function getMyAvailabilityRules(): Promise<AvailabilityRule[]> {
  const guard = await requireCoach();
  if (!guard.ok) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_availability")
    .select("id, day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("coach_id", guard.userId)
    .order("day_of_week");

  return data ?? [];
}

export async function addAvailabilityRule(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  if (input.startTime >= input.endTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("coach_availability").insert({
    coach_id: guard.userId,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    slot_duration_minutes: input.slotDurationMinutes,
  });
  if (error) return { error: "Erreur lors de l'ajout." };

  revalidatePath("/dashboard/coach/live/disponibilites");
  return {};
}

export async function deleteAvailabilityRule(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_availability")
    .delete()
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de la suppression." };

  revalidatePath("/dashboard/coach/live/disponibilites");
  return {};
}
