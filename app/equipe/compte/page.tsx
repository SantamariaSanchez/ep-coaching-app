import { requireStaffPage } from "@/lib/staff-page";
import TwoFactorCard from "@/components/settings/TwoFactorCard";
import StaffPasswordCard from "@/components/staff/StaffPasswordCard";
import AccessibilityCard from "@/components/settings/AccessibilityCard";

export const dynamic = "force-dynamic";

// Sécurité du compte d'une recrue : le contrat (article 7) demande d'activer
// la double authentification dès qu'elle est proposée, elle l'est ici.
export default async function StaffAccountPage() {
  const ctx = await requireStaffPage();

  return (
    <div className="page-transition" style={{ maxWidth: 620 }}>
      <p className="ep-label" style={{ marginBottom: 4 }}>{ctx.role.title}</p>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px", letterSpacing: "-0.03em", textTransform: "uppercase" }}>
        Mon compte
      </h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", margin: "0 0 20px" }}>
        Connecté en tant que {ctx.member.full_name} ({ctx.member.email}).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <p className="ep-label" style={{ marginBottom: 8 }}>Double authentification</p>
          {!ctx.profile?.mfa_enabled && (
            <p style={{ fontSize: 12.5, color: "#facc15", margin: "0 0 10px", lineHeight: 1.55 }}>
              Recommandée par ton contrat : tu as accès à des données de clients, un mot de passe seul ne suffit pas à les protéger.
            </p>
          )}
          <TwoFactorCard enabled={!!ctx.profile?.mfa_enabled} mandatory={false} />
        </div>
        <div>
          <p className="ep-label" style={{ marginBottom: 8 }}>Mot de passe</p>
          <StaffPasswordCard />
        </div>
        <AccessibilityCard className="" />
      </div>
    </div>
  );
}
