import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getT, getLocale } from "@/lib/i18n-server";
import { todayInParis } from "@/lib/dates";
import { getClientPreviewAccess } from "@/lib/client-preview";
import { getAppSetup } from "@/lib/app-setup-server";
import { hiddenSegments, isOn } from "@/lib/app-setup";
import { getAccessType, isSubscribed } from "@/utils/auth-client";
import { getClientIntake } from "@/utils/client-intake";
import { getThisWeekCheckin, getWeekStart } from "@/utils/checkins";
import { getLatestCoachNote } from "@/utils/notes";
import { getPeriodLogs } from "@/utils/period-tracking";
import { getTrialDaysLeft } from "@/utils/coaching-trial";
import { getMemberPreferences } from "@/utils/member-preferences";
import { derivePersonalization } from "@/lib/personalization";
import { getOnboardingChecklist } from "@/lib/onboarding-checklist";
import { getClientActivityStreak } from "@/lib/client-activity";
import { getClientHomeDay } from "@/utils/client-home";
import { weeksSince } from "@/lib/client-home";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { recommendPreset } from "@/lib/preset-programs";
import { trainingStyleFromPractices } from "@/lib/training-styles";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getMostLoggedFoodsGlobal,
} from "@/utils/nutrition";
import { getCommunityRecipes } from "@/utils/community-recipes";
import { getSavedMeals } from "@/utils/saved-meals";
import { getClientSupplements } from "@/utils/supplements";
import { readMealChecks } from "@/lib/meal-checks";
import { mealTimesForDate } from "@/lib/meal-times";
import { getTrainingDays } from "@/utils/training-days";
import { getScheduleBlocks, getScheduleBlockTaskLog } from "@/utils/agenda";
import { getDailyHabitScore, getWeeklyHabitScores, currentStreak } from "@/lib/habit-score";
import ClientPreviewFrame, { type PreviewVue } from "@/components/coach/ClientPreviewFrame";
import { CoachedHome, WelcomeGuide } from "@/components/client/home/ClientHome";
import ProgramWeekView from "@/components/ui/ProgramWeekView";
import { getProgramWeekContext } from "@/utils/program-week";
import ClientCorrectionsSection from "@/components/ui/ClientCorrectionsSection";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import ProgramPresetSelector from "@/components/ui/ProgramPresetSelector";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import SupplementsSection from "@/components/ui/SupplementsSection";
import WeeklyAgenda from "@/components/ui/WeeklyAgenda";
import HabitScoreCard from "@/components/ui/HabitScoreCard";
import HabitScoreTrend from "@/components/ui/HabitScoreTrend";
import PlusMenu from "@/components/ui/PlusMenu";
import { previewReadOnlyAction } from "./readonly-actions";
import { CalendarDays, Dumbbell } from "lucide-react";

// Aperçu « Voir comme mon client » (voir lib/client-preview.ts pour le
// contrôle d'accès). Chaque vue charge les données du client regardé et les
// rend avec les composants de son espace, en lecture seule.

export const metadata: Metadata = { title: "Aperçu client", robots: { index: false, follow: false } };

const VUES: PreviewVue[] = ["accueil", "programme", "nutrition", "agenda", "coach", "plus"];
const SESSION_BASE_PATH = "/dashboard/client/logbook";

function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function ClientPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vue?: string }>;
}) {
  const [t, locale, { id }, { vue: rawVue }] = await Promise.all([getT(), getLocale(), params, searchParams]);
  const access = await getClientPreviewAccess(id);
  if (!access) notFound();
  const { client, db } = access;
  const vue: PreviewVue = VUES.includes(rawVue as PreviewVue) ? (rawVue as PreviewVue) : "accueil";

  const [appSetup, intake] = await Promise.all([getAppSetup(id), getClientIntake(id)]);
  const accessType = getAccessType(client);
  const isFree = accessType === "membre_gratuit";
  const hidden = [...hiddenSegments(appSetup, "client")];
  const showCycle = intake?.gender === "Femme" || (appSetup.completed && isOn(appSetup, "cycle"));
  const rawFirst = client.full_name?.split(" ")[0] ?? "";
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase() : t("ton client");
  const statusLabel = isFree ? t("Accès gratuit, coaching pas encore activé") : t("Coaching actif");
  const today = todayInParis();

  let notice: string | null = null;
  if (!client.onboarding_completed_at) {
    notice = t("Il n'a pas encore fait la visite de bienvenue : à sa prochaine ouverture, l'appli la lui montre avant cet écran.");
  }

  let content: React.ReactNode = null;

  if (vue === "accueil") {
    if (isFree) {
      const [preferences, checklist, activityStreak, day] = await Promise.all([
        getMemberPreferences(id),
        getOnboardingChecklist(id, db),
        getClientActivityStreak(id, db),
        getClientHomeDay(id, { coached: false, checkinDone: true }, db),
      ]);
      content = (
        <WelcomeGuide
          firstName={rawFirst}
          hasCoach={!!client.coach_id}
          personalization={derivePersonalization(preferences)}
          checklist={checklist}
          activityStreak={activityStreak}
          show={{ nutrition: isOn(appSetup, "nutrition"), entrainement: isOn(appSetup, "entrainement") }}
          day={day}
          locale={locale}
          preview
        />
      );
    } else if (!intake) {
      notice = t("Sa fiche de départ n'est pas encore remplie : en ouvrant l'appli, il tombe d'abord sur ce questionnaire, l'accueil ci-dessous ne s'affiche qu'ensuite.");
      content = (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.55)" }}>
          {t("Questionnaire de départ : objectifs, santé, disponibilités, photos.")}
        </div>
      );
    } else {
      const [thisWeekCheckin, latestNote, victoryRes, activityStreak, periodLogs, trialDaysLeft] = await Promise.all([
        getThisWeekCheckin(id, db),
        getLatestCoachNote(id, db),
        db
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", id)
          .eq("type", "victory")
          .gte("created_at", `${getWeekStart()}T00:00:00`),
        getClientActivityStreak(id, db),
        getPeriodLogs(id, db),
        getTrialDaysLeft(id),
      ]);
      const weeks = weeksSince(client.start_date, today);
      const [day, checklist] = await Promise.all([
        getClientHomeDay(
          id,
          {
            coached: true,
            checkinDone: !!thisWeekCheckin,
            checkinDay: (client as { checkin_day?: number | null }).checkin_day ?? null,
            showVictory: !!thisWeekCheckin && (victoryRes.count ?? 0) === 0,
            showCycle: intake.gender === "Femme" && periodLogs.length === 0 && isOn(appSetup, "cycle"),
          },
          db
        ),
        weeks < 4 ? getOnboardingChecklist(id, db) : Promise.resolve([]),
      ]);
      content = (
        <CoachedHome
          profile={client}
          thisWeekCheckin={thisWeekCheckin}
          latestNote={latestNote}
          activityStreak={activityStreak}
          trialDaysLeft={trialDaysLeft}
          appSetup={appSetup}
          locale={locale}
          day={day}
          checklist={checklist}
          preview
        />
      );
    }
  }

  if (vue === "programme") {
    const [program, corrections, preferences] = await Promise.all([
      getActiveProgram(id, undefined, db),
      getClientCorrections(id, db),
      isFree ? getMemberPreferences(id) : Promise.resolve(null),
    ]);
    const hasDays = !!program && program.days.length > 0;
    // Même vue que la page Mon programme du client (ProgramWeekView).
    const weekCtx = hasDays ? await getProgramWeekContext(id, program, db) : null;
    content = (
      <div style={{ padding: "28px 16px 40px" }}>
        {!hasDays && <div style={{ marginBottom: 22 }}>
          <p className="ep-section-title" style={{ marginBottom: 4 }}>{isFree ? t("Training") : t("Entraînement")}</p>
          <h1 className="ep-h1">{t("Mon programme")}</h1>
          {program && (
            <p style={{ marginTop: 6, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.35)", fontWeight: 500 }}>
              {program.name}
              {program.frequency ? ` · ${program.frequency}×/semaine` : ""}
              {program.type ? ` · ${program.type}` : ""}
            </p>
          )}
        </div>}
        {hasDays && weekCtx ? (
          <ProgramWeekView
            program={program}
            ctx={weekCtx}
            sessionBasePath={SESSION_BASE_PATH}
            gymsHref="/dashboard/client/gyms"
            agendaHref="/dashboard/client/agenda"
            eyebrow={isFree ? t("Training") : t("Entraînement")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "48px 16px" }}>
            <Dumbbell size={22} style={{ color: "rgba(var(--ep-ink-rgb),0.25)" }} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("Aucun programme disponible")}</p>
            <p style={{ margin: 0, fontSize: 11.5, maxWidth: 320, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.4)" }}>
              {isFree
                ? t("Il voit la liste des programmes prêts à l'emploi et peut en créer un lui-même.")
                : t("Ton coach prépare ton programme. En attendant, tu peux déjà loguer une séance libre : tes charges seront gardées pour la suite.")}
            </p>
          </div>
        )}
        {isFree ? (
          <div className="border-t border-(--ep-line)/15 pt-6">
            <CollapsibleSection title={hasDays ? t("Changer de programme") : t("Créer mon programme")} defaultOpen={!hasDays}>
              <ProgramPresetSelector
                clientId={id}
                currentProgramName={program?.name ?? null}
                saveProgram={previewReadOnlyAction}
                recommendation={recommendPreset(preferences, trainingStyleFromPractices(Array.isArray(appSetup.answers?.pratique) ? (appSetup.answers.pratique as string[]) : []))}
              />
            </CollapsibleSection>
          </div>
        ) : (
          <ClientCorrectionsSection corrections={corrections} />
        )}
      </div>
    );
  }

  if (vue === "nutrition") {
    const weekStart = (() => {
      const d = new Date(`${today}T12:00:00`);
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      return shiftDate(today, 1 - dow);
    })();
    const from = [weekStart, shiftDate(today, -13)].sort()[0];
    const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, recipes, savedMeals, mostUsedGlobal, supplements, mealChecks, agendaMealTimes, trainingDays] = await Promise.all([
      getNutritionProfile(id, db),
      getTodayLogs(id, today, db),
      getLast30DaysLogs(id, db),
      getAllFoods(),
      getActiveDietPlan(id, db),
      getCommunityRecipes(),
      getSavedMeals(id, db),
      getMostLoggedFoodsGlobal(),
      getClientSupplements(id, db),
      readMealChecks(id, from, today),
      // Agenda du client (jamais celui du coach connecté) pour l'heure des repas.
      getScheduleBlocks(id).then((blocks) => mealTimesForDate(blocks, today)),
      getTrainingDays(id, db),
    ]);
    content = (
      <div style={{ paddingBottom: 32 }}>
        {isFree && (
          <div className="px-6 pt-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">{t("Nutrition")}</p>
            <h1 className="text-3xl font-black uppercase tracking-tight">{t("Calculateur calorique")}</h1>
            <p className="text-sm text-(--ep-ink)/45 mt-2 mb-4 leading-relaxed">
              {t("En accès gratuit, il calcule lui-même ses besoins et gère ses propres plans. Ci-dessous, sa journée telle qu'il la voit.")}
            </p>
          </div>
        )}
        <ClientNutritionView
          today={today}
          nutritionProfile={nutritionProfile}
          initialTodayLogs={todayLogs}
          historyLogs={historyLogs}
          initialFoods={foods}
          recipes={recipes}
          dietMode={activePlan?.mode ?? "flexible"}
          activePlan={activePlan}
          seasonMode={client.season_mode}
          isOwnPlan={isFree}
          intake={intake}
          savedMeals={savedMeals}
          mostUsedGlobal={mostUsedGlobal}
          addFoodLog={previewReadOnlyAction}
          removeFoodLog={previewReadOnlyAction}
          createCustomFood={previewReadOnlyAction}
          createSavedMeal={previewReadOnlyAction}
          deleteSavedMeal={previewReadOnlyAction}
          importPlanMealsAsSavedMeals={previewReadOnlyAction}
          logMealItems={previewReadOnlyAction}
          readOnly={{ checks: mealChecks.checks }}
          agendaMealTimes={agendaMealTimes}
          trainingDays={trainingDays}
        />
        <div className="px-6 mt-6">
          <SupplementsSection
            supplements={supplements}
            onAdd={previewReadOnlyAction}
            onSetStatus={previewReadOnlyAction}
            onDelete={previewReadOnlyAction}
          />
        </div>
      </div>
    );
  }

  if (vue === "agenda") {
    const [blocks, completedTaskKeys, habitScore, weeklyScores] = await Promise.all([
      getScheduleBlocks(id),
      getScheduleBlockTaskLog(id, today),
      getDailyHabitScore(id, today),
      getWeeklyHabitScores(id, today),
    ]);
    content = (
      <div style={{ padding: "28px 16px 40px" }}>
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1 flex items-center gap-1.5">
            <CalendarDays size={11} />{" "}{t("Organisation")}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t("Mon agenda")}</h1>
        </div>
        <div className="mb-5 grid sm:grid-cols-2 gap-3">
          <HabitScoreCard habitScore={habitScore} />
          <HabitScoreTrend points={weeklyScores} streak={currentStreak(weeklyScores)} />
        </div>
        <WeeklyAgenda blocks={blocks} editable={false} today={today} initialCompletedTaskKeys={completedTaskKeys} />
      </div>
    );
  }

  if (vue === "plus") {
    content = <PlusMenu space="client" hidden={hidden} isFounder={false} isFreeTier={!isSubscribed(client)} />;
  }

  return (
    <ClientPreviewFrame
      clientId={id}
      firstName={firstName}
      vue={vue}
      isFreeTier={isFree}
      showCycle={showCycle}
      hidden={hidden}
      statusLabel={statusLabel}
      notice={notice}
    >
      {content}
    </ClientPreviewFrame>
  );
}
