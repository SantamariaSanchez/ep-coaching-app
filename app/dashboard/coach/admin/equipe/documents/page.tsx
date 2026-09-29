import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileSignature, FileText, FolderOpen } from "lucide-react";
import { getUser } from "@/utils/auth";
import { isTeamOwner } from "@/lib/team-owner";
import { createAdminClient } from "@/lib/supabase-admin";
import { getDocumentsForOwner, getTeamDirectory } from "@/lib/staff-team";
import { getApplicationsForHr } from "@/lib/staff";
import { STAFF_ROLE_KEYS, getRoleCard } from "@/lib/staff-roles";
import { STAFF_CONTRACT_VERSION } from "@/lib/staff-contract";
import DocumentsPanel from "@/components/staff/DocumentsPanel";
import { getLatestSignedContract } from "@/lib/staff-contract-files";

export const dynamic = "force-dynamic";

// Tous les documents pro de l'équipe au même endroit (demande directe
// 2026-09-27) : contrats signés (PDF JotForm quand il existe, sinon le
// contrat tel que signé dans l'appli), CV reçus sur /carrieres, et les
// documents partagés avec l'équipe, un métier ou une personne.
export default async function FounderTeamDocumentsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  // Fondateur ou coach en mode entreprise : chacun ne voit que SON équipe.
  if (!(await isTeamOwner(user.id))) redirect("/dashboard/coach/mon-equipe");

  const admin = createAdminClient();
  const [documents, people, applications, { data: memberRows }] = await Promise.all([
    getDocumentsForOwner(user.id),
    getTeamDirectory(user.id),
    getApplicationsForHr(user.id),
    admin
      .from("staff_members")
      .select("user_id, role_key, full_name, status, contract_signed_at, contract_version, contract_signature")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
  ]);
  const members = (memberRows ?? []) as { user_id: string; role_key: string; full_name: string; status: string; contract_signed_at: string | null; contract_version: string | null; contract_signature: string | null }[];

  // PDF signés (JotForm) : bucket privé staff-contracts (lib/staff-contract-files.ts).
  const signed = await Promise.all(members.map((m) => getLatestSignedContract(m.user_id, `${m.full_name} - ${getRoleCard(m.role_key)?.role.title ?? m.role_key}`)));
  const contractPdfs = new Map<string, { href: string }>();
  members.forEach((m, i) => {
    const f = signed[i];
    if (f) contractPdfs.set(m.user_id, { href: f.downloadUrl });
  });
  // Anciens PDF rangés dans les documents partagés (avant le 2026-09-27) : on
  // les laisse dans la liste générale, rien n'est supprimé.
  const otherDocs = documents;
  const cvs = applications.filter((a) => a.cvUrl);

  const targets = [
    { value: "all", label: "Toute l'équipe" },
    ...STAFF_ROLE_KEYS.map((k) => ({ value: `role:${k}`, label: `Métier : ${getRoleCard(k)?.role.title ?? k}` })),
    ...people.filter((p) => !p.isFounder).map((p) => ({ value: `user:${p.id}`, label: `${p.name} (${p.subtitle})` })),
  ];

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid rgba(245,237,237,0.06)", flexWrap: "wrap" };
  const link: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#ff6b6b", textDecoration: "none" };

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Pilotage de l&apos;équipe
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Administration</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Documents de l&apos;équipe</h1>
      <p className="text-sm text-[#F5EDED]/45 mb-6">Contrats, CV et documents partagés : tout le papier de l&apos;équipe au même endroit.</p>

      <section className="ep-card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <p className="ep-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <FileSignature size={12} /> Contrats ({members.filter((m) => m.contract_signed_at).length}/{members.length} signés)
        </p>
        {members.length === 0 && <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Personne dans l&apos;équipe pour l&apos;instant.</p>}
        {members.map((m) => {
          const pdf = contractPdfs.get(m.user_id);
          const upToDate = m.contract_signed_at && m.contract_version === STAFF_CONTRACT_VERSION;
          return (
            <div key={m.user_id} style={row}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{m.full_name}</p>
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>
                  {getRoleCard(m.role_key)?.role.title ?? m.role_key} ·{" "}
                  {m.contract_signed_at ? (
                    <span style={{ color: upToDate ? "#4ade80" : "#facc15" }}>
                      signé le {new Date(m.contract_signed_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                      {upToDate ? "" : " (ancienne version)"}
                      {m.contract_signature?.includes("JotForm") ? " via JotForm" : ""}
                    </span>
                  ) : (
                    <span style={{ color: "#facc15" }}>pas encore signé</span>
                  )}
                </p>
              </div>
              {pdf?.href && (
                <a href={pdf.href} style={link}>
                  PDF signé
                </a>
              )}
              <Link href={`/dashboard/coach/admin/equipe/${m.user_id}/contrat`} style={link}>
                Lire le contrat
              </Link>
            </div>
          );
        })}
      </section>

      <section className="ep-card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <p className="ep-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <FileText size={12} /> CV reçus ({cvs.length})
        </p>
        {cvs.length === 0 && <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>Aucun CV reçu pour l&apos;instant (page Carrières).</p>}
        {cvs.slice(0, 60).map((a) => (
          <div key={a.id} style={row}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{a.full_name}</p>
              <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>
                {getRoleCard(a.role_key)?.role.title ?? a.role_key} · {new Date(a.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} · {a.email}
              </p>
            </div>
            <a href={a.cvUrl!} target="_blank" rel="noopener noreferrer" style={link}>
              Ouvrir le CV
            </a>
          </div>
        ))}
        <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "8px 0 0" }}>Liens sécurisés temporaires (contrats 10 minutes, CV une heure) : recharge la page pour en générer de nouveaux.</p>
      </section>

      <section>
        <p className="ep-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <FolderOpen size={12} /> Documents partagés
        </p>
        <p className="text-sm text-[#F5EDED]/45 mb-4">Ce que tu partages ici apparaît dans l&apos;onglet Documents des personnes concernées.</p>
        <DocumentsPanel documents={otherDocs} meId={user.id} founder targets={targets} />
      </section>
    </div>
  );
}
