"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import PhasePilotCard from "@/components/roadmap/PhasePilotCard";
import RoadmapLoadError from "@/components/roadmap/RoadmapLoadError";
import { RoadmapObjectivesSummary, RoadmapStatusLine } from "@/components/roadmap/RoadmapSummary";
import type { RoadmapPageData } from "@/utils/phase-pilot";

// Retour "travaille sur tout, coach client membre" (2026-09-09) : le coach
// sur SA PROPRE Road Map n'avait droit qu'à l'éditeur brut, sans jamais voir
// sa propre progression en un coup d'œil (préparation WNBF Classic Physique,
// compétition le 06/12/2027, 6 phases construites, jamais résumée nulle
// part). Le résumé est au-dessus de l'éditeur, le coach garde l'édition.
//
// Audit 2026-09-28 :
// - résumé et pilote de phase lus côté serveur
//   (app/dashboard/coach/moi/roadmap/page.tsx) : avant, un fetch sans
//   vérification de r.ok, jamais rafraîchi après une sauvegarde ;
// - après chaque sauvegarde de l'éditeur, router.refresh() relit la page
//   pour que le résumé et le pilote suivent la road map tout juste modifiée ;
// - "Semaine {n}" (semaine ISO de l'année) devient la semaine de la road map.
export default function CoachMoiRoadmapView({
  userId,
  today,
  data,
}: {
  userId: string;
  today: string;
  data: RoadmapPageData;
}) {
  const t = useT();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const { roadmap, phases, objectives, pilot, pilotError, error } = data;

  return (
    <div className="page-transition" style={{ padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(224,30,30,0.6)",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        }}>
          <Map size={12} />{" "}{t("Mon Suivi")}
        </span>
        <h1 className="ep-h1" style={{ fontSize: 28, margin: "0 0 6px" }}>{t("Ma Road Map")}</h1>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: "0 0 6px" }}>
          {t("Construis et visualise tes propres objectifs et phases de progression.")}
        </p>
        {roadmap && <RoadmapStatusLine roadmap={roadmap} phases={phases} today={today} />}
      </div>

      {error && (
        <RoadmapLoadError
          message="Impossible de charger le résumé de ta road map pour l'instant."
          hint={t("Ne modifie rien plus bas avant d'avoir rechargé.")}
        />
      )}

      {roadmap && (
        <>
          <PhasePilotCard pilot={pilot} error={pilotError} basePath="/dashboard/coach/moi" />
          <RoadmapObjectivesSummary roadmap={roadmap} objectives={objectives} today={today} weights={pilot?.weights} />
        </>
      )}

      <RoadmapEditor clientId={userId} onSaved={refresh} />
    </div>
  );
}
