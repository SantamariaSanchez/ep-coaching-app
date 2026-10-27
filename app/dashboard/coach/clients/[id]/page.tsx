import { getT } from "@/lib/i18n-server";
import { todayInParis } from "@/lib/dates";
import { getAccessoriesByExerciseName } from "@/utils/exercise-library";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getTotalPoints } from "@/lib/gamification";
import { getActiveProgram } from "@/utils/programs";
import { getClientCorrections } from "@/utils/corrections";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";
import { getAllClientSessions, getClientPersonalRecords, getSessionsThisWeekCount } from "@/utils/sessions";
import { getClientTasks } from "@/utils/tasks";
import { getClientCheckins } from "@/utils/checkins";
import { getClientDailyLogs, groupLogsByWeek, getWeekDailyLogs, computeWeeklyAverages, getLatestWeight } from "@/utils/daily-logs";
import { getAllClientPhotoUpdates } from "@/utils/photos";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
} from "@/utils/nutrition";
import { getClientSupplements } from "@/utils/supplements";
import { getCoachDietTemplates } from "@/utils/diet-templates";
import { createDietTemplateAction } from "@/app/dashboard/coach/programmation/diet/actions";
import { createClientTask, deleteClientTask, sendMotivationMessage } from "./tasks/actions";
import { saveCompetitionSettings, sendPhotoFeedback } from "./photos/actions";
import {
  saveNutritionProfile,
  suggestSupplement,
  setSupplementStatus,
  deleteSupplement,
} from "./nutrition/actions";
import {
  createDietPlan,
  deactivateDietPlan,
  activateDietPlan,
  deleteDietPlan,
} from "./nutrition/diet-plan-actions";
import { getClientIntake } from "@/utils/client-intake";
import { getEatingRelation } from "@/lib/eating-safety-server";
import { getClientConstraints, getRecoveryLogs } from "@/lib/client-medical-constraints";
import { toggleClientConstraint, addRecoveryLog, deleteRecoveryLog } from "./medical/actions";
import { getClientMeasurementsAsCoach } from "@/utils/measurements";
import { getPeriodLogs, computeCycleStats } from "@/utils/period-tracking";
import { getScheduleBlocks } from "@/utils/agenda";
import { getStepSettings, getStepRoutineItems, getStepLogs } from "@/utils/steps";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import { getMindsetProfile, getHabitLogs } from "@/utils/mindset";
import { createAdminClient } from "@/lib/supabase-admin";
import { saveClientIntake, addPeriodLog, deletePeriodLog, updateClientStepGoal, sendIntakeReminder } from "./intake/actions";
import { generatePlanSuggestions } from "./autogenerate/actions";
import { sendCorrectionFeedback } from "./checkins/actions";
import { getClientCoachingPhase, computeCalibrationSignals, generateCoachingPhaseSuggestions } from "@/lib/coaching-phase";
import ClientProfileTabs from "@/components/ui/ClientProfileTabs";
import ClientSetupCard from "@/components/coach/ClientSetupCard";
import { loadPerformance } from "@/lib/performance-server";
import { Eye, FileText, LayoutTemplate } from "lucide-react";
import BackButton from "@/components/ui/BackButton";

const STATUS_BADGE = {
  active: {
    label: "Actif",
    className: "bg-green-500/15 text-green-400 border border-green-500/25",
  },
  paused: {
    label: "Pause",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
  ended: {
    label: "Terminé",
    className: "bg-(--ep-ink)/10 text-(--ep-ink)/40 border border-(--ep-ink)/10",
  },
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [t, { id }, { tab: initialTab }, user] = await Promise.all([getT(), params, searchParams, getUser()]);
  if (!user) redirect("/");

  // Profil du coach et fiche du client en même temps (avant : l'un après
  // l'autre, un aller-retour base de données de plus à chaque ouverture).
  const [profile, client] = await Promise.all([getProfile(user.id), getClientById(id, user.id)]);
  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const today = todayInParis();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [
    points,
    program,
    workoutLogs,
    sessionsThisWeek,
    logbookSessions,
    personalRecords,
    tasks,
    checkins,
    dailyLogs,
    photos,
    nutritionProfile,
    todayLogs,
    historyLogs,
    foods,
    activePlan,
    allPlans,
    latestWeight,
    intake,
    periodLogs,
    scheduleBlocks,
    corrections,
    stepSettings,
    stepRoutineItems,
    stepLogs,
    ouraConnection,
    biometricLogs,
    biometricInsights,
    coachingPhase,
    supplements,
    dietTemplates,
    mindsetProfile,
    mindsetHabitLogs,
    measurements,
    medicalConstraints,
    recoveryLogs,
    accessoriesByName,
    performance,
    roadmapRow,
    eatingRelation,
  ] = await Promise.all([
    getTotalPoints(id),
    getActiveProgram(id),
    getRecentWorkoutLogs(id),
    getSessionsThisWeekCount(id),
    getAllClientSessions(id, 10),
    getClientPersonalRecords(id),
    getClientTasks(id),
    getClientCheckins(id),
    getClientDailyLogs(id, 56),
    getAllClientPhotoUpdates(id),
    getNutritionProfile(id),
    getTodayLogs(id, today),
    getLast30DaysLogs(id),
    getAllFoods(),
    getActiveDietPlan(id),
    getAllDietPlansWithMeals(id),
    getLatestWeight(id),
    getClientIntake(id),
    getPeriodLogs(id),
    getScheduleBlocks(id),
    getClientCorrections(id),
    getStepSettings(id),
    getStepRoutineItems(id),
    getStepLogs(id, 35),
    createAdminClient().from("oura_connections").select("client_id").eq("client_id", id).maybeSingle(),
    getBiometricLogs(id),
    getBiometricInsights(id),
    // Jamais calculée pour un membre gratuit — voir le rendu conditionnel
    // dans ClientProfileTabs (client.subscription_status === "active").
    client.subscription_status === "active" ? getClientCoachingPhase(id) : Promise.resolve(null),
    getClientSupplements(id),
    getCoachDietTemplates(user.id),
    getMindsetProfile(id),
    getHabitLogs(id, thirtyDaysAgoStr),
    // Item 13 : comparateur avant/après (mensurations + photos de check-in).
    getClientMeasurementsAsCoach(id),
    getClientConstraints(id),
    getRecoveryLogs(id),
    getAccessoriesByExerciseName(),
    // Chargé avec tout le reste (avant : attendu seul, après tout le reste).
    loadPerformance(id),
    createAdminClient().from("roadmaps").select("id").eq("client_id", id).maybeSingle(),
    getEatingRelation(id),
  ]);

  const cycleStats = computeCycleStats(periodLogs);

  // Signaux d'adhérence : uniquement en phase de calibrage, et jamais pour
  // un membre gratuit (déjà garanti par coachingPhase === null ci-dessus).
  const calibrationSignals =
    coachingPhase?.phase === "calibrage"
      ? await computeCalibrationSignals(id, coachingPhase.since, program)
      : [];
  const phaseSuggestions = coachingPhase
    ? generateCoachingPhaseSuggestions(coachingPhase, calibrationSignals)
    : [];

  const checkinsWithAverages = await Promise.all(
    checkins.map(async (checkin) => ({
      checkin,
      averages: computeWeeklyAverages(await getWeekDailyLogs(id, checkin.week_start)),
    }))
  );

  const bilanWeeks = groupLogsByWeek(dailyLogs);

  const badge = STATUS_BADGE[client.status ?? "active"];

  return (
    <div className="px-6 py-8 ep-page-wide page-transition">
      {/* Venant de la liste : vrai retour (filtre, tri, recherche et position
          gardés). Sinon (accueil, notification...) : la liste complète. */}
      <BackButton
        fallbackHref="/dashboard/coach/clients"
        expect="/dashboard/coach/clients"
        label={t("Tous les clients")}
      />

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name ?? t("Client")}
          </h1>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
        {/* La bibliothèque de modèles reste à un clic pendant qu'on travaille
            sur un client : les modèles sont aussi proposés en point de départ
            directement dans l'éditeur de programme et de diète de sa fiche. */}
        {/* « Voir comme mon client » (demande d'une coach, 2026-10-20) : aperçu
            en lecture seule de l'appli telle que le client la voit (ses
            onglets, son accueil, son programme, sa diète, son agenda). */}
        <Link
          href={`/dashboard/coach/clients/${id}/apercu`}
          className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) hover:bg-(--ep-accent)/10 transition-colors border border-(--ep-accent)/40 rounded-lg px-3 py-2"
        >
          <Eye size={12} />
          {t("Voir comme mon client")}
        </Link>
        <Link
          href="/dashboard/coach/programmation"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-accent) transition-colors border border-(--ep-line)/25 rounded-lg px-3 py-2"
        >
          <LayoutTemplate size={12} />
          {t("Modèles")}
        </Link>
        <Link
          href={`/dashboard/coach/clients/${id}/notes`}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-accent) transition-colors border border-(--ep-line)/25 rounded-lg px-3 py-2"
        >
          <FileText size={12} />
          {t("Mes notes")}
        </Link>
      </div>

      {(client.subscription_status === "active" || !profile?.is_platform_owner) && (
        <ClientSetupCard
          clientId={id}
          firstName={(client.full_name ?? t("Client")).split(" ")[0]}
          hasIntake={!!intake}
          hasProgram={!!program}
          hasDiet={!!activePlan}
          hasRoadmap={!!roadmapRow.data}
          checkinDay={(client.checkin_day as number | null) ?? null}
        />
      )}

      <ClientProfileTabs
        performance={performance}
        initialTab={initialTab}
        client={client}
        latestWeight={latestWeight}
        measurements={measurements}
        recentDailyLogs={dailyLogs}
        points={points}
        program={program}
        workoutLogs={workoutLogs}
        sessionsThisWeek={sessionsThisWeek}
        accessoriesByName={accessoriesByName}
        logbookSessions={logbookSessions}
        personalRecords={personalRecords}
        tasks={tasks}
        createClientTask={createClientTask}
        deleteClientTask={deleteClientTask}
        sendMotivationMessage={sendMotivationMessage}
        checkinsWithAverages={checkinsWithAverages}
        bilanWeeks={bilanWeeks}
        photos={photos}
        saveCompetitionSettings={saveCompetitionSettings}
        sendPhotoFeedback={sendPhotoFeedback}
        nutritionProfile={nutritionProfile}
        todayLogs={todayLogs}
        historyLogs={historyLogs}
        foods={foods}
        activePlan={activePlan}
        allPlans={allPlans}
        today={today}
        saveNutritionProfile={saveNutritionProfile}
        createDietPlan={createDietPlan}
        deactivateDietPlan={deactivateDietPlan}
        activateDietPlan={activateDietPlan}
        deleteDietPlan={deleteDietPlan}
        intake={intake}
        eatingRelation={eatingRelation}
        saveClientIntake={saveClientIntake}
        sendIntakeReminder={sendIntakeReminder}
        stepGoal={stepSettings.daily_goal}
        updateClientStepGoal={updateClientStepGoal}
        periodLogs={periodLogs}
        cycleStats={cycleStats}
        addPeriodLog={addPeriodLog}
        deletePeriodLog={deletePeriodLog}
        scheduleBlocks={scheduleBlocks}
        stepRoutineItems={stepRoutineItems}
        stepLogs={stepLogs}
        clientHasOura={!!ouraConnection.data}
        biometricLogs={biometricLogs}
        biometricInsights={biometricInsights}
        generatePlanSuggestions={generatePlanSuggestions}
        corrections={corrections}
        sendCorrectionFeedback={sendCorrectionFeedback}
        coachingPhase={coachingPhase}
        calibrationSignals={calibrationSignals}
        phaseSuggestions={phaseSuggestions}
        supplements={supplements}
        suggestSupplement={suggestSupplement}
        setSupplementStatus={setSupplementStatus}
        deleteSupplement={deleteSupplement}
        dietTemplates={dietTemplates}
        saveDietAsTemplate={createDietTemplateAction}
        mindsetProfile={mindsetProfile}
        mindsetHabitLogs={mindsetHabitLogs}
        medicalConstraints={medicalConstraints}
        recoveryLogs={recoveryLogs}
        toggleClientConstraint={toggleClientConstraint}
        addRecoveryLog={addRecoveryLog}
        deleteRecoveryLog={deleteRecoveryLog}
      />
    </div>
  );
}
