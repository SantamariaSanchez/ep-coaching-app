import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getDailyGateStatus } from "@/lib/daily-gate";

// Re-vérification du verrou (bilan matin/soir + repas, voir lib/daily-gate.ts)
// après qu'une carte du bilan a été sauvegardée dans l'overlay — le
// composant client ne réimplémente jamais la logique "c'est fait ou pas",
// il rappelle toujours cette même source de vérité serveur.
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ active: null });

  const status = await getDailyGateStatus(guard.userId);
  return NextResponse.json(status);
}
