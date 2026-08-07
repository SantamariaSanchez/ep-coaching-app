import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  refreshOuraToken, fetchOuraSleepForDate, fetchOuraReadinessForDate, fetchOuraStepsForDate,
  findWeakestContributor, READINESS_CONTRIBUTOR_INFO,
} from "@/lib/oura";
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

      const [sleep, readiness, steps] = await Promise.all([
        fetchOuraSleepForDate(accessToken, dateStr),
        fetchOuraReadinessForDate(accessToken, dateStr),
        fetchOuraStepsForDate(accessToken, dateStr),
      ]);

      if (sleep || readiness) {
        await admin.from("biometric_logs").upsert(
          {
            client_id: conn.client_id,
            log_date: dateStr,
            sleep_hours: sleep?.total_sleep_duration_seconds != null
              ? Math.round((sleep.total_sleep_duration_seconds / 3600) * 10) / 10
              : null,
            // Score de récupération Oura ("daily_readiness"), pas le score de
            // sommeil — voir lib/oura.ts pour le détail de la distinction.
            readiness_score: readiness?.score ?? null,
            hrv_ms: sleep?.average_hrv ?? null,
            resting_hr: sleep?.lowest_heart_rate ?? null,
            body_temp_deviation: readiness?.temperature_deviation ?? null,
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
          .select("log_date, sleep_hours, readiness_score, hrv_ms, resting_hr, body_temp_deviation")
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

        // Explique le score plutôt que de juste le constater : Oura calcule
        // la récupération à partir de 8 sous-scores (contributors), jamais
        // exploités jusque-là alors qu'ils étaient déjà dans la réponse API.
        // "Récupération basse" devient "récupération basse À CAUSE DE X",
        // bien plus actionnable pour le client comme pour le coach.
        if (readiness?.score != null && readiness.score < 70) {
          const weakest = findWeakestContributor(readiness.contributors);
          if (weakest) {
            const info = READINESS_CONTRIBUTOR_INFO[weakest.key];
            await admin.from("biometric_insights").insert({
              client_id: conn.client_id,
              log_date: dateStr,
              type: "readiness_contributor",
              severity: readiness.score < 60 ? "warning" : "info",
              message: `Récupération à ${readiness.score}/100, tirée vers le bas par : ${info.label} (${weakest.score}/100).`,
              suggestion: info.tip,
            });
          }
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
