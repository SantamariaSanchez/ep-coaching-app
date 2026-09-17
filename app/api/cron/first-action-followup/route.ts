import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { insertNotification } from "@/utils/insert-notification";
import { sendBrevoEmail } from "@/utils/brevo";
import { buildFollowupMessage } from "@/lib/first-action-followup";

// Relance à J+1 après la toute première action d'un membre gratuit (voir
// lib/first-action-followup.ts pour le raisonnement complet). Résout un trou
// identifié le 2026-09-17 : lib/first-action-celebration.ts félicite déjà
// (in-app + push, jamais d'email) le geste lui-même, mais dès qu'il existe le
// membre est classé "actif" par weekly-reengagement (fenêtre de 10 jours,
// lib/reengagement.ts) et ne reçoit plus rien avant longtemps — exactement au
// moment où un rappel compte le plus pour transformer ce geste en habitude.
//
// Fenêtre volontairement large (20h à 44h) plutôt que "pile 24h" : un cron
// quotidien qui viserait une fenêtre étroite raterait des membres si son
// horaire dérive d'un jour à l'autre. 44h laisse une vraie marge de
// recouvrement entre deux passages quotidiens sans jamais doubler un envoi
// (garde-fou définitif : first_action_followup_sent_at, jamais réinitialisé).
const MIN_HOURS_AFTER = 20;
const MAX_HOURS_AFTER = 44;

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  const now = Date.now();
  const windowStart = new Date(now - MAX_HOURS_AFTER * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now - MIN_HOURS_AFTER * 60 * 60 * 1000).toISOString();

  // Uniquement les membres gratuits (subscription_status != "active") : un
  // client accompagné a déjà un coach humain qui suit son démarrage, cette
  // relance automatisée cible spécifiquement ceux qui n'ont personne d'autre
  // pour les ramener le lendemain de leur premier geste.
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .neq("subscription_status", "active")
    .is("first_action_followup_sent_at", null)
    .gte("first_real_action_at", windowStart)
    .lte("first_real_action_at", windowEnd);

  const rows = (clients as ClientRow[] | null) ?? [];
  let pushed = 0;
  let emailed = 0;

  for (const client of rows) {
    const [workoutLogs, foodLogs, dailyLogs] = await Promise.all([
      supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", client.id),
      supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("client_id", client.id),
      supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("client_id", client.id),
    ]);

    const message = buildFollowupMessage({
      firstName: client.full_name?.split(" ")[0] ?? "",
      appUrl,
      doneWorkout: (workoutLogs.count ?? 0) > 0,
      doneMeal: (foodLogs.count ?? 0) > 0,
      doneBilan: (dailyLogs.count ?? 0) > 0,
    });

    const pushResult = await sendPushToUser(client.id, message.pushTitle, message.pushBody, message.pushUrl);
    if (pushResult.ok) pushed++;

    if (client.email) {
      const ok = await sendBrevoEmail({
        to: client.email,
        subject: message.subject,
        htmlContent: message.html,
      });
      if (ok) emailed++;
    }

    // Cloche in-app dans tous les cas : seule trace consultable dans l'appli
    // pour un membre dont le push a échoué et qui ne consulte pas ses mails.
    await insertNotification({
      userId: client.id,
      type: "first_action_followup",
      title: message.pushTitle,
      body: message.pushBody,
      url: message.pushUrl,
    }).catch(() => {});

    // Marqué une seule fois, que l'envoi ait réussi ou non sur chaque canal :
    // un échec transitoire de push/email ne doit pas faire relancer
    // indéfiniment le même membre à chaque passage du cron.
    await supabase
      .from("profiles")
      .update({ first_action_followup_sent_at: new Date().toISOString() })
      .eq("id", client.id);
  }

  return NextResponse.json({ ok: true, candidates: rows.length, pushed, emailed });
}
