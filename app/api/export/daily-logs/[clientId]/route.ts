import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/auth-guards";
import type { DailyLog } from "@/utils/daily-logs";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { csvEscape as esc, csvNumber } from "@/lib/csv";

const STRESS_FR: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
const HUNGER_FR: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  // requireAuth() plutôt que requireOwnClient() (coach uniquement) : un
  // client doit pouvoir exporter SES PROPRES bilans, et un coach exportant
  // les siens (clientId === son propre id, voir /dashboard/coach/moi/bilan)
  // n'est "propriétaire" d'aucun client au sens coach_id — l'ancien guard
  // renvoyait donc 403 sur son propre export. Le contrôle d'accès se fait
  // juste en dessous : soi-même, ou un vrai client dont on est le coach.
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const isSelf = clientId === guard.userId;
  if (!isSelf && guard.role !== "coach") {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  // Export complet de l'historique quotidien d'un client : meme garde fou que
  // pour l'export du carnet d'entrainement.
  const limited = await enforceRateLimit(
    `export-daily-logs:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const admin = createAdminClient();

  const { data: clientProfile } = await admin
    .from("profiles")
    .select("full_name, coach_id")
    .eq("id", clientId)
    .single();

  if (!clientProfile || (!isSelf && clientProfile.coach_id !== guard.userId)) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const { data: logs } = await admin
    .from("daily_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("log_date", { ascending: true });

  const rows = (logs as DailyLog[] ?? []);

  const header = [
    "Date",
    "Entraînement",
    "Note séance /10",
    "Cardio",
    "Pas",
    "Poids matin (kg)",
    "Heure pesée",
    "Sommeil (h)",
    "Qualité sommeil (%)",
    "Digestion",
    "Stress",
    "Protéines (g)",
    "Glucides (g)",
    "Lipides (g)",
    "Calories (kcal)",
    "Faim",
  ].join(",");

  const lines = rows.map((l) =>
    [
      esc(l.log_date),
      esc(l.training_name),
      csvNumber(l.training_rating),
      esc(l.cardio),
      csvNumber(l.steps),
      csvNumber(l.weight_morning),
      esc(l.weight_time),
      csvNumber(l.sleep_hours),
      csvNumber(l.sleep_rating),
      esc(l.digestion),
      esc(l.stress ? (STRESS_FR[l.stress] ?? l.stress) : null),
      csvNumber(l.proteins_g),
      csvNumber(l.carbs_g),
      csvNumber(l.fats_g),
      csvNumber(l.calories_kcal),
      esc(l.hunger ? (HUNGER_FR[l.hunger] ?? l.hunger) : null),
    ].join(",")
  );

  const csv = "﻿" + [header, ...lines].join("\n");

  const clientName = (clientProfile as { full_name: string | null }).full_name
    ?.replace(/[^a-zA-Z0-9]/g, "_") ?? "client";
  const today = new Date().toISOString().split("T")[0];
  const filename = `bilans_quotidiens_${clientName}_${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
