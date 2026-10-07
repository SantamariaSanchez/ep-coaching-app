import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { ClaudeHubPage } from "@/lib/claude-hub-page";

export const dynamic = "force-dynamic";

export default async function ClientClaudePage() {
  const user = await getUser();
  if (!user) redirect("/");
  return <ClaudeHubPage userId={user.id} role="client" />;
}
