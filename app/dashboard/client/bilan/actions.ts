"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { insertNotification, getCoachForClient } from "@/utils/insert-notification";
import { awardPoints, POINTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { isClientCapable } from "@/utils/auth";

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
      .select("full_name, role, coach_id")
      .eq("id", user.id)
      .single();

    if (!profile) return { error: "Profil introuvable." };
    if (!isClientCapable(profile)) return { error: "Accès refusé." };

    const log_date = formData.get("log_date") as string;
    if (!log_date) return { error: "Date manquante." };

    // Compare against today AND yesterday (UTC) — the page renders its hidden
    // log_date at page-load time, and the server's UTC "today" can roll over
    // while the form is still open (e.g. a French client filling it in just
    // after midnight local time), which would otherwise reject a legitimate
    // same-session submission with a confusing error.
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
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
      client_id: user.id,
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

    awardPoints(user.id, POINTS.daily_bilan, "Bilan quotidien rempli", "daily_bilan", log_date);

    // Notify coach — fire-and-forget
    const clientName = profile.full_name ?? "Un client";
    getCoachForClient(user.id).then((coach) => {
      if (!coach) return;
      insertNotification({
        userId: coach.id,
        type: "new_daily_log",
        title: `Bilan quotidien de ${clientName}`,
        body: `${clientName} a soumis son bilan du ${log_date}.`,
        url: `/dashboard/coach/clients/${user.id}/bilan`,
        senderId: user.id,
      }).catch(() => {});
    }).catch(() => {});

    revalidatePath("/dashboard/client/bilan");
    return { success: true };
  } catch (e) {
    console.error("upsertDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
