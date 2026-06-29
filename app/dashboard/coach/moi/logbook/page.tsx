export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords } from "@/utils/sessions";
import LogbookClient from "@/components/client/LogbookClient";

export default async function CoachMonLogbookPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [program, sessions, records] = await Promise.all([
    getActiveProgram(user.id),
    getAllClientSessions(user.id, 10),
    getClientPersonalRecords(user.id),
  ]);

  return (
    <LogbookClient
      program={program}
      sessions={sessions}
      records={records}
      subNavScope="coach-moi"
    />
  );
}
