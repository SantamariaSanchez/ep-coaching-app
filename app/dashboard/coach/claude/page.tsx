import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { ClaudeHubPage } from "@/lib/claude-hub-page";

export const dynamic = "force-dynamic";

export default async function CoachClaudePage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client/claude");
  return <ClaudeHubPage userId={user.id} role="coach" />;
}
