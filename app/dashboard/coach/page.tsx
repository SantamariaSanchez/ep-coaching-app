import { redirect } from "next/navigation";
import { isBlockOnDate } from "@/lib/agenda-day";
import { getUser, getProfile, getClients, isSubscribed } from "@/utils/auth";
import { getPointsMap } from "@/lib/gamification";
import { isEligibleForLegendReward } from "@/lib/gamification-types";
import { getCoachingPhaseOverview } from "@/lib/coaching-phase";
import { getClientsLastActivity, getClientsWeeklyConsistency } from "@/lib/client-activity";
import { getClientsIntakeCompletion } from "@/utils/client-intake";
import { relaunchMember } from "@/app/dashboard/coach/communaute/membres/actions";
import { getNutritionProfile, getTodayLogs } from "@/utils/nutrition";
import { getScheduleBlocks } from "@/utils/agenda";
import { getAllLiveEventsForCoach } from "@/utils/live-events";
import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis, nowInParis } from "@/lib/dates";
import { isSlotStarted } from "@/lib/nutrition-engine";
import ClientsSection from "@/components/ui/ClientsSection";
import DashboardStats from "@/components/coach/DashboardStats";
import UrgentAlertsSection from "@/components/coach/UrgentAlertsSection";
import MyDayCard from "@/components/coach/MyDayCard";
import { messagePreview } from "@/components/messaging/message-format";
import { getAllMessageableMembers } from "@/utils/auth";

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
  // Sans aucun client (2026-10-08) : on n'affiche ni alertes « tout va
  // bien », ni tuiles à zéro, ni grille vide. Seulement ce qui sert.
  const hasClients = clients.length > 0;
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
  const [nutritionProfile, todayFoodLogs, scheduleBlocks, liveEvents, unreadMsgs, messageable] = await Promise.all([
    getNutritionProfile(user.id),
    getTodayLogs(user.id, todayStr),
    getScheduleBlocks(user.id),
    getAllLiveEventsForCoach(user.id),
    supabase
      .from("messages")
      .select("id, conversation_id, content, type, created_at")
      .eq("receiver_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false }),
    // Membres gratuits compris : sinon leur message non lu s'affichait
    // "Membre" au lieu de leur nom.
    getAllMessageableMembers(user.id).catch(() => []),
  ]);

  // Repas déjà commencés seulement (journée pré-remplie avec le plan).
  const started = todayFoodLogs.filter((l) => isSlotStarted(l.meal_slot ?? "breakfast", hhmm));
  const sum = (k: "calories" | "proteins" | "carbs" | "fats") => started.reduce((s, l) => s + (l[k] ?? 0), 0);
  const nutrition = todayFoodLogs.length > 0 || nutritionProfile?.calories_target
    ? {
        kcal: sum("calories"), kcalTarget: nutritionProfile?.calories_target ?? null,
        proteins: sum("proteins"), proteinsTarget: nutritionProfile?.proteins_target ?? null,
        carbs: sum("carbs"), carbsTarget: nutritionProfile?.carbs_target ?? null,
        fats: sum("fats"), fatsTarget: nutritionProfile?.fats_target ?? null,
      }
    : null;

  // Idée "onglet Aujourd'hui, suite" (2026-09-09) : l'agenda vient d'être
  // reconstruit avec du montage/tournage partout entre les moments qui
  // comptent — "prochain créneau" tel quel tombait donc presque toujours sur
  // "Travail : montage", jamais très utile à afficher. On saute les blocs de
  // travail (icon "travail") pour ne surfacer que le prochain repas, trajet,
  // live, formation ou séance — l'info qu'on a vraiment envie de voir d'un
  // coup d'oeil.
  const nextBlock = scheduleBlocks
    .filter((b) => isBlockOnDate(b, todayStr, isoDow) && b.start_time >= hhmm && b.icon !== "travail")
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;

  // Retour direct : "c'est mieux si ça dit le créneau actuel comme ça je
  // sais je dois faire quoi" — celui-ci n'est volontairement PAS filtré sur
  // "travail" contrairement à nextBlock ci-dessus : si c'est vraiment ce
  // qu'il y a à faire là, tout de suite (même du montage), c'est ça qu'il
  // faut afficher, pas le sauter pour une projection plus "intéressante".
  const currentBlock = scheduleBlocks
    .filter((b) => isBlockOnDate(b, todayStr, isoDow) && b.start_time <= hhmm && b.end_time > hhmm)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;


  const nowMs = today.getTime();
  const nextLive = liveEvents
    .filter((e) => e.status === "scheduled" && new Date(e.starts_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null;

  const clientNameById = new Map([...messageable, ...clients].map((c) => [c.id, c.full_name ?? "Client"]));
  // Audit friction coach (2026-09-16) : chaque ligne pointait vers la liste
  // générale des conversations (/dashboard/coach/messages) au lieu de la
  // conversation déjà identifiée par son nom sur la carte — un clic de plus
  // pour retrouver le bon membre. `conversation_id` correspond ici à l'id du
  // client (une conversation par membre, voir CoachConversationsList), donc
  // au segment [clientId] de /dashboard/coach/messages/[clientId].
  const unreadMsgsData = (unreadMsgs.data ?? []) as { id: string; conversation_id: string; content: string | null; type: string; created_at: string }[];
  const unreadTotal = unreadMsgsData.length;
  const unreadPreview = unreadMsgsData.slice(0, 3).map((m) => ({
    id: m.id,
    clientId: m.conversation_id,
    senderName: clientNameById.get(m.conversation_id) ?? "Membre",
    content: messagePreview(m.type, m.content, 60),
    createdAt: m.created_at,
  }));

  return (
    <div
      className="page-transition ep-page-wide"
      style={{ padding: "16px 16px 48px" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 14 }}>
        <p className="ep-section-title" style={{ margin: 0 }}>
          {formattedDate}
        </p>
      </div>

      {/* ── Urgent alerts ─────────────────────────────────────────────────────
          Audit friction coach (2026-09-16) : remonté avant "Ma journée" et les
          stats. Un signal client urgent (décrochage, silence prolongé...) est
          l'information la plus critique du tableau de bord d'un coach qui a
          peu de temps — elle ne doit pas attendre après ses propres infos
          personnelles (nutrition, sommeil) pour apparaître. */}
      {hasClients && <UrgentAlertsSection />}

      {/* ── Ma journée ───────────────────────────────────────────────────────
          Idée #18 : juste après les alertes, avant la gestion clients — c'est
          ce qui est le plus pertinent au quotidien pour un coach qui se suit
          lui-même. */}
      <MyDayCard
        currentBlock={currentBlock ? { label: currentBlock.label, endTime: currentBlock.end_time } : null}
        nextBlock={nextBlock ? { label: nextBlock.label, startTime: nextBlock.start_time } : null}
        unreadPreview={unreadPreview}
        unreadTotal={unreadTotal}
        nutrition={nutrition}
        hasUpcomingLive={nextLive != null}
      />

      {/* ── Stats (client-side fetch) ────────────────────────────────────────── */}
      {hasClients && <DashboardStats />}

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      {hasClients && (
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
      )}
    </div>
  );
}
