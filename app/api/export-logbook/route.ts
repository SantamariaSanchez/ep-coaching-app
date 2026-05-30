import { NextResponse } from "next/server";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientSessionsForExport } from "@/utils/sessions";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const sessions = await getClientSessionsForExport(clientId, days);

  // Build CSV
  const header =
    "Date,Jour,Durée (min),Feeling,Énergie,Pump,Exercice,Set,Poids (kg),Reps,RIR réel,Score standardisation,PR,Repos (s)\n";

  const rows: string[] = [];

  for (const session of sessions) {
    if (session.sets.length === 0) {
      rows.push(
        [
          session.session_date,
          `"${session.day_label}"`,
          session.duration_minutes ?? "",
          session.general_feeling ?? "",
          session.energy_level ?? "",
          session.pump ?? "",
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
            session.session_date,
            `"${session.day_label}"`,
            session.duration_minutes ?? "",
            session.general_feeling ?? "",
            session.energy_level ?? "",
            session.pump ?? "",
            `"${set.exercise_name}"`,
            set.set_number,
            set.weight_kg ?? "",
            set.reps_actual ?? "",
            set.rir_actual ?? "",
            set.standardization_score ?? "",
            set.is_pr ? "OUI" : "non",
            set.rest_duration_seconds ?? "",
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
