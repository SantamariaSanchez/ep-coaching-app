import { NextResponse } from "next/server";
import { runCoachAssistantSweep } from "@/lib/coach-assistant-sweep";

// Assistant coach quotidien (Axe 10, VISION.md) — voir
// lib/coach-assistant-sweep.ts pour la logique. Enregistré dans
// vercel.json (crons) pour un vrai déclenchement automatique.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCoachAssistantSweep();
  return NextResponse.json(result);
}
