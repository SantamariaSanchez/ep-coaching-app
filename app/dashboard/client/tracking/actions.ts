"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { generateInsightsForLatest, type BiometricLogInput } from "@/lib/biometric-rules";
import { sendPushToUser } from "@/lib/push";

export interface LogBiometricsInput {
  logDate: string;
  sleepHours: number | null;
  readinessScore: number | null;
  hrvMs: number | null;
  restingHr: number | null;
}

export async function logBiometrics(input: LogBiometricsInput): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { error } = await supabase.from("biometric_logs").upsert(
      {
        client_id: user.id,
        log_date: input.logDate,
        sleep_hours: input.sleepHours,
        readiness_score: input.readinessScore,
        hrv_ms: input.hrvMs,
        resting_hr: input.restingHr,
        source: "manual",
      },
      { onConflict: "client_id,log_date" }
    );
    if (error) return { error: "Erreur lors de l'enregistrement." };

    // Re-run the rule engine on the last 30 days including today's entry.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: history } = await supabase
      .from("biometric_logs")
      .select("log_date, sleep_hours, readiness_score, hrv_ms, resting_hr")
      .eq("client_id", user.id)
      .gte("log_date", since.toISOString().split("T")[0])
      .order("log_date", { ascending: true });

    const logsAsc = (history ?? []) as BiometricLogInput[];
    const newInsights = generateInsightsForLatest(logsAsc);

    for (const insight of newInsights) {
      const { error: insightError, data: inserted } = await supabase
        .from("biometric_insights")
        .insert({
          client_id: user.id,
          log_date: input.logDate,
          type: insight.type,
          severity: insight.severity,
          message: insight.message,
          suggestion: insight.suggestion,
        })
        .select("id")
        .single();

      // A unique-constraint conflict means this exact insight already exists
      // for today — that's expected on repeat saves, not a real failure.
      if (!insightError && inserted) {
        sendPushToUser(
          user.id,
          insight.severity === "critical" ? "⚠ Alerte récupération" : "Suggestion d'ajustement",
          `${insight.message} ${insight.suggestion}`,
          "/dashboard/client/tracking"
        ).catch(() => {});
      }
    }

    revalidatePath("/dashboard/client/tracking");
    revalidatePath("/dashboard/coach/moi/tracking");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
