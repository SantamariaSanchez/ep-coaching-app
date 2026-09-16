import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import type { MasterclassGuide } from "@/lib/masterclass-guides";
import { MASTERCLASS_CATEGORY_LABELS } from "@/lib/masterclass-guides";
import type { MasterclassProgressMap } from "@/lib/coach-masterclass-progress";

// Liste des guides Masterclass, une card par guide avec catégorie, temps
// estimé et progression en %. Server component pur (pas de "use client") :
// aucune interactivité ici, seulement de la navigation vers le détail
// (composant client MasterclassGuideView), même découpage que
// Ressources/Formations.
export default function MasterclassList({
  guides,
  progress,
}: {
  guides: MasterclassGuide[];
  progress: MasterclassProgressMap;
}) {
  return (
    <div className="space-y-3">
      {guides.map((guide) => {
        const done = progress[guide.slug]?.length ?? 0;
        const total = guide.steps.length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <Link
            key={guide.slug}
            href={`/dashboard/coach/masterclass/${guide.slug}`}
            className="block bg-[#1a0000] border border-[#890404]/25 rounded-xl px-4 py-4 hover:border-[#E01E1E]/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#E01E1E] bg-[#E01E1E]/10 border border-[#E01E1E]/25 rounded-full px-2 py-0.5">
                    {MASTERCLASS_CATEGORY_LABELS[guide.category]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-[#F5EDED]/40">
                    <Clock size={11} />
                    {guide.estimatedMinutes} min
                  </span>
                </div>
                <p className="text-[15px] font-black text-white leading-snug">{guide.title}</p>
                <p className="text-[12px] text-[#F5EDED]/45 mt-1.5 leading-relaxed">{guide.summary}</p>
              </div>
              <ChevronRight size={16} className="text-[#F5EDED]/25 flex-shrink-0 mt-1" />
            </div>

            <div className="mt-3.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
                  {done}/{total} étapes
                </p>
                <p className="text-[10px] font-bold text-[#F5EDED]/40">{percent}%</p>
              </div>
              <div className="h-1.5 bg-[#0f0000] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: percent === 100 ? "#4ade80" : "#E01E1E",
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
