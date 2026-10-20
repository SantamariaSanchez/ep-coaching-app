import { getLocale } from "@/lib/i18n-server";
import { getAppSetup } from "@/lib/app-setup-server";
import { isOn } from "@/lib/app-setup";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAccessType } from "@/utils/auth-client";
import { getThisWeekCheckin, getWeekStart } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLatestCoachNote } from "@/utils/notes";
import { getClientIntake } from "@/utils/client-intake";
import { getPeriodLogs } from "@/utils/period-tracking";
import { getTrialDaysLeft } from "@/utils/coaching-trial";
import { getMemberPreferences } from "@/utils/member-preferences";
import { derivePersonalization } from "@/lib/personalization";
import { getOnboardingChecklist } from "@/lib/onboarding-checklist";
import { PushPermission } from "@/components/messaging/PushPermission";
import { getClientActivityStreak } from "@/lib/client-activity";
import { getTotalPoints } from "@/lib/gamification";
import { CoachedHome, WelcomeGuide } from "@/components/client/home/ClientHome";

// Le rendu de l'accueil vit dans components/client/home/ClientHome.tsx
// (partagé avec l'aperçu « Voir comme mon client » de la fiche coach).

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  // Session, paramètres et langue lus d'un coup (au lieu d'une file d'attente).
  const [user, { onboarded }, locale] = await Promise.all([getUser(), searchParams, getLocale()]);
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  // Brand-new signups get a one-time animated tour before anything else —
  // existing profiles were grandfathered in via migration (onboarding_completed_at
  // backfilled), so this only ever fires once per new member. La sortie de
  // l'onboarding navigue ici sans attendre la confirmation serveur (retour
  // instantané voulu) : ?onboarded=1 evite un aller-retour vers /onboarding
  // si l'ecriture onboarding_completed_at n'a pas encore atterri en base.
  if (profile && !profile.onboarding_completed_at && onboarded !== "1") redirect("/onboarding");

  // Free community members get a welcome guide instead of the coached
  // dashboard (weight tracking, coach notes...) which doesn't apply to them.
  if (getAccessType(profile) === "membre_gratuit") {
    const [preferences, checklist, activityStreak, totalPoints, appSetup] = await Promise.all([
      getMemberPreferences(user.id),
      getOnboardingChecklist(user.id),
      // Item 42 : signal de constance déjà calculé pour item 20, réutilisé
      // ici pour rendre la relance premium contextuelle plutôt que générique.
      getClientActivityStreak(user.id),
      getTotalPoints(user.id),
      getAppSetup(user.id),
    ]);
    return (
      <>
        <PushPermission userId={user.id} />
        <WelcomeGuide
          firstName={profile?.full_name?.split(" ")[0] ?? ""}
          goal={profile?.goal ?? null}
          level={profile?.level ?? null}
          hasCoach={!!profile?.coach_id}
          personalization={derivePersonalization(preferences)}
          checklist={checklist}
          activityStreak={activityStreak}
          totalPoints={totalPoints}
          show={{ poids: isOn(appSetup, "poids"), nutrition: isOn(appSetup, "nutrition"), entrainement: isOn(appSetup, "entrainement"), sommeil: isOn(appSetup, "sommeil") }}
        />
      </>
    );
  }

  // Tout début du coaching : le client remplit sa fiche complète une seule
  // fois, avant de voir le dashboard coaché — remplace l'ancien passage par
  // formulaire externe + email, les réponses vont directement dans sa fiche.
  // Fiche lue en même temps que le reste (perf 2026-10-13), redirection juste après.
  const [intake, thisWeekCheckin, latestNote, victoryPostedThisWeek, activityStreak, totalPoints, periodLogsCount, trialDaysLeft, appSetup] = await Promise.all([
    getClientIntake(user.id),
    getThisWeekCheckin(user.id),
    getLatestCoachNote(user.id),
    (async () => {
      try {
        const supabase = await createServerSupabase();
        const { count } = await supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("type", "victory")
          .gte("created_at", `${getWeekStart()}T00:00:00`);
        return (count ?? 0) > 0;
      } catch {
        return true; // fail-safe : n'affiche pas la relance en cas d'erreur
      }
    })(),
    // Item 20 : régularité mise en avant dès l'accueil, au lieu d'un
    // système de points qui n'existait qu'au fond du profil.
    getClientActivityStreak(user.id),
    getTotalPoints(user.id),
    // Item 32 : uniquement pour savoir si la relance ci-dessous doit
    // s'afficher, évite d'aller chercher les logs pour tout le monde.
    getPeriodLogs(user.id).then((l) => l.length).catch(() => 0),
    // Item 43 : null pour la quasi-totalité des clients (coaching payant
    // classique, pas d'essai en cours) — juste une lecture ciblée en plus.
    getTrialDaysLeft(user.id),
    getAppSetup(user.id),
  ]);
  if (!intake) redirect("/onboarding/intake");
  // Bilan de la semaine déjà envoyé mais rien partagé à la communauté :
  // moment naturel pour relancer, sans être insistant (une fois par semaine).
  const showVictoryNudge = !!thisWeekCheckin && !victoryPostedThisWeek;

  return (
    <>
      <PushPermission userId={user.id} />
      <CoachedHome
        profile={profile}
        intake={intake}
        thisWeekCheckin={thisWeekCheckin}
        latestNote={latestNote}
        showVictoryNudge={showVictoryNudge}
        activityStreak={activityStreak}
        totalPoints={totalPoints}
        periodLogsCount={periodLogsCount}
        trialDaysLeft={trialDaysLeft}
        appSetup={appSetup}
        locale={locale}
      />
    </>
  );
}
