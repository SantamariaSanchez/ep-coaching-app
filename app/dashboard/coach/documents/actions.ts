"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";

// Axe 2 (VISION.md) : espace documents/productivité perso du coach.

// ── Fichiers perso ──────────────────────────────────────────────────────
// Même liste que le bucket (20260820c_coach_documents_espace.sql) — la
// validation applicative est une couche en plus, jamais la seule (le
// bucket refuse déjà tout le reste côté serveur Storage, voir Axe O).
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB, aligné sur la limite du bucket

export async function uploadPersonalFile(formData: FormData): Promise<{ error?: string }> {
  try {
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };

    const limited = await checkRateLimit(`coach-file-upload:${guard.userId}`, PRESETS.upload.limit, PRESETS.upload.windowSeconds);
    if (!limited.allowed) return { error: "Trop d'envois d'affilée. Réessaie dans un instant." };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choisis un fichier." };
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return { error: "Format non accepté (PDF, image, Word, Excel ou ZIP uniquement)." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: "Fichier trop volumineux (20MB max)." };
    }

    const supabase = await createServerSupabase();
    const path = `${guard.userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("coach-personal-files")
      .upload(path, file, { contentType: file.type });
    if (uploadError) return { error: "Échec de l'envoi du fichier." };

    const { error } = await supabase.from("coach_personal_files").insert({
      coach_id: guard.userId,
      storage_path: path,
      filename: file.name.slice(0, 200),
      file_type: file.type,
      size_bytes: file.size,
    });
    if (error) {
      await supabase.storage.from("coach-personal-files").remove([path]);
      return { error: "Échec de l'enregistrement." };
    }

    revalidatePath("/dashboard/coach/documents");
    return {};
  } catch (e) {
    console.error("uploadPersonalFile error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deletePersonalFile(id: string, storagePath: string): Promise<{ error?: string }> {
  try {
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };

    const supabase = await createServerSupabase();
    await supabase.storage.from("coach-personal-files").remove([storagePath]);
    const { error } = await supabase
      .from("coach_personal_files")
      .delete()
      .eq("id", id)
      .eq("coach_id", guard.userId);
    if (error) return { error: "Échec de la suppression." };

    revalidatePath("/dashboard/coach/documents");
    return {};
  } catch (e) {
    console.error("deletePersonalFile error:", e);
    return { error: "Erreur inattendue." };
  }
}

// ── Notes perso ──────────────────────────────────────────────────────────
export async function createPersonalNote(content: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Note vide." };
  if (trimmed.length > 2000) return { error: "Note trop longue (2000 caractères max)." };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_personal_notes").insert({
    coach_id: guard.userId,
    content: trimmed,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/documents");
  return {};
}

export async function toggleNoteDone(id: string, done: boolean): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_personal_notes")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/documents");
  return {};
}

export async function deletePersonalNote(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_personal_notes")
    .delete()
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/documents");
  return {};
}
