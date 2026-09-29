import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords, getActiveSession } from "@/utils/sessions";
import { getClientCheckins } from "@/utils/checkins";
import LogbookClient from "@/components/client/LogbookClient";
import { getFullSessionHistory, FULL_HISTORY_MAX_SESSIONS } from "./session-history";

const HISTORY_RECENT = 10;

export const dynamic = "force-dynamic";

export default async function LogbookPage({
  searchParams,
}: {
  searchParams: Promise<{ historique?: string | string[] }>;
}) {
  // "Mes dernières séances" était plafonné à 10 sans moyen de remonter plus
  // loin : ?historique=tout (lien en bas de la liste) charge tout
  // l'historique, séries comprises (voir ./session-history.ts).
  const { historique } = await searchParams;
  const wantsFullHistory = historique === "tout";

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de son propre logbook
  // (app/dashboard/coach/moi/logbook existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json (raccourcis PWA).
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/logbook");

  const [program, loadedSessions, records, activeSession, checkins] = await Promise.all([
    getActiveProgram(user.id),
    wantsFullHistory ? getFullSessionHistory(user.id) : getAllClientSessions(user.id, HISTORY_RECENT),
    getClientPersonalRecords(user.id),
    getActiveSession(user.id),
    getClientCheckins(user.id),
  ]);

  // Historique complet illisible (null) : on retombe sur les dernières
  // séances, et l'écran le signale au lieu de laisser croire que c'est tout.
  const historyError = wantsFullHistory && loadedSessions === null;
  const sessions = loadedSessions ?? (await getAllClientSessions(user.id, HISTORY_RECENT));
  const showingAllHistory = wantsFullHistory && !historyError;
  const historyLimit = showingAllHistory ? FULL_HISTORY_MAX_SESSIONS : HISTORY_RECENT;

  return (
    <LogbookClient
      program={program}
      sessions={sessions}
      records={records}
      isFree={!isSubscribed(profile)}
      activeSession={activeSession}
      checkins={checkins}
      historyLimit={historyLimit}
      showingAllHistory={showingAllHistory}
      historyError={historyError}
    />
  );
}
