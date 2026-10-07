"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanEntryData, isDisciplineKey } from "@/lib/disciplines";

// Performances (2026-10-07) : chacun n'écrit que dans SES saisies ; les
// données sont validées d'après la déclaration de la discipline
// (lib/disciplines.ts), jamais écrites telles que reçues du navigateur.

function refresh() {
  revalidatePath("/dashboard/client/performances");
  revalidatePath("/dashboard/coach/moi/performances");
}

export async function addPerformanceEntryAction(input: { discipline: string; kind: string; performedOn: string; data: Record<string, unknown> }): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!isDisciplineKey(input.discipline)) return { error: "Discipline inconnue." };
  const cleaned = cleanEntryData(input.discipline, input.kind, input.data ?? {});
  if ("error" in cleaned) return { error: cleaned.error };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.performedOn) ? input.performedOn : new Date().toISOString().slice(0, 10);
  const { error } = await createAdminClient()
    .from("performance_entries")
    .insert({ owner_id: guard.userId, discipline: input.discipline, kind: input.kind, performed_on: date, data: cleaned.data });
  if (error) return { error: "Enregistrement impossible, réessaie." };
  refresh();
  return {};
}

export async function deletePerformanceEntryAction(id: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const { error } = await createAdminClient().from("performance_entries").delete().eq("id", id).eq("owner_id", guard.userId);
  if (error) return { error: "Suppression impossible." };
  refresh();
  return {};
}
