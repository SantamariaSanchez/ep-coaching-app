"use server";

import { requireOwnClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { revalidatePath } from "next/cache";

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
  } catch {
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
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function sendMotivationMessage(
  clientId: string,
  message: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const result = await sendPushToUser(
      clientId,
      "💪 Message de ton coach",
      message,
      "/dashboard/client"
    );
    if (!result.ok) return { error: "Le client n'a pas activé les notifications." };
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
