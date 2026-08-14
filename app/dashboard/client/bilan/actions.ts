"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { insertNotification, getCoachForClient } from "@/utils/insert-notification";
import { awardPoints, POINTS } from "@/lib/gamification";
import { checkWeightObjectiveAchievements } from "@/utils/roadmap";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth-guards";
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

export async function upsertDailyLog(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // requireClient() valide l'identité, le rôle ET la force de session
    // (2FA exigée si le compte l'a activée) — indispensable ici, l'écriture
    // se faisant ensuite via le client admin qui court-circuite la RLS.
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };

    const serverClient = await createServerSupabase();
    const { data: profile } = await serverClient
      .from("profiles")
      .select("full_name")
      .eq("id", guard.userId)
      .single();

    const log_date = formData.get("log_date") as string;
    if (!log_date) return { error: "Date manquante." };

    // Compare against today AND yesterday, en heure de Paris (MASTERCLASS.md
    // Axe L) — la page rend son log_date caché au chargement avec
    // todayInParis(), et ce "today" côté serveur peut changer pendant que le
    // formulaire reste ouvert (ex. un client qui le remplit juste après
    // minuit heure de Paris), ce qui rejetterait sinon une soumission
    // légitime avec une erreur trompeuse. Un calcul en UTC ici rejetait
    // carrément le bilan du jour pendant toute la fenêtre où Paris a déjà
    // changé de date mais pas encore l'UTC (jusqu'à 2h en été).
    const today = todayInParis();
    const [y, m, d] = today.split("-").map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
    if (log_date !== today && log_date !== yesterday) {
      return { error: "Tu ne peux modifier que le bilan du jour." };
    }

    const supabase = createAdminClient();

    // Écriture partielle : seuls les champs réellement présents dans le
    // formData sont inclus dans le payload d'upsert. Supabase ne touche
    // alors que ces colonnes sur ON CONFLICT — un mini-formulaire (ex.
    // juste le poids du matin) ne réinitialise plus le reste du bilan du
    // jour, contrairement à l'ancien comportement qui mettait tout le
    // reste à null dès qu'un seul champ était soumis seul.
    const FIELD_SPEC: Array<{ key: string; kind: "num" | "txt" }> = [
      { key: "training_name", kind: "txt" },
      { key: "cardio", kind: "txt" },
      { key: "steps", kind: "num" },
      { key: "weight_morning", kind: "num" },
      { key: "weight_time", kind: "txt" },
      { key: "sleep_hours", kind: "num" },
      { key: "sleep_rating", kind: "num" },
      { key: "digestion", kind: "txt" },
      { key: "stress", kind: "txt" },
      { key: "proteins_g", kind: "num" },
      { key: "carbs_g", kind: "num" },
      { key: "fats_g", kind: "num" },
      { key: "calories_kcal", kind: "num" },
      { key: "hunger", kind: "txt" },
    ];

    const payload: Record<string, unknown> = {
      client_id: guard.userId,
      log_date,
      updated_at: new Date().toISOString(),
    };
    for (const f of FIELD_SPEC) {
      if (formData.has(f.key)) {
        payload[f.key] = f.kind === "num" ? num(formData.get(f.key)) : txt(formData.get(f.key));
      }
    }

    const { error } = await supabase.from("daily_logs").upsert(payload, { onConflict: "client_id,log_date" });

    if (error) return { error: error.message };

    awardPoints(guard.userId, POINTS.daily_bilan, "Bilan quotidien rempli", "daily_bilan", log_date);

    // Un objectif de road map ("Poids") peut passer "atteint" tout seul dès
    // que ce bilan contient un poids du matin — fire-and-forget, ne doit
    // jamais faire échouer la sauvegarde du bilan.
    const weightLogged = payload.weight_morning as number | null | undefined;
    if (weightLogged != null) {
      checkWeightObjectiveAchievements(guard.userId, weightLogged, log_date).catch(() => {});
    }

    // Notify coach — fire-and-forget
    const clientName = profile?.full_name ?? "Un client";
    getCoachForClient(guard.userId).then((coach) => {
      if (!coach) return;
      insertNotification({
        userId: coach.id,
        type: "new_daily_log",
        title: `Bilan quotidien de ${clientName}`,
        body: `${clientName} a soumis son bilan du ${log_date}.`,
        url: `/dashboard/coach/clients/${guard.userId}/bilan`,
        senderId: guard.userId,
      }).catch(() => {});
    }).catch(() => {});

    revalidatePath("/dashboard/client/bilan");
    return { success: true };
  } catch (e) {
    console.error("upsertDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
