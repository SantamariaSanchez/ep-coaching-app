"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";

const PATH = "/dashboard/coach/admin/ventes";

export async function addSalesCall(input: {
  leadName: string;
  callDate: string; // "YYYY-MM-DD"
}): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await checkRateLimit(`sales-call-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (!limited.allowed) return { error: "Trop de tentatives, réessaie dans un instant." };

  const leadName = input.leadName.trim();
  if (!leadName) return { error: "Le nom du lead est requis." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sales_calls").insert({
    coach_id: guard.userId,
    lead_name: leadName,
    call_date: input.callDate || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath(PATH);
  return {};
}

// Un seul point d'entrée pour les 3 mises à jour ponctuelles (show up,
// closing, CA) plutôt que 3 actions quasi identiques : la table se met à
// jour ligne par ligne au fil des appels, jamais en masse.
export async function updateSalesCall(
  id: string,
  patch: Partial<{ show_up: boolean | null; closed: boolean | null; revenue_amount: number | null; notes: string }>
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("sales_calls")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("coach_id", guard.userId); // RLS couvre déjà ça, ceinture et bretelles

  if (error) return { error: "Erreur lors de la mise à jour." };

  revalidatePath(PATH);
  return {};
}

export async function deleteSalesCall(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sales_calls").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de la suppression." };

  revalidatePath(PATH);
  return {};
}
