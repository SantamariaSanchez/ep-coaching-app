import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getTopUrgentAlerts } from "@/lib/coach-analytics";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ alerts: [] });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") return NextResponse.json({ alerts: [] });

  // getTopUrgentAlerts parcourt tous les clients du coach et leurs donnees
  // biometriques : c'est l'une des lectures les plus lourdes de l'appli.
  const limited = await enforceRateLimit(
    `coach-urgent-alerts:${user.id}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  try {
    const alerts = await getTopUrgentAlerts(user.id, 3);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}
