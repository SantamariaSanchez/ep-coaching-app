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
      getClients()
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
        getClients()
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
