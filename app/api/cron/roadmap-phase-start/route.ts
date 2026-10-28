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
      .select("role, coach_id, full_name")
      .eq("id", clientId)
      .maybeSingle();
    const owner = profile as { role: string; coach_id: string | null; full_name: string | null } | null;
    const url = owner?.role === "coach" ? "/dashboard/coach/moi/roadmap" : "/dashboard/client/roadmap";

    const icon = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS]?.icon ?? "📍";

    await notifyUser(clientId, {
      type: "roadmap_phase_started",
      title: `${icon} Nouvelle phase : ${phase.label}`,
      body: `Ta road map entre aujourd'hui dans la phase "${phase.label}".`,
      url,
    });
    sent++;

    // Le commentaire d'en-tête promet "le client (et son coach)", mais
    // seul le propriétaire de la roadmap était notifié jusqu'ici : le coach
    // n'apprenait jamais qu'un client venait de changer de phase (deload,
    // intensification...), donc rien ne l'invitait à ajuster sa
    // programmation en conséquence. Même principe que
    // stagnation-escalation (client.coach_id) plutôt qu'un mécanisme séparé.
    if (owner?.role === "client" && owner.coach_id) {
      await notifyUser(owner.coach_id, {
        type: "roadmap_phase_started_coach",
        title: `${icon} ${owner.full_name ?? "Un client"} entre en ${phase.label}`,
        body: `Sa road map démarre aujourd'hui la phase "${phase.label}".`,
        url: `/dashboard/coach/clients/${clientId}`,
      });
    }
  }

  return NextResponse.json({ ok: true, checked: todaysPhases.length, sent });
}
