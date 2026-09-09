import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getMindsetProfile, getHabitLogs, getJournalEntries } from "@/utils/mindset";
import MindsetView from "@/components/ui/MindsetView";
import { saveMindsetQuiz, toggleHabitLog, addJournalEntry, deleteJournalEntry } from "./actions";
import { todayInParis } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MindsetPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de son propre mindset
  // (app/dashboard/coach/moi/mindset existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/mindset");

  // MASTERCLASS.md Axe L : new Date().toISOString() reflète le calendrier
  // UTC du serveur (Vercel), pas celui de Paris — entre minuit et 1h/2h du
  // matin heure de Paris, today pointait encore sur hier.
  const today = todayInParis();
  const thirtyDaysAgo = new Date(`${today}T12:00:00Z`);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const [mindsetProfile, habitLogs, journalEntries] = await Promise.all([
    getMindsetProfile(user.id),
    getHabitLogs(user.id, thirtyDaysAgo.toISOString().split("T")[0]),
    getJournalEntries(user.id, 30),
  ]);

  return (
    <MindsetView
      today={today}
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
