export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import ClientBilanView from "@/components/ui/ClientBilanView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CoachClientBilanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const admin = createAdminClient();
  const { data: clientProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .single();

  if (!clientProfile) redirect("/dashboard/coach/clients");

  const logs = await getClientDailyLogs(id, 56);
  const weeks = groupLogsByWeek(logs);

  return (
    <div className="page-transition" style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href={`/dashboard/coach/clients/${id}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.3)", textDecoration: "none", marginBottom: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          <ArrowLeft size={13} /> Retour
        </Link>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Bilans quotidiens</p>
        <h1 className="ep-h1">{clientProfile.full_name ?? "Client"}</h1>
      </div>

      <ClientBilanView weeks={weeks} clientId={id} />
    </div>
  );
}
