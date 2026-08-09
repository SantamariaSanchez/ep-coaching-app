import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { PHASE_COLORS } from "@/lib/roadmap-colors";

// Prévient le client (et son coach) le jour où une nouvelle phase de sa road
// map démarre ("tu entres en Deload cette semaine") — avant, rien ne
// signalait un changement de phase, il fallait penser à aller regarder le
// calendrier. Tourne une fois par jour (voir la migration pg_cron associée) :
// une date de début ne coïncide qu'avec "aujourd'hui" un seul jour dans
// l'année, pas besoin de garde-fou anti-doublon comme les crons à intervalle
// plus court (send-reminders, schedule-block-notify).

interface PhaseRow {
  id: string;
  type: string;
  label: string;
  start_date: string;
  roadmap_id: string;
}

function parisDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = parisDateStr(new Date());
  const supabase = createAdminClient();

  const { data: phases } = await supabase
    .from("roadmap_phases")
    .select("id, type, label, start_date, roadmap_id")
    .eq("start_date", today);

  const todaysPhases = (phases as PhaseRow[] | null) ?? [];
  let sent = 0;

  for (const phase of todaysPhases) {
    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("client_id")
      .eq("id", phase.roadmap_id)
      .maybeSingle();
    const clientId = (roadmap as { client_id: string } | null)?.client_id;
    if (!clientId) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", clientId)
      .maybeSingle();
    const url = (profile as { role: string } | null)?.role === "coach" ? "/dashboard/coach/moi/roadmap" : "/dashboard/client/roadmap";

    const icon = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS]?.icon ?? "📍";

    await notifyUser(clientId, {
      type: "roadmap_phase_started",
      title: `${icon} Nouvelle phase : ${phase.label}`,
      body: `Ta road map entre aujourd'hui dans la phase "${phase.label}".`,
      url,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, checked: todaysPhases.length, sent });
}
