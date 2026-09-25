import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ListChecks, MessagesSquare, GraduationCap, FileBarChart, FolderOpen, AlertCircle, Table } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { allowedKinds, getRoleCard, KINDS, STAFF_ROLES, type RecordKind } from "@/lib/staff-roles";
import { computeKpis, type StaffRecord, type TeamMemberData } from "@/lib/staff-kpis";
import { computeNextActions } from "@/lib/staff-next-actions";
import { isContractSigned } from "@/lib/staff-page";
import { trainingFor, PHASES } from "@/lib/staff-training";
import { getDocumentsForOwner, getTeamDirectory, getThread, getTrainingDone } from "@/lib/staff-team";
import KpiGrid from "@/components/staff/KpiGrid";
import AssignTaskForm from "@/components/staff/AssignTaskForm";
import TeamChat from "@/components/staff/TeamChat";
import DocumentsPanel from "@/components/staff/DocumentsPanel";
import CsvExport from "@/components/staff/CsvExport";

export const dynamic = "force-dynamic";

const RECORD_FIELDS = "id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at";

function Section({ icon: Icon, title, children, action }: { icon: typeof ListChecks; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="ep-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Icon size={12} /> {title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

// Fiche d'un membre de l'équipe côté fondateur (demande directe 2026-09-25 :
// "je dois pouvoir voir, manager, communiquer et assigner des tâches").
export default async function TeamMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const admin = createAdminClient();
  const { data: memberRow } = await admin
    .from("staff_members")
    .select("user_id, role_key, full_name, email, status, contract_signed_at, contract_version, created_at")
    .eq("owner_id", user.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!memberRow) notFound();
  const member = memberRow as { user_id: string; role_key: string; full_name: string; email: string; status: string; contract_signed_at: string | null; contract_version: string | null; created_at: string };
  const card = getRoleCard(member.role_key);
  // Tableaux exportables : ceux du métier, sans l'espace de travail perso.
  const boards = allowedKinds(member.role_key).filter(
    (k): k is Exclude<RecordKind, "report" | "note" | "template"> => k !== "report" && k !== "note" && k !== "template"
  );

  const { data: rows } = await admin.from("staff_records").select(RECORD_FIELDS).eq("staff_id", userId).order("created_at", { ascending: false }).limit(3000);
  const records = ((rows as StaffRecord[]) ?? []).map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount), data: r.data ?? {} }));

  // Responsable de pôle : ses chiffres incluent son équipe.
  const cfg = STAFF_ROLES.find((r) => r.key === member.role_key);
  let team: TeamMemberData[] = [];
  if (cfg?.team?.length) {
    const { data: teamRows } = await admin.from("staff_members").select("user_id, full_name, role_key").eq("owner_id", user.id).eq("status", "actif").in("role_key", cfg.team);
    const ids = ((teamRows as { user_id: string }[]) ?? []).map((t) => t.user_id);
    if (ids.length) {
      const { data: trows } = await admin.from("staff_records").select(RECORD_FIELDS).in("staff_id", ids).limit(5000);
      const all = ((trows as StaffRecord[]) ?? []).map((r) => ({ ...r, amount: r.amount === null ? null : Number(r.amount), data: r.data ?? {} }));
      team = ((teamRows as { user_id: string; full_name: string; role_key: string }[]) ?? []).map((t) => ({ userId: t.user_id, fullName: t.full_name, roleKey: t.role_key, records: all.filter((r) => r.staff_id === t.user_id) }));
    }
  }

  const [people, messages, done, documents] = await Promise.all([
    getTeamDirectory(user.id),
    getThread(user.id, user.id, userId),
    getTrainingDone(userId),
    getDocumentsForOwner(user.id, { userId, roleKey: member.role_key }),
  ]);
  const lessons = trainingFor(member.role_key);
  const doneSet = new Set(done);
  const kpis = computeKpis(member.role_key, records, {}, team);
  const urgent = computeNextActions(member.role_key, records).filter((a) => a.priority <= 2).slice(0, 8);
  const tasks = records.filter((r) => r.kind === "task").sort((a, b) => Number(a.status === "fait") - Number(b.status === "fait") || (a.occurred_on ?? "9").localeCompare(b.occurred_on ?? "9")).slice(0, 25);
  const reports = records.filter((r) => r.kind === "report").sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? "")).slice(0, 7);
  const taskStage = (s: string) => KINDS.task.stages.find((x) => x.value === s);

  const docTargets = [
    { value: `user:${userId}`, label: `Seulement ${member.full_name}` },
    { value: `role:${member.role_key}`, label: `Tous les ${card?.role.title ?? member.role_key}` },
    { value: "all", label: "Toute l'équipe" },
  ];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Pilotage de l&apos;équipe
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: card?.pole.color }}>{card?.pole.name}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight">{member.full_name}</h1>
      <p className="text-sm text-[#F5EDED]/55 mt-1 mb-2">
        {card?.role.title} · {member.email}
      </p>
      <p className="text-xs mb-6" style={{ color: member.status === "actif" ? "#4ade80" : "#f87171" }}>
        Accès {member.status} · {isContractSigned(member) ? `contrat signé le ${new Date(member.contract_signed_at!).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "contrat pas encore signé"} · formation {doneSet.size}/{lessons.length} ·{" "}
        <Link href="/dashboard/coach/admin/organisation" className="text-[#E01E1E] font-bold">gérer l&apos;accès</Link>
      </p>

      <div style={{ marginBottom: 14 }}>
        <KpiGrid kpis={kpis} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Section icon={ListChecks} title="Tâches">
          <div style={{ marginBottom: 14 }}>
            <AssignTaskForm memberId={userId} memberName={member.full_name.split(" ")[0]} />
          </div>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Aucune tâche.</p>
          ) : (
            tasks.map((t) => {
              const st = taskStage(t.status);
              const late = t.status !== "fait" && t.occurred_on && t.occurred_on < new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
              return (
                <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "7px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: st?.color, minWidth: 64 }}>{st?.label}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: t.status === "fait" ? "rgba(245,237,237,0.4)" : "#F5EDED", textDecoration: t.status === "fait" ? "line-through" : undefined }}>
                    {t.title}
                    {typeof t.data?._assigned_by_name === "string" && <span style={{ fontSize: 10.5, color: "#facc15" }}> · de toi</span>}
                  </span>
                  {t.occurred_on && (
                    <span style={{ fontSize: 11, color: late ? "#f87171" : "rgba(245,237,237,0.45)" }}>
                      {new Date(`${t.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </Section>

        <Section icon={MessagesSquare} title={`Conversation avec ${member.full_name.split(" ")[0]}`}>
          <TeamChat meId={user.id} people={people} unread={{}} active={userId} messages={messages} basePath="/dashboard/coach/admin/equipe/messages?avec=" compact />
        </Section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Section icon={AlertCircle} title="Ce qui l'attend maintenant">
          {urgent.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#4ade80", margin: 0 }}>Rien d&apos;urgent en attente.</p>
          ) : (
            urgent.map((a) => (
              <p key={a.id} style={{ fontSize: 12.5, color: a.priority === 1 ? "#fca5a5" : "rgba(245,237,237,0.75)", margin: "0 0 6px", lineHeight: 1.5 }}>{a.title}</p>
            ))
          )}
        </Section>
        <Section icon={GraduationCap} title="Formation">
          {PHASES.map((p) => {
            const list = lessons.filter((l) => l.phase === p.key);
            if (!list.length) return null;
            const n = list.filter((l) => doneSet.has(l.key)).length;
            return (
              <div key={p.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                <span style={{ color: "#F5EDED" }}>{p.label}</span>
                <span style={{ color: n === list.length ? "#4ade80" : "rgba(245,237,237,0.55)", fontWeight: 700 }}>{n}/{list.length}</span>
              </div>
            );
          })}
        </Section>
        <Section icon={FileBarChart} title="Derniers rapports">
          {reports.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Aucun rapport envoyé.</p>
          ) : (
            reports.map((r) => {
              const metrics = (r.data?.metrics as Record<string, number> | undefined) ?? {};
              const labels = Object.fromEntries((cfg?.reportMetrics ?? []).map((m) => [m.key, m.label]));
              return (
                <div key={r.id} style={{ padding: "6px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED", margin: 0, textTransform: "capitalize" }}>
                    {new Date(`${r.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                  </p>
                  <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.55)", margin: 0 }}>
                    {Object.entries(metrics).map(([k, v]) => `${labels[k] ?? k} : ${v}`).join(" · ") || "Aucun chiffre"}
                  </p>
                  {typeof r.data?.blocker === "string" && <p style={{ fontSize: 11.5, color: "#facc15", margin: 0 }}>Blocage : {r.data.blocker as string}</p>}
                </div>
              );
            })
          )}
        </Section>
      </div>

      {boards.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Section icon={Table} title="Ses tableaux">
            {boards.map((k) => (
              <div key={k} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                <span style={{ fontSize: 12.5, color: "#F5EDED" }}>
                  {KINDS[k].plural} <span style={{ color: "rgba(245,237,237,0.45)" }}>· {records.filter((r) => r.kind === k).length}</span>
                </span>
                <CsvExport kind={k} memberId={userId} label="CSV" />
              </div>
            ))}
          </Section>
        </div>
      )}

      <Section icon={FolderOpen} title="Documents">
        <DocumentsPanel documents={documents} meId={user.id} founder targets={docTargets} defaultTarget={`user:${userId}`} />
      </Section>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.3)", marginTop: 10 }}>Poste : {card?.role.mission}</p>
    </div>
  );
}
