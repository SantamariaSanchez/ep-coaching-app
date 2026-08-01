"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";

export default function CoachClientRoadmapView({ clientId }: { clientId: string }) {
  const [clientName, setClientName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/coach/clients/${clientId}`)
      .then((r) => r.json())
      .then((d) => setClientName(d.full_name ?? "Client"))
      .catch(() => {});
  }, [clientId]);

  return (
    <div style={{ padding: "24px 24px 64px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <Link
          href={`/dashboard/coach/clients/${clientId}`}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(245,237,237,0.3)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} />
          {clientName || "Client"}
        </Link>
        <div style={{ flex: 1 }}>
          <p className="ep-section-title" style={{ margin: 0 }}>Road Map Coach</p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0" }}>{clientName || "Client"}</h1>
        </div>
      </div>

      <RoadmapEditor clientId={clientId} />
    </div>
  );
}
