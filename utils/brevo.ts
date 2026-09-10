// Liste Brevo "Newsletter EP Coaching" — centralisée ici (2026-09-10) plutôt
// que dupliquée en constante locale dans chaque appelant (app/ressources/
// actions.ts, app/api/newsletter/subscribe/route.ts, et désormais les flows
// d'inscription) : un seul endroit à changer si l'id de liste change un jour.
export const NEWSLETTER_LIST_ID = 6;

// Ajoute (ou met à jour) un contact sur une liste Brevo — utilisé pour que
// toute personne qui laisse son email (leadmagnet, etc.) rejoigne
// automatiquement le marketing en cours (newsletter générale), au lieu de
// rester un email isolé qui ne reçoit plus jamais rien après le mail de
// livraison. Demande explicite 2026-08-31 : "dès qu'on a un mail, le gars
// doit être dans tout mon contenu, mon marketing".
export async function addBrevoContactToList(
  email: string,
  listId: number,
  firstName?: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        email,
        attributes: firstName ? { FIRSTNAME: firstName } : undefined,
        listIds: [listId],
        updateEnabled: true,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Vérifie si un email est déjà abonné à une liste Brevo donnée — pour ne
// pas proposer "s'inscrire à la newsletter" à quelqu'un déjà inscrit
// (voir app/actions/newsletter.ts, carte Paramètres). Un contact absent de
// Brevo (jamais rien laissé nulle part) renvoie false, pas une erreur.
export async function isBrevoContactSubscribed(email: string, listId: number): Promise<boolean> {
  try {
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers: { "api-key": process.env.BREVO_API_KEY! },
    });
    if (!response.ok) return false; // 404 = jamais vu par Brevo, donc pas abonné
    const data = (await response.json()) as { listIds?: number[] };
    return Array.isArray(data.listIds) && data.listIds.includes(listId);
  } catch {
    return false;
  }
}

export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string
  subject: string
  htmlContent: string
}): Promise<boolean> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: "EP Coaching", email: "peccoux.manu@gmail.com" },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
