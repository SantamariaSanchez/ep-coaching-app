import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Workflow, CalendarDays, Users, CheckCircle2, CircleDashed, MessagesSquare, FolderOpen, ChevronRight } from "lucide-react";
import { getUnreadBySender } from "@/lib/staff-team";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getRoleCard, KINDS } from "@/lib/staff-roles";
import { computeKpis, currentMonthKey, parisDate, stageDate, type StaffRecord } from "@/lib/staff-kpis";
import { computeNextActions } from "@/lib/staff-next-actions";
import { isContractSigned } from "@/lib/staff-page";

export const dynamic = "force-dynamic";

interface MemberRow {
  user_id: string;
  role_key: string;
  full_name: string;
  status: string;
  contract_signed_at: string | null;
  contract_version: string | null;
}

// Vue fondateur de toute l'équipe (demande directe 2026-09-25 : "connecter
// tout à tout" et garder la main sur l'ensemble). Lecture seule : l'accès et
// les contrats se gèrent dans Organisation.
export default async function TeamCockpitPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const admin = createAdminClient();
  const { data: memberData } = await admin
    .from("staff_members")
    .select("user_id, role_key, full_name, status, contract_signed_at, contract_version")
    .eq("owner_id", user.id)
    .order("created_at");
  const members = (memberData as MemberRow[] | null) ?? [];
  const active = members.filter((m) => m.status === "actif");

  const byMember = new Map<string, StaffRecord[]>();
  if (members.length) {
    const { data: rows } = await admin
      .from("staff_records")
      .select("id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at")
      .in("staff_id", members.map((m) => m.user_id))
      .order("created_at", { ascending: false })
      .limit(10_000);
    for (const r of (rows as StaffRecord[]) ?? []) {
      const row = { ...r, amount: r.amount === null ? null : Number(r.amount), data: r.data ?? {} };
      byMember.set(r.staff_id, [...(byMember.get(r.staff_id) ?? []), row]);
    }
  }

  const now = new Date();
  const today = parisDate(now);
  const unreadBySender = await getUnreadBySender(user.id, user.id);
  const unreadTotal = Object.values(unreadBySender).reduce((a, b) => a + b, 0);
  const month = currentMonthKey(now);
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.full_name ?? "?";

  // Pipeline commercial global. Une vente reliée setter + closer apparaît
  // dans les deux CRM : on ne compte que les fiches des closers et du Head of
  // Sales pour le CA, pour ne jamais compter deux fois la même vente.
  const leads: StaffRecord[] = [];
  const closerLeads: StaffRecord[] = [];
  for (const m of members) {
    const list = (byMember.get(m.user_id) ?? []).filter((r) => r.kind === "lead");
    leads.push(...list);
    if (m.role_key === "closer" || m.role_key === "head-of-sales") closerLeads.push(...list);
  }
  const stageCounts = KINDS.lead.stages.map((s) => ({ ...s, count: leads.filter((l) => l.status === s.value && !(l.data?._linked && ["rdv_booke", "show", "close", "perdu"].includes(l.status) && !closerLeads.includes(l))).length }));
  const closedThisMonth = closerLeads.filter((l) => l.status === "close" && (l.occurred_on ?? stageDate(l, "close") ?? "").startsWith(month));
  const cash = closedThisMonth.reduce((s, l) => s + (l.amount ?? 0), 0);

  const appointments = members
    .flatMap((m) => (byMember.get(m.user_id) ?? []).filter((r) => r.kind === "appointment" && r.due_at && parisDate(r.due_at) === today))
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const count = (role: string) => active.filter((m) => m.role_key === role && m.contract_signed_at).length;
  const flows = [
    { label: "Lead magnet et formulaire de préqualification vers le CRM d'un setter", ok: count("setter") + count("head-of-sales") + count("closer") > 0, who: count("setter") ? `${count("setter")} setter(s)` : "aucun setter, un closer ou le Head of Sales prend le relais" },
    { label: "RDV Calendly vers l'agenda d'un closer", ok: !!process.env.CALENDLY_API_TOKEN && count("closer") + count("head-of-sales") > 0, who: process.env.CALENDLY_API_TOKEN ? `${count("closer")} closer(s)` : "jeton CALENDLY_API_TOKEN à ajouter sur Vercel" },
    { label: "Paiement Stripe vers vente closée (closer et setter)", ok: count("closer") + count("setter") + count("head-of-sales") > 0, who: "automatique dès qu'un prospect paie avec l'email de sa fiche" },
    { label: "Paiement Stripe vers la trésorerie", ok: count("finance-comptabilite") > 0, who: count("finance-comptabilite") ? "actif" : "pas encore de Finance / Comptabilité" },
    { label: "Nouveau client coaching vers le suivi J+30", ok: count("coach-onboarding-success") > 0, who: count("coach-onboarding-success") ? "actif" : "pas encore de Coach Onboarding" },
    { label: "Candidature vers le pipeline RH", ok: count("rh-people-ops") > 0, who: count("rh-people-ops") ? "actif" : "pas encore de RH" },
  ];

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Retour
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Administration</p>
      <h1 className="text-3xl font-black uppercase tracking-tight">Pilotage de l&apos;équipe</h1>
      <div className="flex flex-wrap gap-2 mt-4">
        <Link href="/dashboard/coach/admin/equipe/messages" className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white bg-[#E01E1E] rounded-lg px-3 py-2">
          <MessagesSquare size={13} /> Messagerie{unreadTotal > 0 ? ` (${unreadTotal})` : ""}
        </Link>
        <Link href="/dashboard/coach/admin/equipe/documents" className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED] border border-[#E01E1E]/35 rounded-lg px-3 py-2">
          <FolderOpen size={13} /> Documents partagés
        </Link>
      </div>
      <p className="text-sm text-[#F5EDED]/45 mt-4 mb-6 leading-relaxed">
        Tout ce que fait l&apos;équipe, en un seul endroit. Les accès, liens de connexion et contrats se gèrent dans{" "}
        <Link href="/dashboard/coach/admin/organisation" className="text-[#E01E1E] font-bold">Organisation</Link>.
      </p>

      <section className="ep-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
        <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Workflow size={12} /> Automatisations</p>
        {flows.map((f) => (
          <div key={f.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
            {f.ok ? <CheckCircle2 size={15} style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }} /> : <CircleDashed size={15} style={{ color: "#facc15", flexShrink: 0, marginTop: 1 }} />}
            <span>
              <span style={{ display: "block", fontSize: 12.5, color: "#F5EDED", fontWeight: 700 }}>{f.label}</span>
              <span style={{ display: "block", fontSize: 11.5, color: f.ok ? "rgba(245,237,237,0.45)" : "#facc15" }}>{f.who}</span>
            </span>
          </div>
        ))}
      </section>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <section className="ep-card" style={{ padding: "16px 18px" }}>
          <p className="ep-label" style={{ margin: "0 0 10px" }}>Pipeline commercial</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#4ade80", margin: "0 0 2px" }}>{Math.round(cash).toLocaleString("fr-FR")} €</p>
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "0 0 12px" }}>encaissés ce mois, {closedThisMonth.length} vente(s)</p>
          {stageCounts.map((s) => (
            <div key={s.value} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
              <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>
              <span style={{ color: "#F5EDED", fontWeight: 800 }}>{s.count}</span>
            </div>
          ))}
        </section>
        <section className="ep-card" style={{ padding: "16px 18px" }}>
          <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><CalendarDays size={12} /> Rendez-vous du jour</p>
          {appointments.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Aucun rendez-vous aujourd&apos;hui.</p>
          ) : (
            appointments.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid rgba(245,237,237,0.05)", fontSize: 12.5 }}>
                <span style={{ fontWeight: 800, color: "#E01E1E", minWidth: 42 }}>{new Date(a.due_at!).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ color: "#F5EDED", flex: 1 }}>{a.title}</span>
                <span style={{ color: "rgba(245,237,237,0.45)" }}>{nameOf(a.staff_id)}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="ep-card" style={{ padding: "16px 18px" }}>
        <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Users size={12} /> L&apos;équipe ({active.length} actif{active.length > 1 ? "s" : ""})</p>
        {members.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>
            Personne pour l&apos;instant. Envoie le lien d&apos;un poste depuis Organisation pour recruter ta première personne.
          </p>
        ) : (
          members.map((m) => {
            const records = byMember.get(m.user_id) ?? [];
            const reported = records.some((r) => r.kind === "report" && r.occurred_on === today);
            const urgent = computeNextActions(m.role_key, records, now).filter((a) => a.priority === 1).length;
            const kpis = computeKpis(m.role_key, records, {}, [], now).slice(0, 3);
            const signed = isContractSigned(m);
            return (
              <Link key={m.user_id} href={`/dashboard/coach/admin/equipe/${m.user_id}`} style={{ display: "block", padding: "10px 0", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{m.full_name}</span>
                  {unreadBySender[m.user_id] ? <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: "#E01E1E", borderRadius: 999, padding: "1px 7px" }}>{unreadBySender[m.user_id]} message(s)</span> : null}
                  <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>{getRoleCard(m.role_key)?.role.title ?? m.role_key}</span>
                  {m.status !== "actif" && <span style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700 }}>{m.status}</span>}
                  {!signed && <span style={{ fontSize: 10.5, color: "#facc15", fontWeight: 700 }}>contrat pas signé</span>}
                  <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: reported ? "#4ade80" : "#facc15" }}>{reported ? "Rapport envoyé" : "Pas de rapport aujourd'hui"}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.55)", margin: "3px 0 0", lineHeight: 1.55 }}>
                  {kpis.map((k) => `${k.label} : ${k.value}`).join(" · ")}
                  {urgent > 0 && <span style={{ color: "#f87171", fontWeight: 700 }}> · {urgent} action(s) urgente(s) en attente</span>}
                  <ChevronRight size={12} style={{ display: "inline", marginLeft: 6, verticalAlign: "-2px", color: "rgba(245,237,237,0.3)" }} />
                </p>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
