import Link from "next/link";
import { Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import type { MasterclassGuide } from "@/lib/masterclass-guides";
import type { MasterclassProgressMap } from "@/lib/coach-masterclass-progress";

// Liste des guides Masterclass, une card par guide avec catégorie, temps
// estimé et progression en %. Server component pur (pas de "use client") :
// aucune interactivité ici, seulement de la navigation vers le détail
// (composant client MasterclassGuideView), même découpage que
// Ressources/Formations.
// Visuel (audit 2026-11-13) : une tuile par guide, le titre seul, la
// progression en barre, plus de résumé ni d'étiquette.
const HUES = ["var(--ep-accent)", "var(--ep-info)", "var(--ep-violet)", "var(--ep-ok)", "var(--ep-orange)", "var(--ep-yellow)"];

export default function MasterclassList({
  guides,
  progress,
}: {
  guides: MasterclassGuide[];
  progress: MasterclassProgressMap;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {guides.map((guide, i) => {
        const done = progress[guide.slug]?.length ?? 0;
        const total = guide.steps.length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const hue = HUES[i % HUES.length];
        return (
          <Link
            key={guide.slug}
            href={`/dashboard/coach/masterclass/${guide.slug}`}
            className="ep-press flex flex-col justify-between rounded-2xl p-4 min-h-[150px] border border-(--ep-line)/20"
            style={{ background: `linear-gradient(155deg, color-mix(in srgb, ${hue} 22%, var(--ep-s2)) 0%, var(--ep-bg) 100%)`, textDecoration: "none" }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-(--ep-ink)/50">
                <Clock size={11} />
                {guide.estimatedMinutes} min
              </span>
              {percent === 100 ? <CheckCircle2 size={16} style={{ color: "var(--ep-ok)" }} /> : <ChevronRight size={15} className="text-(--ep-ink)/30" />}
            </div>
            <p className="text-[15px] font-black text-(--ep-strong) leading-tight my-3">{guide.title}</p>
            <div className="h-1.5 bg-(--ep-ink)/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, background: percent === 100 ? "var(--ep-ok)" : hue }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
