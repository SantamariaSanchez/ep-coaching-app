"use server";

import { requirePlatformOwner } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeExternalUrl } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { VIDEO_STATUSES, type VideoStatus } from "@/lib/founder-video-scripts";

export async function updateVideoStatus(id: string, status: VideoStatus): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  if (!(VIDEO_STATUSES as readonly string[]).includes(status)) return { error: "Statut invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("founder_video_scripts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/admin/tournage");
  return { success: true };
}

export async function updateVideoYoutubeUrl(id: string, url: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const trimmed = url.trim();
  const safeUrl = trimmed ? safeExternalUrl(trimmed) : null;
  if (trimmed && !safeUrl) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("founder_video_scripts")
    .update({ youtube_url: safeUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/admin/tournage");
  return { success: true };
}

export async function updateVideoNotes(id: string, notes: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const trimmed = notes.trim();
  if (trimmed.length > 2000) return { error: "Note trop longue (2000 caractères max)." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("founder_video_scripts")
    .update({ notes: trimmed || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/admin/tournage");
  return { success: true };
}

export async function updateVideoScript(id: string, scriptContent: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const content = scriptContent.trim();
  const wordCount = content ? content.split(/\s+/).length : 0;

  const admin = createAdminClient();
  const { error } = await admin
    .from("founder_video_scripts")
    .update({ script_content: content, word_count: wordCount, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/admin/tournage");
  return { success: true };
}
