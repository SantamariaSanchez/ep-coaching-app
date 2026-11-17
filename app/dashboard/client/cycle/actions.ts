"use server";

import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { sanitizePeriodInput } from "@/lib/period-input";
import { todayInParis } from "@/lib/dates";

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

  const clean = sanitizePeriodInput(data, todayInParis());
  if (!clean.ok) return { error: clean.error };

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("period_logs")
    .insert({ ...clean.value, client_id: guard.userId })
    .select()
    .single();

  if (error || !row) return { error: "Impossible d'enregistrer ce cycle. Réessaie." };

  revalidatePath("/dashboard/client/cycle");
  return { id: row.id };
}

export async function deletePeriodLog(_clientId: string, logId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("period_logs").delete().eq("id", logId).eq("client_id", guard.userId);

  if (error) return { error: "Impossible de supprimer ce cycle. Réessaie." };

  revalidatePath("/dashboard/client/cycle");
  return {};
}
