"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { DietMode, DietStructure } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import {
  createDietPlanTemplate,
  deleteDietPlanTemplate as deleteDietPlanTemplateData,
  getDietPlanTemplateById,
  dietTemplateToMealInputs,
} from "@/utils/diet-templates";
import { createDietPlan } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

export async function createDietTemplateAction(
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily",
  objective?: string,
  notes?: string
): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!name.trim()) return { error: "Nom du modèle requis." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const result = await createDietPlanTemplate(supabase, guard.userId, name.trim(), mode, meals, structure, objective, notes);
  if (!result.error) revalidatePath("/dashboard/coach/programmation");
  return result;
}

export async function deleteDietTemplate(templateId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const result = await deleteDietPlanTemplateData(supabase, templateId, guard.userId);
  if (!result.error) revalidatePath("/dashboard/coach/programmation");
  return result;
}

// Applique un modèle de diète à un ou plusieurs clients — réutilise
// createDietPlan (même chemin que la création manuelle d'un plan côté fiche
// client), un par client sélectionné. Le modèle lui-même n'est jamais modifié.
export async function applyDietTemplate(
  templateId: string,
  clientIds: string[],
  nameOverride?: string
): Promise<{ error?: string; appliedCount?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (clientIds.length === 0) return { error: "Sélectionne au moins un client." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const template = await getDietPlanTemplateById(templateId, guard.userId, supabase);
  if (!template) return { error: "Modèle introuvable." };

  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, coach_id")
    .in("id", clientIds);
  const validClientIds = ((clientRows ?? []) as { id: string; coach_id: string | null }[])
    .filter((c) => c.coach_id === guard.userId)
    .map((c) => c.id);

  if (validClientIds.length === 0) return { error: "Aucun client valide sélectionné." };

  const meals = dietTemplateToMealInputs(template);
  const name = nameOverride?.trim() || template.name;

  let applied = 0;
  for (const clientId of validClientIds) {
    const result = await createDietPlan(clientId, name, template.mode, meals, template.structure);
    if (!result.error) applied++;
  }

  if (applied === 0) return { error: "Erreur lors de l'application du modèle." };
  return { appliedCount: applied };
}
