"use client";

import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import { Map } from "lucide-react";

export default function CoachMoiRoadmapView({ userId }: { userId: string }) {
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
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          Construis et visualise tes propres objectifs et phases de progression.
        </p>
      </div>
      <RoadmapEditor clientId={userId} />
    </div>
  );
}
