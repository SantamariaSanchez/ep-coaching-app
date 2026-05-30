import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import ClientsSection from "@/components/ui/ClientsSection";
import DashboardStats from "@/components/coach/DashboardStats";
import UrgentAlertsSection from "@/components/coach/UrgentAlertsSection";

export default async function CoachDashboard() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  const firstName = profile?.full_name?.split(" ")[0] ?? "Coach";
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(today);
  const dateLabel = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <span className="ep-section-title">Espace Coach</span>
          <h1
            className="animate-fade-up stagger-1"
            style={{
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 800,
              fontSize: 32,
              letterSpacing: "-0.04em",
              color: "#F5EDED",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Bonjour, {firstName}
          </h1>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(245,237,237,0.4)",
            fontWeight: 500,
            textAlign: "right",
            paddingTop: 4,
          }}
        >
          {dateLabel}
        </div>
      </div>

      {/* ── Stats — client-side for instant render ──────────────────────────── */}
      <DashboardStats />

      {/* ── Urgent alerts — lazy-loaded ─────────────────────────────────────── */}
      <UrgentAlertsSection />

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <ClientsSection clients={clients} />
    </div>
  );
}
