import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { getUser, getProfile, getClients, getAllCoaches } from "@/utils/auth";
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

  const activeCoaches = profile?.is_platform_owner ? await getAllCoaches() : null;
  const activeCoachesCount = activeCoaches?.filter((c) => c.platform_subscription_status === "active").length ?? 0;

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

      {/* ── Vue plateforme (propriétaire uniquement) ─────────────────────────── */}
      {profile?.is_platform_owner && (
        <Link
          href="/dashboard/coach/admin"
          className="animate-fade-up"
          style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
            padding: "14px 18px", borderRadius: 14,
            background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.18)",
            textDecoration: "none",
          }}
        >
          <ShieldCheck size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>Vue plateforme</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>
              {activeCoachesCount} coach{activeCoachesCount > 1 ? "s" : ""} tiers actif{activeCoachesCount > 1 ? "s" : ""} sur la plateforme
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
        </Link>
      )}

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
