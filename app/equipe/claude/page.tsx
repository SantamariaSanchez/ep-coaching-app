import { redirect } from "next/navigation";
import { loadStaffContext } from "@/lib/staff-page";
import { ClaudeHubPage } from "@/lib/claude-hub-page";

export const dynamic = "force-dynamic";

export default async function StaffClaudePage() {
  const ctx = await loadStaffContext();
  if (typeof ctx === "string") redirect("/equipe");
  return <ClaudeHubPage userId={ctx.userId} role="staff" />;
}
