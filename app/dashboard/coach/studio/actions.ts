"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { CONTENT_PLATFORMS, CONTENT_STATUSES, type ContentPlatform, type ContentStatus } from "@/lib/content-ideas";
import { INSPIRATION_PLATFORMS, type InspirationPlatform, SCRIPT_FORMATS, type ScriptFormat, SCRIPT_STATUSES, type ScriptStatus } from "@/lib/coach-ideation";
import { safeExternalUrl } from "@/lib/sanitize";

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

// Point d'entrée depuis la page "Développer mon business" (funnel
// TOF/MOF/BOF, voir lib/coach-business.ts) : jusqu'ici le funnel n'était que
// des idées à lire, il fallait les recopier à la main dans le Studio pour
// les travailler réellement. platformLabel arrive tel qu'affiché ("Instagram",
// "YouTube"...), traduit ici vers la valeur attendue par content_ideas.
export async function createContentIdeaFromFunnel(input: {
  stage: "TOF" | "MOF" | "BOF";
  platformLabel: string;
  format: string;
  idea: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const platformMap: Record<string, ContentPlatform> = {
    Instagram: "instagram",
    YouTube: "youtube",
    LinkedIn: "linkedin",
  };
  const platform = platformMap[input.platformLabel] ?? "general";

  const admin = createAdminClient();
  const { error } = await admin.from("content_ideas").insert({
    coach_id: guard.userId,
    title: `${input.stage} · ${input.format} · ${input.idea.slice(0, 140)}`,
    platform,
    notes: input.idea,
    source: "funnel",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

// ── Notes libres (Idéation) ─────────────────────────────────────────────

export async function createIdeationNote(input: {
  title: string;
  body?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await enforceRateLimit(`ideation-note-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return { error: "Trop de notes créées d'un coup, réessaie dans un instant." };

  const title = input.title.trim();
  if (!title) return { error: "Titre requis." };
  if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_ideation_notes").insert({
    coach_id: guard.userId,
    title,
    body: input.body?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function updateIdeationNote(
  id: string,
  updates: { title?: string; body?: string; pinned?: boolean }
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const patch: Record<string, string | boolean | null> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) return { error: "Titre requis." };
    if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };
    patch.title = title;
  }
  if (updates.body !== undefined) patch.body = updates.body.trim() || null;
  if (updates.pinned !== undefined) patch.pinned = updates.pinned;

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_ideation_notes")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function deleteIdeationNote(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_ideation_notes").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

// ── Swipe file (Idéation) ────────────────────────────────────────────────

export async function createInspiration(input: {
  url: string;
  platform: InspirationPlatform;
  note?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await enforceRateLimit(`inspiration-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return { error: "Trop de liens ajoutés d'un coup, réessaie dans un instant." };

  const safeUrl = safeExternalUrl(input.url);
  if (!safeUrl) return { error: "Lien invalide." };
  if (!(INSPIRATION_PLATFORMS as readonly string[]).includes(input.platform)) return { error: "Plateforme invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_inspirations").insert({
    coach_id: guard.userId,
    url: safeUrl,
    platform: input.platform,
    note: input.note?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function deleteInspiration(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_inspirations").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

// ── Scripts (Idéation) ───────────────────────────────────────────────────

export async function createScript(input: {
  title: string;
  format: ScriptFormat;
  content?: string;
}): Promise<{ error?: string; success?: boolean; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await enforceRateLimit(`script-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return { error: "Trop de scripts créés d'un coup, réessaie dans un instant." };

  const title = input.title.trim();
  if (!title) return { error: "Titre requis." };
  if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };
  if (!(SCRIPT_FORMATS as readonly string[]).includes(input.format)) return { error: "Format invalide." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coach_scripts")
    .insert({ coach_id: guard.userId, title, format: input.format, content: input.content?.trim() || null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true, id: data?.id };
}

export async function updateScript(
  id: string,
  updates: {
    title?: string;
    format?: ScriptFormat;
    content?: string;
    status?: ScriptStatus;
    // Tracking de performance (2026-09-10) — un entier positif ou null
    // pour effacer une valeur saisie par erreur.
    views?: number | null;
    likes?: number | null;
    commentsCount?: number | null;
  }
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const patch: Record<string, string | number | null> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) return { error: "Titre requis." };
    if (title.length > 200) return { error: "Titre trop long (200 caractères max)." };
    patch.title = title;
  }
  if (updates.format !== undefined) {
    if (!(SCRIPT_FORMATS as readonly string[]).includes(updates.format)) return { error: "Format invalide." };
    patch.format = updates.format;
  }
  if (updates.content !== undefined) patch.content = updates.content.trim() || null;
  if (updates.status !== undefined) {
    if (!(SCRIPT_STATUSES as readonly string[]).includes(updates.status)) return { error: "Statut invalide." };
    patch.status = updates.status;
  }
  for (const [key, col] of [["views", "views"], ["likes", "likes"], ["commentsCount", "comments_count"]] as const) {
    const val = updates[key];
    if (val === undefined) continue;
    if (val !== null && (!Number.isFinite(val) || val < 0)) return { error: "Chiffre invalide." };
    patch[col] = val;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("coach_scripts").update(patch).eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}

export async function deleteScript(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_scripts").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/studio");
  return { success: true };
}
