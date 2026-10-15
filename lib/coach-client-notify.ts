import "server-only";
import { sendBrevoEmail } from "@/utils/brevo";
import { getCoachForClient } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/sanitize";

// Emails + notifs coach <-> client (correction demandée, photo update,
// demande de guide et leurs réponses). Module serveur simple (pas
// "use server"), comme lib/live-notify.ts : ces fonctions vivaient dans
// app/actions/notifications.ts, donc exportées comme server actions et
// appelables depuis n'importe quel navigateur connecté, avec les arguments
// voulus. Un membre pouvait ainsi faire envoyer par l'appli un email
// « Ton coach a répondu à ta photo update » à n'importe quelle adresse, ou
// une fausse « correction demandée » au coach d'un autre membre en passant
// son clientId. Ici, seuls les appelants serveur (qui ont déjà vérifié le
// membre ou le coach) y ont accès.
//
// Tout ce qui vient d'une saisie (nom du membre, titre d'une demande de
// guide, exercice...) passe par escapeHtml avant d'entrer dans le HTML d'un
// email. Sujets et notifications push restent du texte brut.
//
// Les appelants les lancent dans after() : chaque fonction attend donc
// TOUS ses envois (notif + email) pour que rien ne soit coupé à la fin de
// la requête sur Vercel.

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// En plus de l'email (seul canal historique), pousse aussi une notif
// in-app + push au coach ASSIGNÉ à ce client — ne fait jamais échouer
// l'appelant.
async function notifyCoach(clientId: string, params: { type: string; title: string; body: string; url: string }) {
  const coach = await getCoachForClient(clientId).catch(() => null);
  if (coach) await notifyUser(coach.id, { ...params, senderId: clientId }).catch(() => {});
}

export async function notifyCoachNewCorrection(
  clientName: string,
  exerciseName: string,
  clientId: string
) {
  await notifyCoach(clientId, {
    type: "coach_correction",
    title: "Correction demandée",
    body: `${clientName} demande une correction sur ${exerciseName}.`,
    url: "/dashboard/coach/clients",
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Correction demandée par ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle correction demandée</h2>
        <p>${escapeHtml(clientName)} demande une correction sur&nbsp;:
           <strong style="color:white;">${escapeHtml(exerciseName)}</strong></p>
        <a href="${APP_URL}/dashboard/coach/clients"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir la correction
        </a>
      </div>
    `,
  })
}

export async function notifyCoachNewPhotoUpdate(
  clientName: string,
  type: string,
  category: string,
  clientId: string
) {
  // Pointait vers la liste générale des clients (fallait retrouver le bon
  // client puis cliquer sur l'onglet Photos soi-même) — direct vers sa page
  // photos maintenant, un tap suffit.
  const photosUrl = `/dashboard/coach/clients/${clientId}/photos`;
  await notifyCoach(clientId, {
    type: "coach_photo",
    title: "Nouvelle photo update",
    body: `${clientName} : ${type} (${category})`,
    url: photosUrl,
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Nouvelle photo update de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle photo update reçue</h2>
        <p>${escapeHtml(clientName)} vient d'envoyer une mise à jour photos.</p>
        <p><strong>Type :</strong> ${escapeHtml(type)}</p>
        <p><strong>Catégorie :</strong> ${escapeHtml(category)}</p>
        <a href="${APP_URL}${photosUrl}"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir les photos
        </a>
      </div>
    `,
  })
}

export async function notifyClientPhotoFeedback(
  clientEmail: string,
  clientName: string,
  clientId?: string,
  coachId?: string
) {
  if (clientId) {
    await notifyUser(clientId, {
      type: "client_photo_feedback",
      title: "Retour photo disponible",
      body: "Ton coach a répondu à ta photo update.",
      url: "/dashboard/client/photos",
      senderId: coachId,
    }).catch(() => {});
  }
  await sendBrevoEmail({
    to: clientEmail,
    subject: "Ton coach a répondu à ta photo update",
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Retour photo disponible</h2>
        <p>Bonjour ${escapeHtml(clientName.split(" ")[0])},</p>
        <p>Ton coach a répondu à ta photo update. Connecte-toi pour voir son retour.</p>
        <a href="${APP_URL}/dashboard/client/photos"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le retour
        </a>
      </div>
    `,
  })
}

export async function notifyCoachNewResourceRequest(
  clientName: string,
  title: string,
  clientId: string
) {
  await notifyCoach(clientId, {
    type: "coach_resource_request",
    title: "Demande de guide",
    body: `${clientName} demande un guide sur « ${title} ».`,
    url: "/dashboard/coach/ressources",
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Demande de guide de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle demande de guide</h2>
        <p>${escapeHtml(clientName)} demande un guide sur&nbsp;: <strong style="color:white;">${escapeHtml(title)}</strong></p>
        <a href="${APP_URL}/dashboard/coach/ressources"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir la demande
        </a>
      </div>
    `,
  })
}

export async function notifyClientRequestAnswered(
  clientEmail: string,
  clientName: string,
  title: string,
  clientId?: string,
  coachId?: string
) {
  if (clientId) {
    await notifyUser(clientId, {
      type: "client_request_answered",
      title: "Réponse disponible",
      body: `Ton coach a répondu à ta demande de guide « ${title} ».`,
      url: "/dashboard/client/ressources",
      senderId: coachId,
    }).catch(() => {});
  }
  await sendBrevoEmail({
    to: clientEmail,
    subject: "Ton coach a répondu à ta demande de guide",
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Réponse disponible</h2>
        <p>Bonjour ${escapeHtml(clientName.split(" ")[0])},</p>
        <p>Ton coach a répondu à ta demande de guide sur&nbsp;: <strong style="color:white;">${escapeHtml(title)}</strong></p>
        <a href="${APP_URL}/dashboard/client/ressources"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir la réponse
        </a>
      </div>
    `,
  })
}
