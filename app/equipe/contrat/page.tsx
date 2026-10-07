import { getT } from "@/lib/i18n-server";
import { FileSignature } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { buildStaffContract } from "@/lib/staff-contract";
import ContractView from "@/components/staff/ContractView";
import ContractSignForm from "@/components/staff/ContractSignForm";
import JotformSign from "@/components/staff/JotformSign";
import { contractFormUrl, jotformEnabled } from "@/lib/jotform";
import { STAFF_CONTRACT_VERSION } from "@/lib/staff-contract";
import { getTemplateFile } from "@/lib/staff-contract-files";
import ContractPdf from "@/components/staff/ContractPdf";

export const dynamic = "force-dynamic";

// Étape 2 de la première connexion (et de toute connexion après un
// changement de version du contrat) : lecture puis signature électronique.
// Une copie part par email dès la signature (voir signStaffContract).
export default async function StaffContractPage({ searchParams }: { searchParams: Promise<{ jotform?: string }> }) {
  const t = await getT();
  const { jotform } = await searchParams;
  const ctx = await requireStaffPage("contract");
  // Le contrat de référence est le PDF du poste (bucket staff-contracts) ;
  // s'il manque, on retombe sur la version texte générée depuis le code.
  const pdf = await getTemplateFile(ctx.member.role_key, ctx.role.title);
  const contract = pdf ? null : buildStaffContract(ctx.member.role_key, ctx.member.full_name, ctx.member.email);
  const isResign = !!ctx.member.contract_signed_at;
  // JotForm configuré : c'est lui qui recueille la signature (voir
  // app/api/webhooks/jotform), la signature intégrée reste en secours.
  const jotformUrl = jotformEnabled()
    ? contractFormUrl({ staffId: ctx.userId, fullName: ctx.member.full_name, email: ctx.member.email, role: ctx.role.title, version: STAFF_CONTRACT_VERSION })
    : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <FileSignature size={18} style={{ color: "#E01E1E" }} />
        <p className="ep-label" style={{ margin: 0 }}>{isResign ? t("Contrat mis à jour") : t("Étape 2 sur 2")}</p>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
        {t("Ton contrat de collaboration")}
      </h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.55)", lineHeight: 1.65, margin: "0 0 20px" }}>
        {isResign
          ? t("Le contrat a évolué depuis ta dernière signature. Relis-le et signe la nouvelle version pour retrouver ton espace.")
          : t("Lis-le tranquillement. Dès que tu signes, ton espace s'ouvre et tu reçois par email une copie du contrat, ta fiche de poste et ton parcours d'intégration.")}
      </p>

      {pdf ? (
        <ContractPdf viewUrl={pdf.viewUrl} downloadUrl={pdf.downloadUrl} title={`Contrat ${ctx.role.title}`} />
      ) : (
        <div className="ep-card" style={{ padding: "22px 20px", marginBottom: 18, maxHeight: "60vh", overflowY: "auto" }}>
          {contract && <ContractView contract={contract} />}
        </div>
      )}

      {jotformUrl ? (
        <JotformSign url={jotformUrl} waiting={jotform === "envoye"} expectedName={ctx.member.full_name} />
      ) : (
        <ContractSignForm expectedName={ctx.member.full_name} />
      )}
    </div>
  );
}
