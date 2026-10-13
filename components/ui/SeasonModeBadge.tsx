export default function SeasonModeBadge({ mode }: { mode: "off_season" | "prep" | null }) {
  const isPrep = mode === "prep";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
        isPrep
          ? "bg-(--ep-accent)/15 border-(--ep-accent)/40 text-(--ep-accent)"
          : "bg-(--ep-ink)/5 border-(--ep-ink)/15 text-(--ep-ink)/45"
      }`}
    >
      {isPrep ? "🔥 Prep" : "🧘 Off-season"}
    </span>
  );
}
