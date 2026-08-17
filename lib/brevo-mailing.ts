import { createAdminClient } from "@/lib/supabase-admin";

// Axe 2 (VISION.md) : mailing par coach — décision retenue avec
// l'utilisateur (2026-08-14) = segmentation par tag/liste sous le compte
// Brevo unique existant, pas de sous-comptes séparés. Compte Brevo
// actuellement sur le plan gratuit (300 envois/jour, partagés avec les
// emails transactionnels critiques de l'app : vérification de compte,
// notifications admin, relances) — voir MAX_RECIPIENTS_PER_SEND plus bas,
// plafond défensif pour ne jamais risquer de vider le quota du jour et
// casser ces flux critiques.
const BREVO_API = "https://api.brevo.com/v3";
const SENDER = { name: "EP Coaching", email: "peccoux.manu@gmail.com" };
// Dossier Brevo déjà utilisé par les listes existantes de la plateforme
// (Newsletter EP Coaching, Leads Fiche Push, Guide Structure) — même
// rangement, pas de nouveau dossier par coach.
const BREVO_FOLDER_ID = 1;

export const MAX_RECIPIENTS_PER_SEND = 200;

function brevoHeaders() {
  return {
    "Content-Type": "application/json",
    "api-key": process.env.BREVO_API_KEY!,
  };
}

async function getOrCreateCoachList(coachId: string, coachName: string): Promise<number> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("brevo_list_id")
    .eq("id", coachId)
    .maybeSingle();

  const existing = (profile as { brevo_list_id: number | null } | null)?.brevo_list_id;
  if (existing) return existing;

  const res = await fetch(`${BREVO_API}/contacts/lists`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({ name: `Clients : ${coachName || coachId.slice(0, 8)}`, folderId: BREVO_FOLDER_ID }),
  });
  if (!res.ok) throw new Error(`Création liste Brevo échouée : ${res.status}`);
  const { id } = (await res.json()) as { id: number };

  await admin.from("profiles").update({ brevo_list_id: id }).eq("id", coachId);
  return id;
}

interface CoachClient {
  id: string;
  email: string;
  full_name: string | null;
}

// MASTERCLASS.md Axe V : cette fonction ignorait silencieusement chaque
// échec de synchronisation (`.catch(() => {})`), et l'appelant reportait
// ensuite `recipientCount: clients.length` au coach et dans l'historique
// comme si l'envoi avait forcément atteint tout le monde. Un incident
// Brevo (clé API rate-limitée, contact rejeté...) pouvait donc faire
// afficher "Envoyé à 12 clients" alors que certains n'avaient en réalité
// jamais été ajoutés à la liste. Retourne maintenant les emails en échec,
// pour que l'appelant reporte un nombre vérifié plutôt que supposé.
async function syncClientsToList(listId: number, clients: CoachClient[]): Promise<{ failedEmails: string[] }> {
  const failedEmails: string[] = [];
  // Séquentiel volontairement, pas Promise.all : l'API Brevo a une limite
  // de débit par seconde, et ce n'est jamais assez de contacts pour que la
  // latence supplémentaire soit gênante en pratique (voir MAX_RECIPIENTS_PER_SEND).
  for (const client of clients) {
    if (!client.email) continue;
    const res = await fetch(`${BREVO_API}/contacts`, {
      method: "POST",
      headers: brevoHeaders(),
      body: JSON.stringify({
        email: client.email,
        attributes: { FIRSTNAME: client.full_name?.split(" ")[0] ?? "" },
        listIds: [listId],
        updateEnabled: true,
      }),
    }).catch(() => null);
    if (!res || !res.ok) failedEmails.push(client.email);
  }
  return { failedEmails };
}

// Nombre réel de contacts dans la liste Brevo au moment de l'envoi — la
// vérité terrain, plutôt que de recompter nous-mêmes qui a été synchronisé
// avec succès (ça inclut aussi les contacts déjà présents d'un envoi
// précédent, et exclut ceux désabonnés côté Brevo). `null` si Brevo ne
// répond pas, l'appelant se rabat alors sur un décompte best effort.
async function getListSize(listId: number): Promise<number | null> {
  try {
    const res = await fetch(`${BREVO_API}/contacts/lists/${listId}`, { headers: brevoHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as { totalSubscribers?: number };
    return typeof data.totalSubscribers === "number" ? data.totalSubscribers : null;
  } catch {
    return null;
  }
}

export async function getCoachClientsForMailing(coachId: string): Promise<CoachClient[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "client")
    .eq("coach_id", coachId)
    .eq("subscription_status", "active")
    .not("email", "is", null);
  return (data as CoachClient[]) ?? [];
}

export async function sendCoachCampaign(
  coachId: string,
  coachName: string,
  subject: string,
  htmlContent: string
): Promise<{ recipientCount: number; campaignId: number | null; failedSyncCount: number }> {
  const clients = await getCoachClientsForMailing(coachId);
  if (clients.length === 0) return { recipientCount: 0, campaignId: null, failedSyncCount: 0 };
  if (clients.length > MAX_RECIPIENTS_PER_SEND) {
    throw new Error(
      `Trop de destinataires (${clients.length}, max ${MAX_RECIPIENTS_PER_SEND} par envoi). Le compte Brevo est sur le plan gratuit, partagé avec les emails critiques de l'app.`
    );
  }

  const listId = await getOrCreateCoachList(coachId, coachName);
  const { failedEmails } = await syncClientsToList(listId, clients);

  // Si absolument tous les contacts ont échoué à synchroniser (incident
  // Brevo, clé API invalide...), on n'envoie pas une campagne vers une
  // liste potentiellement vide ou périmée en la faisant passer pour un
  // succès. On échoue franchement plutôt que de créer un envoi fantôme.
  if (failedEmails.length === clients.length) {
    throw new Error(
      `Échec de synchronisation Brevo pour les ${clients.length} destinataire${clients.length > 1 ? "s" : ""}, envoi annulé.`
    );
  }

  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({
      name: `${coachName} : ${new Date().toISOString().slice(0, 10)} : ${subject.slice(0, 40)}`,
      subject,
      sender: SENDER,
      type: "classic",
      htmlContent,
      recipients: { listIds: [listId] },
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Error(`Création campagne Brevo échouée (${createRes.status}) : ${body.slice(0, 200)}`);
  }
  const { id: campaignId } = (await createRes.json()) as { id: number };

  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${campaignId}/sendNow`, {
    method: "POST",
    headers: brevoHeaders(),
  });
  if (!sendRes.ok) {
    const body = await sendRes.text().catch(() => "");
    throw new Error(`Envoi campagne Brevo échoué (${sendRes.status}) : ${body.slice(0, 200)}`);
  }

  // Nombre réel de destinataires : la taille de la liste Brevo au moment de
  // l'envoi, pas un décompte optimiste côté app (voir syncClientsToList).
  const listSize = await getListSize(listId);
  const recipientCount = listSize ?? clients.length - failedEmails.length;

  return { recipientCount, campaignId, failedSyncCount: failedEmails.length };
}
