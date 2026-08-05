import { NextResponse } from "next/server";
export const revalidate = 30;
import { requireCoach } from "@/lib/auth-guards";
import { getWeeklyCheckinCount, getPendingReplies } from "@/utils/checkins";
import { getClients, getTotalMembersCount } from "@/utils/auth";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET() {
  // requireCoach() remplace le couple getUser + contrôle de rôle maison :
  // même règle métier, plus le contrôle de force de session (2FA).
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Agregations lourdes sur toute la base du coach : quota genereux, mais reel.
  const limited = await enforceRateLimit(
    `coach-dashboard-stats:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const [clients, weeklyCount, pendingReplies, totalMembers] =
    await Promise.all([
      getClients(guard.userId),
      getWeeklyCheckinCount(),
      getPendingReplies(),
      getTotalMembersCount(guard.userId),
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
