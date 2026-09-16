"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth-guards";
import { todayInParis } from "@/lib/dates";
import { invalidateSignedUrlCache } from "@/utils/signed-url-cache";

// Suivi photo perso (membres gratuits) : upload direct, aucune notification
// coach, aucun lien Drive à gérer soi-même — juste une photo pour se
// souvenir de sa progression physique.
export async function uploadPersonalPhoto(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    const file = formData.get("photo");
    const notes = (formData.get("notes") as string | null)?.trim() || null;
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choisis une photo." };
    }
    const ALLOWED_TYPES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return { error: "Seules les images (jpg, png, webp, gif) sont acceptées." };
    }
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB, aligné sur la limite du bucket "progress-photos"
    if (file.size > MAX_SIZE) {
      return { error: "Photo trop volumineuse (8MB max)." };
    }

    const path = `${guard.userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, file, { contentType: file.type });
    if (uploadError) return { error: "Échec de l'envoi de la photo." };

    const today = todayInParis();
    const { error } = await supabase.from("personal_photos").insert({
      client_id: guard.userId,
      taken_at: today,
      storage_path: path,
      notes,
    });
    if (error) return { error: "Échec de l'enregistrement." };

    revalidatePath("/dashboard/client/photos");
    return {};
  } catch (e) {
    console.error("uploadPersonalPhoto error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deletePersonalPhoto(
  id: string,
  storagePath: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    await supabase.storage.from("progress-photos").remove([storagePath]);
    const { error } = await supabase
      .from("personal_photos")
      .delete()
      .eq("id", id)
      .eq("client_id", guard.userId);
    if (error) return { error: "Échec de la suppression." };

    // Ne jamais laisser une URL signée en cache pointer vers un fichier
    // désormais supprimé (chantier egress, voir utils/signed-url-cache.ts).
    await invalidateSignedUrlCache("progress-photos", [storagePath]);

    revalidatePath("/dashboard/client/photos");
    return {};
  } catch (e) {
    console.error("deletePersonalPhoto error:", e);
    return { error: "Erreur inattendue." };
  }
}
