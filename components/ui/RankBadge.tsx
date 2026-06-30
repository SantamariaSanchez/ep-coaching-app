import { getRankForPoints } from "@/lib/gamification-types";

// Petit badge cosmétique réutilisable — à côté d'un nom dans la Communauté,
// sur une carte de profil, etc. Pas de "use client" : pur calcul + rendu.
export default function RankBadge({
  points,
  size = "sm",
}: {
  points: number;
  size?: "sm" | "md";
}) {
  const { rank } = getRankForPoints(points);
  const isSm = size === "sm";

  return (
    <span
      title={`${rank.label} · ${points} pts`}
      className={`inline-flex items-center gap-1 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/55 font-bold uppercase tracking-wide flex-shrink-0 ${
        isSm ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"
      }`}
    >
      <span>{rank.emoji}</span>
      {rank.label}
    </span>
  );
}
