import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import ClientsSection from "@/components/ui/ClientsSection";
import DashboardStats from "@/components/coach/DashboardStats";
import UrgentAlertsSection from "@/components/coach/UrgentAlertsSection";

export default async function CoachDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  // Onboarding coach (Axe 9, VISION.md — gap confirmé 2026-08-19 : seul
  // le membre/client avait un vrai parcours d'accueil). Seulement pour un
  // coach tiers dont l'abonnement plateforme est déjà actif (paiement
  // Stripe confirmé, voir app/api/webhooks/stripe/route.ts) — jamais le
  // fondateur (déjà "onboardé" par définition), jamais avant paiement.
  if (
    profile?.role === "coach" &&
    !profile.is_platform_owner &&
    profile.platform_subscription_status === "active" &&
    !profile.onboarding_completed_at
  ) {
    redirect("/onboarding/coach");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Coach";
  const today = new Date();
  const formattedDate = (() => {
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <div
      className="page-transition ep-page-wide"
      style={{ padding: "32px 24px 48px" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          Espace Coach &nbsp;·&nbsp; {formattedDate}
        </p>
        <h1 className="ep-h1">Bonjour, {firstName}</h1>
      </div>

      {/* ── Stats (client-side fetch) ────────────────────────────────────────── */}
      <DashboardStats />

      {/* ── Urgent alerts ───────────────────────────────────────────────────── */}
      <UrgentAlertsSection />

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <section>
        <ClientsSection clients={clients} />
      </section>
    </div>
  );
}
