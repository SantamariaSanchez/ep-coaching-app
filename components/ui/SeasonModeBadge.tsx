export default function SeasonModeBadge({ mode }: { mode: "off_season" | "prep" | null }) {
  const isPrep = mode === "prep";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
        isPrep
          ? "bg-[var(--color-ep-red)]/15 border-[var(--color-ep-red)]/40 text-[var(--color-ep-red)]"
          : "bg-[var(--color-ep-light)]/5 border-[var(--color-ep-light)]/15 text-[var(--color-ep-light)]/45"
      }`}
    >
      {isPrep ? "🔥 Prep" : "🧘 Off-season"}
    </span>
  );
}
