import Link from "next/link";
import { CalendarDays, FileBarChart, ChevronRight, PartyPopper, Target } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import { getMyRecords, getTeamData, getApplicationsForHr, getRecentPayingClients } from "@/lib/staff";
import { computeKpis, targetActuals, todayAgenda, parisDate, type KpiExtras } from "@/lib/staff-kpis";
import { computeNextActions } from "@/lib/staff-next-actions";
import { getPlaybook } from "@/lib/staff-playbooks";
import { MODULES } from "@/lib/staff-roles";
import { nowInParis } from "@/lib/dates";
import KpiGrid from "@/components/staff/KpiGrid";
import TargetsCard from "@/components/staff/TargetsCard";
import PushOptIn from "@/components/staff/PushOptIn";
import { MyDay, NextActions, LoggingGuide } from "@/components/staff/MyDay";

export const dynamic = "force-dynamic";

// Tableau de bord personnel d'une recrue (demande directe 2026-09-25 :
// "chaque compte est une appli 100 % personnalisée, il sait ce qu'il doit
// faire, quand, quoi logger"). Tout vient de SES données et de la routine
// de SON métier : ce qu'il faut faire maintenant en premier, ses chiffres
// ensuite.
export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const ctx = await requireStaffPage();
  const { bienvenue } = await searchParams;
  const { member, cfg, role } = ctx;
  const now = new Date();
  const today = parisDate(now);
  const { isoDow, hhmm } = nowInParis();

  const [records, team] = await Promise.all([getMyRecords(ctx.userId), getTeamData(member)]);

  const extras: KpiExtras = {};
  if (member.role_key === "rh-people-ops") {
    const apps = await getApplicationsForHr(member.owner_id);
    extras.applicationsThisMonth = apps.filter((a) => parisDate(a.created_at).startsWith(today.slice(0, 7))).length;
    extras.applicationsWaiting = apps.filter((a) => a.status === "nouvelle").length;
  }
  if (member.role_key === "coach-onboarding-success") {
    const since = parisDate(new Date(now.getTime() - 30 * 86_400_000));
    extras.newPayingClients = (await getRecentPayingClients()).filter((c) => (c.start_date ?? "") >= since).length;
  }

  const playbook = getPlaybook(member.role_key);
  const kpis = computeKpis(member.role_key, records, extras, team, now);
  const actions = computeNextActions(member.role_key, records, now);
  const agenda = cfg.modules.includes("agenda") ? todayAgenda(records, now) : [];
  const reportedToday = records.some((r) => r.kind === "report" && r.occurred_on === today);
  const firstName = member.full_name.split(" ")[0];
  const monthLabel = now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", month: "long" });

  return (
    <div className="page-transition">
      {bienvenue === "1" && (
        <div className="ep-card-hero" style={{ padding: "16px 18px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <PartyPopper size={20} style={{ color: "#4ade80", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", margin: 0, lineHeight: 1.55 }}>
            Contrat signé, bienvenue dans l&apos;équipe. Ta copie, ta fiche de poste et ton parcours d&apos;intégration
            viennent de partir par email. Ta journée type est juste en dessous.
          </p>
        </div>
      )}

      <p className="ep-label" style={{ marginBottom: 4 }}>{role.title}</p>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#F5EDED", margin: "0 0 10px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>
        Salut {firstName}
      </h1>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 18 }}>
        <Target size={15} style={{ color: "#E01E1E", marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.65)", margin: 0, lineHeight: 1.6 }}>{cfg.focus}</p>
      </div>

      <PushOptIn />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12, marginBottom: 12 }}>
        {playbook && <MyDay playbook={playbook} hhmm={hhmm} isoDow={isoDow} />}
        <NextActions actions={actions} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12, marginBottom: 18 }}>
        {cfg.modules.includes("agenda") && (
          <section className="ep-card" style={{ padding: "15px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarDays size={12} /> Rendez-vous du jour
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

        {playbook && (
          <TargetsCard
            defs={playbook.targets}
            targets={member.targets ?? {}}
            actuals={targetActuals(member.role_key, records, team, now)}
            monthLabel={monthLabel}
          />
        )}

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

      <p className="ep-label" style={{ marginBottom: 8 }}>Mes chiffres du mois</p>
      <KpiGrid kpis={kpis} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12, marginTop: 18 }}>
        {playbook && <LoggingGuide playbook={playbook} />}
        <section className="ep-card" style={{ padding: "15px 16px" }}>
          <p className="ep-label" style={{ margin: "0 0 8px" }}>Mon espace</p>
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
