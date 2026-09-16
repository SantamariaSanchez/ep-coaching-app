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
import { groupLogsByWeek } from "@/lib/daily-logs-helpers";
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
import type { DietPlanTemplateWithMeals } from "@/utils/diet-templates";
import type { ClientSupplement } from "@/utils/supplements";
import type { ClientIntake, ClientIntakeInput } from "@/utils/client-intake";
import { ALLERGEN_LABELS, DIET_LABELS } from "@/lib/recipes-data";
import type { PeriodLog, CycleStats } from "@/utils/period-tracking";
import type { ScheduleBlock } from "@/utils/agenda";
import type { StepRoutineItem, StepLog } from "@/utils/steps";
import type { BiometricLog, BiometricInsight } from "@/utils/biometrics";
import type { MindsetProfile, MindsetHabitLog } from "@/utils/mindset";
import type { Measurement } from "@/utils/measurements";
import type { ClientMedicalConstraint, RecoveryLog } from "@/lib/client-medical-constraints";
import ClientMedicalConstraintsPanel from "./ClientMedicalConstraintsPanel";
import WeeklyAgenda from "./WeeklyAgenda";
import BeforeAfterComparator from "./BeforeAfterComparator";
import StepsClient from "@/components/steps/StepsClient";
import TrackingClient from "@/components/tracking/TrackingClient";
import ClientProgramView from "./ClientProgramView";
import ClientBilanView from "./ClientBilanView";
import CoachLogbookClient from "@/components/coach/CoachLogbookClient";
import CoachClientMindsetView from "@/components/coach/CoachClientMindsetView";
import CoachClientPhotosView from "./CoachClientPhotosView";
import CheckinDaySettings from "./CheckinDaySettings";
import CheckinCard from "./CheckinCard";
import CoachClientTasksView from "./CoachClientTasksView";
import CoachClientNutritionTabs from "./CoachClientNutritionTabs";
import ClientIntakeForm from "./ClientIntakeForm";
import ClientPeriodTracking from "./ClientPeriodTracking";
import ClientSuggestionsPanel from "./ClientSuggestionsPanel";
import CoachingPhasePanel from "./CoachingPhasePanel";
import type { CoachingPhaseState, AdherenceSignal, PhaseSuggestion } from "@/lib/coaching-phase-helpers";
import AutoGeneratePlanButton from "./AutoGeneratePlanButton";
import ClientCorrectionsReplySection from "./ClientCorrectionsReplySection";
import type { ExerciseCorrectionResolved } from "@/utils/corrections";
import { generateClientSuggestions, generateFatigueTrendSuggestion } from "@/lib/client-suggestions";
import type { PlanSuggestions } from "@/app/dashboard/coach/clients/[id]/autogenerate/actions";
import {
  ExternalLink, User, Map, BookOpen, Dumbbell, Apple,
  ClipboardCheck, Image as ImageIcon, ClipboardList, ListChecks,
  FileText, Droplet, CalendarDays, Footprints, Bell, Hourglass, Moon, Brain,
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
  { key: "pas",       label: "Pas",       icon: Footprints },
  { key: "sommeil",   label: "Sommeil",   icon: Moon },
  { key: "mindset",   label: "Mindset",   icon: Brain },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Non renseigné";
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
      <span className="text-sm text-white font-medium">{value || "Non renseigné"}</span>
    </div>
  );
}

// Remplace l'ancien formulaire vide que le coach devait remplir lui-même :
// la fiche est désormais du ressort du client, via son propre questionnaire
// d'onboarding (/onboarding/intake), déclenché automatiquement à
// l'activation du coaching payant. Le coach ne voit/modifie la fiche
// qu'une fois qu'elle existe réellement — voir sendIntakeReminder plus haut.
function IntakeWaitingState({
  clientId,
  clientFirstName,
  isClientSubscribed,
  sendIntakeReminder,
}: {
  clientId: string;
  clientFirstName: string;
  isClientSubscribed: boolean;
  sendIntakeReminder: (clientId: string) => Promise<{ error?: string }>;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleRemind() {
    setStatus("sending");
    const res = await sendIntakeReminder(clientId);
    setStatus(res.error ? "error" : "sent");
    if (!res.error) setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center py-6 px-2">
        <div
          className="flex items-center justify-center rounded-2xl mb-4"
          style={{ width: 48, height: 48, background: "rgba(224,30,30,0.1)" }}
        >
          <Hourglass size={20} className="text-[#E01E1E]" strokeWidth={1.8} />
        </div>
        {!isClientSubscribed ? (
          <>
            <p className="text-sm font-black text-white mb-1.5">Coaching pas encore activé</p>
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed max-w-xs">
              Active le coaching payant de {clientFirstName} depuis l&apos;onglet Profil pour débloquer
              son questionnaire d&apos;onboarding. Il remplira alors sa fiche lui-même, en autonomie.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-black text-white mb-1.5">En attente de {clientFirstName}</p>
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed max-w-xs mb-4">
              Son questionnaire d&apos;onboarding n&apos;est pas encore rempli. Sa fiche se complètera
              automatiquement dès qu&apos;il le fera, tu pourras alors la consulter et la corriger ici.
            </p>
            <button
              type="button"
              onClick={handleRemind}
              disabled={status === "sending"}
              className="ep-btn-secondary inline-flex items-center gap-1.5"
              style={{ fontSize: 11, padding: "9px 16px" }}
            >
              <Bell size={12} />
              {status === "sending"
                ? "Envoi…"
                : status === "sent"
                ? "Rappel envoyé"
                : status === "error"
                ? "Erreur, réessaie"
                : "Renvoyer une notification"}
            </button>
          </>
        )}
      </div>
    </Card>
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
  measurements,
  points,
  program,
  workoutLogs,
  sessionsThisWeek,
  accessoriesByName,
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
  sendIntakeReminder,
  stepGoal,
  updateClientStepGoal,
  periodLogs,
  cycleStats,
  addPeriodLog,
  deletePeriodLog,
  scheduleBlocks,
  stepRoutineItems,
  stepLogs,
  clientHasOura,
  biometricLogs,
  biometricInsights,
  generatePlanSuggestions,
  corrections,
  sendCorrectionFeedback,
  coachingPhase,
  calibrationSignals,
  phaseSuggestions,
  supplements,
  suggestSupplement,
  setSupplementStatus,
  deleteSupplement,
  dietTemplates,
  saveDietAsTemplate,
  mindsetProfile,
  mindsetHabitLogs,
  medicalConstraints,
  recoveryLogs,
  toggleClientConstraint,
  addRecoveryLog,
  deleteRecoveryLog,
}: {
  client: Profile;
  latestWeight: number | null;
  recentDailyLogs: DailyLog[];
  /** Item 13 : comparateur avant/après, voir components/ui/BeforeAfterComparator. */
  measurements: Measurement[];
  points: number;
  program: ProgramWithDays | null;
  workoutLogs: WorkoutLog[];
  sessionsThisWeek: number;
  /** Bagage d'accessoires choisi par exercice (exercise_library.accessories). */
  accessoriesByName?: Record<string, string[]>;
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
  createDietPlan: (clientId: string, name: string, mode: DietMode, meals: DietPlanMealInput[], structure?: DietStructure, objective?: string) => Promise<{ error?: string; id?: string }>;
  deactivateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  activateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  deleteDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  intake: ClientIntake | null;
  saveClientIntake: (clientId: string, data: ClientIntakeInput) => Promise<{ error?: string }>;
  sendIntakeReminder: (clientId: string) => Promise<{ error?: string }>;
  stepGoal: number;
  updateClientStepGoal: (clientId: string, dailyGoal: number) => Promise<{ error?: string }>;
  periodLogs: PeriodLog[];
  cycleStats: CycleStats;
  addPeriodLog: (
    clientId: string,
    data: { start_date: string; end_date: string | null; flow: string | null; symptoms: string[]; notes: string | null }
  ) => Promise<{ error?: string; id?: string }>;
  deletePeriodLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
  scheduleBlocks: ScheduleBlock[];
  stepRoutineItems: StepRoutineItem[];
  stepLogs: StepLog[];
  clientHasOura: boolean;
  biometricLogs: BiometricLog[];
  biometricInsights: BiometricInsight[];
  generatePlanSuggestions: (clientId: string) => Promise<PlanSuggestions>;
  corrections: ExerciseCorrectionResolved[];
  sendCorrectionFeedback: (
    correctionId: string,
    clientId: string,
    _prev: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | null>;
  // Phase de coaching — jamais rendue si client.subscription_status !==
  // "active" (voir plus bas). coachingPhase est déjà null côté page.tsx
  // pour un membre gratuit, cette prop double juste la garantie côté UI.
  coachingPhase: CoachingPhaseState | null;
  calibrationSignals: AdherenceSignal[];
  phaseSuggestions: PhaseSuggestion[];
  // Compléments : ces quatre props manquaient, l'onglet Nutrition > Compléments
  // de la fiche client rendait SupplementsSection avec une liste undefined.
  supplements: ClientSupplement[];
  suggestSupplement: (clientId: string, input: { name: string; dosage?: string; timing?: string; notes?: string }) => Promise<{ error?: string }>;
  setSupplementStatus: (clientId: string, supplementId: string, status: "active" | "stopped") => Promise<{ error?: string }>;
  deleteSupplement: (clientId: string, supplementId: string) => Promise<{ error?: string }>;
  // Conception de la diète : modèles proposés en point de départ, et chemin
  // inverse pour capitaliser un plan sur mesure en modèle réutilisable.
  dietTemplates: DietPlanTemplateWithMeals[];
  saveDietAsTemplate: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure?: DietStructure,
    objective?: string,
    notes?: string
  ) => Promise<{ error?: string; id?: string }>;
  // Mindset : profil de quiz + habitudes, en lecture seule (voir
  // CoachClientMindsetView). Le journal reste volontairement absent d'ici.
  mindsetProfile: MindsetProfile | null;
  mindsetHabitLogs: MindsetHabitLog[];
  // Contraintes médicales rattachées à ce client (Axe 8, tourné en outil
  // le 2026-09-09) — voir ClientMedicalConstraintsPanel.
  medicalConstraints: ClientMedicalConstraint[];
  recoveryLogs: RecoveryLog[];
  toggleClientConstraint: (clientId: string, slug: string, active: boolean) => Promise<{ error?: string }>;
  addRecoveryLog: (
    clientId: string,
    data: { log_date: string; zone: string; load_note: string | null; pain: number; note: string | null }
  ) => Promise<{ error?: string }>;
  deleteRecoveryLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
}) {
  const { rank, next, progressPct } = getRankForPoints(points);
  const [activeTab, setActiveTab] = useState<TabKey>("profil");
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(true);
  // Repasse "petit détail utile" (2026-09-10) : `roadmapData === null`
  // servait aussi bien "pas encore de road map" que "échec réseau" — le
  // bouton affichait "Configurer" et le résumé "Clique sur Configurer pour
  // créer..." dans les deux cas. RoadmapEditor.tsx (ouvert derrière ce
  // lien) protège déjà contre la vraie conséquence (créer une deuxième
  // road map en double), mais ce résumé restait trompeur en soi.
  const [roadmapError, setRoadmapError] = useState(false);

  useEffect(() => {
    fetch(`/api/roadmap/${client.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((data) => setRoadmapData(data.roadmap ? data : null))
      .catch(() => {
        setRoadmapData(null);
        setRoadmapError(true);
      })
      .finally(() => setRoadmapLoading(false));
  }, [client.id]);

  const pendingCheckins = checkinsWithAverages.filter(({ checkin }) => !checkin.coach_replied_at).length;

  const suggestions = useMemo(() => {
    const base = generateClientSuggestions(intake, nutritionProfile, recentDailyLogs, periodLogs.length, program);
    const fatigue = generateFatigueTrendSuggestion(logbookSessions);
    return fatigue ? [...base, fatigue] : base;
  }, [intake, nutritionProfile, recentDailyLogs, periodLogs.length, program, logbookSessions]);

  // Regroupe les suggestions par onglet concerné — affiché en pastille sur
  // le bouton pour que la fiche client se répercute directement sur la
  // navigation au lieu de rester enfermée dans le panneau "Profil" que rien
  // n'oblige à consulter avant d'aller voir la nutrition ou le programme.
  const suggestionsByTab = useMemo(() => {
    // Objet plutôt que Map : "Map" est déjà pris par l'icône lucide-react
    // importée plus haut dans ce fichier.
    const byTab: Record<string, { count: number; hasWarning: boolean }> = {};
    for (const sug of suggestions) {
      if (!sug.tab) continue;
      const entry = byTab[sug.tab] ?? { count: 0, hasWarning: false };
      entry.count += 1;
      if (sug.severity === "warning") entry.hasWarning = true;
      byTab[sug.tab] = entry;
    }
    return byTab;
  }, [suggestions]);

  return (
    <div>
      {/* Grille de boutons icône + texte plutôt qu'une rangée d'onglets sur
          une seule ligne — avec 9 sections, la rangée dépassait largement la
          largeur de l'écran sur mobile, forçant à zoomer/dézoomer et
          défiler sur le côté pour juste choisir un onglet. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
        {TABS.filter(({ key }) => key !== "cycle" || intake?.gender === "Femme")
          // Onglet "Photos" = suivi de pose de préparation compétition, pas
          // les photos de check-in (gérées ailleurs). Masqué sauf pour un
          // client réellement en préparation, pour ne pas paraître cassé/vide.
          .filter(({ key }) => key !== "photos" || !!client.competition_category)
          .map(({ key, label, icon: Icon }) => {
          const badge = suggestionsByTab[key];
          return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-center transition-colors ${
              activeTab === key
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/45 hover:border-[#890404]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={17} strokeWidth={activeTab === key ? 2.2 : 1.7} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{label}</span>
            {badge && (
              <span
                className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-black ${
                  badge.hasWarning ? "bg-[#E01E1E] text-white" : "bg-amber-500/90 text-black"
                }`}
              >
                {badge.count}
              </span>
            )}
          </button>
          );
        })}
      </div>

      {activeTab === "profil" && (
        <div className="space-y-4">
          {/* Coach exclusivement — jamais rendu sur /dashboard/client/**,
              et jamais pour un membre gratuit (pas de coaching à calibrer). */}
          {client.subscription_status === "active" && (
            <CoachingPhasePanel
              clientId={client.id}
              phase={coachingPhase}
              signals={calibrationSignals}
              suggestions={phaseSuggestions}
            />
          )}

          <ClientSuggestionsPanel suggestions={suggestions} />

          <ClientMedicalConstraintsPanel
            clientId={client.id}
            activeConstraints={medicalConstraints}
            recoveryLogs={recoveryLogs}
            today={today}
            toggleClientConstraint={toggleClientConstraint}
            addRecoveryLog={addRecoveryLog}
            deleteRecoveryLog={deleteRecoveryLog}
          />

          {intake ? (
            <Card title="Fiche client : l'essentiel">
              <div className="space-y-3">
                {(intake.goal_3_months || intake.goal_12_months) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Objectif 3 mois" value={intake.goal_3_months} />
                    <InfoRow label="Objectif 12 mois" value={intake.goal_12_months} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {intake.diet_type && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/60">
                      {DIET_LABELS[intake.diet_type]}
                    </span>
                  )}
                  {intake.allergens.map((a) => (
                    <span key={a} className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
                      ⚠ {ALLERGEN_LABELS[a]}
                    </span>
                  ))}
                  {intake.injuries && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
                      ⚠ Blessure/douleur déclarée
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("intake")}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
                >
                  Voir la fiche complète →
                </button>
              </div>
            </Card>
          ) : (
            <Card title="Fiche client : l'essentiel">
              <p className="text-xs text-[#F5EDED]/40 mb-2">
                {client.subscription_status === "active"
                  ? "En attente que le client remplisse son questionnaire d'onboarding. Objectifs, régime, blessures... tout ce qui sert ensuite dans le créateur de recette, de programme et de plan nutrition, se remplira automatiquement dès qu'il l'aura fait."
                  : "Active le coaching payant de ce client pour débloquer son questionnaire d'onboarding. C'est lui qui remplit sa fiche, pas toi."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("intake")}
                className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
              >
                Voir le statut →
              </button>
            </Card>
          )}

          <SubscriptionToggle
            clientId={client.id}
            currentStatus={client.subscription_status}
            currentPlan={client.subscription_plan}
            currentNextBillingDate={client.next_billing_date}
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
        intake ? (
          <div>
            <AutoGeneratePlanButton clientId={client.id} hasIntake={!!intake} generatePlanSuggestions={generatePlanSuggestions} />
            <ClientIntakeForm
              clientId={client.id}
              existingIntake={intake}
              saveClientIntake={saveClientIntake}
              stepGoal={stepGoal}
              updateClientStepGoal={updateClientStepGoal}
            />
          </div>
        ) : (
          <IntakeWaitingState
            clientId={client.id}
            clientFirstName={client.full_name?.split(" ")[0] ?? "ce client"}
            isClientSubscribed={client.subscription_status === "active"}
            sendIntakeReminder={sendIntakeReminder}
          />
        )
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
            Emploi du temps du client. Lecture seule, c&apos;est lui qui le gère depuis son espace.
          </p>
          <WeeklyAgenda blocks={scheduleBlocks} editable={false} />
        </div>
      )}

      {activeTab === "pas" && (
        <div>
          <p className="text-xs text-[#F5EDED]/40 leading-relaxed mb-4">
            Suivi de pas du client. Lecture seule, c&apos;est lui qui coche sa routine et logue ses pas
            au quotidien. L&apos;objectif se règle depuis l&apos;onglet Fiche client.
          </p>
          <StepsClient
            settings={{ client_id: client.id, daily_goal: stepGoal }}
            routineItems={stepRoutineItems}
            logs={stepLogs}
            hasOura={clientHasOura}
            readOnly
          />
        </div>
      )}

      {activeTab === "sommeil" && (
        <div>
          <p className="text-xs text-[#F5EDED]/40 leading-relaxed mb-4">
            Sommeil et récupération du client. Lecture seule, c&apos;est lui qui logue ses données ou
            connecte sa bague Oura depuis son espace.
          </p>
          <TrackingClient logs={biometricLogs} insights={biometricInsights} ouraConnected={clientHasOura} readOnly />
        </div>
      )}

      {activeTab === "mindset" && (
        <div>
          <p className="text-xs text-[#F5EDED]/40 leading-relaxed mb-4">
            Profil mindset et habitudes du client. Lecture seule, c&apos;est lui qui remplit son quiz et
            coche ses habitudes depuis son espace.
          </p>
          <CoachClientMindsetView profile={mindsetProfile} habitLogs={mindsetHabitLogs} />
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
          ) : roadmapError ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <p className="text-xs text-[#F5EDED]/40">
                  Impossible de vérifier si ce client a déjà une road map. Recharge la page avant de
                  cliquer sur « Configurer », pour ne pas risquer d&apos;en créer une en double.
                </p>
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
        <CoachLogbookClient
          clientId={client.id}
          sessions={logbookSessions}
          records={personalRecords}
          declaredInjuries={intake?.injuries ?? null}
          declaredHealthIssues={intake?.health_issues ?? null}
        />
      )}

      {activeTab === "programme" && (
        <ClientProgramView
          clientId={client.id}
          program={program}
          workoutLogs={workoutLogs}
          sessionsThisWeek={sessionsThisWeek}
          accessoriesByName={accessoriesByName}
        />
      )}

      {/*
        `hidden`, pas un rendu conditionnel `{activeTab === "x" && <X/>}` :
        même bug de démontage React que MASTERCLASS.md Axe CB (5 endroits
        déjà corrigés), retrouvé ici en corrigeant CoachClientNutritionTabs
        (audit nutrition 2026-09-16) — cette page-ci l'enveloppe encore
        d'un second niveau de démontage. Quitter l'onglet "Nutrition" pour
        n'importe quel autre onglet de cette fiche client démontait
        entièrement CoachClientNutritionTabs, donc perdait de la même façon
        tout plan de diète en cours de construction dans son PlanBuilder.
        Seul cet onglet est corrigé ici (périmètre nutrition) : les autres
        onglets de cette page suivent le même motif `{activeTab === "x" &&
        ...}` et pourraient avoir le même risque, mais restent hors
        périmètre de cet audit.
      */}
      <div hidden={activeTab !== "nutrition"}>
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
          supplements={supplements}
          dietTemplates={dietTemplates}
          saveDietAsTemplate={saveDietAsTemplate}
          subjectLabel={client.full_name ?? "ce client"}
          saveNutritionProfile={saveNutritionProfile}
          createDietPlan={createDietPlan}
          deactivateDietPlan={deactivateDietPlan}
          activateDietPlan={activateDietPlan}
          deleteDietPlan={deleteDietPlan}
          suggestSupplement={suggestSupplement}
          setSupplementStatus={setSupplementStatus}
          deleteSupplement={deleteSupplement}
        />
      </div>

      {activeTab === "bilans" && (
        <>
          <BeforeAfterComparator
            measurements={measurements}
            checkins={checkinsWithAverages.map(({ checkin }) => checkin)}
          />
          <ClientBilanView weeks={bilanWeeks} clientId={client.id} />
        </>
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

          <ClientCorrectionsReplySection
            corrections={corrections}
            clientId={client.id}
            sendCorrectionFeedback={sendCorrectionFeedback}
          />
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
