"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { ROADMAP_HORIZONS, type RoadmapHorizon } from "@/lib/coach-roadmap";

function isValidHorizon(h: string): h is RoadmapHorizon {
  return (ROADMAP_HORIZONS as readonly string[]).includes(h);
}

export async function saveRoadmapVision(
  horizon: RoadmapHorizon,
  vision: string
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!isValidHorizon(horizon)) return { error: "Horizon invalide." };

  const clean = cleanText(vision, LIMITS.longForm) ?? "";

  const admin = createAdminClient();
  const { error } = await admin.from("coach_business_roadmap").upsert({
    coach_id: guard.userId,
    horizon,
    vision: clean || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/business");
  return { success: true };
}

export async function addRoadmapMilestone(
  horizon: RoadmapHorizon,
  label: string
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!isValidHorizon(horizon)) return { error: "Horizon invalide." };

  const clean = cleanText(label, LIMITS.shortText);
  if (!clean) return { error: "Jalon vide." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("coach_roadmap_milestones")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", guard.userId)
    .eq("horizon", horizon);

  const { data, error } = await admin
    .from("coach_roadmap_milestones")
    .insert({ coach_id: guard.userId, horizon, label: clean, position: count ?? 0 })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/business");
  return { success: true, id: data.id };
}

export async function toggleRoadmapMilestone(
  id: string,
  done: boolean
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_roadmap_milestones")
    .update({ done })
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/business");
  return { success: true };
}

export async function deleteRoadmapMilestone(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_roadmap_milestones")
    .delete()
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/business");
  return { success: true };
}
