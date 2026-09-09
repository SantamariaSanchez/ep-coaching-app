"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { generateRoomSlug, isOneToOneType, LIVE_TYPE_LABELS, type LiveType } from "@/lib/live-types";
import { notifyClientNewLiveEvent } from "@/app/actions/notifications";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { getClients } from "@/utils/auth";

export interface CreateLiveEventInput {
  title: string;
  description: string;
  type: LiveType;
  invitedClientId: string | null;
  guestName?: string | null;
  startsAt: string; // ISO
  durationMinutes: number;
}

export async function createLiveEvent(
  input: CreateLiveEventInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (isOneToOneType(input.type) && !input.invitedClientId) {
    return { error: "Choisis un client pour ce type de live." };
  }

  try {
    const admin = createAdminClient();

    // Isolation multi-coach : le client invité doit appartenir à CE coach,
    // jamais faire confiance à l'id transmis depuis le formulaire (un coach
    // ne doit jamais pouvoir programmer un appel avec le client d'un autre
    // coach, ni récupérer son email/nom via la notification ci-dessous).
    if (isOneToOneType(input.type) && input.invitedClientId) {
      const { data: invited } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", input.invitedClientId)
        .single();
      if (!invited || invited.coach_id !== guard.userId) {
        return { error: "Client introuvable." };
      }
    }

    const roomSlug = generateRoomSlug();

    const { data, error } = await admin
      .from("live_events")
      .insert({
        host_id: guard.userId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        type: input.type,
        invited_client_id: isOneToOneType(input.type) ? input.invitedClientId : null,
        guest_name: input.guestName || null,
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

    if (isOneToOneType(input.type) && input.invitedClientId) {
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
        senderId: guard.userId,
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
              senderId: guard.userId,
            }
          )
        )
        .catch(() => {});
    }

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return { id: data.id };
  } catch (e) {
    console.error("createLiveEvent error:", e);
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
    if (isOneToOneType(existing.type) && !input.invitedClientId) {
      return { error: "Choisis un client pour ce type de live." };
    }

    // Isolation multi-coach : même vérification qu'à la création, un coach
    // ne doit jamais pouvoir réassigner un live à un client qui n'est pas
    // le sien.
    if (isOneToOneType(existing.type) && input.invitedClientId) {
      const { data: invited } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", input.invitedClientId)
        .single();
      if (!invited || invited.coach_id !== guard.userId) {
        return { error: "Client introuvable." };
      }
    }

    const { error } = await admin
      .from("live_events")
      .update({
        title: input.title.trim(),
        description: input.description.trim() || null,
        invited_client_id: isOneToOneType(existing.type) ? input.invitedClientId : null,
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
      senderId: guard.userId,
    };
    if (isOneToOneType(existing.type) && input.invitedClientId) {
      notifyUser(input.invitedClientId, params).catch(() => {});
    } else if (!isOneToOneType(existing.type)) {
      getClients(guard.userId)
        .then((clients) => notifyUsers(clients.map((c) => c.id), params))
        .catch(() => {});
    }

    revalidatePath("/dashboard/coach/live");
    revalidatePath("/dashboard/client/live");
    return {};
  } catch (e) {
    console.error("updateLiveEvent error:", e);
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
        senderId: guard.userId,
      };
      if (isOneToOneType(event.type) && event.invited_client_id) {
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
  } catch (e) {
    console.error("cancelLiveEvent error:", e);
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
  } catch (e) {
    console.error("endLiveEvent error:", e);
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
  } catch (e) {
    console.error("deleteLiveEvent error:", e);
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
  } catch (e) {
    console.error("updateLiveRecap error:", e);
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

// Ajout groupé : un coach disponible du lundi au vendredi de 9h à 12h devait
// auparavant répéter cinq fois le même formulaire. Une seule action pour tous
// les jours cochés, avec un aller retour réseau au lieu de cinq.
export async function addAvailabilityRules(input: {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}): Promise<{ error?: string; added?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const days = [...new Set(input.daysOfWeek)].filter((d) => d >= 1 && d <= 7);
  if (days.length === 0) return { error: "Choisis au moins un jour." };
  if (input.startTime >= input.endTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }
  if (![15, 30, 45, 60].includes(input.slotDurationMinutes)) {
    return { error: "Durée de créneau invalide." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("coach_availability").insert(
    days.map((day) => ({
      coach_id: guard.userId,
      day_of_week: day,
      start_time: input.startTime,
      end_time: input.endTime,
      slot_duration_minutes: input.slotDurationMinutes,
    }))
  );
  if (error) return { error: "Erreur lors de l'ajout." };

  revalidatePath("/dashboard/coach/live/disponibilites");
  return { added: days.length };
}

// ── Accès direct : demandes de point flash ──────────────────────────────

export interface FlashRequest {
  id: string;
  client_id: string;
  client_name: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export async function getPendingFlashRequests(): Promise<FlashRequest[]> {
  const guard = await requireCoach();
  if (!guard.ok) return [];

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("live_flash_requests")
    .select("id, client_id, reason, status, created_at")
    .eq("coach_id", guard.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (!requests || requests.length === 0) return [];

  const clientIds = [...new Set(requests.map((r) => r.client_id))];
  const { data: clients } = await admin.from("profiles").select("id, full_name").in("id", clientIds);
  const nameMap: Record<string, string> = {};
  for (const c of (clients ?? []) as { id: string; full_name: string | null }[]) {
    nameMap[c.id] = c.full_name ?? "Client";
  }

  return requests.map((r) => ({ ...r, client_name: nameMap[r.client_id] ?? null }));
}

// Nouveau (retour direct 2026-09-09, "ajoute des choses auxquelles on n'a
// pas encore pensé", section Live) : resolved_at existe déjà sur chaque
// demande de point flash (posé au moment d'accepter ou refuser, voir
// scheduleFlashCall/declineFlashCall ci-dessous) mais jamais exploité pour
// mesurer la réactivité réelle du coach — le point flash promet justement
// une "réponse rapide sur une décision clé", sans jamais vérifier si c'est
// tenu.
export async function getFlashResponseStats(): Promise<{ avgMinutes: number | null; count: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { avgMinutes: null, count: 0 };

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data } = await admin
    .from("live_flash_requests")
    .select("created_at, resolved_at")
    .eq("coach_id", guard.userId)
    .not("resolved_at", "is", null)
    .gte("created_at", thirtyDaysAgo.toISOString());

  const rows = (data ?? []) as { created_at: string; resolved_at: string }[];
  if (rows.length === 0) return { avgMinutes: null, count: 0 };

  const totalMinutes = rows.reduce(
    (sum, r) => sum + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 60000,
    0
  );
  return { avgMinutes: Math.round(totalMinutes / rows.length), count: rows.length };
}

export async function scheduleFlashCall(
  requestId: string,
  startsAt: string
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("live_flash_requests")
    .select("client_id, reason")
    .eq("id", requestId)
    .eq("coach_id", guard.userId)
    .eq("status", "pending")
    .single();
  if (!request) return { error: "Demande introuvable." };

  const { data: event, error: eventError } = await admin
    .from("live_events")
    .insert({
      host_id: guard.userId,
      title: `Point flash : ${request.reason.slice(0, 60)}`,
      type: "acces_direct",
      invited_client_id: request.client_id,
      room_slug: generateRoomSlug(),
      starts_at: startsAt,
      duration_minutes: 15,
    })
    .select("id")
    .single();
  if (eventError || !event) return { error: "Erreur lors de la programmation." };

  await admin
    .from("live_flash_requests")
    .update({ status: "scheduled", live_event_id: event.id, resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  notifyUser(request.client_id, {
    type: "live_scheduled",
    title: "⚡ Ton point flash est programmé",
    body: new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(startsAt)),
    url: "/dashboard/client/live",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/coach/live");
  revalidatePath("/dashboard/client/live");
  return {};
}

export async function declineFlashCall(requestId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("live_flash_requests")
    .select("client_id")
    .eq("id", requestId)
    .eq("coach_id", guard.userId)
    .single();

  const { error } = await admin
    .from("live_flash_requests")
    .update({ status: "declined", resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("coach_id", guard.userId);
  if (error) return { error: "Erreur." };

  if (request) {
    notifyUser(request.client_id, {
      type: "flash_declined",
      title: "Point flash non retenu",
      body: "Ton coach n'a pas pu accepter cette demande, écris-lui en message.",
      url: "/dashboard/client/messages",
      senderId: guard.userId,
    }).catch(() => {});
  }

  revalidatePath("/dashboard/coach/live");
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
