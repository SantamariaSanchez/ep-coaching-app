import { NextResponse } from "next/server";
import { runSequences } from "@/lib/sequences-run";

// Séquences de mails automatiques (lib/sequences.ts) : relances lead,
// rappels d'audit, onboarding. Déclenché toutes les 10 minutes par pg_cron
// (migration 20261116d_sequences.sql).
export const maxDuration = 120;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSequences();
  return NextResponse.json({ ok: true, ...result });
}
