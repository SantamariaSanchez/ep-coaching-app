"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { todayInParis } from "@/lib/dates";

// Miroir de app/dashboard/client/photos/personal-actions.ts pour le coach
// qui suit ses propres photos (aucun coach au-dessus de lui pour les
// relire — voir la refonte de app/dashboard/coach/moi/photos/page.tsx qui
// utilise maintenant PersonalPhotosView au lieu de ClientPhotosView).
// requireCoach() au lieu de requireClient() : le fondateur de la
// plateforme (is_platform_owner) n'a justement pas de coach_id renseigné,
// donc requireClient() le rejetterait.
export async function uploadPersonalPhoto(
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const guard = await requireCoach();
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

    revalidatePath("/dashboard/coach/moi/photos");
    return {};
  } catch (e) {
    console.error("uploadPersonalPhoto (coach) error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Trou trouvé en creusant "Moi" (2026-09-09) : la table measurements
// (tour de taille, poitrine, bras, cuisse...) a toute une infrastructure de
// lecture déjà construite — getClientMeasurements, BeforeAfterComparator
// (curseur photo avant/après + tableau d'écarts par mensuration) — mais
// AUCUN chemin d'écriture n'existe nulle part dans toute l'appli, sur aucun
// compte : 0 ligne en base, tous comptes confondus. BeforeAfterComparator
// ne s'affiche d'ailleurs qu'à partir de 2 mensurations (`if (measurements.
// length < 2) return null`), donc structurellement jamais vu par personne.
// Première brique d'écriture, sur son propre suivi (le plus pertinent pour
// une prépa physique) : mêmes champs que la table, saisie optionnelle
// (aucun champ obligatoire hors la date), pour ne jamais forcer une mesure
// qu'on n'a pas sous la main.
export async function logPersonalMeasurement(input: {
  measuredAt: string;
  weight: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  shoulders: number | null;
  armRelaxed: number | null;
  armFlexed: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  abdomen: number | null;
  neck: number | null;
  notes: string | null;
}): Promise<{ error?: string }> {
  try {
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    // Upsert, pas insert brut (migration 20260909f, une seule prise par
    // client et par jour) : un double-tap sur "Enregistrer", ou re-sauvegarder
    // le même jour après correction d'une valeur, créait une ligne en plus au
    // lieu de remplacer l'existante — faussait silencieusement l'historique
    // et le comparateur avant/après (deux entrées pour un même jour).
    const { error } = await supabase.from("measurements").upsert(
      {
        client_id: guard.userId,
        measured_at: input.measuredAt,
        weight: input.weight,
        waist: input.waist,
        hips: input.hips,
        chest: input.chest,
        shoulders: input.shoulders,
        arm_relaxed: input.armRelaxed,
        arm_flexed: input.armFlexed,
        forearm: input.forearm,
        thigh: input.thigh,
        calf: input.calf,
        abdomen: input.abdomen,
        neck: input.neck,
        notes: input.notes?.trim() || null,
      },
      { onConflict: "client_id,measured_at" }
    );
    if (error) {
      console.error("logPersonalMeasurement upsert error:", error);
      return { error: "Échec de l'enregistrement." };
    }

    revalidatePath("/dashboard/coach/moi/photos");
    return {};
  } catch (e) {
    console.error("logPersonalMeasurement error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deletePersonalPhoto(
  id: string,
  storagePath: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    await supabase.storage.from("progress-photos").remove([storagePath]);
    const { error } = await supabase
      .from("personal_photos")
      .delete()
      .eq("id", id)
      .eq("client_id", guard.userId);
    if (error) return { error: "Échec de la suppression." };

    revalidatePath("/dashboard/coach/moi/photos");
    return {};
  } catch (e) {
    console.error("deletePersonalPhoto (coach) error:", e);
    return { error: "Erreur inattendue." };
  }
}
