"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { notifyCoachNewPhotoUpdate } from "@/app/actions/notifications";
import type { SubmissionType } from "@/lib/posing-data";
import { TYPE_LABELS } from "@/lib/posing-data";

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

export async function submitPhotoUpdate(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // Verify user identity explicitly (RLS bypassed via adminClient)
    const serverClient = await createServerSupabase();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Non authentifié" };

    const { data: profile } = await serverClient
      .from("profiles")
      .select("full_name, competition_category, role")
      .eq("id", user.id)
      .single();

    if (!profile) return { error: "Profil introuvable" };
    if (profile.role !== "client") return { error: "Accès refusé." };

    const type = formData.get("type") as SubmissionType;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const category = (profile as { competition_category?: string | null }).competition_category ?? "Non définie";

    // Médias déjà uploadés côté client (voir ClientPhotosView) — on ne reçoit
    // ici que les chemins de stockage, jamais les fichiers eux-mêmes.
    const photoPaths = formData
      .getAll("photo_paths")
      .map((v) => (v as string).trim())
      .filter(Boolean);
    const videoPath = (formData.get("video_path") as string)?.trim() || null;

    if (!type) return { error: "Type requis." };
    if (type === "mandatory_poses" && photoPaths.length === 0) return { error: "Au moins une photo requise." };
    if (type !== "mandatory_poses" && !videoPath) return { error: "Vidéo requise." };

    const today = new Date();
    const submitted_at = today.toISOString().split("T")[0];
    const week_number = getISOWeekNumber(today);

    // Use admin client to bypass RLS — user identity verified above
    const supabase = createAdminClient();
    const { error } = await supabase.from("photo_updates").insert({
      client_id: user.id,
      submitted_at,
      week_number,
      type,
      category,
      photo_paths: photoPaths.length > 0 ? photoPaths : null,
      video_path: videoPath,
      notes,
    });

    if (error) return { error: `Erreur lors de l'envoi : ${error.message}` };

    notifyCoachNewPhotoUpdate(
      profile.full_name ?? "Un client",
      TYPE_LABELS[type],
      category,
      user.id
    ).catch(() => {});

    revalidatePath("/dashboard/client/photos");
    return { success: true };
  } catch (e) {
    console.error("submitPhotoUpdate error:", e);
    return { error: "Erreur inattendue." };
  }
}
