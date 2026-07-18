"use server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { ClientIntakeInput } from "@/utils/client-intake";

export async function saveClientIntake(
  clientId: string,
  data: ClientIntakeInput
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_intake")
    .upsert({ client_id: clientId, ...data, updated_at: new Date().toISOString() }, { onConflict: "client_id" });

  if (error) return { error: error.message };

  // clientId est parfois l'id du coach lui-meme (fiche perso, voir
  // /dashboard/coach/profile) — les deux chemins sont revalidated sans
  // savoir lequel s'applique, l'autre est un no-op.
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/profile");
  return {};
}

export async function addPeriodLog(
  clientId: string,
  data: { start_date: string; end_date: string | null; flow: string | null; symptoms: string[]; notes: string | null }
): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("period_logs")
    .insert({ client_id: clientId, ...data })
    .select()
    .single();

  if (error || !row) return { error: error?.message ?? "Erreur." };

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  return { id: row.id };
}

export async function deletePeriodLog(clientId: string, logId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("period_logs").delete().eq("id", logId).eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  return {};
}
