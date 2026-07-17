import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { refreshOuraToken, fetchOuraSleepForDate, fetchOuraStepsForDate } from "@/lib/oura";
import { generateInsightsForLatest, type BiometricLogInput } from "@/lib/biometric-rules";

// Synchro quotidienne Oura Ring — voir supabase/migrations/20260717f_oura_integration.sql
// pour la planification pg_cron. Ne touche que sommeil/récupération/HRV/FC
// repos (biometric_logs) et les pas (step_logs) : jamais le cardio/calories,
// hors-sujet dans l'onglet Sommeil.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections } = await admin.from("oura_connections").select("*");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  let synced = 0;
  let failed = 0;

  for (const conn of connections ?? []) {
    try {
      let accessToken = conn.access_token as string;

      // Rafraîchit le token s'il expire dans moins de 5 minutes.
      if (new Date(conn.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
        const refreshed = await refreshOuraToken(conn.refresh_token);
        if (!refreshed) { failed++; continue; }
        accessToken = refreshed.access_token;
        await admin.from("oura_connections").update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq("client_id", conn.client_id);
      }

      const [sleep, steps] = await Promise.all([
        fetchOuraSleepForDate(accessToken, dateStr),
        fetchOuraStepsForDate(accessToken, dateStr),
      ]);

      if (sleep) {
        await admin.from("biometric_logs").upsert(
          {
            client_id: conn.client_id,
            log_date: dateStr,
            sleep_hours: sleep.total_sleep_duration_seconds != null
              ? Math.round((sleep.total_sleep_duration_seconds / 3600) * 10) / 10
              : null,
            readiness_score: sleep.score,
            hrv_ms: sleep.average_hrv,
            resting_hr: sleep.lowest_heart_rate,
            source: "oura",
          },
          { onConflict: "client_id,log_date" }
        );

        // Même moteur de suggestions que la saisie manuelle (voir
        // app/dashboard/client/tracking/actions.ts).
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: history } = await admin
          .from("biometric_logs")
          .select("log_date, sleep_hours, readiness_score, hrv_ms, resting_hr")
          .eq("client_id", conn.client_id)
          .gte("log_date", since.toISOString().split("T")[0])
          .order("log_date", { ascending: true });
        const newInsights = generateInsightsForLatest((history ?? []) as BiometricLogInput[]);
        for (const insight of newInsights) {
          await admin.from("biometric_insights").insert({
            client_id: conn.client_id,
            log_date: dateStr,
            type: insight.type,
            severity: insight.severity,
            message: insight.message,
            suggestion: insight.suggestion,
          });
        }
      }

      if (steps != null) {
        // Préserve la routine (completed_items) déjà cochée manuellement —
        // seul le nombre de pas vient d'Oura.
        const { data: existing } = await admin
          .from("step_logs")
          .select("completed_items")
          .eq("client_id", conn.client_id)
          .eq("log_date", dateStr)
          .maybeSingle();

        await admin.from("step_logs").upsert(
          {
            client_id: conn.client_id,
            log_date: dateStr,
            steps_actual: steps,
            completed_items: existing?.completed_items ?? [],
          },
          { onConflict: "client_id,log_date" }
        );
      }

      await admin.from("oura_connections").update({ last_synced_at: new Date().toISOString() }).eq("client_id", conn.client_id);
      synced++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, synced, failed, checked: connections?.length ?? 0 });
}
