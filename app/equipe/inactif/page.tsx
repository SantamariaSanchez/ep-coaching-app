import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { loadStaffContext } from "@/lib/staff-page";

export default async function StaffInactivePage() {
  const ctx = await loadStaffContext();
  if (ctx !== "inactive") redirect("/equipe");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ep-card" style={{ maxWidth: 420, padding: "28px 24px", textAlign: "center" }}>
        <ShieldOff size={28} style={{ color: "#E01E1E", margin: "0 auto 12px" }} />
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px" }}>Accès équipe désactivé</h1>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.6, margin: 0 }}>
          Ton espace métier n&apos;est plus actif. Si tu penses que c&apos;est une erreur, écris à
          peccoux.manu@gmail.com.
        </p>
      </div>
    </div>
  );
}
