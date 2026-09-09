"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { cleanText, LIMITS } from "@/lib/sanitize";
import type { GoalMetricType } from "@/lib/coach-business-goals";

const VALID_METRICS: GoalMetricType[] = ["clients_actifs", "revenu_mois", "custom"];

export async function createBusinessGoal(data: {
  title: string;
  metric_type: GoalMetricType;
  unit: string | null;
  target_value: number;
  target_date: string | null;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const title = cleanText(data.title, LIMITS.shortText);
  if (!title) return { error: "Titre obligatoire." };
  if (!VALID_METRICS.includes(data.metric_type)) return { error: "Métrique invalide." };
  if (!Number.isFinite(data.target_value) || data.target_value <= 0) {
    return { error: "L'objectif chiffré doit être supérieur à 0." };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("coach_business_goals")
    .insert({
      coach_id: guard.userId,
      title,
      metric_type: data.metric_type,
      unit: data.metric_type === "custom" ? cleanText(data.unit ?? "", LIMITS.handle) : null,
      target_value: data.target_value,
      target_date: data.target_date || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Erreur lors de la création." };

  revalidatePath("/dashboard/coach/business");
  return { id: row.id };
}

export async function updateManualGoalValue(id: string, value: number): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!Number.isFinite(value) || value < 0) return { error: "Valeur invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_business_goals")
    .update({ manual_current_value: value })
    .eq("id", id)
    .eq("coach_id", guard.userId)
    .eq("metric_type", "custom"); // jamais sur un objectif auto-calculé
  if (error) return { error: "Erreur lors de la mise à jour." };

  revalidatePath("/dashboard/coach/business");
  return {};
}

export async function setGoalStatus(
  id: string,
  status: "active" | "done" | "abandoned"
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_business_goals")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de la mise à jour." };

  revalidatePath("/dashboard/coach/business");
  return {};
}

export async function deleteBusinessGoal(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  await admin.from("coach_business_goals").delete().eq("id", id).eq("coach_id", guard.userId);

  revalidatePath("/dashboard/coach/business");
  return {};
}
