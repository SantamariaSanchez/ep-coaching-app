"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";

export default function CoachRoadmapPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
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
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", margin: 0 }}>
            Road Map Coach
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "#F5EDED", margin: "2px 0 0" }}>
            {clientName || "Client"}
          </h1>
        </div>
      </div>

      <RoadmapEditor clientId={clientId} />
    </div>
  );
}
