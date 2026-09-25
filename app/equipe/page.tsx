import Link from "next/link";
import { CalendarDays, AlertTriangle, FileBarChart, ChevronRight, PartyPopper, Target } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { getMyRecords, getTeamData, getApplicationsForHr, getRecentPayingClients } from "@/lib/staff";
import { computeKpis, overdueItems, todayAgenda, parisDate, kindLabel, type KpiExtras } from "@/lib/staff-kpis";
import { MODULES, type ModuleKey, type RecordKind } from "@/lib/staff-roles";
import KpiGrid from "@/components/staff/KpiGrid";

export const dynamic = "force-dynamic";

const MODULE_BY_KIND: Partial<Record<RecordKind, ModuleKey>> = Object.fromEntries(
  Object.values(MODULES)
    .filter((m) => m.kind)
    .map((m) => [m.kind as RecordKind, m.key])
);

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const ctx = await requireStaffPage();
  const { bienvenue } = await searchParams;
  const { member, cfg, role } = ctx;
  const now = new Date();
  const today = parisDate(now);

  const [records, team] = await Promise.all([getMyRecords(ctx.userId), getTeamData(member)]);

  const extras: KpiExtras = {};
  if (member.role_key === "rh-people-ops") {
    const apps = await getApplicationsForHr(member.owner_id);
    const month = today.slice(0, 7);
    extras.applicationsThisMonth = apps.filter((a) => parisDate(a.created_at).startsWith(month)).length;
    extras.applicationsWaiting = apps.filter((a) => a.status === "nouvelle").length;
  }
  if (member.role_key === "coach-onboarding-success") {
    const since = parisDate(new Date(now.getTime() - 30 * 86_400_000));
    extras.newPayingClients = (await getRecentPayingClients()).filter((c) => (c.start_date ?? "") >= since).length;
  }

  const kpis = computeKpis(member.role_key, records, extras, team, now);
  const agenda = cfg.modules.includes("agenda") ? todayAgenda(records, now) : [];
  const overdue = overdueItems(records, now).slice(0, 8);
  const reportedToday = records.some((r) => r.kind === "report" && r.occurred_on === today);
  const firstName = member.full_name.split(" ")[0];

  return (
    <div className="page-transition">
      {bienvenue === "1" && (
        <div className="ep-card-hero" style={{ padding: "16px 18px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <PartyPopper size={20} style={{ color: "#4ade80", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", margin: 0, lineHeight: 1.55 }}>
            Contrat signé, bienvenue dans l&apos;équipe. Ta copie, ta fiche de poste et ton parcours d&apos;intégration
            viennent de partir par email.
          </p>
        </div>
      )}

      <p className="ep-label" style={{ marginBottom: 4 }}>{role.title}</p>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#F5EDED", margin: "0 0 10px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>
        Salut {firstName}
      </h1>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 20 }}>
        <Target size={15} style={{ color: "#E01E1E", marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.65)", margin: 0, lineHeight: 1.6 }}>{cfg.focus}</p>
      </div>

      <KpiGrid kpis={kpis} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 18 }}>
        {cfg.modules.includes("agenda") && (
          <section className="ep-card" style={{ padding: "15px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarDays size={12} /> Aujourd&apos;hui
              </p>
              <Link href="/equipe/agenda" style={{ fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>Agenda</Link>
            </div>
            {agenda.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Aucun rendez-vous aujourd&apos;hui.</p>
            ) : (
              agenda.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 10, padding: "7px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#E01E1E", minWidth: 42 }}>
                    {a.due_at ? new Date(a.due_at).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#F5EDED", fontWeight: 600 }}>{a.title}</span>
                </div>
              ))
            )}
          </section>
        )}

        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={12} /> À traiter maintenant
          </p>
          {overdue.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#4ade80", margin: 0 }}>Rien en retard. Propre.</p>
          ) : (
            overdue.map((r) => {
              const mod = MODULE_BY_KIND[r.kind];
              return (
                <Link
                  key={r.id}
                  href={mod ? `/equipe/${mod}` : "/equipe"}
                  style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none" }}
                >
                  <span style={{ fontSize: 12.5, color: "#F5EDED", fontWeight: 600 }}>{r.title}</span>
                  <span style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700, flexShrink: 0 }}>{kindLabel(r.kind)}</span>
                </Link>
              );
            })
          )}
        </section>

        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <FileBarChart size={12} /> Rapport de fin de journée
          </p>
          <p style={{ fontSize: 12.5, color: reportedToday ? "#4ade80" : "rgba(245,237,237,0.6)", margin: "0 0 12px", lineHeight: 1.55 }}>
            {reportedToday ? "Envoyé pour aujourd'hui. Tu peux encore le compléter." : "Pas encore envoyé aujourd'hui. Deux minutes, tes chiffres et ta journée."}
          </p>
          <Link href="/equipe/rapports" className="ep-btn-primary" style={{ height: 38, padding: "0 16px", fontSize: 11.5, textDecoration: "none", display: "inline-flex" }}>
            {reportedToday ? "Voir mon rapport" : "Faire mon rapport"}
          </Link>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 10px" }}>Tes missions</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {role.tasks.map((t) => (
              <li key={t} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.6, marginBottom: 4 }}>{t}</li>
            ))}
          </ul>
          <p className="ep-label" style={{ margin: "14px 0 8px" }}>Non négociable</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {role.nonNegotiable.map((t) => (
              <li key={t} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.6, marginBottom: 4 }}>{t}</li>
            ))}
          </ul>
        </section>
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 8px" }}>Ton espace</p>
          {cfg.modules.map((k) => (
            <Link
              key={k}
              href={`/equipe/${k}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none" }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>{MODULES[k].label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>{MODULES[k].description}</span>
              </span>
              <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
