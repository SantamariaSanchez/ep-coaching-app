export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords, getActiveSession } from "@/utils/sessions";
import { getClientCheckins } from "@/utils/checkins";
import LogbookClient from "@/components/client/LogbookClient";

export default async function CoachMonLogbookPage() {
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
      activeSession={activeSession}
      checkins={checkins}
      subNavScope="coach-moi"
    />
  );
}
