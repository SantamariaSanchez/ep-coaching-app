"use server"

import { sendBrevoEmail } from "@/utils/brevo"
import { getCoachForClient } from "@/utils/insert-notification"
import { notifyUser } from "@/lib/notify"
import { requireAuth } from "@/lib/auth-guards"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Ces fonctions sont des server actions exportées : elles sont donc
// appelables directement depuis un navigateur, avec les arguments qu'on
// veut, et pas seulement depuis les actions qui les utilisent aujourd'hui.
// Sans le moindre contrôle, n'importe qui pouvait faire envoyer par l'app
// un email et une notification push au coach, avec un nom de client et un
// texte choisis. Chacune exige maintenant requireAuth() — donc aussi une
// session forte quand le compte a activé la double authentification.
// Échec silencieux (return sans erreur) : tous les appelants les lancent
// en fire-and-forget et ne doivent jamais échouer à cause d'elles.

// En plus de l'email (seul canal historique), pousse aussi une notif
// in-app + push au coach ASSIGNÉ à ce client — fire-and-forget, ne doit
// jamais faire échouer l'action appelante.
function notifyCoach(clientId: string, params: { type: string; title: string; body: string; url: string }) {
  getCoachForClient(clientId)
    .then((coach) => {
      if (coach) notifyUser(coach.id, { ...params, senderId: clientId });
    })
    .catch(() => {});
}

export async function notifyCoachNewCheckin(clientName: string, clientId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return;
  notifyCoach(clientId, {
    type: "coach_checkin",
    title: "Nouveau check-in",
    body: `${clientName} vient d'envoyer son check-in hebdomadaire.`,
    url: "/dashboard/coach/clients",
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Nouveau check-in de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouveau check-in reçu</h2>
        <p>${clientName} vient d'envoyer son check-in hebdomadaire.</p>
        <a href="${APP_URL}/dashboard/coach/clients"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le bilan
        </a>
      </div>
    `,
  })
}

export async function notifyCoachNewCheckinWithMeasurements(clientName: string, clientId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return;
  notifyCoach(clientId, {
    type: "coach_checkin",
    title: "📏 Check-in mensuel reçu",
    body: `${clientName} a envoyé son check-in mensuel avec ses mensurations.`,
    url: "/dashboard/coach/clients",
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Check-in mensuel avec mensurations de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">📏 Check-in mensuel reçu</h2>
        <p>${clientName} vient d'envoyer son check-in mensuel avec ses nouvelles mensurations.</p>
        <a href="${APP_URL}/dashboard/coach/clients"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le bilan
        </a>
      </div>
    `,
  })
}

export async function notifyCoachNewCorrection(
  clientName: string,
  exerciseName: string,
  clientId: string
) {
  const guard = await requireAuth();
  if (!guard.ok) return;
  notifyCoach(clientId, {
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
        <p>${clientName} demande une correction sur&nbsp;:
           <strong style="color:white;">${exerciseName}</strong></p>
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
  const guard = await requireAuth();
  if (!guard.ok) return;
  notifyCoach(clientId, {
    type: "coach_photo",
    title: "Nouvelle photo update",
    body: `${clientName} : ${type} (${category})`,
    url: "/dashboard/coach/clients",
  });
  const coach = await getCoachForClient(clientId);
  if (!coach?.email) return;
  await sendBrevoEmail({
    to: coach.email,
    subject: `Nouvelle photo update de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle photo update reçue</h2>
        <p>${clientName} vient d'envoyer une mise à jour photos.</p>
        <p><strong>Type :</strong> ${type}</p>
        <p><strong>Catégorie :</strong> ${category}</p>
        <a href="${APP_URL}/dashboard/coach/clients"
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
  const guard = await requireAuth();
  if (!guard.ok) return;
  if (clientId) {
    notifyUser(clientId, {
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
        <p>Bonjour ${clientName.split(" ")[0]},</p>
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
  const guard = await requireAuth();
  if (!guard.ok) return;
  notifyCoach(clientId, {
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
        <p>${clientName} demande un guide sur&nbsp;: <strong style="color:white;">${title}</strong></p>
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
  const guard = await requireAuth();
  if (!guard.ok) return;
  if (clientId) {
    notifyUser(clientId, {
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
        <p>Bonjour ${clientName.split(" ")[0]},</p>
        <p>Ton coach a répondu à ta demande de guide sur&nbsp;: <strong style="color:white;">${title}</strong></p>
        <a href="${APP_URL}/dashboard/client/ressources"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir la réponse
        </a>
      </div>
    `,
  })
}

export async function notifyClientNewLiveEvent(
  clientEmail: string,
  clientName: string,
  title: string,
  startsAt: string
) {
  const guard = await requireAuth();
  if (!guard.ok) return;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(startsAt));

  await sendBrevoEmail({
    to: clientEmail,
    subject: `Appel programmé : ${title}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">📅 Un appel a été programmé</h2>
        <p>Bonjour ${clientName.split(" ")[0]},</p>
        <p>Ton coach a programmé <strong style="color:white;">${title}</strong> le ${dateLabel}.</p>
        <a href="${APP_URL}/dashboard/client/live"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le détail
        </a>
      </div>
    `,
  })
}

export async function notifyClientBilanReady(
  clientEmail: string,
  clientName: string,
  clientId?: string,
  coachId?: string
) {
  const guard = await requireAuth();
  if (!guard.ok) return;
  if (clientId) {
    notifyUser(clientId, {
      type: "client_bilan_ready",
      title: "Ton bilan est prêt",
      body: "Ton coach a répondu à ton check-in.",
      url: "/dashboard/client/checkin",
      senderId: coachId,
    }).catch(() => {});
  }
  await sendBrevoEmail({
    to: clientEmail,
    subject: "Ton bilan est prêt",
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Ton bilan de la semaine est disponible</h2>
        <p>Bonjour ${clientName.split(" ")[0]},</p>
        <p>Ton coach a répondu à ton check-in. Connecte-toi pour voir son retour.</p>
        <a href="${APP_URL}/dashboard/client/checkin"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir mon bilan
        </a>
      </div>
    `,
  })
}
