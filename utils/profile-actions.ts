"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string | null;
  bio?: string | null;
  instagram_handle?: string | null;
  website?: string | null;
}

export async function updateMyProfile(data: UpdateProfileInput): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    // Chaque champ est borné côté serveur : sans ça, une requête forgée vers
    // cette server action pouvait écrire des mégaoctets dans bio, qui est
    // ensuite affichée à tout le monde dans l'annuaire des coachs.
    const update: Record<string, string | null> = {};
    if (data.full_name !== undefined) {
      const fullName = cleanText(data.full_name, LIMITS.name);
      if (!fullName) return { error: "Le nom est requis." };
      update.full_name = fullName;
    }
    if (data.phone !== undefined) update.phone = cleanText(data.phone, LIMITS.phone);
    if (data.bio !== undefined) update.bio = cleanText(data.bio, LIMITS.bio);
    if (data.instagram_handle !== undefined) {
      const handle = cleanText(data.instagram_handle, LIMITS.handle)?.replace(/^@/, "") || null;
      update.instagram_handle = handle;
    }
    // Colonne "website" déjà en base depuis un moment (jamais reliée à
    // aucune UI) — retour direct 2026-09-09, "ajoute des choses auxquelles
    // on n'a pas encore pensé". http(s):// ajouté d'office si absent : un
    // lien sans protocole ("moncoaching.fr") casse un <a href> (relatif à
    // la page courante au lieu d'être un vrai lien externe).
    if (data.website !== undefined) {
      let site = cleanText(data.website, LIMITS.url);
      if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;
      update.website = site;
    }

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/client/profile");
    revalidatePath("/dashboard/coach/profile");
    return {};
  } catch (e) {
    console.error("updateMyProfile error:", e);
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
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB, aligné sur la limite du bucket "avatars"
    if (file.size > MAX_SIZE) {
      return { error: "Photo trop volumineuse (8MB max)." };
    }

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
  } catch (e) {
    console.error("uploadAvatar error:", e);
    return { error: "Erreur inattendue." };
  }
}
