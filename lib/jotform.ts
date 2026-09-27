// Signature des contrats d'équipe via JotForm (demande directe 2026-09-27).
// Le contrat lui-même est un PDF par poste, stocké dans le bucket privé
// Supabase "staff-contracts" (voir lib/staff-contract-files.ts) : JotForm ne
// sert qu'à SIGNER, il ne contient pas le texte du contrat et rien n'y est
// conservé par l'appli (aucune suppression n'y est jamais faite non plus).
// Le PDF signé est rapatrié dans staff-contracts par le webhook.
// Activé dès que JOTFORM_API_KEY et JOTFORM_CONTRACT_FORM_ID sont définis ;
// sinon la signature intégrée à l'appli reste en place.
//
// Champs du formulaire (nom unique, onglet "Avancé" dans JotForm) :
// fullName, email, role (lecture seule), staffId et contractVersion
// (cachés), accept (case obligatoire) et signature. Ils sont préremplis par
// l'URL ci-dessous.

export const JOTFORM_API = process.env.JOTFORM_API_BASE ?? "https://api.jotform.com";

export function jotformEnabled(): boolean {
  return !!process.env.JOTFORM_API_KEY && !!process.env.JOTFORM_CONTRACT_FORM_ID;
}

export function contractFormUrl(input: { staffId: string; fullName: string; email: string; role: string; version: string }): string | null {
  const formId = process.env.JOTFORM_CONTRACT_FORM_ID;
  if (!formId) return null;
  const base = process.env.JOTFORM_FORM_BASE ?? "https://form.jotform.com";
  const q = new URLSearchParams({
    staffId: input.staffId,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    contractVersion: input.version,
  });
  return `${base}/${formId}?${q.toString()}`;
}

export interface JotformSubmission {
  id: string;
  formId: string;
  ip: string | null;
  createdAt: string | null;
  answers: Record<string, string>;
}

/**
 * Relit la soumission directement chez JotForm avec la clé API : un appel
 * au webhook ne suffit jamais à lui seul (n'importe qui peut poster dessus),
 * seule la version relue chez JotForm fait foi.
 */
export async function fetchSubmission(submissionId: string): Promise<JotformSubmission | null> {
  const key = process.env.JOTFORM_API_KEY;
  if (!key || !/^\d+$/.test(submissionId)) return null;
  try {
    const res = await fetch(`${JOTFORM_API}/submission/${submissionId}?apiKey=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { id: string; form_id: string; ip?: string; created_at?: string; answers?: Record<string, { name?: string; answer?: unknown; prettyFormat?: string }> } };
    const c = json.content;
    if (!c) return null;
    const answers: Record<string, string> = {};
    for (const a of Object.values(c.answers ?? {})) {
      if (!a?.name) continue;
      const v = a.prettyFormat ?? a.answer;
      answers[a.name] = typeof v === "string" ? v : v == null ? "" : typeof v === "object" ? Object.values(v as Record<string, unknown>).join(" ").trim() : String(v);
    }
    return { id: c.id, formId: c.form_id, ip: c.ip ?? null, createdAt: c.created_at ?? null, answers };
  } catch {
    return null;
  }
}

/** PDF de la soumission signée (tel que JotForm l'envoie par email). */
export async function fetchSubmissionPdf(formId: string, submissionId: string): Promise<ArrayBuffer | null> {
  const key = process.env.JOTFORM_API_KEY;
  if (!key) return null;
  try {
    const url = `${JOTFORM_API}/generatePDF?formid=${encodeURIComponent(formId)}&submissionid=${encodeURIComponent(submissionId)}&apikey=${encodeURIComponent(key)}&download=1`;
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // Un vrai PDF commence par "%PDF".
    const head = new Uint8Array(buf.slice(0, 4));
    if (String.fromCharCode(...head) !== "%PDF") return null;
    return buf;
  } catch {
    return null;
  }
}
