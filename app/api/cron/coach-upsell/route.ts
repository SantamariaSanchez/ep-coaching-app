import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { insertNotification } from "@/utils/insert-notification";

// Déclenché par Supabase pg_cron les 1er et 15 de chaque mois, voir
// supabase/migrations/20260809_coach_upsell_notifications.sql.
// Cible les membres gratuits (subscription_status != 'active') qui ont une
// activité récente (gamification_points sur les 14 derniers jours — check-in,
// nutrition, séance, communauté...) : contrairement au rappel hebdo générique
// (weekly-reengagement, qui relance même les comptes dormants), celui-ci ne
// s'adresse qu'à des gens qui utilisent déjà l'appli, pour leur proposer
// explicitement le coaching plutôt que de les relancer sur des fonctions
// qu'ils connaissent déjà. Garde-fou à 28 jours via last_upsell_notified_at :
// même si le cron tourne 2x/mois, personne ne reçoit ce nudge plus d'une fois
// par mois.
const TITLE = "🚀 Passe la vitesse supérieure";
const BODY = "Tu utilises déjà l'appli, un coach peut te construire un programme et un suivi sur mesure, avec un vrai humain derrière.";
const URL = "/dashboard/client/abonnement";

// Même habillage de marque que les autres emails de l'appli (logo, carte
// rouge sombre, pied de page) : celui-ci partait en <div> brut, sans logo
// ni cadre, donc visuellement étranger au reste.
function emailBody(firstName: string) {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  return wrapBrandedEmail(`
    <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">${TITLE}</h2>
    <p style="margin:0 0 12px;">Salut ${firstName},</p>
    <p style="margin:0 0 16px;">${BODY}</p>
    <a href="${url}${URL}" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
      Découvrir le coaching
    </a>
  `);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .neq("subscription_status", "active")
    .not("onboarding_completed_at", "is", null)
    .or(`last_upsell_notified_at.is.null,last_upsell_notified_at.lt.${twentyEightDaysAgo}`);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, candidates: 0 });
  }

  // Activité récente = présent dans gamification_points sur les 14 derniers
  // jours — signal large (check-in, nutrition, séance, communauté...) déjà
  // utilisé ailleurs dans l'appli plutôt qu'inventer un nouveau tracking.
  const candidateIds = candidates.map((c) => c.id as string);
  const { data: activePoints } = await supabase
    .from("gamification_points")
    .select("client_id")
    .in("client_id", candidateIds)
    .gte("created_at", fourteenDaysAgo);

  const activeIds = new Set((activePoints ?? []).map((p) => p.client_id as string));
  const active = candidates.filter((c) => activeIds.has(c.id as string));

  let pushed = 0;
  let emailed = 0;

  for (const client of active as { id: string; full_name: string | null; email: string | null }[]) {
    await insertNotification({ userId: client.id, type: "coach_upsell", title: TITLE, body: BODY, url: URL }).catch(() => {});

    const pushResult = await sendPushToUser(client.id, TITLE, BODY, URL);
    let notified = pushResult.ok;
    if (pushResult.ok) {
      pushed++;
    } else if (client.email) {
      const ok = await sendBrevoEmail({
        to: client.email,
        subject: TITLE,
        htmlContent: emailBody(client.full_name?.split(" ")[0] ?? ""),
      });
      if (ok) {
        emailed++;
        notified = true;
      }
    }

    if (notified) {
      await supabase.from("profiles").update({ last_upsell_notified_at: new Date().toISOString() }).eq("id", client.id);
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, active: active.length, pushed, emailed });
}
