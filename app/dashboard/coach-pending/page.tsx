import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { COACH_PLATFORM_PLAN } from "@/lib/coach-platform-plan";
import { Crown } from "lucide-react";
import SignOutButton from "@/components/ui/SignOutButton";

export default async function CoachPendingPage() {
  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/auth/coach");
  if (profile.role !== "coach") redirect("/dashboard/client");
  if (profile.is_platform_owner || profile.platform_subscription_status === "active") {
    redirect("/dashboard/coach");
  }

  const checkoutUrl = `${COACH_PLATFORM_PLAN.url}?client_reference_id=${user.id}`;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
          background: "linear-gradient(135deg, rgba(224,30,30,0.18), rgba(137,4,4,0.1))",
          border: "1px solid rgba(224,30,30,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Crown size={28} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 12px" }}>
          Plus qu&apos;une étape
        </h1>
        <p style={{ fontSize: 14, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Ton compte coach est créé. Active ton abonnement plateforme
          ({COACH_PLATFORM_PLAN.priceLabel}) pour accéder à ton espace et
          commencer à suivre tes propres clients.
        </p>
        <a
          href={checkoutUrl}
          className="ep-btn-primary"
          style={{ display: "inline-flex", height: 50, padding: "0 28px", fontSize: 13, textDecoration: "none" }}
        >
          Activer mon abonnement
        </a>
        <div style={{ marginTop: 20 }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
