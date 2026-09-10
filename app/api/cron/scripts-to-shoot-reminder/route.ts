import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// Rappel "autour de" Studio créatif (2026-09-10, retour direct : "pense à
// tout, les notifs, les rappels"). Depuis les Axes BJ/BM, jusqu'à 6
// scripts/jour tombent automatiquement en "à tourner" (5 reels + 1 YouTube,
// routines cloud) — sans rappel, rien n'empêche cette liste de grossir
// silencieusement pendant des jours si le coach ne pense pas à ouvrir
// Studio créatif. Routine quotidienne, un seul critère volontairement
// simple : au moins SEUIL scripts en attente, pas de logique de date par
// script (inutilement complexe pour un rappel dont le seul but est "va
// jeter un œil", pas un audit précis).
const SEUIL_SCRIPTS_EN_ATTENTE = 5;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("coach_scripts")
    .select("coach_id, created_at")
    .eq("status", "a_tourner");

  const byCoach = new Map<string, { count: number; oldest: string }>();
  for (const r of (rows ?? []) as { coach_id: string; created_at: string }[]) {
    const existing = byCoach.get(r.coach_id);
    if (!existing) {
      byCoach.set(r.coach_id, { count: 1, oldest: r.created_at });
    } else {
      existing.count++;
      if (r.created_at < existing.oldest) existing.oldest = r.created_at;
    }
  }

  let notified = 0;
  for (const [coachId, { count, oldest }] of byCoach) {
    if (count < SEUIL_SCRIPTS_EN_ATTENTE) continue;

    const days = Math.floor((Date.now() - new Date(oldest).getTime()) / 86_400_000);
    const oldestLine = days >= 1 ? ` Le plus ancien attend depuis ${days} jour${days !== 1 ? "s" : ""}.` : "";

    await notifyUser(coachId, {
      type: "scripts_to_shoot_reminder",
      title: "🎬 Ça s'accumule dans Studio créatif",
      body: `${count} scripts prêts à tourner t'attendent.${oldestLine}`,
      url: "/dashboard/coach/studio",
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified, coachesChecked: byCoach.size });
}
