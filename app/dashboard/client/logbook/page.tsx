import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import {
  getClientSessions,
  getClientPersonalRecords,
  buildPRMap,
} from "@/utils/sessions";
import LogbookClient from "@/components/client/LogbookClient";

export default async function LogbookPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

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
