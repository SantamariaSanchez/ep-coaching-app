import { FileSignature } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { buildStaffContract } from "@/lib/staff-contract";
import ContractView from "@/components/staff/ContractView";
import ContractSignForm from "@/components/staff/ContractSignForm";

export const dynamic = "force-dynamic";

// Étape 2 de la première connexion (et de toute connexion après un
// changement de version du contrat) : lecture puis signature électronique.
// Une copie part par email dès la signature (voir signStaffContract).
export default async function StaffContractPage() {
  const ctx = await requireStaffPage("contract");
  const contract = buildStaffContract(ctx.member.role_key, ctx.member.full_name, ctx.member.email);
  const isResign = !!ctx.member.contract_signed_at;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <FileSignature size={18} style={{ color: "#E01E1E" }} />
        <p className="ep-label" style={{ margin: 0 }}>{isResign ? "Contrat mis à jour" : "Étape 2 sur 2"}</p>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
        Ton contrat de collaboration
      </h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.55)", lineHeight: 1.65, margin: "0 0 20px" }}>
        {isResign
          ? "Le contrat a évolué depuis ta dernière signature. Relis-le et signe la nouvelle version pour retrouver ton espace."
          : "Lis-le tranquillement. Dès que tu signes, ton espace s'ouvre et tu reçois par email une copie du contrat, ta fiche de poste et ton parcours d'intégration."}
      </p>

      <div className="ep-card" style={{ padding: "22px 20px", marginBottom: 18, maxHeight: "60vh", overflowY: "auto" }}>
        {contract && <ContractView contract={contract} />}
      </div>

      <ContractSignForm expectedName={ctx.member.full_name} />
    </div>
  );
}
