export default function SeasonModeBadge({ mode }: { mode: "off_season" | "prep" | null }) {
  const isPrep = mode === "prep";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
        isPrep
          ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
          : "bg-[#F5EDED]/5 border-[#F5EDED]/15 text-[#F5EDED]/45"
      }`}
    >
      {isPrep ? "🔥 Prep" : "🧘 Off-season"}
    </span>
  );
}
