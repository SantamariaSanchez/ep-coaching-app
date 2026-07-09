import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { sendBrevoEmail } from "@/utils/brevo";

// Rappel hebdomadaire de réengagement — 1 fois par semaine maximum, par
// client, jamais plus (garde-fou via last_reengagement_notified_at, en plus
// du cron lui-même qui ne tourne qu'une fois par semaine). Déclenché par
// Supabase pg_cron, voir supabase/migrations/20260715_reengagement_notifications.sql.
// Deux canaux :
//   - push, si le client a déjà autorisé les notifications (sendPushToUser
//     renvoie reason: "no subscription" sinon, ce qui sert de bascule) ;
//   - sinon email, pour ne jamais laisser un inscrit sans aucune sollicitation
//     simplement parce qu'il n'a pas (encore) accepté les notifications.

const PUSH_MESSAGES = [
  { title: "🗺️ Ta Road Map t'attend", body: "Fixe tes objectifs à 3 mois si ce n'est pas déjà fait.", url: "/dashboard/client/roadmap" },
  { title: "🏆 Partage ta victoire de la semaine", body: "La communauté est là pour t'encourager, même une petite victoire compte.", url: "/dashboard/client/communaute/victoires" },
  { title: "🍽️ Check tes macros du jour", body: "Ton calculateur nutrition est prêt en 2 minutes.", url: "/dashboard/client/nutrition" },
  { title: "💪 Log ta dernière séance", body: "Même une séance rapide mérite sa place dans ton logbook.", url: "/dashboard/client/logbook" },
  { title: "📚 Nouvelles ressources dispo", body: "Des guides et recettes gratuites t'attendent.", url: "/dashboard/client/ressources" },
];

const EMAIL_SUBJECT = "On continue ?";
function emailBody(firstName: string) {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  return `
    <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
      <h2 style="color:#E01E1E;margin-top:0;">Salut ${firstName} 👋</h2>
      <p>Ton compte EP Coaching est prêt : programme, nutrition, communauté, tout est gratuit et accessible dès maintenant.</p>
      <p>Deux minutes suffisent pour reprendre où tu t'es arrêté·e.</p>
      <a href="${url}/dashboard/client" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin-top:8px;">
        Ouvrir mon espace
      </a>
    </div>
  `;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client")
    .not("onboarding_completed_at", "is", null)
    .or(`last_reengagement_notified_at.is.null,last_reengagement_notified_at.lt.${sevenDaysAgo}`);

  let pushed = 0;
  let emailed = 0;

  for (const client of (clients as { id: string; full_name: string | null }[]) ?? []) {
    const msg = PUSH_MESSAGES[Math.floor(Math.random() * PUSH_MESSAGES.length)];
    const pushResult = await sendPushToUser(client.id, msg.title, msg.body, msg.url);

    let notified = pushResult.ok;
    if (pushResult.ok) {
      pushed++;
    } else if (pushResult.reason === "no subscription") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", client.id)
        .single();
      if (profile?.email) {
        const ok = await sendBrevoEmail({
          to: profile.email,
          subject: EMAIL_SUBJECT,
          htmlContent: emailBody(client.full_name?.split(" ")[0] ?? ""),
        });
        if (ok) {
          emailed++;
          notified = true;
        }
      }
    }

    if (notified) {
      await supabase
        .from("profiles")
        .update({ last_reengagement_notified_at: new Date().toISOString() })
        .eq("id", client.id);
    }
  }

  return NextResponse.json({ ok: true, candidates: clients?.length ?? 0, pushed, emailed });
}
