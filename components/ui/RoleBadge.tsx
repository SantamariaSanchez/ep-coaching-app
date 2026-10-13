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
        background: accent ? "rgba(var(--ep-accent-rgb),0.12)" : "var(--ep-s2)",
        border: accent ? "1px solid rgba(var(--ep-accent-rgb),0.35)" : "1px solid rgba(var(--ep-line-rgb),0.25)",
        color: accent ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.55)",
      }}
    >
      {label}
    </span>
  );
}
