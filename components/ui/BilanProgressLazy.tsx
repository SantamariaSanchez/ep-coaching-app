"use client";

import dynamic from "next/dynamic";
import type { DailyLog } from "@/utils/daily-logs";

// Le bilan s'ouvre tous les jours pour remplir un formulaire : la progression
// (et sa librairie de graphiques) se charge à part, sans retarder le
// formulaire.
const BilanProgressView = dynamic(() => import("@/components/ui/BilanProgressView"), {
  ssr: false,
  loading: () => <div className="ep-card" aria-hidden style={{ minHeight: 320, opacity: 0.4 }} />,
});

export default function BilanProgressLazy(props: { logs: DailyLog[]; exportHref?: string }) {
  return <BilanProgressView {...props} />;
}
