import { getT } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getBiometricLogs, getBiometricInsights, type BiometricLog } from "@/utils/biometrics";
import { getClientDailyLogs } from "@/utils/daily-logs";
import { getSleepSchedule } from "@/lib/daily-gate";
import { BILAN_BACKFILL_DAYS, todayInParis } from "@/lib/dates";
import { isOuraConfigured } from "@/lib/oura";
import TrackingClient from "@/components/tracking/TrackingClient";
import SleepScheduleCard from "@/components/tracking/SleepScheduleCard";
import SleepToolkit from "@/components/tracking/SleepToolkit";
import SleepSummary, { SleepUnderstand, type SleepNight } from "@/components/tracking/SleepSummary";
import { disconnectOura, acknowledgeBiometricInsight, updateSleepSchedule } from "@/app/dashboard/client/tracking/actions";

function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Onglet Sommeil (2026-10-08, retour direct : « on est censé y aller pour
// voir nos stats, comprendre des choses, et avoir des sons pour s'endormir,
// de la méditation, des exercices de respiration ; pas de logger en plus,
// c'est nul, on ne le fait jamais tous les jours »). Plus aucune saisie ici :
// les nuits viennent du bilan du matin ou de la bague Oura. Ordre : le point
// en un coup d'œil, la boîte à outils du soir, comprendre, puis le détail.
export async function SleepPage({ userId, canConnectOura, ouraStatus, isCoachView = false }: { userId: string; canConnectOura: boolean; ouraStatus?: string; isCoachView?: boolean }) {
  const t = await getT();
  const admin = createAdminClient();
  const today = todayInParis();
  const [bio, insights, { data: ouraConnection }, { data: daily }, recentDailyLogs, sleepSchedule] = await Promise.all([
    getBiometricLogs(userId),
    getBiometricInsights(userId),
    admin.from("oura_connections").select("client_id").eq("client_id", userId).maybeSingle(),
    admin.from("daily_logs").select("log_date, sleep_hours, sleep_rating, bedtime_actual").eq("client_id", userId).gte("log_date", shift(today, -30)).order("log_date"),
    getClientDailyLogs(userId, BILAN_BACKFILL_DAYS),
    getSleepSchedule(userId),
  ]);

  // Une nuit = le bilan du matin d'abord (ce que la personne remplit
  // vraiment), sinon la bague.
  const rows = (daily ?? []) as { log_date: string; sleep_hours: number | null; sleep_rating: number | null; bedtime_actual: string | null }[];
  const byDate = new Map<string, SleepNight>();
  for (const b of bio) byDate.set(b.log_date, { date: b.log_date, hours: b.sleep_hours, bedtime: null, rating: null });
  for (const r of rows) {
    const prev = byDate.get(r.log_date);
    byDate.set(r.log_date, {
      date: r.log_date,
      hours: r.sleep_hours != null ? Number(r.sleep_hours) : prev?.hours ?? null,
      bedtime: r.bedtime_actual ? String(r.bedtime_actual).slice(0, 5) : null,
      rating: r.sleep_rating,
    });
  }
  const nights = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Graphiques détaillés : la durée du bilan complète la bague quand elle manque.
  const merged: BiometricLog[] = nights.map((n) => {
    const b = bio.find((x) => x.log_date === n.date);
    return b ? { ...b, sleep_hours: b.sleep_hours ?? n.hours } : { id: n.date, client_id: userId, log_date: n.date, sleep_hours: n.hours, readiness_score: null, hrv_ms: null, resting_hr: null, body_temp_deviation: null, activity_calories: null, source: "manual" };
  });
  const hasBiometrics = bio.some((b) => b.hrv_ms != null || b.readiness_score != null || b.resting_hr != null) || !!ouraConnection;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto pb-24 md:pb-8 page-transition space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Mon suivi")}</p>
        <h1 className="text-3xl font-black uppercase tracking-tight">{t("Sommeil")}</h1>
        <p className="ep-tagline">{t("Comprendre tes nuits, et mieux dormir ce soir.")}</p>
      </div>

      <SleepSummary nights={nights} />

      <SleepToolkit />

      <SleepUnderstand />

      <SleepScheduleCard
        targetBedtime={sleepSchedule.targetBedtime}
        targetWakeTime={sleepSchedule.targetWakeTime}
        recentLogs={recentDailyLogs}
        updateAction={updateSleepSchedule}
      />

      {(hasBiometrics || (canConnectOura && isOuraConfigured())) && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">{t("Récupération détaillée")}</p>
          <TrackingClient
            logs={hasBiometrics ? merged : []}
            insights={insights}
            acknowledgeBiometricInsight={acknowledgeBiometricInsight}
            ouraConnected={!!ouraConnection}
            canConnectOura={canConnectOura}
            ouraConfigured={isOuraConfigured()}
            isCoachView={isCoachView}
            disconnectOura={disconnectOura}
            ouraStatus={ouraStatus}
            compact={!hasBiometrics}
          />
        </section>
      )}
    </div>
  );
}
