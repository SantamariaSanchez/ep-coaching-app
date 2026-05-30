import { NextResponse } from "next/server";
export const revalidate = 30;
import { getUser } from "@/utils/auth";
import { getWeeklyCheckinCount, getPendingReplies } from "@/utils/checkins";
import { getPendingCorrectionsCount } from "@/utils/corrections";
import { getClients } from "@/utils/auth";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [clients, weeklyCount, pendingReplies, pendingCorrections] =
    await Promise.all([
      getClients(),
      getWeeklyCheckinCount(),
      getPendingReplies(),
      getPendingCorrectionsCount(),
    ]);

  const activeCount = clients.filter((c) => c.status === "active").length;

  return NextResponse.json({
    activeCount,
    weeklyCount,
    pendingCount: pendingReplies.length,
    pendingCorrections,
    pendingReplies,
  });
}
