"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/Skeleton";
import RoadmapEditor from "@/components/roadmap/RoadmapEditor";
import { Map } from "lucide-react";

export default function CoachRoadmapPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClientSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 900, margin: "0 auto" }}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(224,30,30,0.6)",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        }}>
          <Map size={12} /> Mon Suivi
        </span>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: "0 0 6px",
        }}>
          Ma Road Map
        </h1>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          Construis et visualise tes propres objectifs et phases de progression.
        </p>
      </div>
      <RoadmapEditor clientId={userId} />
    </div>
  );
}
