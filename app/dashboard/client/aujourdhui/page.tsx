import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getScheduleBlocks } from "@/utils/agenda";
import { getHabitLogs } from "@/utils/mindset";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import { getTodayLog } from "@/utils/daily-logs";
import { getClientSupplements } from "@/utils/supplements";
import { getNutritionProfile, getTodayLogs } from "@/utils/nutrition";
import { getStepSettings, getTodayStepsActual } from "@/utils/steps";
import { getClientsWeeklyConsistency } from "@/lib/client-activity";
import { getDailyQuote, getPromptOfDay } from "@/lib/mindset-content";
import { todayInParis, nowInParis, weekNumber } from "@/lib/dates";
import { toggleHabitLog, addJournalEntry } from "@/app/dashboard/client/mindset/actions";
import { upsertDailyLog } from "@/app/dashboard/client/bilan/actions";
import AujourdhuiView from "@/components/client/AujourdhuiView";

export default async function AujourdhuiPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date();
  // Bug corrigé (repasse masterclass 2026-09-10, même classe que Axe L) :
  // `today.toISOString().split("T")[0]` donne la date UTC, pas celle de
  // Paris — entre minuit et 1h/2h du matin heure de Paris, ce calcul
  // pointait encore sur hier. Concrètement : les habitudes du jour se
  // loguaient sur la mauvaise date, l'agenda affichait le mauvais jour, et
  // le poids du matin pouvait s'enregistrer avec un log_date différent de
  // celui que getTodayLog() (déjà correct en interne) venait de lire —
  // un vrai risque de désynchronisation. todayInParis()/nowInParis() sont
  // déjà le motif établi ailleurs (voir app/dashboard/coach/page.tsx).
  const todayStr = todayInParis();
  const { isoDow } = nowInParis();
  const subscribed = isSubscribed(profile);

  const [
    allBlocks, habitLogs, biometricLogs, insights, todayLog, allSupplements,
    nutritionProfile, todayFoodLogs, stepSettings, todaySteps, weeklyConsistencyMap,
  ] = await Promise.all([
    subscribed ? getScheduleBlocks(user.id) : Promise.resolve([]),
    getHabitLogs(user.id, todayStr),
    subscribed ? getBiometricLogs(user.id, 3) : Promise.resolve([]),
    subscribed ? getBiometricInsights(user.id, 5) : Promise.resolve([]),
    // Le poids se log en 5 secondes ici même, pour un membre gratuit comme
    // pour un client coaché — pas besoin d'ouvrir le bilan complet juste
    // pour ça (voir WeightQuickCard dans AujourdhuiView).
    getTodayLog(user.id),
    // Item 34 : accessible aux membres gratuits comme aux clients coachés,
    // même logique que la section Compléments de la page Nutrition.
    getClientSupplements(user.id),
    // Brainstorm "onglet Aujourd'hui, version membre" (2026-09-10, en écho
    // à la passe "20 idées" déjà faite côté coach le 2026-09-09) : ce
    // membre voyait son poids/agenda/sommeil/habitudes/journal ici, mais
    // RIEN sur sa nutrition ni ses pas du jour — les deux métriques
    // pourtant suivies quotidiennement ailleurs dans l'appli (onglets
    // Nutrition et Pas). Ouvert à tout membre, gratuit comme coaché, même
    // logique que le poids et les compléments ci-dessus.
    getNutritionProfile(user.id),
    getTodayLogs(user.id, todayStr),
    getStepSettings(user.id),
    getTodayStepsActual(user.id),
    // Même métrique que le coach voit déjà sur CHAQUE client
    // (getClientsWeeklyConsistency, ClientsSection.tsx) — jamais montrée
    // au client lui-même jusqu'ici. Accepte déjà un tableau d'ids, donc
    // aucun nouveau code de calcul, juste un appel avec un seul id.
    getClientsWeeklyConsistency([user.id]),
  ]);
  const activeSupplements = allSupplements.filter((s) => s.status === "active");

  const todayBlocks = allBlocks
    .filter((b) => b.day_of_week === isoDow)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const latestBiometric = biometricLogs.length > 0 ? biometricLogs[biometricLogs.length - 1] : null;
  const latestInsight = insights.find((i) => !i.acknowledged) ?? insights[0] ?? null;

  const nutritionLogged = todayFoodLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const nutrition = todayFoodLogs.length > 0 || nutritionProfile?.calories_target
    ? { logged: nutritionLogged, target: nutritionProfile?.calories_target ?? null }
    : null;

  return (
    <AujourdhuiView
      firstName={profile?.full_name?.split(" ")[0] ?? ""}
      hour={Number(nowInParis().hhmm.split(":")[0])}
      weekNum={weekNumber(profile?.start_date ?? null)}
      todayBlocks={todayBlocks}
      habitLogs={habitLogs}
      isSubscribedClient={subscribed}
      biometric={latestBiometric}
      insight={latestInsight}
      dailyQuote={getDailyQuote(today)}
      promptOfDay={getPromptOfDay(today)}
      todayStr={todayStr}
      toggleHabitLog={toggleHabitLog}
      addJournalEntry={addJournalEntry}
      todayWeight={todayLog?.weight_morning ?? null}
      logWeight={upsertDailyLog}
      supplements={activeSupplements}
      nutrition={nutrition}
      steps={{ actual: todaySteps, goal: stepSettings.daily_goal }}
      weeklyConsistency={weeklyConsistencyMap[user.id] ?? null}
    />
  );
}
