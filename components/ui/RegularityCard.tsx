import Link from "next/link";
import { Flame } from "lucide-react";
import { getRankForPoints } from "@/lib/gamification-types";

// Item 20 : le système de points/rangs existait déjà (profil, fiche client
// vue par le coach...) mais n'apparaissait nulle part sur le dashboard que
// le client voit tous les jours. Carte compacte, pensée pour être visible
// sans scroller, streak + rang côte à côte plutôt que deux blocs séparés.
export default function RegularityCard({ streakDays, points }: { streakDays: number; points: number }) {
  const { rank } = getRankForPoints(points);

  // Rien à montrer pour un compte tout neuf (0 point, 0 jour) — afficher
  // "0j de régularité" le premier jour serait décourageant plutôt que motivant.
  if (streakDays === 0 && points === 0) return null;

  return (
    <div
      className="ep-card animate-fade-up stagger-1"
      style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 18px", marginBottom: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: streakDays > 0 ? "rgba(251,146,60,0.12)" : "rgba(245,237,237,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Flame size={16} style={{ color: streakDays > 0 ? "#fb923c" : "rgba(245,237,237,0.2)" }} strokeWidth={1.8} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#F5EDED", letterSpacing: "-0.02em" }}>
            {streakDays}j
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600 }}>
            de régularité
          </p>
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: "rgba(137,4,4,0.2)", margin: "0 16px" }} />

      <Link
        href="/dashboard/client/profile"
        style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{rank.emoji}</span>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "#F5EDED" }}>{rank.label}</p>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600 }}>
            {points} pts
          </p>
        </div>
      </Link>
    </div>
  );
}
