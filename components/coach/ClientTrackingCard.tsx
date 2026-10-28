"use client";

import { useT } from "@/components/i18n/I18nProvider";
import TrackingLevelPicker from "@/components/tracking/TrackingLevelPicker";
import { setClientTrackingLevelAction } from "@/app/actions/tracking";
import type { TrackingLevel } from "@/lib/tracking-profile";

// Fiche client : « tracking configuré automatiquement » + pourquoi, avec
// possibilité de fixer un autre niveau. Le coach règle seulement ce qui est
// demandé au client au quotidien, jamais son plan.
export default function ClientTrackingCard({
  clientId, level, autoLevel, source, reasons, summary, safeguards, suggestion,
}: {
  clientId: string;
  level: TrackingLevel;
  autoLevel: TrackingLevel;
  source: "auto" | "client" | "coach";
  reasons: string[];
  summary: string[];
  safeguards: string[];
  suggestion: { level: TrackingLevel; reason: string } | null;
}) {
  const t = useT();
  return (
    <section className="mb-6">
      <p className="text-[11px] font-black uppercase tracking-widest text-(--ep-ink)/50 mb-2">{t("Tracking configuré automatiquement")}</p>
      <TrackingLevelPicker
        level={level} autoLevel={autoLevel} source={source}
        reasons={[...safeguards, ...reasons]} summary={summary} suggestion={suggestion}
        onPick={(v) => setClientTrackingLevelAction(clientId, v)}
      />
    </section>
  );
}
