"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser, getProfile } from "@/utils/auth";
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
    const user = await getUser();
    if (!user) return { error: "Non authentifié" };

    const profile = await getProfile(user.id);
    if (!profile) return { error: "Profil introuvable" };

    const type = formData.get("type") as SubmissionType;
    const drive_link = (formData.get("drive_link") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim() || null;
    const category = profile.competition_category ?? "Non définie";

    if (!type) return { error: "Type requis." };
    if (!drive_link) return { error: "Lien Drive requis." };

    const today = new Date();
    const submitted_at = today.toISOString().split("T")[0];
    const week_number = getISOWeekNumber(today);

    const supabase = await createServerSupabase();
    const { error } = await supabase.from("photo_updates").insert({
      client_id: user.id,
      submitted_at,
      week_number,
      type,
      category,
      drive_link,
      notes,
    });

    if (error) return { error: "Erreur lors de l'envoi." };

    notifyCoachNewPhotoUpdate(
      profile.full_name ?? "Un client",
      TYPE_LABELS[type],
      category
    ).catch(() => {});

    revalidatePath("/dashboard/client/photos");
    return { success: true };
  } catch {
    return { error: "Erreur inattendue." };
  }
}
