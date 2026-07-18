"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "./Card";
import type { Profile } from "@/utils/auth";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import { getRankForPoints } from "@/lib/gamification-types";
import type { ProgramWithDays } from "@/utils/programs";
import type { WorkoutLog } from "@/utils/workout-logs";
import type { SessionWithSets, PersonalRecord } from "@/utils/sessions";
import type { ClientTask } from "@/utils/tasks";
import type { CheckIn } from "@/utils/checkins";
import type { WeeklyAverages, DailyLog } from "@/utils/daily-logs";
import { groupLogsByWeek } from "@/utils/daily-logs";
import type { PhotoUpdate } from "@/utils/photos";
import type {
  NutritionProfile,
  NutritionProfileInput,
  Food,
  FoodLogWithFood,
  DietPlanWithMeals,
  DietMode,
  DietStructure,
} from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import type { ClientIntake, ClientIntakeInput } from "@/utils/client-intake";
import type { PeriodLog, CycleStats } from "@/utils/period-tracking";
import type { ScheduleBlock } from "@/utils/agenda";
import WeeklyAgenda from "./WeeklyAgenda";
import ClientProgramView from "./ClientProgramView";
import ClientBilanView from "./ClientBilanView";
import CoachLogbookClient from "@/components/coach/CoachLogbookClient";
import CoachClientPhotosView from "./CoachClientPhotosView";
import CheckinDaySettings from "./CheckinDaySettings";
import CheckinCard from "./CheckinCard";
import CoachClientTasksView from "./CoachClientTasksView";
import CoachClientNutritionTabs from "./CoachClientNutritionTabs";
import ClientIntakeForm from "./ClientIntakeForm";
import ClientPeriodTracking from "./ClientPeriodTracking";
import ClientSuggestionsPanel from "./ClientSuggestionsPanel";
import AutoGeneratePlanButton from "./AutoGeneratePlanButton";
import { generateClientSuggestions } from "@/lib/client-suggestions";
import type { AutoGenerateResult } from "@/app/dashboard/coach/clients/[id]/autogenerate/actions";
import {
  ExternalLink, User, Map, BookOpen, Dumbbell, Apple,
  ClipboardCheck, Image as ImageIcon, ClipboardList, ListChecks,
  FileText, Droplet, CalendarDays,
} from "lucide-react";
import SubscriptionToggle from "./SubscriptionToggle";

type ActionState = { error?: string; success?: boolean } | null;

const TABS = [
  { key: "profil",    label: "Profil",    icon: User },
  { key: "intake",    label: "Fiche client", icon: FileText },
  { key: "roadmap",   label: "Road Map",  icon: Map },
  { key: "logbook",   label: "Logbook",   icon: BookOpen },
  { key: "programme", label: "Programme", icon: Dumbbell },
  { key: "nutrition", label: "Nutrition", icon: Apple },
  { key: "bilans",    label: "Bilans",    icon: ClipboardCheck },
  { key: "photos",    label: "Photos",    icon: ImageIcon },
  { key: "checkins",  label: "Check-ins", icon: ClipboardList },
  { key: "rappels",   label: "Rappels",   icon: ListChecks },
  { key: "cycle",     label: "Cycle",     icon: Droplet },
  { key: "agenda",    label: "Agenda",    icon: CalendarDays },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        {label}
      </span>
      <span className="text-sm text-white font-medium">{value || "N/A"}</span>
    </div>
  );
}

interface RoadmapData {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
}

export default function ClientProfileTabs({
  client,
  latestWeight,
  recentDailyLogs,
  points,
  program,
  workoutLogs,
  sessionsThisWeek,
  logbookSessions,
  personalRecords,
  tasks,
  createClientTask,
  deleteClientTask,
  sendMotivationMessage,
  checkinsWithAverages,
  bilanWeeks,
  photos,
  saveCompetitionSettings,
  sendPhotoFeedback,
  nutritionProfile,
  todayLogs,
  historyLogs,
  foods,
  activePlan,
  allPlans,
  today,
  saveNutritionProfile,
  createDietPlan,
  deactivateDietPlan,
  activateDietPlan,
  deleteDietPlan,
  intake,
  saveClientIntake,
  periodLogs,
  cycleStats,
  addPeriodLog,
  deletePeriodLog,
  scheduleBlocks,
  autoGenerateClientPlan,
}: {
  client: Profile;
  latestWeight: number | null;
  recentDailyLogs: DailyLog[];
  points: number;
  program: ProgramWithDays | null;
  workoutLogs: WorkoutLog[];
  sessionsThisWeek: number;
  logbookSessions: SessionWithSets[];
  personalRecords: PersonalRecord[];
  tasks: ClientTask[];
  createClientTask: (clientId: string, label: string, icon: string, nagMinutes: number) => Promise<{ error?: string }>;
  deleteClientTask: (clientId: string, taskId: string) => Promise<{ error?: string }>;
  sendMotivationMessage: (clientId: string, message: string) => Promise<{ error?: string }>;
  checkinsWithAverages: { checkin: CheckIn; averages: WeeklyAverages }[];
  bilanWeeks: ReturnType<typeof groupLogsByWeek>;
  photos: PhotoUpdate[];
  saveCompetitionSettings: (clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
  sendPhotoFeedback: (photoId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
  nutritionProfile: NutritionProfile | null;
  todayLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  foods: Food[];
  activePlan: DietPlanWithMeals | null;
  allPlans: DietPlanWithMeals[];
  today: string;
  saveNutritionProfile: (clientId: string, data: NutritionProfileInput) => Promise<{ error?: string }>;
  createDietPlan: (clientId: string, name: string, mode: DietMode, meals: DietPlanMealInput[], structure?: DietStructure) => Promise<{ error?: string; id?: string }>;
  deactivateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  activateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  deleteDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  intake: ClientIntake | null;
  saveClientIntake: (clientId: string, data: ClientIntakeInput) => Promise<{ error?: string }>;
  periodLogs: PeriodLog[];
  cycleStats: CycleStats;
  addPeriodLog: (
    clientId: string,
    data: { start_date: string; end_date: string | null; flow: string | null; symptoms: string[]; notes: string | null }
  ) => Promise<{ error?: string; id?: string }>;
  deletePeriodLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
  scheduleBlocks: ScheduleBlock[];
  autoGenerateClientPlan: (clientId: string) => Promise<AutoGenerateResult>;
}) {
  const { rank, next, progressPct } = getRankForPoints(points);
  const [activeTab, setActiveTab] = useState<TabKey>("profil");
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/roadmap/${client.id}`)
      .then((r) => r.json())
      .then((data) => setRoadmapData(data.roadmap ? data : null))
      .catch(() => setRoadmapData(null))
      .finally(() => setRoadmapLoading(false));
  }, [client.id]);

  const pendingCheckins = checkinsWithAverages.filter(({ checkin }) => !checkin.coach_replied_at).length;

  const suggestions = useMemo(
    () => generateClientSuggestions(intake, nutritionProfile, recentDailyLogs, periodLogs.length),
    [intake, nutritionProfile, recentDailyLogs, periodLogs.length]
  );

  return (
    <div>
      {/* Grille de boutons icône + texte plutôt qu'une rangée d'onglets sur
          une seule ligne — avec 9 sections, la rangée dépassait largement la
          largeur de l'écran sur mobile, forçant à zoomer/dézoomer et
          défiler sur le côté pour juste choisir un onglet. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
        {TABS.filter(({ key }) => key !== "cycle" || intake?.gender === "Femme").map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-center transition-colors ${
              activeTab === key
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/45 hover:border-[#890404]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={17} strokeWidth={activeTab === key ? 2.2 : 1.7} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "profil" && (
        <div className="space-y-4">
          <ClientSuggestionsPanel suggestions={suggestions} />

          <SubscriptionToggle
            clientId={client.id}
            currentStatus={client.subscription_status}
          />

          <Card title="Informations personnelles">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Nom complet" value={client.full_name} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Téléphone" value={client.phone} />
              <InfoRow
                label="Statut"
                value={
                  client.status === "active"
                    ? "Actif"
                    : client.status === "paused"
                    ? "En pause"
                    : "Terminé"
                }
              />
            </div>
          </Card>

          <Card title="Suivi">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoRow
                label="Date de début"
                value={formatDate(client.start_date)}
              />
              <InfoRow
                label="Poids de départ"
                value={
                  client.weight_start ? `${client.weight_start} kg` : null
                }
              />
            </div>
          </Card>

          {client.goal && (
            <Card title="Objectif">
              <p className="text-sm text-[#F5EDED]/80 leading-relaxed">
                {client.goal}
              </p>
            </Card>
          )}

          <Card title="Points & rang">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">
                {rank.emoji} {rank.label}
              </span>
              <span className="text-xs text-[#F5EDED]/40">{points} pts</span>
            </div>
            {next && (
              <>
                <div className="h-1.5 bg-[#890404]/15 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-[#E01E1E] transition-all"
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#F5EDED]/35">
                  Encore {next.minPoints - points} pts avant {next.emoji} {next.label}
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      {activeTab === "intake" && (
        <div>
          <AutoGeneratePlanButton clientId={client.id} hasIntake={!!intake} autoGenerateClientPlan={autoGenerateClientPlan} />
          <ClientIntakeForm clientId={client.id} existingIntake={intake} saveClientIntake={saveClientIntake} />
        </div>
      )}

      {activeTab === "cycle" && intake?.gender === "Femme" && (
        <ClientPeriodTracking
          clientId={client.id}
          logs={periodLogs}
          stats={cycleStats}
          addPeriodLog={addPeriodLog}
          deletePeriodLog={deletePeriodLog}
        />
      )}

      {activeTab === "agenda" && (
        <div>
          <p className="text-xs text-[#F5EDED]/40 leading-relaxed mb-4">
            Emploi du temps du client — lecture seule, c&apos;est lui qui le gère depuis son espace.
          </p>
          <WeeklyAgenda blocks={scheduleBlocks} editable={false} />
        </div>
      )}

      {activeTab === "roadmap" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">Road Map client</p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/roadmap`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              {roadmapData ? "Modifier" : "Configurer"}
            </Link>
          </div>

          {roadmapLoading ? (
            <Card>
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-[#F5EDED]/40">Chargement…</p>
              </div>
            </Card>
          ) : !roadmapData ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <p className="text-xs text-[#F5EDED]/40">
                  Clique sur &laquo; Configurer &raquo; pour créer la road map de ce client.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card title="Période">
                <p className="text-sm text-white font-medium">
                  {formatDate(roadmapData.roadmap.start_date)} → {formatDate(roadmapData.roadmap.end_date)}
                </p>
              </Card>

              {roadmapData.phases.length > 0 && (
                <Card title="Phases">
                  <div className="flex flex-col gap-2">
                    {roadmapData.phases.map((phase) => {
                      const colors = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
                      return (
                        <div
                          key={phase.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                        >
                          <span className="text-sm font-semibold" style={{ color: colors.solid }}>
                            {colors.icon} {phase.label}
                          </span>
                          <span className="text-xs text-[#F5EDED]/40">
                            {formatDate(phase.start_date)} → {formatDate(phase.end_date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {roadmapData.objectives.length > 0 && (
                <Card title="Objectifs">
                  <div className="flex flex-col gap-2">
                    {roadmapData.objectives.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          border: `1px solid ${obj.is_achieved ? "rgba(74,222,128,0.3)" : "rgba(224,30,30,0.15)"}`,
                        }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{ color: obj.is_achieved ? "#4ade80" : OBJECTIVE_TERM_COLORS[obj.term] }}
                        >
                          {obj.is_achieved ? "✓ " : ""}{obj.label}
                          {obj.target_value ? ` : ${obj.target_value}${obj.target_unit ?? ""}` : ""}
                        </span>
                        <span className="text-xs text-[#F5EDED]/40">{formatDate(obj.target_date)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "logbook" && (
        <CoachLogbookClient clientId={client.id} sessions={logbookSessions} records={personalRecords} />
      )}

      {activeTab === "programme" && (
        <ClientProgramView
          clientId={client.id}
          program={program}
          workoutLogs={workoutLogs}
          sessionsThisWeek={sessionsThisWeek}
        />
      )}

      {activeTab === "nutrition" && (
        <CoachClientNutritionTabs
          clientId={client.id}
          clientWeight={latestWeight ?? client.weight_start}
          recentDailyLogs={recentDailyLogs}
          nutritionProfile={nutritionProfile}
          todayLogs={todayLogs}
          historyLogs={historyLogs}
          foods={foods}
          activePlan={activePlan}
          allPlans={allPlans}
          today={today}
          intake={intake}
          saveNutritionProfile={saveNutritionProfile}
          createDietPlan={createDietPlan}
          deactivateDietPlan={deactivateDietPlan}
          activateDietPlan={activateDietPlan}
          deleteDietPlan={deleteDietPlan}
        />
      )}

      {activeTab === "bilans" && (
        <ClientBilanView weeks={bilanWeeks} clientId={client.id} />
      )}

      {activeTab === "photos" && (
        <CoachClientPhotosView
          client={client}
          photos={photos}
          saveCompetitionSettings={saveCompetitionSettings}
          sendPhotoFeedback={sendPhotoFeedback}
        />
      )}

      {activeTab === "checkins" && (
        <div>
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              {checkinsWithAverages.length} check-in{checkinsWithAverages.length !== 1 ? "s" : ""}
              {pendingCheckins > 0 && (
                <span className="ml-2 text-amber-400 font-semibold normal-case tracking-normal">
                  · {pendingCheckins} sans réponse
                </span>
              )}
            </p>
          </div>

          <CheckinDaySettings clientId={client.id} currentDay={client.checkin_day} />

          {checkinsWithAverages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-semibold text-[#F5EDED]/40 uppercase tracking-widest">
                Aucun check-in pour l&apos;instant
              </p>
              <p className="text-xs text-[#F5EDED]/25 mt-1">
                Le client n&apos;a pas encore soumis de bilan hebdomadaire.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkinsWithAverages.map(({ checkin, averages }) => (
                <CheckinCard key={checkin.id} checkin={checkin} dailyAverages={averages} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "rappels" && (
        <CoachClientTasksView
          clientId={client.id}
          initialTasks={tasks}
          createClientTask={createClientTask}
          deleteClientTask={deleteClientTask}
          sendMotivationMessage={sendMotivationMessage}
        />
      )}
    </div>
  );
}
