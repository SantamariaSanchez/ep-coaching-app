// Candidatures (formulaires de préqualification, écrites par
// ep-coaching-formulaires) : tant qu'aucun setter n'est en poste, personne
// ne les recevait (staff_routed_at resté vide, 6 candidatures jamais vues
// au 16/11). Elles arrivent maintenant chez le fondateur, sur la page Leads
// et dans la carte Clients de l'accueil. Fichier pur, client et serveur.

export const PREQUAL_LABELS: Record<string, string> = {
  objectif: "Objectif",
  pourquoi: "Pourquoi",
  niveau: "Ancienneté d'entraînement",
  motivation: "Engagement",
  pourquoi_ep_coaching: "Pourquoi EP Coaching",
  lead_qualification_signal: "Déclencheur",
  blocage: "Ce qui bloque",
  timeline: "Démarrage",
  budget: "Budget mensuel",
  source_decouverte: "Découverte",
  anciennete: "Ancienneté comme coach",
  nb_clients: "Clients actuels",
  gestion_actuelle: "Gestion actuelle",
  blocage_principal: "Blocage principal",
  objectif_business: "Objectif business",
  disponibilite: "Disponibilité",
};

/** Statuts acceptés par la table (contrainte CHECK). */
export const PREQUAL_STATUSES = ["nouveau", "contacte", "appel_reserve", "ferme", "pas_adapte"] as const;
export type PrequalStatus = (typeof PREQUAL_STATUSES)[number];

export const PREQUAL_STATUS_LABELS: Record<PrequalStatus, string> = {
  nouveau: "À rappeler",
  contacte: "Contacté",
  appel_reserve: "Appel prévu",
  ferme: "Client",
  pas_adapte: "Pas adapté",
};

/** Encore à traiter : rien n'est fait tant que la personne n'a pas été jointe. */
export const OPEN_PREQUAL_STATUSES: PrequalStatus[] = ["nouveau"];

export function isPrequalStatus(v: unknown): v is PrequalStatus {
  return typeof v === "string" && (PREQUAL_STATUSES as readonly string[]).includes(v);
}

/** Réponses lisibles, dans l'ordre des libellés connus puis le reste. */
export function prequalAnswerLines(answers: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  const entries = Object.entries(answers ?? {}).filter(([, v]) => typeof v === "string" && v.trim()) as [string, string][];
  const order = Object.keys(PREQUAL_LABELS);
  const rank = (k: string) => (order.indexOf(k) === -1 ? order.length : order.indexOf(k));
  return entries
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([k, v]) => ({ label: PREQUAL_LABELS[k] ?? k, value: v.trim() }));
}

/** Jours d'attente depuis l'envoi du formulaire (0 = aujourd'hui). */
export function waitingDays(createdAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86_400_000));
}

/** Numéro au format international pour un lien WhatsApp (France par défaut). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.slice(1).replace(/\D/g, "") || null;
  if (digits.startsWith("00")) return digits.slice(2) || null;
  if (digits.startsWith("0") && digits.length === 10) return `33${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/** Premier message proposé, sans promesse ni chiffre : à adapter avant envoi. */
export function firstContactMessage(firstName: string | null | undefined, coachName?: string | null): string {
  const name = (firstName ?? "").trim();
  const me = (coachName ?? "").trim();
  return `Salut${name ? ` ${name}` : ""}, c'est ${me || "l'équipe"} d'EP Coaching. J'ai bien reçu ton formulaire, merci. Tu as 15 minutes cette semaine pour qu'on en parle au téléphone ?`;
}

/** Candidature la plus récente envoyée avec cet email (préparation d'un audit). */
export function prequalForEmail<T extends { email: string | null; created_at: string }>(email: string | null | undefined, rows: T[]): T | null {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return null;
  return rows
    .filter((r) => (r.email ?? "").trim().toLowerCase() === e)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

/** « mer. 26 nov., 00:30 » en heure de Paris. */
export function auditWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
