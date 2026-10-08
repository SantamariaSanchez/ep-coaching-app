import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { getTopUrgentAlerts } from "@/lib/coach-analytics";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET() {
  // Échec silencieux (liste vide) comme avant, pour ne pas faire clignoter
  // une erreur sur le tableau de bord — mais le guard couvre maintenant la
  // force de session en plus du rôle.
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ alerts: [] });

  // getTopUrgentAlerts parcourt tous les clients du coach et leurs donnees
  // biometriques : c'est l'une des lectures les plus lourdes de l'appli.
  const limited = await enforceRateLimit(
    `coach-urgent-alerts:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  try {
    const alerts = await getTopUrgentAlerts(guard.userId, 3);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}
