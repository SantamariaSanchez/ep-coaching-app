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
