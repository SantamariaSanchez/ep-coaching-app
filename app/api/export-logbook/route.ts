import { NextResponse } from "next/server";
import { getClientById } from "@/utils/auth";
import { requireCoach } from "@/lib/auth-guards";
import { getClientSessionsForExport } from "@/utils/sessions";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { csvEscape, csvNumber } from "@/lib/csv";

export async function GET(request: Request) {
  // Un export siphonne l'historique complet d'un client : c'est exactement
  // le genre d'appel qui doit exiger une session forte quand la 2FA est active.
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Un export renvoie tout l'historique d'un client en clair : on borne le
  // rythme pour qu'un compte coach compromis ne siphonne pas la base d'un coup.
  const limited = await enforceRateLimit(
    `export-logbook:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const days = parseInt(searchParams.get("days") ?? "30");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = await getClientById(clientId, guard.userId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const sessions = await getClientSessionsForExport(clientId, days);

  // Build CSV
  const header =
    "Date,Jour,Durée (min),Feeling,Énergie,Pump,Exercice,Set,Poids (kg),Reps,RIR réel,Score standardisation,PR,Repos (s)\n";

  const rows: string[] = [];

  for (const session of sessions) {
    // Les libelles de seance et noms d'exercice sont saisis a la main : ils
    // passent par csvEscape, qui gere a la fois les guillemets/virgules et les
    // debuts de formule interpretes par Excel (voir lib/csv.ts).
    if (session.sets.length === 0) {
      rows.push(
        [
          csvEscape(session.session_date),
          csvEscape(session.day_label),
          csvNumber(session.duration_minutes),
          csvNumber(session.general_feeling),
          csvNumber(session.energy_level),
          csvNumber(session.pump),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(",")
      );
    } else {
      for (const set of session.sets) {
        rows.push(
          [
            csvEscape(session.session_date),
            csvEscape(session.day_label),
            csvNumber(session.duration_minutes),
            csvNumber(session.general_feeling),
            csvNumber(session.energy_level),
            csvNumber(session.pump),
            csvEscape(set.exercise_name),
            csvNumber(set.set_number),
            csvNumber(set.weight_kg),
            csvNumber(set.reps_actual),
            csvNumber(set.rir_actual),
            csvNumber(set.standardization_score),
            set.is_pr ? "OUI" : "non",
            csvNumber(set.rest_duration_seconds),
          ].join(",")
        );
      }
    }
  }

  const csv = header + rows.join("\n");
  const clientName = client.full_name?.replace(/[^a-zA-Z0-9]/g, "_") ?? "client";
  const filename = `logbook_${clientName}_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
