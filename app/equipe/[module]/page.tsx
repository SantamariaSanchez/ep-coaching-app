import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/staff-page";
import { getMyRecords, getTeamData, getApplicationsForHr, getRecentPayingClients } from "@/lib/staff";
import { computeKpis, parisDate } from "@/lib/staff-kpis";
import { MODULES, type ModuleKey } from "@/lib/staff-roles";
import RecordBoard from "@/components/staff/RecordBoard";
import DailyReport from "@/components/staff/DailyReport";
import KpiGrid from "@/components/staff/KpiGrid";
import { ApplicationsPanel, NewClientsPanel, ScriptsLibrary, TeamView } from "@/components/staff/StaffPanels";

export const dynamic = "force-dynamic";

export default async function StaffModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const ctx = await requireStaffPage();
  if (!(module in MODULES) || !ctx.cfg.modules.includes(module as ModuleKey)) notFound();
  const mod = MODULES[module as ModuleKey];
  const records = await getMyRecords(ctx.userId);

  let body: React.ReactNode = null;

  if (mod.key === "rapports") {
    body = (
      <DailyReport
        metrics={ctx.cfg.reportMetrics}
        reports={records.filter((r) => r.kind === "report").sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))}
        today={parisDate(new Date())}
      />
    );
  } else if (mod.key === "scripts") {
    body = <ScriptsLibrary />;
  } else if (mod.key === "equipe") {
    const team = await getTeamData(ctx.member);
    body = (
      <>
        <div style={{ marginBottom: 18 }}>
          <KpiGrid kpis={computeKpis(ctx.member.role_key, records, {}, team)} />
        </div>
        <TeamView team={team} />
      </>
    );
  } else if (mod.kind) {
    const kindRecords = records.filter((r) => r.kind === mod.kind);
    let panel: React.ReactNode = null;
    if (mod.key === "recrutement") panel = <ApplicationsPanel applications={await getApplicationsForHr(ctx.member.owner_id)} />;
    if (mod.key === "clients") panel = <NewClientsPanel clients={await getRecentPayingClients()} />;
    const showKpis = mod.key === "campagnes" || mod.key === "crm" || mod.key === "finance";
    body = (
      <>
        {panel}
        {showKpis && (
          <div style={{ marginBottom: 18 }}>
            <KpiGrid kpis={computeKpis(ctx.member.role_key, records).slice(0, 6)} />
          </div>
        )}
        <RecordBoard kind={mod.kind} records={kindRecords} />
      </>
    );
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
