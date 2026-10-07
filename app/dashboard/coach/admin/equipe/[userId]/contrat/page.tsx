import { getT } from "@/lib/i18n-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, FileSignature } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildStaffContract } from "@/lib/staff-contract";
import ContractView from "@/components/staff/ContractView";
import ContractPdf from "@/components/staff/ContractPdf";
import { getRoleCard } from "@/lib/staff-roles";
import { getLatestSignedContract, getTemplateFile } from "@/lib/staff-contract-files";

export const dynamic = "force-dynamic";

// Le contrat signé d'un membre : le PDF signé (JotForm) quand il existe,
// sinon le texte du contrat, avec date, version, IP et signature ; plus le
// modèle vierge du poste.
export default async function MemberContractPage({ params }: { params: Promise<{ userId: string }> }) {
  const t = await getT();
  const { userId } = await params;
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_members")
    .select("user_id, role_key, full_name, email, contract_signed_at, contract_version, contract_signature, contract_signed_ip")
    .eq("owner_id", user.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) notFound();
  const m = data as { user_id: string; role_key: string; full_name: string; email: string; contract_signed_at: string | null; contract_version: string | null; contract_signature: string | null; contract_signed_ip: string | null };
  const roleTitle = getRoleCard(m.role_key)?.role.title ?? m.role_key;
  const [signedPdf, template] = await Promise.all([
    getLatestSignedContract(m.user_id, `${m.full_name} - ${roleTitle}`),
    getTemplateFile(m.role_key, roleTitle, m.contract_version ?? undefined),
  ]);
  const contract = signedPdf ? null : buildStaffContract(m.role_key, m.full_name, m.email);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} />{" "}{t("Documents de l'équipe")}
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <FileSignature size={16} style={{ color: "#E01E1E" }} />
        <p className="ep-label" style={{ margin: 0 }}>{t("Contrat de")}{" "}{m.full_name}</p>
      </div>
      <div className="ep-card" style={{ padding: "14px 16px", marginBottom: 14 }}>
        {m.contract_signed_at ? (
          <p style={{ fontSize: 13, color: "#F5EDED", margin: 0, lineHeight: 1.7 }}>
            {t("Signé le")}{" "}<strong>{new Date(m.contract_signed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}</strong>
            <br />
            {t("Version")}{" "}{m.contract_version}{" "}{t("· signature :")}{" "}{m.contract_signature}{" "}{t("· IP")}{" "}{m.contract_signed_ip ?? t("inconnue")}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#facc15", margin: 0 }}>{t("Pas encore signé.")}</p>
        )}
      </div>
      {template && (
        <a href={template.viewUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#ff6b6b", textDecoration: "none", marginBottom: 14 }}>
          <ExternalLink size={13} />{" "}{t("Voir le modèle du poste (")}{roleTitle}{t(", version")}{" "}{m.contract_version ?? t("actuelle")})
        </a>
      )}
      {signedPdf ? (
        <ContractPdf viewUrl={signedPdf.viewUrl} downloadUrl={signedPdf.downloadUrl} title={`Contrat signé de ${m.full_name}`} downloadLabel="Télécharger le contrat signé" />
      ) : (
        <>
          {m.contract_signed_at && (
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "0 0 10px" }}>{t("Signé dans l'appli (pas de PDF JotForm) : voici le texte accepté.")}</p>
          )}
          <div className="ep-card" style={{ padding: "22px 20px" }}>{contract && <ContractView contract={contract} />}</div>
        </>
      )}
    </div>
  );
}
