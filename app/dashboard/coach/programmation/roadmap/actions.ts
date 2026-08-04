"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { RoadmapTemplateInput } from "@/utils/roadmap-templates";
import {
  saveRoadmapTemplate as saveRoadmapTemplateData,
  deleteRoadmapTemplate as deleteRoadmapTemplateData,
  getRoadmapTemplateById,
  roadmapTemplateToApplyInput,
} from "@/utils/roadmap-templates";
import { applyRoadmapForClient } from "@/utils/roadmap";

export async function saveRoadmapTemplate(
  templateId: string | null,
  input: RoadmapTemplateInput
): Promise<{ id?: string; error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  if (templateId) {
    const { data: existing } = await supabase
      .from("roadmap_templates")
      .select("coach_id")
      .eq("id", templateId)
      .single();
    if (!existing || existing.coach_id !== guard.userId) {
      return { error: "Accès non autorisé à ce modèle." };
    }
  }

  const result = await saveRoadmapTemplateData(supabase, guard.userId, templateId, input);
  if (result.error) return result;

  revalidatePath("/dashboard/coach/programmation");
  return result;
}

export async function deleteRoadmapTemplate(templateId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const result = await deleteRoadmapTemplateData(supabase, templateId, guard.userId);
  if (!result.error) revalidatePath("/dashboard/coach/programmation");
  return result;
}

// Applique un modèle de road map à un ou plusieurs clients — les décalages en
// semaines du modèle se convertissent en vraies dates à partir de startDate
// (aujourd'hui par défaut côté UI, ou une date de démarrage choisie par le
// coach). Même chemin d'écriture qu'une sauvegarde manuelle de road map
// (applyRoadmapForClient), le modèle lui-même n'est jamais modifié. Les
// clients qui n'appartiennent pas à ce coach sont silencieusement ignorés
// (cloisonnement multi-coach).
export async function applyRoadmapTemplate(
  templateId: string,
  clientIds: string[],
  startDate: string
): Promise<{ error?: string; appliedCount?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (clientIds.length === 0) return { error: "Sélectionne au moins un client." };
  if (!startDate) return { error: "Date de démarrage requise." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const template = await getRoadmapTemplateById(templateId, guard.userId, supabase);
  if (!template) return { error: "Modèle introuvable." };
  if (template.phases.length === 0 && template.milestones.length === 0) {
    return { error: "Ce modèle n'a ni phase ni jalon à appliquer." };
  }

  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, coach_id")
    .in("id", clientIds);
  const validClientIds = ((clientRows ?? []) as { id: string; coach_id: string | null }[])
    .filter((c) => c.coach_id === guard.userId)
    .map((c) => c.id);

  if (validClientIds.length === 0) return { error: "Aucun client valide sélectionné." };

  const input = roadmapTemplateToApplyInput(template, startDate);

  let applied = 0;
  for (const clientId of validClientIds) {
    const result = await applyRoadmapForClient(supabase, clientId, guard.userId, input);
    if (!result.error) {
      applied++;
      revalidatePath(`/dashboard/coach/clients/${clientId}/roadmap`);
      revalidatePath(`/dashboard/client/roadmap`);
    }
  }

  if (applied === 0) return { error: "Erreur lors de l'application du modèle." };
  return { appliedCount: applied };
}
