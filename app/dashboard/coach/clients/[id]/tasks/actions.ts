"use server";

import { requireOwnClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export async function createClientTask(
  clientId: string,
  label: string,
  icon: string,
  nagMinutes: number
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("client_tasks").insert({
      client_id: clientId,
      created_by: guard.userId,
      label,
      icon,
      nag_minutes: nagMinutes,
      last_notified_at: new Date().toISOString(),
    });

    if (error) return { error: "Erreur lors de la création du rappel." };

    await sendPushToUser(
      clientId,
      `${icon} Nouveau rappel`,
      label,
      "/dashboard/client/tasks"
    );

    revalidatePath(`/dashboard/coach/clients/${clientId}/tasks`);
    return {};
  } catch (e) {
    console.error("createClientTask error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteClientTask(
  clientId: string,
  taskId: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    await supabase.from("client_tasks").delete().eq("id", taskId).eq("client_id", clientId);
    revalidatePath(`/dashboard/coach/clients/${clientId}/tasks`);
    return {};
  } catch (e) {
    console.error("deleteClientTask error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Borne alignée sur un message de conversation raisonnable : un mot de
// motivation, pas un roman (le champ côté fiche est une simple ligne).
const MOTIVATION_MAX_LENGTH = 2000;

export async function sendMotivationMessage(
  clientId: string,
  message: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const content = (message ?? "").trim();
  if (!content) return { error: "Le message est vide." };
  if (content.length > MOTIVATION_MAX_LENGTH) {
    return { error: `Message trop long (${MOTIVATION_MAX_LENGTH} caractères maximum).` };
  }

  try {
    // Avant, ce message n'était qu'un push éphémère : si le membre n'avait
    // pas activé les notifications, l'envoi échouait et rien n'était gardé ;
    // s'il les avait activées, le texte disparaissait une fois la
    // notification balayée. Il est maintenant d'abord enregistré dans sa
    // conversation avec le coach (conversation_id = id du membre, même
    // convention que la messagerie et lib/coach-agent-checkin.ts), où il
    // reste lisible et où le membre peut répondre.
    const supabase = createAdminClient();
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: clientId,
      sender_id: guard.userId,
      receiver_id: clientId,
      type: "text",
      content,
      is_read: false,
    });
    if (insertError) {
      console.error("sendMotivationMessage insert error:", insertError.message);
      return { error: "Le message n'a pas pu être envoyé, réessaie." };
    }

    // Push en bonus, jamais bloquant : sans notifications activées, le
    // message est quand même dans sa conversation (badge non lu). after()
    // l'envoie une fois la réponse partie, sans risque d'être coupé.
    after(() =>
      sendPushToUser(
        clientId,
        "💪 Message de ton coach",
        content.slice(0, 140),
        "/dashboard/client/messages"
      ).catch(() => {})
    );

    revalidatePath(`/dashboard/coach/messages/${clientId}`);
    revalidatePath("/dashboard/coach/messages");
    revalidatePath("/dashboard/client/messages");
    return {};
  } catch (e) {
    console.error("sendMotivationMessage error:", e);
    return { error: "Erreur inattendue." };
  }
}
