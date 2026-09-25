import Link from "next/link";
import { Wallet, ShieldCheck, Route, FileSignature, Target, Clock, Wrench, Repeat, UserRound, NotebookPen } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { buildStaffContract } from "@/lib/staff-contract";
import { ONBOARDING_STEPS } from "@/lib/job-applications";
import { getPlaybook } from "@/lib/staff-playbooks";
import { MODULES, allModules } from "@/lib/staff-roles";
import ContractView from "@/components/staff/ContractView";
import ResendContractButton from "@/components/staff/ResendContractButton";

export const dynamic = "force-dynamic";

const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

function Card({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <section className="ep-card" style={{ padding: "15px 16px" }}>
      <p className="ep-label" style={{ margin: "0 0 8px", display: "flex", gap: 6, alignItems: "center" }}>
        <Icon size={12} /> {title}
      </p>
      {children}
    </section>
  );
}

const li: React.CSSProperties = { fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.6, marginBottom: 4 };

// Fiche technique complète du poste (demande directe 2026-09-25) : tout ce
// qu'il faut savoir pour tenir le poste, sur une seule page.
export default async function StaffPostePage() {
  const { member, role, pole, cfg } = await requireStaffPage();
  const pb = getPlaybook(member.role_key);
  const contract = buildStaffContract(member.role_key, member.full_name, member.email);
  const signedAt = member.contract_signed_at
    ? new Date(member.contract_signed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })
    : null;

  return (
    <div className="page-transition" style={{ maxWidth: 900 }}>
      <p className="ep-label" style={{ marginBottom: 4 }}>Fiche technique · {pole.name}</p>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>{role.title}</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.65)", margin: "0 0 6px", lineHeight: 1.65 }}>{role.mission}</p>
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: "0 0 20px" }}>{cfg.focus}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Card icon={Target} title="Responsabilités">
          <ul style={{ margin: 0, paddingLeft: 16 }}>{role.tasks.map((t) => <li key={t} style={li}>{t}</li>)}</ul>
        </Card>
        <Card icon={ShieldCheck} title="Non négociable">
          <ul style={{ margin: 0, paddingLeft: 16 }}>{role.nonNegotiable.map((t) => <li key={t} style={li}>{t}</li>)}</ul>
        </Card>
        <Card icon={UserRound} title="Rattachement">
          <p style={{ ...li, margin: 0 }}>Tu rends compte à : <strong style={{ color: "#F5EDED" }}>{role.reportsTo}</strong></p>
          <p style={{ ...li, margin: "6px 0 0" }}>
            Une question, un blocage : écris-lui dans l&apos;onglet <Link href="/equipe/messages?avec=general" style={{ color: "#E01E1E", fontWeight: 700 }}>Équipe</Link>.
          </p>
        </Card>
      </div>

      {pb && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Card icon={Clock} title="Journée type">
            {pb.routine.map((b) => (
              <div key={b.start + b.title} style={{ display: "flex", gap: 10, padding: "4px 0" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#E01E1E", minWidth: 42 }}>{b.start}</span>
                <span style={{ fontSize: 12.5, color: "#F5EDED" }}>{b.title}</span>
              </div>
            ))}
          </Card>
          <Card icon={Repeat} title="Rituels de la semaine">
            {pb.rituals.map((r) => (
              <p key={r.title} style={{ ...li }}>
                <strong style={{ color: "#F5EDED" }}>{DAYS[r.day]} : {r.title}.</strong> {r.detail}
              </p>
            ))}
          </Card>
          <Card icon={Target} title="Ce sur quoi tu es mesuré">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {pb.targets.map((t) => <li key={t.key} style={li}>{t.label}, chaque mois</li>)}
              <li style={li}>La régularité de ton rapport du jour</li>
            </ul>
          </Card>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12, marginBottom: 12 }}>
        {pb && (
          <Card icon={NotebookPen} title="Quoi noter, et quand">
            {pb.logRules.map((r) => (
              <p key={r.when} style={li}>
                <strong style={{ color: "#F5EDED" }}>{r.when} :</strong> {r.what}
              </p>
            ))}
          </Card>
        )}
        <Card icon={Wrench} title="Tes outils">
          {allModules(cfg).map((k) => (
            <Link key={k} href={k === "messages" ? "/equipe/messages?avec=general" : `/equipe/${k}`} style={{ display: "block", padding: "4px 0", textDecoration: "none" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F5EDED" }}>{MODULES[k].label}</span>
              <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}> · {MODULES[k].description}</span>
            </Link>
          ))}
        </Card>
        <Card icon={Wallet} title="Rémunération">
          {role.compensation.variable && <p style={li}><strong style={{ color: "#F5EDED" }}>Variable</strong> {role.compensation.variable}</p>}
          {role.compensation.fixed && <p style={li}><strong style={{ color: "#F5EDED" }}>Fixe</strong> {role.compensation.fixed}</p>}
          {role.compensation.earnings && <p style={{ ...li, color: "#facc15" }}>{role.compensation.earnings}</p>}
        </Card>
        <Card icon={Route} title="Parcours d'intégration">
          {ONBOARDING_STEPS.map((s) => (
            <div key={s.key} style={{ display: "flex", gap: 10, padding: "4px 0" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#E01E1E", minWidth: 78 }}>{s.when}</span>
              <span style={{ fontSize: 12.5, color: "#F5EDED" }}>{s.label}</span>
            </div>
          ))}
          <Link href="/equipe/formation" style={{ fontSize: 12, fontWeight: 700, color: "#E01E1E", display: "inline-block", marginTop: 6 }}>Ouvrir ma formation</Link>
        </Card>
      </div>

      <details className="ep-card" style={{ padding: "15px 16px" }}>
        <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span className="ep-label" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center" }}>
            <FileSignature size={12} /> Mon contrat signé
          </span>
          {signedAt && (
            <span style={{ fontSize: 12, color: "#4ade80" }}>
              Signé électroniquement par {member.contract_signature} le {signedAt} (version {member.contract_version})
            </span>
          )}
        </summary>
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <ResendContractButton />
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>{contract && <ContractView contract={contract} />}</div>
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: "14px 0 0" }}>
            Voir aussi les <Link href="/legal/equipe" style={{ color: "#E01E1E", fontWeight: 700 }}>Conditions de collaboration</Link> et la{" "}
            <Link href="/legal/confidentialite" style={{ color: "#E01E1E", fontWeight: 700 }}>politique de confidentialité</Link>.
          </p>
        </div>
      </details>
    </div>
  );
}
