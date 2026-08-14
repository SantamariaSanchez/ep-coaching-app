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
import { createDietPlan, rescaleActiveDietPlanToTargets } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

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
    const result = await createDietPlan(clientId, name, template.mode, meals, template.structure, template.objective);
    if (!result.error) applied++;
  }

  if (applied === 0) return { error: "Erreur lors de l'application du modèle." };
  return { appliedCount: applied };
}

// Item 11 (actions groupées) : décale l'objectif calorique de plusieurs
// clients à la fois d'un même écart, plutôt que de rouvrir chaque fiche une
// par une. Les glucides absorbent l'écart (protéines/lipides inchangés,
// même logique que l'ajustement de phase déficit/surplus dans le calcul
// TDEE individuel — 1g de glucides = 4 kcal), puis rescaleActiveDietPlanToTargets
// (déjà utilisé pour le rescale auto d'un client seul) réajuste les
// grammages du plan actif de chacun pour suivre le nouvel objectif.
export async function bulkAdjustCalories(
  clientIds: string[],
  deltaKcal: number
): Promise<{ error?: string; appliedCount?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (clientIds.length === 0) return { error: "Sélectionne au moins un client." };
  if (!Number.isFinite(deltaKcal) || deltaKcal === 0) return { error: "Indique un écart de calories non nul." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, coach_id")
    .in("id", clientIds);
  const validClientIds = ((clientRows ?? []) as { id: string; coach_id: string | null }[])
    .filter((c) => c.coach_id === guard.userId)
    .map((c) => c.id);
  if (validClientIds.length === 0) return { error: "Aucun client valide sélectionné." };

  const { data: profiles } = await supabase
    .from("nutrition_profiles")
    .select("client_id, calories_target, proteins_target, carbs_target, fats_target")
    .in("client_id", validClientIds);

  type NutritionRow = {
    client_id: string;
    calories_target: number | null;
    proteins_target: number | null;
    carbs_target: number | null;
    fats_target: number | null;
  };

  let applied = 0;
  for (const row of (profiles ?? []) as NutritionRow[]) {
    if (row.calories_target == null) continue;
    const newCalories = Math.max(0, row.calories_target + deltaKcal);
    const newCarbs = Math.max(0, (row.carbs_target ?? 0) + deltaKcal / 4);

    const { error } = await supabase
      .from("nutrition_profiles")
      .update({ calories_target: newCalories, carbs_target: newCarbs, updated_at: new Date().toISOString() })
      .eq("client_id", row.client_id);
    if (error) continue;

    await rescaleActiveDietPlanToTargets(row.client_id, {
      calories: newCalories,
      proteins: row.proteins_target ?? 0,
      carbs: newCarbs,
      fats: row.fats_target ?? 0,
    });
    applied++;
  }

  if (applied === 0) return { error: "Aucun profil nutrition trouvé pour ces clients." };

  revalidatePath("/dashboard/coach/clients");
  return { appliedCount: applied };
}
