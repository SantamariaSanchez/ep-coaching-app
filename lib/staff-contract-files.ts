import { createAdminClient } from "@/lib/supabase-admin";
import { STAFF_CONTRACT_VERSION } from "@/lib/staff-contract";

// Contrats d'équipe en PDF (décision du fondateur 2026-09-27) : un modèle
// PDF par poste et les PDF signés, tous dans le bucket privé
// "staff-contracts" de Supabase Storage. Rien n'est gardé côté JotForm, qui
// ne sert qu'à recueillir la signature.
//
//   templates/{roleKey}/{version}.pdf              modèle vierge du poste
//   signed/{staffId}/{version}-{submissionId}.pdf  contrat signé
//
// Le bucket est privé : l'appli ne sert les fichiers que par des liens
// signés de courte durée, générés côté serveur après avoir vérifié qui
// demande (la recrue pour son poste et ses contrats, le fondateur pour tout).
// Les modèles se génèrent avec `npm run contracts:generate` et s'envoient
// avec `npm run contracts:upload` (voir EQUIPE-IA.md).

export const CONTRACTS_BUCKET = "staff-contracts";
const TEN_MINUTES = 600;

export function templatePath(roleKey: string, version: string = STAFF_CONTRACT_VERSION): string {
  return `templates/${roleKey}/${version}.pdf`;
}

export function signedContractPath(staffId: string, version: string, submissionId: string): string {
  return `signed/${staffId}/${version}-${submissionId}.pdf`;
}

async function signedUrl(path: string, seconds: number, downloadName?: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(CONTRACTS_BUCKET)
      .createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export interface ContractFile {
  path: string;
  viewUrl: string;
  downloadUrl: string;
}

/** Modèle PDF du poste, ou null s'il n'a pas encore été envoyé. */
export async function getTemplateFile(roleKey: string, fileLabel: string, version: string = STAFF_CONTRACT_VERSION): Promise<ContractFile | null> {
  const path = templatePath(roleKey, version);
  const [viewUrl, downloadUrl] = await Promise.all([
    signedUrl(path, TEN_MINUTES),
    signedUrl(path, TEN_MINUTES, `Contrat EP Coaching - ${fileLabel} (${version}).pdf`),
  ]);
  if (!viewUrl || !downloadUrl) {
    console.error(`[contrats] modèle PDF manquant pour le poste "${roleKey}" (${path})`);
    return null;
  }
  return { path, viewUrl, downloadUrl };
}

/** Dernier contrat signé d'un membre (le plus récent en premier). */
export async function getLatestSignedContract(staffId: string, fileLabel: string): Promise<(ContractFile & { name: string }) | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(CONTRACTS_BUCKET)
      .list(`signed/${staffId}`, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
    if (error || !data?.length) return null;
    const file = data.find((f) => f.name.endsWith(".pdf"));
    if (!file) return null;
    const path = `signed/${staffId}/${file.name}`;
    const [viewUrl, downloadUrl] = await Promise.all([
      signedUrl(path, TEN_MINUTES),
      signedUrl(path, TEN_MINUTES, `Contrat signé - ${fileLabel}.pdf`),
    ]);
    if (!viewUrl || !downloadUrl) return null;
    return { path, name: file.name, viewUrl, downloadUrl };
  } catch {
    return null;
  }
}

/** Enregistre le PDF signé (jamais d'écrasement d'un contrat existant). */
export async function storeSignedContract(staffId: string, version: string, submissionId: string, pdf: ArrayBuffer): Promise<string | null> {
  const path = signedContractPath(staffId, version, submissionId);
  const admin = createAdminClient();
  const { error } = await admin.storage.from(CONTRACTS_BUCKET).upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: false });
  // Déjà présent (webhook rejoué par JotForm) : même soumission, même fichier.
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error("[contrats] enregistrement du PDF signé impossible:", error.message);
    return null;
  }
  return path;
}
