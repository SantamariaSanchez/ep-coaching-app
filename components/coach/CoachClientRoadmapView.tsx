"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import PhasePilotCard from "@/components/roadmap/PhasePilotCard";
import RoadmapLoadError from "@/components/roadmap/RoadmapLoadError";
import { RoadmapObjectivesSummary, RoadmapStatusLine } from "@/components/roadmap/RoadmapSummary";
import type { RoadmapPageData } from "@/utils/phase-pilot";

// Road map d'un client vue par son coach. Audit 2026-09-28 : le coach voit
// aussi le pilote de phase de son client (lu côté serveur après
// requireOwnClient, voir app/dashboard/coach/clients/[id]/roadmap/page.tsx),
// sans liens d'action : les boutons "me peser", "loguer mes repas" n'ont de
// sens que sur sa propre road map.
export default function CoachClientRoadmapView({
  clientId,
  today,
  data,
}: {
  clientId: string;
  today: string;
  data: RoadmapPageData;
}) {
  const t = useT();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const [clientName, setClientName] = useState<string>("");
  const { roadmap, phases, objectives, pilot, pilotError, error } = data;

  useEffect(() => {
    fetch(`/api/coach/clients/${clientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClientName(d?.full_name ?? "Client"))
      // Le nom n'est qu'un libellé d'en-tête : "Client" par défaut suffit.
      .catch(() => {});
  }, [clientId]);

  return (
    <div className="page-transition" style={{ padding: "24px 20px 64px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Link
          href={`/dashboard/coach/clients/${clientId}`}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(245,237,237,0.3)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} />
          {clientName || t("Client")}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="ep-section-title" style={{ margin: 0 }}>{t("Road Map")}</p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0", overflowWrap: "anywhere" }}>{clientName || t("Client")}</h1>
        </div>
      </div>

      {roadmap && (
        <div style={{ marginBottom: 16 }}>
          <RoadmapStatusLine roadmap={roadmap} phases={phases} today={today} perspective="coach" />
        </div>
      )}

      {error && (
        <RoadmapLoadError
          message="Impossible de charger le résumé de cette road map pour l'instant."
          hint={t("Ne modifie rien plus bas avant d'avoir rechargé.")}
        />
      )}

      {roadmap && (
        <>
          <PhasePilotCard pilot={pilot} error={pilotError} basePath={null} />
          <RoadmapObjectivesSummary
            roadmap={roadmap}
            objectives={objectives}
            today={today}
            weights={pilot?.weights}
            title={t("Ses objectifs")}
          />
        </>
      )}

      <RoadmapEditor clientId={clientId} onSaved={refresh} />
    </div>
  );
}
