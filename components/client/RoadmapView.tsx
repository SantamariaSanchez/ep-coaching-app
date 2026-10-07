"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import RoadmapCalendar from "@/components/roadmap/RoadmapCalendar";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import PhasePilotCard from "@/components/roadmap/PhasePilotCard";
import RoadmapLoadError from "@/components/roadmap/RoadmapLoadError";
import { RoadmapObjectivesSummary, RoadmapStatusLine } from "@/components/roadmap/RoadmapSummary";
import type { RoadmapPageData } from "@/utils/phase-pilot";

// Road map d'un membre (/dashboard/client/roadmap).
//
// Audit 2026-09-28 :
// - les données (road map + pilote de phase) sont lues côté serveur
//   (app/dashboard/client/roadmap/page.tsx, utils/phase-pilot.ts) au lieu
//   d'un fetch ici qui ne vérifiait pas res.ok : une erreur de chargement
//   s'affichait "Ton coach n'a pas encore configuré ta road map" ;
// - le membre gratuit (le seul type de membre aujourd'hui) n'avait QUE
//   l'éditeur, sans aucun résumé : il a maintenant la même vue d'ensemble
//   (semaine de la road map, pilote de phase, objectifs) au-dessus ;
// - "Semaine {n}" était la semaine ISO de l'année, sans rapport avec la
//   road map (voir components/roadmap/RoadmapSummary.tsx).

const BASE_PATH = "/dashboard/client";

export default function RoadmapView({
  userId,
  isFree,
  today,
  data,
}: {
  userId: string;
  isFree: boolean;
  today: string;
  data: RoadmapPageData;
}) {
  const t = useT();
  const router = useRouter();
  // Après une sauvegarde de l'éditeur, on relit la page côté serveur pour
  // que le résumé et le pilote suivent (l'état de l'éditeur est conservé).
  const refresh = useCallback(() => router.refresh(), [router]);

  const { roadmap, phases, objectives, pilot, pilotError, error } = data;

  const overview = roadmap ? (
    <>
      <PhasePilotCard pilot={pilot} error={pilotError} basePath={BASE_PATH} />
      <RoadmapObjectivesSummary roadmap={roadmap} objectives={objectives} today={today} weights={pilot?.weights} />
    </>
  ) : null;

  // Membre en autonomie : il construit et modifie lui-même sa road map.
  if (isFree) {
    return (
      <div className="page-transition" style={{ padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)" }}>
            {t("Road Map : Communauté")}
          </span>
          <h1 className="ep-h1" style={{ margin: "4px 0 6px" }}>{t("Ma Road Map")}</h1>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: "0 0 6px" }}>
            {t("Construis toi-même tes phases et tes objectifs, en autonomie, sans suivi coach.")}
          </p>
          {roadmap && <RoadmapStatusLine roadmap={roadmap} phases={phases} today={today} />}
        </div>

        {error && (
          <RoadmapLoadError
            message="Impossible de charger le résumé de ta road map pour l'instant."
            hint={t("Ne modifie rien plus bas avant d'avoir rechargé.")}
          />
        )}
        {overview}

        <RoadmapEditor clientId={userId} onSaved={refresh} />
      </div>
    );
  }

  // Client accompagné : lecture seule, c'est son coach qui construit.
  if (error) {
    return (
      <div className="page-transition" style={{ padding: "32px 20px", maxWidth: 700, margin: "0 auto" }}>
        <h1 className="ep-h1" style={{ fontSize: 28, margin: "0 0 16px" }}>{t("Ma Road Map")}</h1>
        <RoadmapLoadError message="Impossible de charger ta road map pour l'instant." />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <MapPin size={40} style={{ color: "rgba(224,30,30,0.3)", margin: "0 auto 16px" }} strokeWidth={1.5} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em", marginBottom: 8 }}>
          {t("Road Map non configurée")}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>
          {t("Ton coach n'a pas encore configuré ta road map.")}
        </p>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ padding: "24px 20px 80px", maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)" }}>
          {t("Road Map")}
        </span>
        <h1 className="ep-h1" style={{ fontSize: 28, margin: "4px 0 6px" }}>{t("Ma Road Map")}</h1>
        <RoadmapStatusLine roadmap={roadmap} phases={phases} today={today} />
      </div>

      {overview}

      {/* Calendar */}
      <section>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 12 }}>
          {t("Calendrier")}
        </p>
        <div className="ep-card" style={{ padding: 16 }}>
          <RoadmapCalendar roadmap={roadmap} phases={phases} objectives={objectives} clientId={userId} />
        </div>
      </section>
    </div>
  );
}
