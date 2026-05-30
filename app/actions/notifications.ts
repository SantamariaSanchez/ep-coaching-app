"use server"

import { sendBrevoEmail } from "@/utils/brevo"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function notifyCoachNewCheckin(clientName: string) {
  await sendBrevoEmail({
    to: "peccoux.manu@gmail.com",
    subject: `Nouveau check-in de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouveau check-in reçu</h2>
        <p>${clientName} vient d'envoyer son check-in hebdomadaire.</p>
        <a href="${APP_URL}/dashboard/coach/bilan"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le bilan
        </a>
      </div>
    `,
  })
}

export async function notifyCoachNewCheckinWithMeasurements(clientName: string) {
  await sendBrevoEmail({
    to: "peccoux.manu@gmail.com",
    subject: `Check-in mensuel avec mensurations de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">📏 Check-in mensuel reçu</h2>
        <p>${clientName} vient d'envoyer son check-in mensuel avec ses nouvelles mensurations.</p>
        <a href="${APP_URL}/dashboard/coach/bilan"
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
  exerciseName: string
) {
  await sendBrevoEmail({
    to: "peccoux.manu@gmail.com",
    subject: `Correction demandée par ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle correction demandée</h2>
        <p>${clientName} demande une correction sur&nbsp;:
           <strong style="color:white;">${exerciseName}</strong></p>
        <a href="${APP_URL}/dashboard/coach/bilan"
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
  category: string
) {
  await sendBrevoEmail({
    to: "peccoux.manu@gmail.com",
    subject: `Nouvelle photo update de ${clientName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouvelle photo update reçue</h2>
        <p>${clientName} vient d'envoyer une mise à jour photos.</p>
        <p><strong>Type :</strong> ${type}</p>
        <p><strong>Catégorie :</strong> ${category}</p>
        <a href="${APP_URL}/dashboard/coach/bilan"
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
  clientName: string
) {
  await sendBrevoEmail({
    to: clientEmail,
    subject: "Ton coach a répondu à ta photo update",
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Retour photo disponible</h2>
        <p>Bonjour ${clientName.split(" ")[0]},</p>
        <p>Emmanuel a répondu à ta photo update. Connecte-toi pour voir son retour.</p>
        <a href="${APP_URL}/dashboard/client/photos"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir le retour
        </a>
      </div>
    `,
  })
}

export async function notifyClientBilanReady(
  clientEmail: string,
  clientName: string
) {
  await sendBrevoEmail({
    to: clientEmail,
    subject: "Ton bilan est prêt",
    htmlContent: `
      <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Ton bilan de la semaine est disponible</h2>
        <p>Bonjour ${clientName.split(" ")[0]},</p>
        <p>Emmanuel a répondu à ton check-in. Connecte-toi pour voir son retour.</p>
        <a href="${APP_URL}/dashboard/client/checkin"
           style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                  text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
          Voir mon bilan
        </a>
      </div>
    `,
  })
}
