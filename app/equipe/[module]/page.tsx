import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSignature } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { getMyRecords, getTeamData, getApplicationsForHr, getRecentPayingClients } from "@/lib/staff";
import { computeKpis, parisDate } from "@/lib/staff-kpis";
import { MODULES, allModules, type ModuleKey } from "@/lib/staff-roles";
import { trainingFor } from "@/lib/staff-training";
import { templatesFor } from "@/lib/staff-templates";
import { getChannel, getDocumentsFor, getTeamDirectory, getThread, getTrainingDone, getUnreadBySender } from "@/lib/staff-team";
import RecordBoard from "@/components/staff/RecordBoard";
import DailyReport from "@/components/staff/DailyReport";
import KpiGrid from "@/components/staff/KpiGrid";
import TrainingView from "@/components/staff/TrainingView";
import TemplatesLibrary from "@/components/staff/TemplatesLibrary";
import DocumentsPanel from "@/components/staff/DocumentsPanel";
import TeamChat from "@/components/staff/TeamChat";
import Calculator from "@/components/staff/Calculator";
import { OffersPanel, EditorialCalendar, ScorecardsPanel } from "@/components/staff/StaffTools";
import { ApplicationsPanel, NewClientsPanel, ScriptsLibrary, TeamView } from "@/components/staff/StaffPanels";

export const dynamic = "force-dynamic";

export default async function StaffModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ avec?: string }>;
}) {
  const { module } = await params;
  const { avec } = await searchParams;
  const ctx = await requireStaffPage();
  // Seuls les onglets du métier existent : un closer n'a pas de livrables,
  // un secrétaire pas de CRM, etc.
  if (!(module in MODULES) || !allModules(ctx.cfg).includes(module as ModuleKey)) notFound();
  const mod = MODULES[module as ModuleKey];
  const { member } = ctx;
  const records = await getMyRecords(ctx.userId);

  let body: React.ReactNode = null;

  switch (mod.key) {
    case "rapports":
      body = (
        <DailyReport
          metrics={ctx.cfg.reportMetrics}
          reports={records.filter((r) => r.kind === "report").sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))}
          today={parisDate(new Date())}
        />
      );
      break;
    case "scripts":
      body = <ScriptsLibrary />;
      break;
    case "equipe": {
      const team = await getTeamData(member);
      body = (
        <>
          <div style={{ marginBottom: 18 }}>
            <KpiGrid kpis={computeKpis(member.role_key, records, {}, team)} />
          </div>
          <TeamView team={team} />
        </>
      );
      break;
    }
    case "formation":
      body = <TrainingView lessons={trainingFor(member.role_key)} done={await getTrainingDone(ctx.userId)} />;
      break;
    case "modeles":
      body = (
        <>
          <TemplatesLibrary templates={templatesFor(member.role_key)} />
          <p className="ep-label" style={{ marginBottom: 8 }}>Mes modèles</p>
          <RecordBoard kind="template" records={records.filter((r) => r.kind === "template")} />
        </>
      );
      break;
    case "documents":
      body = (
        <>
          <Link href="/equipe/poste" className="ep-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", marginBottom: 14, textDecoration: "none" }}>
            <FileSignature size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>Mon contrat de collaboration</span>
              <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)" }}>
                Signé le {member.contract_signed_at ? new Date(member.contract_signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "?"}, avec ta fiche technique
              </span>
            </span>
          </Link>
          <DocumentsPanel documents={await getDocumentsFor(member.owner_id, ctx.userId, member.role_key)} meId={ctx.userId} />
        </>
      );
      break;
    case "messages": {
      const people = await getTeamDirectory(member.owner_id);
      const active = avec === "general" || people.some((p) => p.id === avec && p.id !== ctx.userId) ? (avec as string) : null;
      const messages = active === "general" ? await getChannel(member.owner_id) : active ? await getThread(member.owner_id, ctx.userId, active) : [];
      body = (
        <TeamChat
          meId={ctx.userId}
          people={people}
          unread={await getUnreadBySender(member.owner_id, ctx.userId)}
          active={active}
          messages={messages}
          basePath="/equipe/messages?avec="
        />
      );
      break;
    }
    case "offres":
      body = <OffersPanel />;
      break;
    case "calendrier":
      body = <EditorialCalendar records={records} />;
      break;
    case "calculateur":
      body = <Calculator />;
      break;
    case "scorecards":
      body = <ScorecardsPanel onlyPoleKeys={member.role_key === "head-of-sales" ? ["sales"] : undefined} />;
      break;
    default:
      if (mod.kind) {
        let panel: React.ReactNode = null;
        if (mod.key === "recrutement") panel = <ApplicationsPanel applications={await getApplicationsForHr(member.owner_id)} />;
        if (mod.key === "clients") panel = <NewClientsPanel clients={await getRecentPayingClients()} />;
        const showKpis = mod.key === "campagnes" || mod.key === "crm" || mod.key === "finance";
        body = (
          <>
            {panel}
            {showKpis && (
              <div style={{ marginBottom: 18 }}>
                <KpiGrid kpis={computeKpis(member.role_key, records).slice(0, 6)} />
              </div>
            )}
            <RecordBoard kind={mod.kind} records={records.filter((r) => r.kind === mod.kind)} />
          </>
        );
      }
  }

  return (
    <div className="page-transition">
      <p className="ep-label" style={{ marginBottom: 4 }}>{ctx.role.title}</p>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>
        {mod.label}
      </h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", margin: "0 0 20px" }}>{mod.description}</p>
      {body}
    </div>
  );
}
