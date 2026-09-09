"use client";

import { useEffect, useState } from "react";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import { ObjectiveCard, getISOWeek, type RoadmapData } from "@/components/client/RoadmapView";
import { PHASE_COLORS } from "@/lib/roadmap-colors";
import { Map, Target } from "lucide-react";

// Retour "travaille sur tout, coach client membre" (2026-09-09) : un client
// coaché voit un vrai résumé de sa Road Map (phase active, objectifs avec
// barre de progression et compte à rebours, voir components/client/RoadmapView.tsx)
// — le coach sur SA PROPRE Road Map n'avait droit qu'à l'éditeur brut, sans
// jamais voir sa propre progression en un coup d'œil (confirmé sur son
// compte : préparation WNBF Classic Physique, compétition le 06/12/2027,
// 6 phases construites, jamais résumée nulle part). Même carte
// (ObjectiveCard, exportée depuis RoadmapView) réutilisée ici, au-dessus de
// l'éditeur — le coach garde l'édition (normal, c'est lui qui construit sa
// propre roadmap), en plus du résumé qu'un client obtient gratuitement.
export default function CoachMoiRoadmapView({ userId }: { userId: string }) {
  const [data, setData] = useState<RoadmapData | null>(null);

  useEffect(() => {
    fetch(`/api/roadmap/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.roadmap) setData(json as RoadmapData);
      })
      .catch(() => {
        // Silencieux : l'éditeur plus bas refait son propre chargement et
        // affichera l'état vide/erreur si besoin — ce résumé est un bonus,
        // pas le chemin critique.
      });
  }, [userId]);

  const today = new Date().toISOString().split("T")[0];
  const activePhase = data?.phases.find((p) => p.start_date <= today && p.end_date >= today) ?? null;
  const activePhaseCols = activePhase
    ? PHASE_COLORS[activePhase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom
    : null;
  const weekNumber = getISOWeek(new Date());

  const pendingObjectives = data?.objectives.filter((o) => !o.is_achieved) ?? [];
  const nextShort = pendingObjectives.find((o) => o.term === "short");
  const nextMedium = pendingObjectives.find((o) => o.term === "medium");
  const nextLong = pendingObjectives.find((o) => o.term === "long");

  return (
    <div className="page-transition" style={{ padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(224,30,30,0.6)",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        }}>
          <Map size={12} /> Mon Suivi
        </span>
        <h1 className="ep-h1" style={{ fontSize: 28, margin: "0 0 6px" }}>Ma Road Map</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: 0 }}>
            Semaine {weekNumber} · construis et visualise tes propres objectifs et phases de progression.
          </p>
          {activePhaseCols && (
            <span style={{
              background: activePhaseCols.bg,
              border: `1px solid ${activePhaseCols.border}`,
              color: activePhaseCols.solid,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}>
              {activePhaseCols.icon} {activePhase?.label ?? activePhaseCols.label}
            </span>
          )}
        </div>
      </div>

      {(nextShort || nextMedium || nextLong) && data && (
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 10 }}>
            <Target size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            Mes objectifs
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[nextShort, nextMedium, nextLong].map((obj) => {
              if (!obj) return null;
              return <ObjectiveCard key={obj.id} obj={obj} roadmapStart={data.roadmap.start_date} />;
            })}
          </div>
        </section>
      )}

      <RoadmapEditor clientId={userId} />
    </div>
  );
}
