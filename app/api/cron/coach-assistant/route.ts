import { NextResponse } from "next/server";
import { runCoachAssistantSweep } from "@/lib/coach-assistant-sweep";

// Assistant coach quotidien (Axe 10, VISION.md) — voir
// lib/coach-assistant-sweep.ts pour la logique. Déclenché via Supabase
// pg_cron (supabase/migrations/20260819g_coach_assistant_cron.sql),
// comme toutes les autres routes app/api/cron/* de cette appli — jamais
// vercel.json, dont le cron natif ne permet qu'une fréquence quotidienne
// sur le plan Vercel utilisé ici.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCoachAssistantSweep();
  return NextResponse.json(result);
}
