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
import { ChevronLeft, FileText, LayoutTemplate } from "lucide-react";

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
    className: "bg-[#F5EDED]/10 text-[#F5EDED]/40 border border-[#F5EDED]/10",
  },
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const client = await getClientById(id, user.id);
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
      <Link
        href="/dashboard/coach/clients"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Tous les clients
      </Link>

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name ?? "Client"}
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
        <Link
          href="/dashboard/coach/programmation"
          className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
        >
          <LayoutTemplate size={12} />
          Modèles
        </Link>
        <Link
          href={`/dashboard/coach/clients/${id}/notes`}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
        >
          <FileText size={12} />
          Mes notes
        </Link>
      </div>

      <ClientProfileTabs
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
