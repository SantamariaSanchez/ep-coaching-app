import type { RoleBadge as RoleBadgeLabel } from "@/utils/auth";

// Pastille de rôle réutilisable (messagerie, notifications) — même gabarit
// visuel que RankBadge.tsx pour rester cohérent avec le reste de l'appli.
export default function RoleBadge({
  label,
  size = "sm",
}: {
  label: RoleBadgeLabel;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  const accent = label === "Fondateur" || label === "Coach";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide flex-shrink-0 ${
        isSm ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"
      }`}
      style={{
        background: accent ? "rgba(224,30,30,0.12)" : "#150000",
        border: accent ? "1px solid rgba(224,30,30,0.35)" : "1px solid rgba(137,4,4,0.25)",
        color: accent ? "#E01E1E" : "rgba(245,237,237,0.55)",
      }}
    >
      {label}
    </span>
  );
}
