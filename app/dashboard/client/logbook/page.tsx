import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getAllClientSessions, getClientPersonalRecords, getActiveSession } from "@/utils/sessions";
import LogbookClient from "@/components/client/LogbookClient";

export default async function LogbookPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [program, sessions, records, activeSession] = await Promise.all([
    getActiveProgram(user.id),
    getAllClientSessions(user.id, 10),
    getClientPersonalRecords(user.id),
    getActiveSession(user.id),
  ]);

  return (
    <LogbookClient
      program={program}
      sessions={sessions}
      records={records}
      isFree={!isSubscribed(profile)}
      activeSession={activeSession}
    />
  );
}
