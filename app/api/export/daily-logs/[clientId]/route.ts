import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { DailyLog } from "@/utils/daily-logs";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

function esc(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const STRESS_FR: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
const HUNGER_FR: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Export complet de l'historique quotidien d'un client : meme garde fou que
  // pour l'export du carnet d'entrainement.
  const limited = await enforceRateLimit(
    `export-daily-logs:${user.id}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const admin = createAdminClient();

  const { data: coachProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (coachProfile?.role !== "coach") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: clientProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", clientId)
    .eq("coach_id", user.id)
    .single();

  if (!clientProfile) {
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
      l.training_rating ?? "",
      esc(l.cardio),
      l.steps ?? "",
      l.weight_morning ?? "",
      esc(l.weight_time),
      l.sleep_hours ?? "",
      l.sleep_rating ?? "",
      esc(l.digestion),
      esc(l.stress ? (STRESS_FR[l.stress] ?? l.stress) : null),
      l.proteins_g ?? "",
      l.carbs_g ?? "",
      l.fats_g ?? "",
      l.calories_kcal ?? "",
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
