import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getScheduleBlocks } from "@/utils/agenda";
import { getHabitLogs } from "@/utils/mindset";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import { getTodayLog } from "@/utils/daily-logs";
import { getClientSupplements } from "@/utils/supplements";
import { getDailyQuote, getPromptOfDay } from "@/lib/mindset-content";
import { toggleHabitLog, addJournalEntry } from "@/app/dashboard/client/mindset/actions";
import { upsertDailyLog } from "@/app/dashboard/client/bilan/actions";
import AujourdhuiView from "@/components/client/AujourdhuiView";

// 1 = lundi ... 7 = dimanche, cohérent avec ScheduleBlock.day_of_week.
function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export default async function AujourdhuiPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const subscribed = isSubscribed(profile);

  const [allBlocks, habitLogs, biometricLogs, insights, todayLog, allSupplements] = await Promise.all([
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
  ]);
  const activeSupplements = allSupplements.filter((s) => s.status === "active");

  const todayBlocks = allBlocks
    .filter((b) => b.day_of_week === isoWeekday(today))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const latestBiometric = biometricLogs.length > 0 ? biometricLogs[biometricLogs.length - 1] : null;
  const latestInsight = insights.find((i) => !i.acknowledged) ?? insights[0] ?? null;

  return (
    <AujourdhuiView
      firstName={profile?.full_name?.split(" ")[0] ?? ""}
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
    />
  );
}
