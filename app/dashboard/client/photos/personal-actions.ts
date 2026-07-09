"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Suivi photo perso (membres gratuits) : upload direct, aucune notification
// coach, aucun lien Drive à gérer soi-même — juste une photo pour se
// souvenir de sa progression physique.
export async function uploadPersonalPhoto(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const file = formData.get("photo");
    const notes = (formData.get("notes") as string | null)?.trim() || null;
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choisis une photo." };
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, file, { contentType: file.type || "image/jpeg" });
    if (uploadError) return { error: "Échec de l'envoi de la photo." };

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("personal_photos").insert({
      client_id: user.id,
      taken_at: today,
      storage_path: path,
      notes,
    });
    if (error) return { error: "Échec de l'enregistrement." };

    revalidatePath("/dashboard/client/photos");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deletePersonalPhoto(
  id: string,
  storagePath: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    await supabase.storage.from("progress-photos").remove([storagePath]);
    const { error } = await supabase
      .from("personal_photos")
      .delete()
      .eq("id", id)
      .eq("client_id", user.id);
    if (error) return { error: "Échec de la suppression." };

    revalidatePath("/dashboard/client/photos");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
