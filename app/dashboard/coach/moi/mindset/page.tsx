import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getMindsetProfile, getHabitLogs, getJournalEntries } from "@/utils/mindset";
import MindsetView from "@/components/ui/MindsetView";
import { saveMindsetQuiz, toggleHabitLog, addJournalEntry, deleteJournalEntry } from "@/app/dashboard/client/mindset/actions";

export const dynamic = "force-dynamic";

export default async function CoachMindsetPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

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
