"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { insertNotification, getCoachUserId } from "@/utils/insert-notification";
import { revalidatePath } from "next/cache";

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

export async function upsertDailyLog(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const serverClient = await createServerSupabase();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { data: profile } = await serverClient
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile) return { error: "Profil introuvable." };
    if (profile.role !== "client") return { error: "Accès refusé." };

    const log_date = formData.get("log_date") as string;
    if (!log_date) return { error: "Date manquante." };

    const today = new Date().toISOString().split("T")[0];
    if (log_date !== today) return { error: "Tu ne peux modifier que le bilan du jour." };

    const supabase = createAdminClient();

    const { error } = await supabase.from("daily_logs").upsert(
      {
        client_id: user.id,
        log_date,
        training_name: txt(formData.get("training_name")),
        training_rating: num(formData.get("training_rating")),
        cardio: txt(formData.get("cardio")),
        steps: num(formData.get("steps")),
        weight_morning: num(formData.get("weight_morning")),
        weight_time: txt(formData.get("weight_time")),
        sleep_hours: num(formData.get("sleep_hours")),
        sleep_rating: num(formData.get("sleep_rating")),
        digestion: txt(formData.get("digestion")),
        stress: txt(formData.get("stress")),
        proteins_g: num(formData.get("proteins_g")),
        carbs_g: num(formData.get("carbs_g")),
        fats_g: num(formData.get("fats_g")),
        calories_kcal: num(formData.get("calories_kcal")),
        hunger: txt(formData.get("hunger")),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,log_date" }
    );

    if (error) return { error: error.message };

    // Notify coach — fire-and-forget
    const clientName = profile.full_name ?? "Un client";
    getCoachUserId().then((coachId) => {
      if (!coachId) return;
      insertNotification({
        userId: coachId,
        type: "new_daily_log",
        title: `Bilan quotidien — ${clientName}`,
        body: `${clientName} a soumis son bilan du ${log_date}.`,
        url: `/dashboard/coach/clients/${user.id}/bilan`,
      }).catch(() => {});
    }).catch(() => {});

    revalidatePath("/dashboard/client/bilan");
    return { success: true };
  } catch (e) {
    console.error("upsertDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
