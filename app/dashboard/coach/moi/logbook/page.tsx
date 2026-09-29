export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords, getActiveSession } from "@/utils/sessions";
import { getClientCheckins } from "@/utils/checkins";
import LogbookClient from "@/components/client/LogbookClient";
// Même chargeur que le logbook membre : l'historique complet est lu par
// paquets, séries comprises (voir le fichier pour le pourquoi).
import {
  getFullSessionHistory,
  FULL_HISTORY_MAX_SESSIONS,
} from "@/app/dashboard/client/logbook/session-history";

const HISTORY_RECENT = 10;

export default async function CoachMonLogbookPage({
  searchParams,
}: {
  searchParams: Promise<{ historique?: string | string[] }>;
}) {
  // "Mes dernières séances" était plafonné à 10 sans moyen de remonter plus
  // loin : ?historique=tout (lien en bas de la liste) charge tout
  // l'historique.
  const { historique } = await searchParams;
  const wantsFullHistory = historique === "tout";

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  // Manquaient entièrement ici (retour "travaille sur tout, coach client
  // membre", 2026-09-09) : activeSession (bannière "reprendre ta séance en
  // cours", app/dashboard/client/logbook/page.tsx) et checkins (graphiques
  // de progression ClientProgressCharts) existent côté client mais
  // n'étaient jamais chargés ni passés à LogbookClient ici — un coach qui
  // quitte une séance en cours de log n'avait donc aucun moyen de la
  // reprendre depuis Moi > Logbook, et son propre graphique de progression
  // n'apparaissait jamais, même avec des check-ins complétés.
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
      activeSession={activeSession}
      checkins={checkins}
      historyLimit={historyLimit}
      showingAllHistory={showingAllHistory}
      historyError={historyError}
      subNavScope="coach-moi"
    />
  );
}
