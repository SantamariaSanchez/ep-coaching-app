"use server";
import { requireOwnClient } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { ProgramInput } from "@/utils/programs";
import { saveProgramForClient } from "@/utils/programs";
import type { ProgramTemplateInput } from "@/utils/program-templates";
import { saveProgramTemplate } from "@/app/dashboard/coach/programmation/programmes/actions";

export async function saveProgram(
  clientId: string,
  input: ProgramInput
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const result = await saveProgramForClient(supabase, clientId, input);
  if (result.error) return result;

  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath(`/dashboard/client/program`);
  return {};
}

// Chemin inverse de l'application d'un modèle : le travail sur mesure fait
// dans la fiche d'un client devient un modèle réutilisable, sans quitter la
// page. Passe par la même action (et donc le même guard requireCoach) que la
// création d'un modèle depuis la page Programmation.
export async function saveCurrentProgramAsTemplate(
  input: ProgramTemplateInput
): Promise<{ id?: string; error?: string }> {
  return saveProgramTemplate(null, input);
}

export async function submitCorrectionFeedback(
  correctionId: string,
  clientId: string,
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  const coach_video_link =
    (formData.get("coach_video_link") as string)?.trim() || null;

  if (!coach_feedback) return { error: "Le retour écrit est obligatoire." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const { error } = await supabase
    .from("exercise_corrections")
    .update({
      coach_feedback,
      coach_video_link,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("client_id", clientId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath(`/dashboard/client/program`);
  revalidatePath(`/dashboard/coach`);
  return { success: true };
}
