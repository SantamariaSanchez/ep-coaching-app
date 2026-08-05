import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";

const ADMIN_EMAIL = "peccoux.manu@gmail.com";

// Email "métier" à l'admin (fondateur), distinct des notifications
// transactionnelles coach/client — événements de plateforme jugés
// suffisamment importants pour être suivis en temps réel (inscriptions,
// paiements, suppressions de compte). Fire-and-forget, ne doit jamais
// faire échouer l'action appelante.
// Les lignes peuvent contenir un peu de mise en forme maîtrisée (<strong>),
// mais jamais de valeur venant d'un utilisateur non échappée : les appelants
// doivent passer les données brutes dans escapeHtml (voir lib/sanitize.ts).
// Sans ça, un nom d'inscription contenant du HTML arrive tel quel dans la
// boîte du fondateur et peut y glisser un faux lien.
export async function notifyAdmin(subject: string, bodyLines: string[]): Promise<void> {
  try {
    await sendBrevoEmail({
      to: ADMIN_EMAIL,
      subject: `[EP Coaching] ${escapeHtml(subject)}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">${escapeHtml(subject)}</h2>
          ${bodyLines.map((l) => `<p style="margin:4px 0;">${l}</p>`).join("")}
        </div>
      `,
    });
  } catch {
    // non-blocking
  }
}
