import Link from "next/link";
import { Wallet, ShieldCheck, Route, FileSignature } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { buildStaffContract } from "@/lib/staff-contract";
import { ONBOARDING_STEPS } from "@/lib/job-applications";
import ContractView from "@/components/staff/ContractView";
import ResendContractButton from "@/components/staff/ResendContractButton";

export const dynamic = "force-dynamic";

export default async function StaffPostePage() {
  const { member, role, pole } = await requireStaffPage();
  const contract = buildStaffContract(member.role_key, member.full_name, member.email);
  const signedAt = member.contract_signed_at
    ? new Date(member.contract_signed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })
    : null;

  return (
    <div className="page-transition" style={{ maxWidth: 820 }}>
      <p className="ep-label" style={{ marginBottom: 4 }}>{pole.name}</p>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>
        {role.title}
      </h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.6)", margin: "0 0 20px", lineHeight: 1.65 }}>{role.mission}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 18 }}>
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "center" }}><Wallet size={12} /> Rémunération</p>
          {role.compensation.variable && <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", margin: "0 0 6px", lineHeight: 1.6 }}><strong style={{ color: "#F5EDED" }}>Variable</strong> {role.compensation.variable}</p>}
          {role.compensation.fixed && <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.6 }}><strong style={{ color: "#F5EDED" }}>Fixe</strong> {role.compensation.fixed}</p>}
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: "8px 0 0" }}>Rattachement : {role.reportsTo}</p>
        </section>
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "center" }}><ShieldCheck size={12} /> Non négociable</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {role.nonNegotiable.map((n) => (
              <li key={n} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.6, marginBottom: 4 }}>{n}</li>
            ))}
          </ul>
        </section>
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "center" }}><Route size={12} /> Parcours d&apos;intégration</p>
          {ONBOARDING_STEPS.map((s) => (
            <div key={s.key} style={{ display: "flex", gap: 10, padding: "5px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#E01E1E", minWidth: 78 }}>{s.when}</span>
              <span style={{ fontSize: 12.5, color: "#F5EDED" }}>{s.label}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="ep-card" style={{ padding: "18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <p className="ep-label" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center" }}><FileSignature size={12} /> Mon contrat signé</p>
          <ResendContractButton />
        </div>
        {signedAt && (
          <p style={{ fontSize: 12, color: "#4ade80", margin: "0 0 14px" }}>
            Signé électroniquement par {member.contract_signature} le {signedAt} (version {member.contract_version}).
          </p>
        )}
        <div style={{ maxHeight: "55vh", overflowY: "auto" }}>{contract && <ContractView contract={contract} />}</div>
        <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: "14px 0 0" }}>
          Voir aussi les <Link href="/legal/equipe" style={{ color: "#E01E1E", fontWeight: 700 }}>Conditions de collaboration</Link> et la{" "}
          <Link href="/legal/confidentialite" style={{ color: "#E01E1E", fontWeight: 700 }}>politique de confidentialité</Link>.
        </p>
      </section>
    </div>
  );
}
