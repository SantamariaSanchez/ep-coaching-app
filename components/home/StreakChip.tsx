import Link from "next/link";
import { Flame } from "lucide-react";
import { getRankForPoints } from "@/lib/gamification-types";

// Régularité et rang dans une pastille à côté du bonjour, au lieu d'une
// carte entière (2026-10-08, accueil raccourci). Rien pour un compte neuf.
export default function StreakChip({ streakDays, points, href, label }: { streakDays: number; points: number; href: string; label: string }) {
  if (streakDays === 0 && points === 0) return null;
  const { rank } = getRankForPoints(points);
  return (
    <Link
      href={href}
      aria-label={label}
      className="ep-press"
      style={{
        flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", minHeight: 32,
        borderRadius: 999, background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)",
        textDecoration: "none", color: "#F5EDED", fontSize: 12, fontWeight: 800,
      }}
    >
      <Flame size={13} style={{ color: streakDays > 0 ? "#fb923c" : "rgba(245,237,237,0.3)" }} strokeWidth={2} />
      {streakDays} j
      <span style={{ fontSize: 13, lineHeight: 1 }}>{rank.emoji}</span>
    </Link>
  );
}
