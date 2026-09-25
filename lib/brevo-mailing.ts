import { createAdminClient } from "@/lib/supabase-admin";
import { MAX_RECIPIENTS_PER_SEND, type MailingAudience } from "@/lib/mailing-audience";
import { todayInParis } from "@/lib/dates";

// Axe 2 (VISION.md) : mailing par coach — décision retenue avec
// l'utilisateur (2026-08-14) = segmentation par tag/liste sous le compte
// Brevo unique existant, pas de sous-comptes séparés. Compte Brevo
// actuellement sur le plan gratuit (300 envois/jour, partagés avec les
// emails transactionnels critiques de l'app : vérification de compte,
// notifications admin, relances) — voir MAX_RECIPIENTS_PER_SEND plus bas,
// plafond défensif pour ne jamais risquer de vider le quota du jour et
// casser ces flux critiques.
//
// Mailing v2 (2026-08-18, MASTERCLASS.md Axe V/X) : retour direct de
// l'utilisateur suite aux questions posées sur cet onglet — "le mailing
// c'est pour la newsletter par coach... je dois pouvoir envoyer soit à
// tout le monde (toute ma liste newsletter Brevo) soit que aux membres
// soit que aux coachs, je veux tout centraliser". D'où MailingAudience
// ci-dessous : chaque coach garde son audience par défaut (ses propres
// clients actifs), le propriétaire de la plateforme gagne en plus la
// possibilité de viser tous les membres, l'équipe de coachs, ou une liste
// Brevo déjà existante (sa newsletter historique). Reste sur le compte
// Brevo unique existant pour l'instant (voir la note dans CROISSANCE.md) —
// la connexion "chaque coach son propre compte Brevo" attendra un vrai
// 2e coach actif, comme pour le CRM (même décision déjà actée le 14/08).
// Exportés pour lib/brevo-stats.ts (lecture des statistiques de campagne) :
// même base d'API et mêmes en-têtes que les fonctions d'envoi ci-dessous,
// une seule source de vérité plutôt que de dupliquer la clé/URL ailleurs.
export const BREVO_API = "https://api.brevo.com/v3";
const SENDER = { name: "EP Coaching", email: "peccoux.manu@gmail.com" };
// Dossier Brevo déjà utilisé par les listes existantes de la plateforme
// (Newsletter EP Coaching, Leads Fiche Push, Guide Structure) — même
// rangement, pas de nouveau dossier par coach.
const BREVO_FOLDER_ID = 1;

export { MAX_RECIPIENTS_PER_SEND };

const MEMBERS_LIST_NAME = "Tous les membres EP Coaching";
const COACHS_LIST_NAME = "Coachs EP Coaching";

export type { MailingAudience };

export function brevoHeaders() {
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

export interface BrevoListSummary {
  id: number;
  name: string;
  totalSubscribers: number;
}

// Liste les listes de contacts déjà existantes dans le compte Brevo (dont
// la newsletter historique de l'utilisateur, créée en dehors de l'app) —
// pour le sélecteur d'audience "liste Brevo existante" du composeur.
export async function getBrevoLists(): Promise<BrevoListSummary[]> {
  try {
    const res = await fetch(`${BREVO_API}/contacts/lists?limit=50&sort=desc`, { headers: brevoHeaders() });
    if (!res.ok) return [];
    const data = (await res.json()) as { lists?: { id: number; name: string; totalSubscribers: number }[] };
    return (data.lists ?? []).map((l) => ({ id: l.id, name: l.name, totalSubscribers: l.totalSubscribers }));
  } catch {
    return [];
  }
}

async function getOrCreateNamedList(name: string): Promise<number> {
  const lists = await getBrevoLists();
  const existing = lists.find((l) => l.name === name);
  if (existing) return existing.id;

  const res = await fetch(`${BREVO_API}/contacts/lists`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({ name, folderId: BREVO_FOLDER_ID }),
  });
  if (!res.ok) throw new Error(`Création liste Brevo échouée : ${res.status}`);
  const { id } = (await res.json()) as { id: number };
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
        attributes: {
          PRENOM: client.full_name?.split(" ")[0] ?? "",
          NOM: client.full_name?.split(" ").slice(1).join(" ") ?? "",
        },
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

async function getAllMembersForMailing(): Promise<CoachClient[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "client")
    .not("email", "is", null);
  return (data as CoachClient[]) ?? [];
}

async function getAllCoachesForMailing(): Promise<CoachClient[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "coach")
    .not("email", "is", null);
  return (data as CoachClient[]) ?? [];
}

// wrapBrandedEmail vit dans lib/mailing-audience.ts (pas ici) : c'est une
// fonction pure sans secret, et CoachMailingComposer.tsx (client) en a
// besoin pour l'aperçu avant envoi — l'importer directement d'ici aurait
// entraîné createAdminClient/BREVO_API_KEY dans le bundle client.
export { wrapBrandedEmail } from "@/lib/mailing-audience";

async function resolveAudience(
  coachId: string,
  coachName: string,
  audience: MailingAudience
): Promise<{ listId: number; clientsToSync: CoachClient[] | null }> {
  if (audience.type === "liste_existante") {
    // Liste déjà gérée côté Brevo (la newsletter historique par exemple) :
    // aucune synchronisation, on cible directement.
    return { listId: audience.listId, clientsToSync: null };
  }
  if (audience.type === "tous_les_membres") {
    const listId = await getOrCreateNamedList(MEMBERS_LIST_NAME);
    return { listId, clientsToSync: await getAllMembersForMailing() };
  }
  if (audience.type === "coachs") {
    const listId = await getOrCreateNamedList(COACHS_LIST_NAME);
    return { listId, clientsToSync: await getAllCoachesForMailing() };
  }
  const listId = await getOrCreateCoachList(coachId, coachName);
  return { listId, clientsToSync: await getCoachClientsForMailing(coachId) };
}

// Le compte Brevo nomme les attributs PRENOM/NOM, pas FIRSTNAME/LASTNAME :
// un brouillon écrit avec l'ancienne balise partait avec "Salut ," sans
// prénom. Converti ici pour couvrir aussi les brouillons déjà enregistrés.
function normalizeMergeTags(text: string): string {
  return text
    .replace(/\{\{\s*contact\.FIRSTNAME\s*\}\}/g, "{{contact.PRENOM}}")
    .replace(/\{\{\s*contact\.LASTNAME\s*\}\}/g, "{{contact.NOM}}");
}

export async function sendCoachCampaign(
  coachId: string,
  coachName: string,
  subject: string,
  htmlContent: string,
  audience: MailingAudience = { type: "mes_clients_actifs" },
  scheduledAt?: string
): Promise<{ recipientCount: number; campaignId: number | null; failedSyncCount: number; scheduled: boolean }> {
  const { listId, clientsToSync } = await resolveAudience(coachId, coachName, audience);

  let failedSyncCount = 0;
  let fallbackCount = 0;

  if (clientsToSync !== null) {
    if (clientsToSync.length === 0) return { recipientCount: 0, campaignId: null, failedSyncCount: 0, scheduled: false };
    if (clientsToSync.length > MAX_RECIPIENTS_PER_SEND) {
      throw new Error(
        `Trop de destinataires (${clientsToSync.length}, max ${MAX_RECIPIENTS_PER_SEND} par envoi). Le compte Brevo est sur le plan gratuit, partagé avec les emails critiques de l'app.`
      );
    }
    const { failedEmails } = await syncClientsToList(listId, clientsToSync);
    failedSyncCount = failedEmails.length;
    fallbackCount = clientsToSync.length - failedEmails.length;

    // Si absolument tous les contacts ont échoué à synchroniser (incident
    // Brevo, clé API invalide...), on n'envoie pas une campagne vers une
    // liste potentiellement vide ou périmée en la faisant passer pour un
    // succès. On échoue franchement plutôt que de créer un envoi fantôme.
    if (failedEmails.length === clientsToSync.length) {
      throw new Error(
        `Échec de synchronisation Brevo pour les ${clientsToSync.length} destinataire${clientsToSync.length > 1 ? "s" : ""}, envoi annulé.`
      );
    }
  }

  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({
      name: `${coachName} : ${todayInParis()} : ${subject.slice(0, 40)}`,
      subject: normalizeMergeTags(subject),
      sender: SENDER,
      type: "classic",
      htmlContent: normalizeMergeTags(htmlContent),
      recipients: { listIds: [listId] },
      ...(scheduledAt ? { scheduledAt } : {}),
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Error(`Création campagne Brevo échouée (${createRes.status}) : ${body.slice(0, 200)}`);
  }
  const { id: campaignId } = (await createRes.json()) as { id: number };

  // Un envoi programmé (scheduledAt déjà passé à la création ci-dessus) ne
  // demande pas de sendNow — Brevo s'en charge lui-même à l'heure dite. Pas
  // de confirmation webhook dans cette version : le statut "scheduled" est
  // optimiste, basé sur la création de campagne réussie.
  if (!scheduledAt) {
    const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${campaignId}/sendNow`, {
      method: "POST",
      headers: brevoHeaders(),
    });
    if (!sendRes.ok) {
      const body = await sendRes.text().catch(() => "");
      throw new Error(`Envoi campagne Brevo échoué (${sendRes.status}) : ${body.slice(0, 200)}`);
    }
  }

  // Nombre réel de destinataires : la taille de la liste Brevo au moment de
  // l'envoi, pas un décompte optimiste côté app (voir syncClientsToList).
  const listSize = await getListSize(listId);
  const recipientCount = listSize ?? fallbackCount;

  return { recipientCount, campaignId, failedSyncCount, scheduled: !!scheduledAt };
}
