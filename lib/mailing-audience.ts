// Utilitaires mailing sûrs à importer côté CLIENT (type d'audience, sa
// (dé)sérialisation, l'habillage de marque) — extraits de lib/brevo-mailing.ts
// et lib/coach-mailings.ts (2026-08-18) parce que ceux-ci importent
// createAdminClient/BREVO_API_KEY (secrets serveur) : un composant client
// qui aurait importé l'un des deux juste pour ces fonctions pures aurait
// entraîné tout le module, secrets compris, dans le bundle client. Ce
// fichier-ci n'importe rien de sensible — sûr à utiliser aussi bien serveur
// que client (CoachMailingComposer.tsx).
export type MailingAudience =
  | { type: "mes_clients_actifs" }
  | { type: "tous_les_membres" }
  | { type: "coachs" }
  | { type: "liste_existante"; listId: number; listName: string };

// Vit ici (pas dans app/dashboard/coach/mailing/actions.ts) pour la même
// raison que tout ce fichier : un fichier "use server" ne peut exporter que
// des fonctions async (règle Next.js), jamais une simple constante — la
// réexporter depuis actions.ts cassait le build ("A 'use server' file can
// only export async functions, found number").
export const MAX_RECIPIENTS_PER_SEND = 200;

// "clients_actifs" (et pas "mes_clients_actifs") pour rester compatible
// avec la valeur par défaut posée par la migration 20260818a_mailing_v2.sql
// sur toutes les lignes déjà en base avant ce jour.
export function audienceToStorageKey(audience: MailingAudience): string {
  if (audience.type === "liste_existante") return `liste_${audience.listId}:${audience.listName}`;
  if (audience.type === "mes_clients_actifs") return "clients_actifs";
  return audience.type;
}

export function storageKeyToAudience(key: string): MailingAudience {
  if (key.startsWith("liste_")) {
    const rest = key.slice("liste_".length);
    const [idPart, ...nameParts] = rest.split(":");
    const listId = parseInt(idPart, 10);
    return { type: "liste_existante", listId: isNaN(listId) ? 0 : listId, listName: nameParts.join(":") || "Liste Brevo" };
  }
  if (key === "tous_les_membres") return { type: "tous_les_membres" };
  if (key === "coachs") return { type: "coachs" };
  return { type: "mes_clients_actifs" };
}

export const AUDIENCE_LABELS: Record<string, string> = {
  clients_actifs: "Mes clients actifs",
  tous_les_membres: "Tous les membres",
  coachs: "Coachs",
};

export function describeAudience(audience: string): string {
  if (audience.startsWith("liste_")) {
    const [, ...nameParts] = audience.slice("liste_".length).split(":");
    const name = nameParts.join(":");
    return name || "Liste Brevo existante";
  }
  return AUDIENCE_LABELS[audience] ?? audience;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

// Habillage de marque automatique (2026-08-18, demande explicite :
// "bannière/logo de marque automatique... même identité visuelle rouge
// sombre que le reste de l'app"). Enveloppe le HTML rédigé par le coach
// entre un bandeau logo et un pied de page minimal — le corps du message
// lui-même n'est jamais modifié. Tables + styles inline volontairement
// (compatibilité email, pas de CSS externe possible dans un client mail).
// Fonction pure, sans secret : utilisée à l'envoi réel (lib/brevo-mailing.ts,
// réexportée) ET côté client pour l'aperçu avant envoi
// (CoachMailingComposer.tsx), d'où sa place ici plutôt que là-bas.
export function wrapBrandedEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0D0000;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D0000;">
      <tr>
        <td align="center" style="padding:28px 16px 12px;">
          <img src="${APP_URL}/logo-email.jpg" alt="EP Coaching" width="64" style="display:block;border-radius:10px;" />
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:0 16px 28px;">
          <table role="presentation" width="100%" style="max-width:560px;background:#1f0101;border:1px solid #890404;border-radius:14px;">
            <tr>
              <td style="padding:30px 26px;color:#F5EDED;font-size:14px;line-height:1.65;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:4px 16px 28px;color:rgba(245,237,237,0.35);font-size:11px;">
          EP Coaching
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
