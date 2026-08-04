"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { ProgramTemplateInput } from "@/utils/program-templates";
import {
  saveProgramTemplate as saveProgramTemplateData,
  deleteProgramTemplate as deleteProgramTemplateData,
  getProgramTemplateById,
  programTemplateToInput,
} from "@/utils/program-templates";
import { saveProgramForClient } from "@/utils/programs";

export async function saveProgramTemplate(
  templateId: string | null,
  input: ProgramTemplateInput
): Promise<{ id?: string; error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  if (templateId) {
    const { data: existing } = await supabase
      .from("program_templates")
      .select("coach_id")
      .eq("id", templateId)
      .single();
    if (!existing || existing.coach_id !== guard.userId) {
      return { error: "Accès non autorisé à ce modèle." };
    }
  }

  const result = await saveProgramTemplateData(supabase, guard.userId, templateId, input);
  if (result.error) return result;

  revalidatePath("/dashboard/coach/programmation");
  return result;
}

export async function deleteProgramTemplate(templateId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const result = await deleteProgramTemplateData(supabase, templateId, guard.userId);
  if (!result.error) revalidatePath("/dashboard/coach/programmation");
  return result;
}

// Applique un modèle de programme à un ou plusieurs clients d'un coup —
// génère un programme actif indépendant pour chacun (même chemin de code
// que la création manuelle, saveProgramForClient), le modèle lui-même
// n'est jamais modifié. Les clients qui n'appartiennent pas à ce coach
// sont silencieusement ignorés (cloisonnement multi-coach).
export async function applyProgramTemplate(
  templateId: string,
  clientIds: string[],
  nameOverride?: string
): Promise<{ error?: string; appliedCount?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (clientIds.length === 0) return { error: "Sélectionne au moins un client." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const template = await getProgramTemplateById(templateId, guard.userId, supabase);
  if (!template) return { error: "Modèle introuvable." };
  if (template.days.length === 0) return { error: "Ce modèle n'a aucune séance à appliquer." };

  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, coach_id")
    .in("id", clientIds);
  const validClientIds = ((clientRows ?? []) as { id: string; coach_id: string | null }[])
    .filter((c) => c.coach_id === guard.userId)
    .map((c) => c.id);

  if (validClientIds.length === 0) return { error: "Aucun client valide sélectionné." };

  const input = programTemplateToInput(template, nameOverride);

  let applied = 0;
  for (const clientId of validClientIds) {
    const result = await saveProgramForClient(supabase, clientId, input);
    if (!result.error) {
      applied++;
      revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
      revalidatePath(`/dashboard/client/program`);
    }
  }

  if (applied === 0) return { error: "Erreur lors de l'application du modèle." };
  return { appliedCount: applied };
}
