"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string | null;
  bio?: string | null;
}

export async function updateMyProfile(data: UpdateProfileInput): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const update: Record<string, string | null> = {};
    if (data.full_name !== undefined) update.full_name = data.full_name.trim();
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.bio !== undefined) update.bio = data.bio?.trim() || null;

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/client/profile");
    revalidatePath("/dashboard/coach/profile");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Aucune image fournie." };
    }
    if (!file.type.startsWith("image/")) {
      return { error: "Seules les images sont acceptées." };
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) return { error: "Erreur lors de l'upload de la photo." };

    // On stocke le chemin dans le bucket (pas l'URL publique) pour pouvoir
    // générer des signed URLs à la demande. Le bucket "avatars" doit être
    // configuré en mode privé dans le dashboard Supabase.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    if (updateError) return { error: "Erreur lors de l'enregistrement de la photo." };

    // Générer une signed URL courte pour retourner une URL utilisable immédiatement.
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 300);

    revalidatePath("/dashboard/client/profile");
    revalidatePath("/dashboard/coach/profile");
    return { url: signed?.signedUrl ?? path };
  } catch {
    return { error: "Erreur inattendue." };
  }
}
