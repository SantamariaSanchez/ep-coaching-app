import { MailCheck } from "lucide-react";
import { requireStaffPage } from "@/lib/staff-page";
import ResendVerificationButton from "@/components/staff/ResendVerificationButton";

export const dynamic = "force-dynamic";

// Étape 1 de la première connexion : prouver l'accès à la boîte mail avant
// de signer quoi que ce soit (le contrat y sera envoyé).
export default async function StaffVerifyPage() {
  const ctx = await requireStaffPage("verify");

  return (
    <div style={{ maxWidth: 520, margin: "24px auto 0" }}>
      <div className="ep-card-hero" style={{ padding: "30px 24px", textAlign: "center" }}>
        <MailCheck size={30} style={{ color: "#E01E1E", margin: "0 auto 12px" }} />
        <p className="ep-label" style={{ marginBottom: 6 }}>Étape 1 sur 2</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5EDED", margin: "0 0 10px" }}>Confirme ton email</h1>
        <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.65, margin: "0 0 18px" }}>
          Un lien vient d&apos;être envoyé à <strong style={{ color: "#F5EDED" }}>{ctx.member.email}</strong>. Clique
          dessus, puis tu signeras ton contrat de collaboration (étape 2). Pense à regarder dans tes spams.
        </p>
        <ResendVerificationButton />
      </div>
    </div>
  );
}
