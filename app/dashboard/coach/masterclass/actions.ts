"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { getMasterclassGuide } from "@/lib/masterclass-guides";

// Progression par coach sur les guides Masterclass — voir
// lib/coach-masterclass-progress.ts et la migration
// 20260916d_masterclass_progress.sql pour le contexte complet. Le contenu
// des guides n'est jamais modifié ici, seule la case cochée par étape.

export async function toggleMasterclassStep(
  guideSlug: string,
  stepIndex: number,
  completed: boolean
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const guide = getMasterclassGuide(guideSlug);
  if (!guide) return { error: "Guide introuvable." };
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= guide.steps.length) {
    return { error: "Étape invalide." };
  }

  const limited = await checkRateLimit(
    `masterclass-step-toggle:${guard.userId}`,
    PRESETS.write.limit,
    PRESETS.write.windowSeconds
  );
  if (!limited.allowed) return { error: "Trop d'actions d'affilée, réessaie dans un instant." };

  const admin = createAdminClient();

  if (completed) {
    const { error } = await admin.from("coach_masterclass_progress").upsert(
      {
        coach_id: guard.userId,
        guide_slug: guideSlug,
        step_index: stepIndex,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "coach_id,guide_slug,step_index" }
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("coach_masterclass_progress")
      .delete()
      .eq("coach_id", guard.userId)
      .eq("guide_slug", guideSlug)
      .eq("step_index", stepIndex);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/coach/masterclass/${guideSlug}`);
  revalidatePath("/dashboard/coach/masterclass");
  return { success: true };
}
