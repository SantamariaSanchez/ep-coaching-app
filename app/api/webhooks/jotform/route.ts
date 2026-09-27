import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { escapeHtml } from "@/lib/sanitize";
import { notifyAdmin } from "@/lib/admin-notify";
import { notifyUser } from "@/lib/notify";
import { getStaffMember, sendContractEmail } from "@/lib/staff";
import { getRoleCard } from "@/lib/staff-roles";
import { STAFF_CONTRACT_VERSION, STAFF_TERMS_VERSION } from "@/lib/staff-contract";
import { fetchSubmission, fetchSubmissionPdf, jotformEnabled } from "@/lib/jotform";
import { storeSignedContract } from "@/lib/staff-contract-files";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Webhook JotForm : appelé à chaque contrat signé sur le formulaire JotForm.
// Rien n'est cru sur parole : la soumission est relue chez JotForm avec la
// clé API, rattachée à la recrue par son identifiant caché (staffId), et le
// nom signé doit correspondre. Ensuite : contrat marqué signé, PDF signé
// rangé dans les documents (la recrue et le fondateur le voient), copie par
// email à la recrue, alerte au fondateur.
export async function POST(req: Request) {
  if (!jotformEnabled()) return NextResponse.json({ ok: false, reason: "jotform off" }, { status: 503 });
  const token = process.env.JOTFORM_WEBHOOK_TOKEN;
  if (token && new URL(req.url).searchParams.get("token") !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let submissionId = "";
  try {
    const form = await req.formData();
    submissionId = String(form.get("submissionID") ?? form.get("submission_id") ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const sub = await fetchSubmission(submissionId);
  if (!sub || sub.formId !== process.env.JOTFORM_CONTRACT_FORM_ID) {
    return NextResponse.json({ error: "Soumission inconnue" }, { status: 400 });
  }

  const staffId = (sub.answers.staffId ?? "").trim();
  const member = /^[0-9a-f-]{36}$/i.test(staffId) ? await getStaffMember(staffId) : null;
  if (!member) {
    await notifyAdmin("Contrat JotForm non rattaché", [
      `Soumission ${escapeHtml(sub.id)} reçue sans recrue reconnue (staffId "${escapeHtml(staffId)}").`,
      `Nom saisi : ${escapeHtml(sub.answers.fullName ?? "")}, email : ${escapeHtml(sub.answers.email ?? "")}.`,
    ]);
    return NextResponse.json({ ok: false, reason: "membre inconnu" });
  }

  const signedName = (sub.answers.fullName ?? "").trim() || member.full_name;
  if (normalizeName(signedName) !== normalizeName(member.full_name)) {
    await notifyAdmin("Contrat JotForm à vérifier", [
      `<strong>${escapeHtml(member.full_name)}</strong> a signé sous le nom « ${escapeHtml(signedName)} ».`,
      "Le contrat n'a pas été validé automatiquement : vérifie la soumission dans JotForm.",
    ]);
    return NextResponse.json({ ok: false, reason: "nom différent" });
  }

  const admin = createAdminClient();
  const signedAt = new Date().toISOString();
  const alreadySigned = member.contract_signed_at && member.contract_version === STAFF_CONTRACT_VERSION;

  if (!alreadySigned) {
    const { error } = await admin
      .from("staff_members")
      .update({
        contract_version: STAFF_CONTRACT_VERSION,
        contract_signed_at: signedAt,
        contract_signature: `${signedName} (JotForm ${sub.id})`,
        contract_signed_ip: sub.ip ?? "jotform",
        terms_accepted_at: member.terms_accepted_at ?? signedAt,
        terms_version: STAFF_TERMS_VERSION,
      })
      .eq("user_id", member.user_id);
    if (error) return NextResponse.json({ error: "Écriture impossible" }, { status: 500 });
  }

  // PDF signé dans le bucket privé staff-contracts (jamais de suppression
  // chez JotForm, rien d'autre n'y est géré). La recrue le retrouve dans son
  // onglet Documents, le fondateur dans Administration > Équipe > Documents.
  let pdfPath: string | null = null;
  const pdf = await fetchSubmissionPdf(sub.formId, sub.id);
  if (pdf) {
    pdfPath = await storeSignedContract(member.user_id, STAFF_CONTRACT_VERSION, sub.id, pdf);
    if (pdfPath) {
      // Colonne ajoutée par la migration 20260927b ; sans elle, l'appli
      // retrouve quand même le fichier en listant signed/{staffId}/.
      const { error } = await admin.from("staff_members").update({ signed_pdf_path: pdfPath }).eq("user_id", member.user_id);
      if (error && !/signed_pdf_path/.test(error.message)) console.error("[jotform] signed_pdf_path:", error.message);
    }
  } else {
    console.error(`[jotform] PDF signé introuvable pour la soumission ${sub.id}`);
  }
  const pdfStored = !!pdfPath;

  if (!alreadySigned) {
    await sendContractEmail(member, signedAt, signedName, STAFF_CONTRACT_VERSION).catch(() => false);
    await notifyAdmin("Contrat signé sur JotForm", [
      `<strong>${escapeHtml(member.full_name)}</strong> (${escapeHtml(member.email)})`,
      `Poste : ${escapeHtml(getRoleCard(member.role_key)?.role.title ?? member.role_key)}`,
      pdfStored ? "Le PDF signé est rangé dans Administration > Équipe > Documents." : "Le PDF signé n'a pas pu être récupéré automatiquement : la soumission reste consultable dans JotForm.",
      `<a href="${APP_URL}/dashboard/coach/admin/equipe/${member.user_id}" style="color:#E01E1E">Ouvrir sa fiche</a>`,
    ]);
    await notifyUser(member.owner_id, {
      type: "staff",
      title: "Contrat signé",
      body: `${member.full_name} a signé son contrat (${getRoleCard(member.role_key)?.role.title ?? member.role_key}).`,
      url: `/dashboard/coach/admin/equipe/${member.user_id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, pdf: pdfStored });
}
