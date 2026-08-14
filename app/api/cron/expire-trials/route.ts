import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { endCoachingPhaseTracking } from "@/lib/coaching-phase";
import { notifyUser } from "@/lib/notify";
import { sendBrevoEmail } from "@/utils/brevo";

// Item 43 (chantier 50 idées) : repasse automatiquement en gratuit les
// essais coaching arrivés à échéance (trial_ends_at dépassé). Tourne une
// fois par jour, voir supabase/migrations/20260814c_expire_trials_cron.sql.
// Symétrique de setClientSubscriptionStatus(clientId, "free", ...) mais
// sans passer par requireOwnClient — un cron n'a pas de session coach,
// l'authentification se fait via CRON_SECRET comme les autres crons.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expired } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("subscription_status", "active")
    .not("trial_ends_at", "is", null)
    .lt("trial_ends_at", nowIso);

  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  let reverted = 0;
  for (const client of expired as { id: string; full_name: string | null; email: string | null }[]) {
    const { error } = await admin
      .from("profiles")
      .update({ subscription_status: "free", trial_ends_at: null })
      .eq("id", client.id);
    if (error) continue;
    reverted++;

    await admin.from("subscription_events").insert({
      client_id: client.id,
      changed_by: client.id,
      status: "free",
      note: "Essai gratuit expiré (automatique)",
    });

    // Best-effort : une phase de calibrage laissée ouverte n'empêche rien
    // de fonctionner, pas la peine de bloquer le reste du lot pour ça.
    endCoachingPhaseTracking(client.id, client.id).catch(() => {});

    const title = "Ton essai coaching est terminé";
    const body = "Tu es repassé en accès gratuit. Active un vrai coaching pour continuer avec un suivi personnalisé.";
    await notifyUser(client.id, { type: "trial_ended", title, body, url: "/dashboard/client/abonnement" }).catch(() => {});
    if (client.email) {
      sendBrevoEmail({
        to: client.email,
        subject: title,
        htmlContent: `
          <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
            <h2 style="color:#E01E1E;margin-top:0;">${title}</h2>
            <p>Salut ${client.full_name?.split(" ")[0] ?? ""},</p>
            <p>${body}</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/client/abonnement"
               style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin-top:8px;">
              Activer le coaching
            </a>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, expired: expired.length, reverted });
}
