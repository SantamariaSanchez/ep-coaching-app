import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords, getActiveSession } from "@/utils/sessions";
import { getClientCheckins } from "@/utils/checkins";
import LogbookClient from "@/components/client/LogbookClient";

export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de son propre logbook
  // (app/dashboard/coach/moi/logbook existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json (raccourcis PWA).
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/logbook");

  const [program, sessions, records, activeSession, checkins] = await Promise.all([
    getActiveProgram(user.id),
    getAllClientSessions(user.id, 10),
    getClientPersonalRecords(user.id),
    getActiveSession(user.id),
    getClientCheckins(user.id),
  ]);

  return (
    <LogbookClient
      program={program}
      sessions={sessions}
      records={records}
      isFree={!isSubscribed(profile)}
      activeSession={activeSession}
      checkins={checkins}
    />
  );
}
