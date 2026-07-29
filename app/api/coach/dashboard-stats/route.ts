import { NextResponse } from "next/server";
export const revalidate = 30;
import { getUser, getProfile } from "@/utils/auth";
import { getWeeklyCheckinCount, getPendingReplies } from "@/utils/checkins";
import { getClients, getTotalMembersCount } from "@/utils/auth";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [clients, weeklyCount, pendingReplies, totalMembers] =
    await Promise.all([
      getClients(user.id),
      getWeeklyCheckinCount(),
      getPendingReplies(),
      getTotalMembersCount(user.id),
    ]);

  const activeCount = clients.filter((c) => c.status === "active").length;

  return NextResponse.json({
    activeCount,
    weeklyCount,
    pendingCount: pendingReplies.length,
    totalMembers,
    pendingReplies,
  });
}
