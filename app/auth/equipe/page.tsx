import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Briefcase } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { POLES } from "@/lib/org-roles";
import { STAFF_ROLE_KEYS, staffLoginPath } from "@/lib/staff-roles";

export const metadata: Metadata = {
  title: "Espace équipe | EP Coaching",
  robots: { index: false, follow: false },
};

// Point de chute d'une recrue dont la session a expiré (voir proxy.ts) : elle
// retrouve la page de connexion de son poste sans avoir gardé le lien.
export default function StaffAuthIndexPage() {
  const poles = POLES.map((p) => ({ ...p, roles: p.roles.filter((r) => STAFF_ROLE_KEYS.includes(r.key)) })).filter((p) => p.roles.length > 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <EPLogo size="md" showCoaching />
        </div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Briefcase size={12} style={{ color: "rgba(224,30,30,0.7)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)" }}>Espace équipe</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#F5EDED", margin: "0 0 8px", letterSpacing: "-0.03em" }}>Choisis ton poste</h1>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0, lineHeight: 1.6 }}>
            Réservé aux personnes recrutées. Tu es membre ou client ?{" "}
            <Link href="/auth/client" style={{ color: "#E01E1E", fontWeight: 700 }}>Connecte-toi ici</Link>.
          </p>
        </div>
        {poles.map((pole) => (
          <div key={pole.key} className="ep-card" style={{ padding: "12px 14px", marginBottom: 10 }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: pole.color, margin: "2px 4px 6px" }}>{pole.name}</p>
            {pole.roles.map((r) => (
              <Link
                key={r.key}
                href={staffLoginPath(r.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 6px", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none", color: "#F5EDED", fontSize: 13, fontWeight: 700 }}
              >
                {r.title}
                <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.3)" }} />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
