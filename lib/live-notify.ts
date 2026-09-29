// Email "Un appel a été programmé" envoyé au client invité à un live en
// tête-à-tête. Module serveur simple (pas "use server") : il n'est donc
// jamais exposé comme server action appelable depuis un navigateur, seul
// createLiveEvent (qui a déjà vérifié le coach et son client) l'appelle.
//
// Pourquoi il ne passe plus par notifyClientNewLiveEvent
// (app/actions/notifications.ts) : ce dernier formatait l'horaire sans
// fuseau, donc en UTC sur Vercel, et l'email annonçait 16:00 pour un live
// à 18:00. L'horaire est désormais formaté ici, côté appelant, en heure de
// Paris (voir lib/live-time.ts).
import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";
import { formatLiveDateTime } from "@/lib/live-time";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendLiveScheduledEmail(params: {
  to: string;
  clientName: string;
  title: string;
  startsAt: string;
}): Promise<boolean> {
  const firstName = params.clientName.trim().split(" ")[0] ?? "";
  const dateLabel = formatLiveDateTime(params.startsAt);
  // Titre et prénom viennent de saisies libres : échappés avant d'entrer
  // dans le HTML de l'email. Le sujet est du texte brut, pas du HTML.
  return sendBrevoEmail({
    to: params.to,
    subject: `Appel programmé : ${params.title} (${dateLabel})`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">📅 Un appel a été programmé</h2>
        <p>Bonjour${firstName ? ` ${escapeHtml(firstName)}` : ""},</p>
        <p>Ton coach a programmé <strong style="color:white;">${escapeHtml(params.title)}</strong> le ${escapeHtml(dateLabel)} (heure de Paris).</p>
        <p style="color:rgba(245,237,237,0.6);font-size:13px;">La salle ouvre 10 minutes avant le début, depuis ton espace Live.</p>
        <a href="${APP_URL}/dashboard/client/live"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le détail
        </a>
      </div>
    `,
  });
}
