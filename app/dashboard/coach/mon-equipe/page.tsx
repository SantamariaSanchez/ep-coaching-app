import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, MessagesSquare, FolderOpen, LayoutDashboard, Briefcase, Wallet } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAppSetup } from "@/lib/app-setup-server";
import { CAREER_MODES } from "@/lib/app-setup";
import { isTeamOwner } from "@/lib/team-owner";
import { getOwnedCoachTeam, getMyCoachMemberships, getStaffOverview } from "@/lib/coach-team";
import { POLES } from "@/lib/org-roles";
import { STAFF_ROLE_KEYS, getRoleCard } from "@/lib/staff-roles";
import { getStaffMember } from "@/lib/staff";
import { computePayroll } from "@/lib/staff-pay";
import {
  CareerPicker,
  InviteResponse,
  LeaveTeam,
  InviteCoachForm,
  CoachLinkActions,
  InviteStaffForm,
  RevokeStaffInvite,
  StaffStatus,
  PayConfigEditor,
  type CareerOption,
} from "@/components/team/TeamManager";

// Mon équipe (demande directe 2026-09-29) : le parcours du coach est
// modulable et évolue avec lui. Seul à son compte, pour une marque, avec un
// autre coach, ou à la tête d'une entreprise qui recrute des coachs et du
// staff, avec tous les outils de management.

export const dynamic = "force-dynamic";

const UNLOCKS: Record<string, string> = {
  independant: "Tes clients, ta marque : coaching, contenu, stats réseaux, business. Tu peux passer en mode entreprise quand tu recrutes.",
  marque: "Tu coaches pour une marque : accepte son invitation ci-dessous, elle suit tes chiffres et tu gardes tes outils.",
  avec_coach: "Binôme ou coach associé : accepte l'invitation d'un coach, vous voyez chacun ce qui vous concerne.",
  entreprise: "Tu recrutes et tu manages : coachs (avec leurs clients et chiffres), staff (setter, closer, monteur...), cockpit, messagerie, documents.",
};

const STATUS_LABEL: Record<string, string> = { actif: "actif", suspendu: "suspendu", termine: "terminé" };

function tile(label: string, value: string | number) {
  return (
    <div className="ep-card" style={{ padding: "12px 14px" }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: "#F5EDED", margin: 0, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", margin: "2px 0 0" }}>{label}</p>
    </div>
  );
}

const linkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(137,4,4,0.45)", color: "rgba(245,237,237,0.85)", fontSize: 12, fontWeight: 800, textDecoration: "none" };

export default async function MyTeamPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const admin = createAdminClient();
  const [setup, owner, { data: me }, staffSelf] = await Promise.all([
    getAppSetup(user.id),
    isTeamOwner(user.id),
    admin.from("profiles").select("email").eq("id", user.id).maybeSingle(),
    getStaffMember(user.id),
  ]);
  const memberships = await getMyCoachMemberships(user.id, (me?.email as string | null) ?? null);
  const [team, staff, payroll] = owner ? await Promise.all([getOwnedCoachTeam(user.id), getStaffOverview(user.id), computePayroll(user.id)]) : [null, null, null];

  const mode = typeof setup.answers.career_mode === "string" ? setup.answers.career_mode : null;
  const options: CareerOption[] = CAREER_MODES.map((o) => ({ ...o, unlocks: UNLOCKS[o.value] ?? "" }));
  const roleGroups = POLES.map((p) => ({ pole: p.name, items: p.roles.filter((r) => STAFF_ROLE_KEYS.includes(r.key)).map((r) => ({ key: r.key, title: r.title })) })).filter((g) => g.items.length);

  const activeCoaches = team?.links.filter((l) => l.status === "actif") ?? [];
  const pendingCoaches = team?.links.filter((l) => l.status === "invite") ?? [];
  const totals = activeCoaches.reduce(
    (acc, l) => {
      const s = l.coach_id ? team?.stats[l.coach_id] : null;
      return { clients: acc.clients + (s?.clients ?? 0), paying: acc.paying + (s?.paying ?? 0), waiting: acc.waiting + (s?.checkinsWaiting ?? 0) };
    },
    { clients: 0, paying: 0, waiting: 0 }
  );

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Mon business")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-1">{t("Mon équipe")}</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, color: "rgba(245,237,237,0.6)", fontSize: 16, margin: "0 0 20px" }}>
        {t("Seul, en binôme, pour une marque ou à la tête d'une équipe : l'appli suit ton parcours.")}
      </p>

      {memberships.invites.length > 0 && (
        <section style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {memberships.invites.map((l) => (
            <InviteResponse key={l.id} id={l.id} ownerName={l.ownerName} title={l.title} share={l.share_pct === null ? null : Number(l.share_pct)} />
          ))}
        </section>
      )}

      <section style={{ marginBottom: 20 }}>
        <p className="ep-label" style={{ marginBottom: 8 }}>{t("Comment tu travailles")}</p>
        <CareerPicker current={mode} options={options} />
      </section>

      {(memberships.active.length > 0 || staffSelf) && (
        <section style={{ marginBottom: 20 }}>
          <p className="ep-label" style={{ marginBottom: 8 }}>{t("Tu travailles avec")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {memberships.active.map((l) => (
              <div key={l.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{l.ownerName}</p>
                  <p style={{ fontSize: 12, color: "rgba(245,237,237,0.55)", margin: "2px 0 0" }}>
                    {l.title || t("Coach")}
                    {l.share_pct !== null ? ` · ${Number(l.share_pct)} % reversé` : ""}
                    {l.accepted_at ? ` · depuis le ${new Date(l.accepted_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })}` : ""}
                  </p>
                </div>
                <LeaveTeam id={l.id} ownerName={l.ownerName} />
              </div>
            ))}
            {staffSelf && (
              <Link href="/equipe" className="ep-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#F5EDED", fontSize: 13.5, fontWeight: 700 }}>
                <Briefcase size={15} style={{ color: "#E01E1E" }} />{" "}{t("Mon espace")}{" "}{getRoleCard(staffSelf.role_key)?.role.title ?? t("équipe")}
              </Link>
            )}
          </div>
        </section>
      )}

      {!owner ? (
        <section className="ep-card" style={{ padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: "0 0 4px" }}>{t("Tu veux recruter ?")}</p>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.6)", margin: 0, lineHeight: 1.6 }}>
            {t("Choisis « Mon entreprise, avec une équipe » juste au-dessus : tu pourras inviter des coachs et donner des accès à ton staff (setter, closer, monteur, community manager...), chacun avec un espace adapté à son métier.")}
          </p>
        </section>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 14 }}>
            {tile("coachs actifs", activeCoaches.length)}
            {tile("clients suivis par l'équipe", totals.clients)}
            {tile("clients payants", totals.paying)}
            {tile("bilans hebdo à traiter", totals.waiting)}
            {tile("staff actif", staff?.members.filter((m) => m.status === "actif").length ?? 0)}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <Link href="/dashboard/coach/admin/equipe" style={linkStyle}><LayoutDashboard size={14} />{" "}{t("Cockpit")}</Link>
            <Link href="/dashboard/coach/admin/equipe/messages" style={linkStyle}><MessagesSquare size={14} />{" "}{t("Messagerie d'équipe")}</Link>
            <Link href="/dashboard/coach/admin/equipe/documents" style={linkStyle}><FolderOpen size={14} />{" "}{t("Documents")}</Link>
          </div>

          <section style={{ marginBottom: 20 }}>
            <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={12} />{" "}{t("Mes coachs (")}{activeCoaches.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {activeCoaches.map((l) => {
                const s = l.coach_id ? team?.stats[l.coach_id] : null;
                return (
                  <div key={l.id} className="ep-card" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{s?.name ?? l.email}</p>
                        <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: "2px 0 6px" }}>
                          {l.title || t("Coach")}
                          {l.share_pct !== null ? ` · ${l.share_pct} % reversé` : ""}
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.6 }}>
                          {s ? `${s.clients} clients dont ${s.paying} payants · +${s.newThisMonth} ce mois · ${s.bilansToday} bilans aujourd'hui · ${s.checkinsWaiting} bilans hebdo à traiter` : t("Pas encore de chiffres.")}
                        </p>
                        {l.note && <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "4px 0 0", fontStyle: "italic" }}>{l.note}</p>}
                      </div>
                      <CoachLinkActions id={l.id} title={l.title} share={l.share_pct} note={l.note} pendingInvite={false} />
                    </div>
                  </div>
                );
              })}
              {pendingCoaches.map((l) => (
                <div key={l.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", opacity: 0.85 }}>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.75)", margin: 0 }}>
                    {l.email} <span style={{ color: "rgba(245,237,237,0.4)" }}>{t("· invité le")}{" "}{new Date(l.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" })}{t(", en attente")}</span>
                  </p>
                  <CoachLinkActions id={l.id} title={l.title} share={l.share_pct} note={l.note} pendingInvite />
                </div>
              ))}
              {!activeCoaches.length && !pendingCoaches.length && (
                <p className="ep-card" style={{ padding: "12px 14px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>{t("Pas encore de coach dans ton équipe.")}</p>
              )}
            </div>
            <InviteCoachForm />
          </section>

          <section style={{ marginBottom: 20 }}>
            <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Briefcase size={12} />{" "}{t("Mon staff (")}{staff?.members.length ?? 0})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {staff?.members.map((m) => (
                <div key={m.user_id} className="ep-card" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dashboard/coach/admin/equipe/${m.user_id}`} style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", textDecoration: "none" }}>{m.full_name}</Link>
                    <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: "2px 0 0" }}>
                      {getRoleCard(m.role_key)?.role.title ?? m.role_key}{" "}{t("· accès")}{" "}{STATUS_LABEL[m.status] ?? m.status}
                    </p>
                  </div>
                  <StaffStatus userId={m.user_id} status={m.status} />
                </div>
              ))}
              {staff?.invites.map((i) => (
                <div key={i.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", opacity: 0.85 }}>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.75)", margin: 0 }}>
                    {i.email} <span style={{ color: "rgba(245,237,237,0.4)" }}>· {getRoleCard(i.role_key)?.role.title ?? i.role_key}{t(", accès pas encore créé")}</span>
                  </p>
                  <RevokeStaffInvite id={i.id} />
                </div>
              ))}
            </div>
            <InviteStaffForm roles={roleGroups} />
          </section>

          {payroll && payroll.lines.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Wallet size={12} />{" "}{t("Paie du mois (")}{new Date(`${payroll.month}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})
              </p>
              <div className="ep-card-hero" style={{ padding: "14px 16px", marginBottom: 8 }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{Math.round(payroll.total).toLocaleString("fr-FR")} €</p>
                <p style={{ fontSize: 12, color: "rgba(245,237,237,0.55)", margin: "2px 0 0" }}>{t("à verser à ton staff pour ce mois, calculé sur leurs vraies ventes et livraisons")}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {payroll.lines.map((l) => (
                  <div key={l.userId} className="ep-card" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{l.name}</p>
                        <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: "2px 0 0" }}>{l.roleTitle} · {l.detail}</p>
                      </div>
                      <p style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED", margin: 0, flexShrink: 0 }}>{Math.round(l.total).toLocaleString("fr-FR")} €</p>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <PayConfigEditor userId={l.userId} config={l.config} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
