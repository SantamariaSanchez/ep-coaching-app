"use server";

import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

// Signature alignée sur ClientPeriodTracking (partagé avec la vue coach, voir
// ClientProfileTabs) qui passe toujours un clientId — ici il est ignoré au
// profit de l'id authentifié : un client ne peut jamais logger que son propre
// cycle, quoi qu'il envoie dans ce premier paramètre.
export async function addPeriodLog(
  _clientId: string,
  data: { start_date: string; end_date: string | null; flow: string | null; symptoms: string[]; notes: string | null }
): Promise<{ error?: string; id?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("period_logs")
    .insert({ client_id: guard.userId, ...data })
    .select()
    .single();

  if (error || !row) return { error: error?.message ?? "Erreur." };

  revalidatePath("/dashboard/client/cycle");
  return { id: row.id };
}

export async function deletePeriodLog(_clientId: string, logId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("period_logs").delete().eq("id", logId).eq("client_id", guard.userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/client/cycle");
  return {};
}
