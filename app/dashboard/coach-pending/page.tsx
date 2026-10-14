import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import NotInIOSApp from "@/components/native/NotInIOSApp";
import { getUser, getProfile } from "@/utils/auth";
import { COACH_TESTER_PLAN } from "@/lib/coach-platform-plan";
import { activateTesterPlan } from "./actions";
import { Crown, Gift } from "lucide-react";
import SignOutButton from "@/components/ui/SignOutButton";
import CoachPlanCards, { CoachPlanComparison, CoachPlanReassurance } from "@/components/coach/CoachPlanCards";

// Choix de la formule d'un coach tout juste inscrit (retour du fondateur
// 2026-10-14 : offres beaucoup plus claires, une vraie carte par prix avec
// tout ce qui est compris). Cartes : components/coach/CoachPlanCards.tsx.
export default async function CoachPendingPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/auth/coach");
  if (profile.role !== "coach") redirect("/dashboard/client");
  if (profile.is_platform_owner || profile.platform_subscription_status === "active") {
    redirect("/dashboard/coach");
  }

  const freeOption = (
    <form action={activateTesterPlan} className="ep-card" style={{ padding: "16px", borderRadius: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span
          aria-hidden
          style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "rgba(var(--ep-ok-rgb),0.12)", color: "var(--ep-ok)",
          }}
        >
          <Gift size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--ep-strong)", margin: 0 }}>
            {t("Pas prêt à payer ?")}
          </p>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.6)", margin: "3px 0 0" }}>
            {t(COACH_TESTER_PLAN.label)}{" "}({t(COACH_TESTER_PLAN.priceLabel)}){" : "}{t(COACH_TESTER_PLAN.sublabel)}
          </p>
        </div>
      </div>
      <button type="submit" className="ep-btn-secondary" style={{ width: "100%", minHeight: 48, borderRadius: 14, marginTop: 14, fontSize: 12 }}>
        {t("Commencer gratuitement")}
      </button>
    </form>
  );

  return (
    <main style={{ minHeight: "100vh", padding: "28px 16px 48px", position: "relative", zIndex: 1 }}>
      <div className="animate-fade-up" style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 24px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(var(--ep-accent-rgb),0.18), rgba(var(--ep-line-rgb),0.1))",
            border: "1px solid rgba(var(--ep-accent-rgb),0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={26} style={{ color: "var(--ep-accent)" }} strokeWidth={1.8} />
          </div>
          <h1 className="ep-h2" style={{ margin: "0 0 10px" }}>{t("Choisis ta formule")}</h1>
          <p style={{ fontSize: 14, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.6, margin: 0 }}>
            {t("Ton compte coach est créé. Une seule appli pour suivre tes clients, et avec Premium pour développer ton business.")}
          </p>
        </div>

        <NotInIOSApp
          fallback={
            <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
              {freeOption}
              <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
                {t("Ton abonnement se gère depuis ton espace sur le web. Une fois actif, reviens ici : tout sera prêt.")}
              </p>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <CoachPlanCards mode="link" userId={user.id} />
            <div className="ep-plan-wrap">
              <div className="ep-plan-grid">
                <CoachPlanComparison />
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="ep-card" style={{ padding: "18px 16px", borderRadius: 20 }}>
                    <CoachPlanReassurance />
                  </div>
                  {freeOption}
                </div>
              </div>
            </div>
          </div>
        </NotInIOSApp>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
