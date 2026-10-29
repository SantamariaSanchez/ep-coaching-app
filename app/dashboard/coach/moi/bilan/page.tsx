import { getT } from "@/lib/i18n-server";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientDailyLogs } from "@/utils/daily-logs";
import { getTodayLogs, getActiveDietPlan } from "@/utils/nutrition";
import BilanDayPicker from "@/components/ui/BilanDayPicker";
import { getAppSetup } from "@/lib/app-setup-server";
import { isWithinBilanBackfillWindow } from "@/lib/dates";
import { getTodayStepsActual } from "@/utils/steps";
import DailyBilanForm from "@/components/ui/DailyBilanForm";
import QuickBilan from "@/components/tracking/QuickBilan";
import TrackingLevelPicker from "@/components/tracking/TrackingLevelPicker";
import Link from "next/link";
import { getTrackingProfile } from "@/lib/tracking-profile-server";
import { bilanLayout, describeTracking, isWeighDay, nextWeighDayLabel } from "@/lib/tracking-profile";
import { setTrackingLevelAction } from "@/app/actions/tracking";
import { nowInParis } from "@/lib/dates";
import BilanProgressView from "@/components/ui/BilanProgressView";
import BilanKpiBoard from "@/components/ui/BilanKpiBoard";
import { computeLogStreak } from "@/lib/daily-logs-helpers";
import { upsertCoachDailyLog } from "./actions";
import { todayInParis } from "@/lib/dates";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00")));
}

export default async function CoachMonBilanPage({ searchParams }: { searchParams: Promise<{ jour?: string; complet?: string }> }) {
  const t = await getT();
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  // "Progression" (moyennes globales, tendances, export CSV) vivait avant
  // dans un onglet séparé qui recalculait les mêmes daily_logs autrement —
  // fusionné ici, voir components/ui/BilanProgressView. L'ancienne route
  // /dashboard/coach/moi/progression redirige maintenant ici.
  const today = todayInParis();
  // Bilan d'un jour passé (?jour=AAAA-MM-JJ, 30 jours max) : rattraper un
  // oubli avec exactement le même formulaire.
  const { jour, complet } = await searchParams;
  const date = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) && isWithinBilanBackfillWindow(jour) ? jour : today;
  const [allLogs, dayFoodLogs, autoSteps, activePlan, appSetup, tracking] = await Promise.all([
    getClientDailyLogs(user.id, 90),
    getTodayLogs(user.id, date),
    date === today ? getTodayStepsActual(user.id) : Promise.resolve(null),
    getActiveDietPlan(user.id),
    getAppSetup(user.id),
    getTrackingProfile(user.id),
  ]);
  const todayLog = allLogs.find((l) => l.log_date === date) ?? null;
  const todayFoodLogs = dayFoodLogs;

  // Retour direct 2026-09-09 : "onglet par onglet, masterclass" — le bilan
  // client pré-remplit calories/macros depuis ce qui est déjà loggé dans
  // Nutrition (voir app/dashboard/client/bilan/page.tsx), mais ce
  // pré-remplissage n'existait pas ici : le coach devait retaper à la main
  // des macros qu'il avait déjà loggées précisément dans Moi > Nutrition.
  const nutritionTotals = todayFoodLogs.length > 0
    ? todayFoodLogs.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories ?? 0),
          proteins: acc.proteins + (l.proteins ?? 0),
          carbs: acc.carbs + (l.carbs ?? 0),
          fats: acc.fats + (l.fats ?? 0),
        }),
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      )
    : null;

  const layout = bilanLayout(tracking, appSetup.modules);
  const { isoDow } = nowInParis();
  const lastWeight = allLogs.find((l) => l.log_date < date && l.weight_morning != null)?.weight_morning ?? null;
  const lastSleep = allLogs.find((l) => l.log_date < date && l.sleep_hours != null)?.sleep_hours ?? null;

  const streakDays = computeLogStreak(allLogs, today);
  const doneToday = date === today && !!todayLog;

  const formBlock = complet !== "1" ? (
    <div className="animate-scale-in">
      <QuickBilan
        key={date} today={date} existing={todayLog} action={upsertCoachDailyLog}
        fields={layout.fields} extraFields={layout.extraFields} minimum={layout.minimum}
        isWeighDay={date !== today || isWeighDay(tracking, isoDow)} nextWeighLabel={nextWeighDayLabel(tracking, isoDow)}
        lastWeight={lastWeight} lastSleep={lastSleep} autoSteps={autoSteps} hasPlan={!!activePlan}
        trackerHref={date === today ? "/dashboard/coach/moi/nutrition" : `/dashboard/coach/moi/nutrition?jour=${date}`}
        tone={tracking.tone} allowQuick={tracking.level !== "simple"}
      />
      <p style={{ margin: "10px 2px 0", fontSize: 12 }}>
        <Link href={date === today ? "?complet=1" : `?jour=${date}&complet=1`} style={{ color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 700 }}>{t("Formulaire complet")}</Link>
      </p>
    </div>
  ) : (
    <div className="ep-card animate-scale-in" style={{ padding: "20px 16px" }}>
      <DailyBilanForm key={date} today={date} existing={todayLog} action={upsertCoachDailyLog} nutritionTotals={nutritionTotals} autoSteps={autoSteps} plan={activePlan ? { name: activePlan.name, mode: activePlan.mode } : null} trackerHref={date === today ? "/dashboard/coach/moi/nutrition" : `/dashboard/coach/moi/nutrition?jour=${date}`} setup={appSetup} />
    </div>
  );

  return (
    <div className="page-transition mx-auto px-4 pt-8 pb-24 md:pb-10" style={{ maxWidth: 1120 }}>
      <div className="animate-fade-up" style={{ marginBottom: 18 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{date === today ? fmt(today) : `Rattrapage · ${fmt(date)}`}</p>
        <h1 className="ep-h1">{t("Mon bilan & ma progression")}</h1>
      </div>

      <div style={{ marginBottom: 14 }}>
        <BilanDayPicker basePath="/dashboard/coach/moi/bilan" today={today} selected={date} logs={allLogs} />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-x-6 lg:items-start">
        {allLogs.length > 0 && (
          <div className="order-1 lg:col-start-2 lg:row-start-1">
            <BilanKpiBoard logs={allLogs} streakDays={streakDays} />
          </div>
        )}

        <div className="order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 flex flex-col gap-4">
          {doneToday ? (
            <details className="ep-card" style={{ padding: 0 }}>
              <summary style={{ listStyle: "none", cursor: "pointer", padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{t("Bilan du jour rempli")}</span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent-hi2)" }}>{t("Modifier")}</span>
              </summary>
              <div style={{ padding: "0 8px 10px" }}>{formBlock}</div>
            </details>
          ) : (
            formBlock
          )}
          <TrackingLevelPicker level={tracking.level} autoLevel={tracking.autoLevel} source={tracking.source} reasons={tracking.reasons} summary={describeTracking(tracking)} suggestion={tracking.suggestion} onPick={setTrackingLevelAction} compact />
        </div>

        <div className="order-3 lg:col-start-2 lg:row-start-2">
          <BilanProgressView logs={allLogs} exportHref={`/api/export/daily-logs/${user.id}`} />
        </div>
      </div>
    </div>
  );
}
