import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileSignature } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildStaffContract } from "@/lib/staff-contract";
import ContractView from "@/components/staff/ContractView";

export const dynamic = "force-dynamic";

// Le contrat signé d'un membre, tel qu'il l'a signé (texte, date, version,
// nom tapé ou référence JotForm), lisible et imprimable par le fondateur.
export default async function MemberContractPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_members")
    .select("user_id, role_key, full_name, email, contract_signed_at, contract_version, contract_signature, contract_signed_ip")
    .eq("owner_id", user.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) notFound();
  const m = data as { user_id: string; role_key: string; full_name: string; email: string; contract_signed_at: string | null; contract_version: string | null; contract_signature: string | null; contract_signed_ip: string | null };
  const contract = buildStaffContract(m.role_key, m.full_name, m.email);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Documents de l&apos;équipe
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <FileSignature size={16} style={{ color: "#E01E1E" }} />
        <p className="ep-label" style={{ margin: 0 }}>Contrat de {m.full_name}</p>
      </div>
      <div className="ep-card" style={{ padding: "14px 16px", marginBottom: 14 }}>
        {m.contract_signed_at ? (
          <p style={{ fontSize: 13, color: "#F5EDED", margin: 0, lineHeight: 1.7 }}>
            Signé le <strong>{new Date(m.contract_signed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}</strong>
            <br />
            Version {m.contract_version} · signature : {m.contract_signature} · IP {m.contract_signed_ip ?? "inconnue"}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#facc15", margin: 0 }}>Pas encore signé.</p>
        )}
      </div>
      <div className="ep-card" style={{ padding: "22px 20px" }}>{contract && <ContractView contract={contract} />}</div>
    </div>
  );
}
