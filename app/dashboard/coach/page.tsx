import { redirect } from "next/navigation";
import { getUser, getProfile, getClients, isSubscribed } from "@/utils/auth";
import { getPointsMap } from "@/lib/gamification";
import { isEligibleForLegendReward } from "@/lib/gamification-types";
import { getCoachingPhaseOverview } from "@/lib/coaching-phase";
import { getClientsLastActivity, getClientsWeeklyConsistency } from "@/lib/client-activity";
import { getClientsIntakeCompletion } from "@/utils/client-intake";
import { relaunchMember } from "@/app/dashboard/coach/communaute/membres/actions";
import { getTodayLog } from "@/utils/daily-logs";
import { getNutritionProfile, getTodayLogs } from "@/utils/nutrition";
import { getScheduleBlocks } from "@/utils/agenda";
import { getAllLiveEventsForCoach } from "@/utils/live-events";
import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis, nowInParis } from "@/lib/dates";
import { getTipOfTheDay } from "@/lib/coach-daily-tips";
import ClientsSection from "@/components/ui/ClientsSection";
import DashboardStats from "@/components/coach/DashboardStats";
import UrgentAlertsSection from "@/components/coach/UrgentAlertsSection";
import MyDayCard, { timeAwareGreeting } from "@/components/coach/MyDayCard";

export default async function CoachDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  // Onboarding coach (Axe 9, VISION.md — gap confirmé 2026-08-19 : seul
  // le membre/client avait un vrai parcours d'accueil). Seulement pour un
  // coach tiers dont l'abonnement plateforme est déjà actif (paiement
  // Stripe confirmé, voir app/api/webhooks/stripe/route.ts) — jamais le
  // fondateur (déjà "onboardé" par définition), jamais avant paiement.
  if (
    profile?.role === "coach" &&
    !profile.is_platform_owner &&
    profile.platform_subscription_status === "active" &&
    !profile.onboarding_completed_at
  ) {
    redirect("/onboarding/coach");
  }

  // Retour direct 2026-09-09 : "onglet par onglet, masterclass" — la grille
  // de clients ici réutilisait déjà ClientsSection mais sans lui passer les
  // données d'enrichissement (alertes, phase de coaching, silence, fiche
  // incomplète, constance hebdo, relance) que /dashboard/coach/clients lui
  // passe pourtant — les cartes du tableau de bord affichaient donc les
  // clients "à nu", sans aucun des signaux de triage visibles sur la vraie
  // page Clients. Même chargement, dupliqué ici pour que les deux vues
  // restent cohérentes.
  const clientIds = clients.map((c) => c.id);
  const [pointsMap, phaseOverview, activity, intakeComplete, weeklyConsistency] = await Promise.all([
    getPointsMap(clientIds),
    getCoachingPhaseOverview(clientIds),
    getClientsLastActivity(clientIds),
    getClientsIntakeCompletion(clientIds),
    getClientsWeeklyConsistency(clientIds),
  ]);
  const ouraEligibleIds = clients
    .filter((c) => isEligibleForLegendReward(pointsMap[c.id] ?? 0, isSubscribed(c)))
    .map((c) => c.id);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Coach";
  const today = new Date();
  const formattedDate = (() => {
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  // Section "Ma journée" (retour direct 2026-09-09, "au moins 20 idées") :
  // rien de personnel n'apparaissait jusqu'ici sur le tableau de bord, alors
  // que le coach s'entraîne et se suit lui-même au quotidien (voir Moi >
  // Nutrition, Sommeil, Agenda). Même sources de données déjà utilisées par
  // ces pages, agrégées ici pour un coup d'oeil sans naviguer.
  const todayStr = todayInParis();
  const { isoDow, hhmm } = nowInParis();
  const supabase = await createServerSupabase();
  const [todayLog, nutritionProfile, todayFoodLogs, scheduleBlocks, liveEvents, unreadMsgs] = await Promise.all([
    getTodayLog(user.id),
    getNutritionProfile(user.id),
    getTodayLogs(user.id, todayStr),
    getScheduleBlocks(user.id),
    getAllLiveEventsForCoach(user.id),
    supabase
      .from("messages")
      .select("id, conversation_id, content, type, created_at")
      .eq("receiver_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const nutritionLogged = todayFoodLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const nutrition = todayFoodLogs.length > 0 || nutritionProfile?.calories_target
    ? { logged: nutritionLogged, target: nutritionProfile?.calories_target ?? null }
    : null;

  const nextBlock = scheduleBlocks
    .filter((b) => b.day_of_week === isoDow && b.start_time >= hhmm)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;

  const nowMs = Date.now();
  const nextLive = liveEvents
    .filter((e) => e.status === "scheduled" && new Date(e.starts_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null;

  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name ?? "Client"]));
  const unreadPreview = ((unreadMsgs.data ?? []) as { id: string; conversation_id: string; content: string | null; type: string; created_at: string }[])
    .map((m) => ({
      id: m.id,
      senderName: clientNameById.get(m.conversation_id) ?? "Membre",
      content: m.type === "voice" ? "🎤 Message vocal" : (m.content ?? "").slice(0, 60),
      createdAt: m.created_at,
    }));

  return (
    <div
      className="page-transition ep-page-wide"
      style={{ padding: "32px 24px 48px" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          Espace Coach &nbsp;·&nbsp; {formattedDate}
        </p>
        {/* Idée #1 : salutation adaptée à l'heure plutôt que "Bonjour" figé
            toute la journée, y compris à 22h. */}
        <h1 className="ep-h1">{timeAwareGreeting(Number(hhmm.split(":")[0]))}, {firstName}</h1>
      </div>

      {/* ── Ma journée ───────────────────────────────────────────────────────
          Idée #18 : en premier, avant la gestion clients — c'est ce qui est
          le plus pertinent au quotidien pour un coach qui se suit lui-même. */}
      <MyDayCard
        tip={getTipOfTheDay(today)}
        nutrition={nutrition}
        sleepHours={todayLog?.sleep_hours ?? null}
        nextBlock={nextBlock ? { label: nextBlock.label, startTime: nextBlock.start_time } : null}
        nextLive={nextLive ? { title: nextLive.title, startsAt: nextLive.starts_at } : null}
        unreadPreview={unreadPreview}
      />

      {/* ── Stats (client-side fetch) ────────────────────────────────────────── */}
      <DashboardStats />

      {/* ── Urgent alerts ───────────────────────────────────────────────────── */}
      <UrgentAlertsSection />

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <section>
        <ClientsSection
          clients={clients}
          ouraEligibleIds={ouraEligibleIds}
          phaseOverview={phaseOverview}
          activity={activity}
          intakeComplete={intakeComplete}
          weeklyConsistency={weeklyConsistency}
          relaunchMember={relaunchMember}
        />
      </section>
    </div>
  );
}
