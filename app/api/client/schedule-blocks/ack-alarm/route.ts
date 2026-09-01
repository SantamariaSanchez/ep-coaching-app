import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { parisDateStr } from "@/lib/schedule-time";

// Arrête l'escalade d'un réveil (voir app/api/cron/schedule-block-notify) :
// appelé par le bouton "Arrêter" d'AlarmPlayer.tsx et par l'action "stop-alarm"
// de la notification système (public/sw.js), les deux seuls endroits où
// l'utilisateur signale "je suis réveillé, arrête de sonner". Sans cet
// acquittement, un réveil sans réponse relancerait indéfiniment (jusqu'à la
// limite de 30 min posée côté cron).
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { blockId } = (await request.json().catch(() => ({}))) as { blockId?: string };
  if (!blockId) return NextResponse.json({ error: "blockId manquant" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("schedule_blocks")
    .update({ alarm_ack_date: parisDateStr(new Date()) })
    .eq("id", blockId)
    .eq("owner_id", guard.userId); // jamais acquitter le bloc de quelqu'un d'autre

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
