import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";
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
        <h1 className="ep-h2" style={{ margin: "0 0 12px" }}>Plus qu&apos;une étape</h1>
        <p style={{ fontSize: 14, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Ton compte coach est créé. Active ton abonnement plateforme
          pour accéder à ton espace et commencer à suivre tes propres clients.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {COACH_PLATFORM_PLANS.map((plan) => (
            <a
              key={plan.id}
              href={`${plan.url}?client_reference_id=${user.id}`}
              className="ep-btn-primary"
              style={{ display: "flex", flexDirection: "column", height: "auto", padding: "14px 20px", fontSize: 13, textDecoration: "none" }}
            >
              <span>{plan.label} — {plan.priceLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{plan.sublabel}</span>
            </a>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
