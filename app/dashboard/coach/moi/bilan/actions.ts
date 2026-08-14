"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { checkWeightObjectiveAchievements } from "@/utils/roadmap";
import { todayInParis } from "@/lib/dates";

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

export async function upsertCoachDailyLog(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // requireCoach() remplace le contrôle de rôle maison et ajoute la force
    // de session (2FA) — l'écriture passe ensuite par le client admin.
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };

    const log_date = formData.get("log_date") as string;
    if (!log_date) return { error: "Date manquante." };

    // MASTERCLASS.md Axe L : tolérance "hier" en plus d'"aujourd'hui" (heure
    // de Paris) — la page rend son log_date au chargement, et le formulaire
    // peut rester ouvert pendant que la date change (ex. juste après minuit
    // heure de Paris), ce qui rejetterait sinon une soumission légitime.
    // Même correctif que app/dashboard/client/bilan/actions.ts.
    const today = todayInParis();
    const [y, m, d] = today.split("-").map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
    if (log_date !== today && log_date !== yesterday) {
      return { error: "Tu ne peux modifier que le bilan du jour." };
    }

    const supabase = createAdminClient();

    const weightMorning = num(formData.get("weight_morning"));

    const { error } = await supabase.from("daily_logs").upsert(
      {
        client_id: guard.userId,
        log_date,
        training_name: txt(formData.get("training_name")),
        training_rating: num(formData.get("training_rating")),
        cardio: txt(formData.get("cardio")),
        steps: num(formData.get("steps")),
        weight_morning: weightMorning,
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

    // Voir le même hook côté client dans app/dashboard/client/bilan/actions.ts.
    if (weightMorning != null) {
      checkWeightObjectiveAchievements(guard.userId, weightMorning, log_date).catch(() => {});
    }

    revalidatePath("/dashboard/coach/moi/bilan");
    return { success: true };
  } catch (e) {
    console.error("upsertCoachDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
