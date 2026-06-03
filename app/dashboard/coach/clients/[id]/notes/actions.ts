"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { CoachNoteInput, KeyDecisionInput } from "@/utils/notes";

export async function saveCoachNote(
  clientId: string,
  noteId: string | null,
  data: CoachNoteInput
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    if (noteId) {
      const { error } = await supabase
        .from("coach_notes")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("client_id", clientId);
      if (error) return { error: "Erreur lors de la mise à jour." };
    } else {
      const { error } = await supabase
        .from("coach_notes")
        .insert({ client_id: clientId, ...data });
      if (error) return { error: "Erreur lors de l'enregistrement." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/notes`);
    revalidatePath(`/dashboard/coach/notes`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function saveKeyDecision(
  clientId: string,
  data: KeyDecisionInput
): Promise<{ error?: string }> {
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    const { error } = await supabase
      .from("key_decisions")
      .insert({ client_id: clientId, ...data });
    if (error) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/notes`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteKeyDecision(
  clientId: string,
  decisionId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    const { error } = await supabase
      .from("key_decisions")
      .delete()
      .eq("id", decisionId)
      .eq("client_id", clientId);

    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/notes`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
