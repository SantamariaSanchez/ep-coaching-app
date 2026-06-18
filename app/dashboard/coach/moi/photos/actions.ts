"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { SubmissionType } from "@/lib/posing-data";

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export async function submitPhotoUpdate(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const serverClient = await createServerSupabase();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Non authentifié" };

    const { data: profile } = await serverClient
      .from("profiles")
      .select("full_name, competition_category, role")
      .eq("id", user.id)
      .single();

    if (!profile) return { error: "Profil introuvable" };
    if (profile.role !== "coach") return { error: "Accès refusé." };

    const type = formData.get("type") as SubmissionType;
    const drive_link = (formData.get("drive_link") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim() || null;
    const category = (profile as { competition_category?: string | null }).competition_category ?? "Non définie";

    if (!type) return { error: "Type requis." };
    if (!drive_link) return { error: "Lien Drive requis." };

    const today = new Date();
    const supabase = createAdminClient();
    const { error } = await supabase.from("photo_updates").insert({
      client_id: user.id,
      submitted_at: today.toISOString().split("T")[0],
      week_number: getISOWeekNumber(today),
      type,
      category,
      drive_link,
      notes,
    });

    if (error) return { error: `Erreur : ${error.message}` };

    revalidatePath("/dashboard/coach/moi/photos");
    return { success: true };
  } catch (e) {
    console.error("submitPhotoUpdate coach error:", e);
    return { error: "Erreur inattendue." };
  }
}
