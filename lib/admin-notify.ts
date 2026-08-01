import { sendBrevoEmail } from "@/utils/brevo";

const ADMIN_EMAIL = "peccoux.manu@gmail.com";

// Email "métier" à l'admin (fondateur), distinct des notifications
// transactionnelles coach/client — événements de plateforme jugés
// suffisamment importants pour être suivis en temps réel (inscriptions,
// paiements, suppressions de compte). Fire-and-forget, ne doit jamais
// faire échouer l'action appelante.
export async function notifyAdmin(subject: string, bodyLines: string[]): Promise<void> {
  try {
    await sendBrevoEmail({
      to: ADMIN_EMAIL,
      subject: `[EP Coaching] ${subject}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">${subject}</h2>
          ${bodyLines.map((l) => `<p style="margin:4px 0;">${l}</p>`).join("")}
        </div>
      `,
    });
  } catch {
    // non-blocking
  }
}
