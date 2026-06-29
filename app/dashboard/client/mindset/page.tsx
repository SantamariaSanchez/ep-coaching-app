import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getMindsetProfile, getHabitLogs, getJournalEntries } from "@/utils/mindset";
import MindsetView from "@/components/ui/MindsetView";
import { saveMindsetQuiz, toggleHabitLog, addJournalEntry, deleteJournalEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function MindsetPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  const [mindsetProfile, habitLogs, journalEntries] = await Promise.all([
    getMindsetProfile(user.id),
    getHabitLogs(user.id, thirtyDaysAgo.toISOString().split("T")[0]),
    getJournalEntries(user.id, 30),
  ]);

  return (
    <MindsetView
      today={today.toISOString().split("T")[0]}
      mindsetProfile={mindsetProfile}
      habitLogs={habitLogs}
      journalEntries={journalEntries}
      saveMindsetQuiz={saveMindsetQuiz}
      toggleHabitLog={toggleHabitLog}
      addJournalEntry={addJournalEntry}
      deleteJournalEntry={deleteJournalEntry}
    />
  );
}
