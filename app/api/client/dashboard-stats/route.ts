import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
export const revalidate = 0; // always fresh — this is the daily dashboard
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { computeClientDashboardStats } from "@/lib/client-dashboard-stats";

export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `client-dashboard-stats:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  return NextResponse.json(await computeClientDashboardStats(guard.userId));
}
