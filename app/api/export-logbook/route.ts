import { NextResponse } from "next/server";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientSessionsForExport } from "@/utils/sessions";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { csvEscape, csvNumber } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Un export renvoie tout l'historique d'un client en clair : on borne le
  // rythme pour qu'un compte coach compromis ne siphonne pas la base d'un coup.
  const limited = await enforceRateLimit(
    `export-logbook:${user.id}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const days = parseInt(searchParams.get("days") ?? "30");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = await getClientById(clientId, user.id);
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
