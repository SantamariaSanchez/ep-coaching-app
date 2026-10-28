import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { todayInParis } from "@/lib/dates";
import { reviewDate, reviewState } from "@/lib/engagement";
import { addDaysIso, isoDayOfWeek } from "@/lib/roadmap-weeks";

// Un mois avant la fin d'engagement (6 mois par défaut, voir lib/engagement.ts),
// prévient le coach de proposer l'appel bilan et lui crée un rappel dans son
// agenda. Tourne une fois par jour (migration pg_cron 20261028b) ; l'anti
// doublon repose sur client_engagements.review_notified_at. Le client n'est
// jamais prévenu automatiquement : le coach envoie lui-même le message modèle
// affiché sur la fiche client.

interface EngagementRow {
  client_id: string;
  end_date: string;
  renewal_status: "en_reflexion" | "renouvele" | "arrete" | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayInParis();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("client_engagements")
    .select("client_id, end_date, renewal_status")
    .is("review_notified_at", null)
    .gte("end_date", addDaysIso(today, -30));

  let notified = 0;
  for (const e of (rows as EngagementRow[] | null) ?? []) {
    const state = reviewState(e.end_date, today, e.renewal_status);
    if (state !== "due" && state !== "late") continue;

    const { data: client } = await admin
      .from("profiles")
      .select("full_name, coach_id, subscription_status, status")
      .eq("id", e.client_id)
      .maybeSingle();
    const c = client as { full_name: string | null; coach_id: string | null; subscription_status: string | null; status: string | null } | null;
    if (!c?.coach_id || c.subscription_status !== "active" || c.status !== "active") continue;

    const name = c.full_name ?? "Un client";
    await notifyUser(c.coach_id, {
      type: "engagement_review_coach",
      title: `Appel bilan à proposer à ${name}`,
      body: state === "late"
        ? "Son engagement de 6 mois est terminé : propose un appel bilan et la suite. Un message modèle t'attend sur sa fiche."
        : `Son engagement se termine le ${e.end_date.split("-").reverse().join("/")}. Propose un appel bilan (un mois avant la fin) : un message modèle t'attend sur sa fiche.`,
      url: `/dashboard/coach/clients/${e.client_id}`,
    });

    // Rappel dans l'agenda du coach : le prochain jour, à 9 h, 30 minutes.
    const day = addDaysIso(today, 1);
    await admin.from("schedule_blocks").insert({
      owner_id: c.coach_id,
      day_of_week: isoDayOfWeek(day),
      specific_date: day,
      start_time: "09:00:00",
      end_time: "09:30:00",
      label: `Appel bilan : ${name}`,
      notes: `Fin d'engagement le ${e.end_date}. Prévu depuis le ${reviewDate(e.end_date)}. Propose le créneau au client avec le message modèle de sa fiche.`,
      tasks: [],
      notify: true,
    });

    await admin.from("client_engagements").update({ review_notified_at: new Date().toISOString() }).eq("client_id", e.client_id);
    notified++;
  }

  return NextResponse.json({ ok: true, checked: (rows ?? []).length, notified });
}
