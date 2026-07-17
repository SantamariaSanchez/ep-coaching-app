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
    getClients(),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

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
      className="page-transition"
      style={{ padding: "32px 24px 48px", maxWidth: 900, margin: "0 auto" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          Espace Coach &nbsp;·&nbsp; {formattedDate}
        </p>
        <h1 style={{
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: "-0.04em",
          color: "#F5EDED",
          margin: 0,
          lineHeight: 1.05,
        }}>
          Bonjour, {firstName}
        </h1>
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
