import { getT } from "@/lib/i18n-server";
export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import ClientBilanView from "@/components/ui/ClientBilanView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CoachClientBilanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  // Avant, le nom était lu via le client admin sans aucun contrôle
  // d'appartenance (seul le rôle coach était vérifié) : n'importe quel coach
  // pouvait afficher les bilans de n'importe quel membre en forgeant l'id
  // dans l'URL. getClientById ne renvoie le profil que s'il est rattaché à
  // CE coach, même garde que la fiche membre et ses autres onglets.
  const clientProfile = await getClientById(id, user.id);
  if (!clientProfile) notFound();

  // Les bilans ne sont lus qu'une fois l'appartenance vérifiée.
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
          <ArrowLeft size={13} />{" "}{t("Retour")}
        </Link>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{t("Bilans quotidiens")}</p>
        <h1 className="ep-h1">{clientProfile.full_name ?? t("Membre")}</h1>
      </div>

      <ClientBilanView weeks={weeks} clientId={id} />
    </div>
  );
}
