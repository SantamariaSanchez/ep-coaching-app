export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getClientSessions, getClientPersonalRecords, buildPRMap } from "@/utils/sessions";
import LogbookClient from "@/components/client/LogbookClient";

export default async function CoachMonLogbookPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [program, sessions, records] = await Promise.all([
    getActiveProgram(user.id),
    getClientSessions(user.id, 5),
    getClientPersonalRecords(user.id),
  ]);

  const prMap = buildPRMap(records);

  return (
    <LogbookClient
      program={program}
      sessions={sessions}
      records={records}
      prMap={prMap}
    />
  );
}
