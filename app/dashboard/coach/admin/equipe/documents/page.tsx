import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getDocumentsForOwner, getTeamDirectory } from "@/lib/staff-team";
import { STAFF_ROLE_KEYS, getRoleCard } from "@/lib/staff-roles";
import DocumentsPanel from "@/components/staff/DocumentsPanel";

export const dynamic = "force-dynamic";

// Documents de l'équipe côté fondateur : partager une procédure, un
// support de formation, un fichier à toute l'équipe, à un métier ou à une
// seule personne.
export default async function FounderTeamDocumentsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const [documents, people] = await Promise.all([getDocumentsForOwner(user.id), getTeamDirectory(user.id)]);
  const targets = [
    { value: "all", label: "Toute l'équipe" },
    ...STAFF_ROLE_KEYS.map((k) => ({ value: `role:${k}`, label: `Métier : ${getRoleCard(k)?.role.title ?? k}` })),
    ...people.filter((p) => !p.isFounder).map((p) => ({ value: `user:${p.id}`, label: `${p.name} (${p.subtitle})` })),
  ];

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Pilotage de l&apos;équipe
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Administration</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Documents de l&apos;équipe</h1>
      <p className="text-sm text-[#F5EDED]/45 mb-6">Ce que tu partages ici apparaît dans l&apos;onglet Documents des personnes concernées.</p>
      <DocumentsPanel documents={documents} meId={user.id} founder targets={targets} />
    </div>
  );
}
