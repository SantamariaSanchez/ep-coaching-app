"use client";

import type { RoadmapWithData } from "@/utils/roadmap";

// Contexte road map partagé entre l'espace de conception programme
// (ProgramEditor) et diète (DietPlanManager) — ce qu'on construit ne doit
// jamais être déconnecté de la trajectoire déjà posée pour ce client.
export default function RoadmapContextPanel({
  roadmap,
  roadmapHref,
  subjectLabel,
  workTypeLabel = "ce que tu construis",
}: {
  roadmap: RoadmapWithData;
  roadmapHref?: string;
  subjectLabel: string;
  /** Ex. "ce programme", "cette diète" — utilisé dans le texte de repère en bas. */
  workTypeLabel?: string;
}) {
  if (!roadmap.roadmap) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Road map
        </p>
        <p className="text-[11px] text-[#F5EDED]/30">
          Pas de road map posée pour {subjectLabel} — {workTypeLabel} n&apos;est rattaché à aucune trajectoire
          déclarée.
          {roadmapHref && (
            <>
              {" "}
              <a href={roadmapHref} className="text-[#E01E1E] hover:text-[#ff4444] underline">
                En créer une
              </a>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const currentPhase =
    roadmap.phases.find((p) => p.start_date <= today && today <= p.end_date) ??
    [...roadmap.phases].sort((a, b) => b.end_date.localeCompare(a.end_date))[0] ??
    null;
  const upcomingObjectives = roadmap.objectives
    .filter((o) => !o.is_achieved)
    .sort((a, b) => a.target_date.localeCompare(b.target_date))
    .slice(0, 3);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
          Road map de {subjectLabel}
        </p>
        {roadmapHref && (
          <a href={roadmapHref} className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60">
            Voir la road map complète
          </a>
        )}
      </div>
      {currentPhase ? (
        <p className="text-xs text-white mb-1">
          <span className="font-black">Phase en cours : {currentPhase.label}</span>
          <span className="text-[#F5EDED]/30"> ({currentPhase.start_date} → {currentPhase.end_date})</span>
        </p>
      ) : (
        <p className="text-[11px] text-[#F5EDED]/30 mb-1">Aucune phase active actuellement dans la road map.</p>
      )}
      {currentPhase?.notes && <p className="text-[11px] text-[#F5EDED]/50 leading-relaxed mb-2">{currentPhase.notes}</p>}
      {upcomingObjectives.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#890404]/15 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">Objectifs à venir</p>
          {upcomingObjectives.map((o) => (
            <p key={o.id} className="text-[11px] text-[#F5EDED]/55">
              {o.label} <span className="text-[#F5EDED]/25">— {o.target_date}</span>
            </p>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[#F5EDED]/25 mt-2 leading-relaxed">
        Ce que tu construis ci-dessous doit servir cette trajectoire, pas exister à côté.
      </p>
    </div>
  );
}
