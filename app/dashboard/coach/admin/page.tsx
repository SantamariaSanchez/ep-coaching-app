import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getAllCoaches, getClients } from "@/utils/auth";
import { getCoachBillingInfo } from "@/lib/coach-billing";
import CoachStatusToggle from "@/components/coach/CoachStatusToggle";
import CoachClientsToggle from "@/components/coach/CoachClientsToggle";
import { ExternalLink, ChevronLeft } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: "Essai gratuit", color: "#facc15" },
  active: { label: "Actif", color: "#4ade80" },
  past_due: { label: "Paiement en retard", color: "#E01E1E" },
  unpaid: { label: "Impayé", color: "#E01E1E" },
  canceled: { label: "Annulé", color: "rgba(245,237,237,0.4)" },
  incomplete: { label: "Incomplet", color: "rgba(245,237,237,0.4)" },
  erreur: { label: "Erreur Stripe", color: "#E01E1E" },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

// Réservé au propriétaire de la plateforme — gère l'accès des coachs tiers
// et affiche l'état réel de leur abonnement Stripe (paiement, essai,
// prochaine échéance).
export default async function CoachAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const coaches = await getAllCoaches();
  const [billing, clientsByCoach] = await Promise.all([
    Promise.all(coaches.map((c) => getCoachBillingInfo(c.platform_stripe_customer_id, c.platform_stripe_subscription_id))),
    Promise.all(coaches.map((c) => getClients(c.id))),
  ]);

  // MRR estimé : ramène chaque abonnement actif/en essai à un équivalent mensuel.
  const mrr = billing.reduce((sum, b) => {
    if (!b || !b.amount || !b.intervalMonths) return sum;
    if (b.status !== "active" && b.status !== "trialing") return sum;
    return sum + b.amount / b.intervalMonths;
  }, 0);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Retour
      </Link>
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Administration
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Coachs</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Coachs tiers inscrits sur la plateforme. Chacun ne voit que ses propres clients, toi seul peux consulter la liste de chacun ci-dessous (lecture seule, sans y accéder toi-même).
        </p>
      </div>

      <div className="ep-card" style={{ padding: "16px 20px", display: "flex", gap: 24, marginBottom: 24 }}>
        <div>
          <p className="ep-label" style={{ marginBottom: 4 }}>Coachs inscrits</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{coaches.length}</p>
        </div>
        <div>
          <p className="ep-label" style={{ marginBottom: 4 }}>MRR estimé</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#4ade80", margin: 0 }}>
            {mrr.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
          </p>
        </div>
      </div>

      {coaches.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>Aucun coach tiers inscrit pour l&apos;instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {coaches.map((coach, i) => {
            const b = billing[i];
            const statusInfo = b?.status ? STATUS_LABELS[b.status] : null;
            return (
              <div key={coach.id} className="ep-card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
                      {coach.full_name ?? "Sans nom"}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{coach.email}</p>
                  </div>
                  <CoachStatusToggle coachId={coach.id} status={coach.platform_subscription_status} />
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(245,237,237,0.06)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {statusInfo ? (
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
                      color: statusInfo.color, border: `1px solid ${statusInfo.color}55`, borderRadius: 999, padding: "2px 8px",
                    }}>
                      {statusInfo.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "rgba(245,237,237,0.35)" }}>Pas encore de paiement Stripe</span>
                  )}
                  {b?.amount != null && (
                    <span style={{ fontSize: 12, color: "rgba(245,237,237,0.55)" }}>
                      {b.amount}€ / {b.intervalMonths === 1 ? "mois" : `${b.intervalMonths} mois`}
                    </span>
                  )}
                  {b?.status === "trialing" && b.trialEnd && (
                    <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                      Essai jusqu&apos;au {formatDate(b.trialEnd)}
                    </span>
                  )}
                  {b?.status === "active" && b.currentPeriodEnd && (
                    <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                      Prochain prélèvement le {formatDate(b.currentPeriodEnd)}
                    </span>
                  )}
                  {b?.stripeCustomerUrl && (
                    <a
                      href={b.stripeCustomerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#E01E1E", textDecoration: "none", fontWeight: 700, marginLeft: "auto" }}
                    >
                      Voir sur Stripe <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <CoachClientsToggle
                  clients={(clientsByCoach[i] ?? []).map((c) => ({
                    id: c.id,
                    full_name: c.full_name,
                    email: c.email,
                    subscription_status: c.subscription_status,
                  }))}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
