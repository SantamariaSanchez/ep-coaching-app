"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { CONTENT_PLATFORMS, CONTENT_STATUSES, type ContentPlatform, type ContentStatus } from "@/lib/content-ideas";

// Axe 2 (VISION.md) : espace de création de contenu du coach.

export async function createContentIdea(input: {
  title: string;
  platform: ContentPlatform;
  notes?: string;
  sourceQuestionId?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const title = input.title.trim();
  if (!title) return { error: "Titre requis." };
  if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };
  if (!(CONTENT_PLATFORMS as readonly string[]).includes(input.platform)) {
    return { error: "Plateforme invalide." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("content_ideas").insert({
    coach_id: guard.userId,
    title,
    platform: input.platform,
    notes: input.notes?.trim() || null,
    source: input.sourceQuestionId ? "question" : "manuel",
    source_question_id: input.sourceQuestionId ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function updateContentIdea(
  id: string,
  updates: { title?: string; notes?: string; platform?: ContentPlatform; status?: ContentStatus }
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) return { error: "Titre requis." };
    if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };
    patch.title = title;
  }
  if (updates.notes !== undefined) patch.notes = updates.notes.trim() || null;
  if (updates.platform !== undefined) {
    if (!(CONTENT_PLATFORMS as readonly string[]).includes(updates.platform)) return { error: "Plateforme invalide." };
    patch.platform = updates.platform;
  }
  if (updates.status !== undefined) {
    if (!(CONTENT_STATUSES as readonly string[]).includes(updates.status)) return { error: "Statut invalide." };
    patch.status = updates.status;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_ideas")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function deleteContentIdea(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_ideas")
    .delete()
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

// Point d'entrée depuis l'onglet Questions (CommunityFeed) : transforme une
// question de client en idée de contenu prête à travailler, sans ressaisie.
export async function createIdeaFromQuestion(questionId: string, questionContent: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const title = questionContent.trim().slice(0, 200) || "Question d'un membre";

  const admin = createAdminClient();
  const { error } = await admin.from("content_ideas").insert({
    coach_id: guard.userId,
    title,
    platform: "general",
    notes: `Question posée par un membre :\n« ${questionContent.trim()} »`,
    source: "question",
    source_question_id: questionId,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}
