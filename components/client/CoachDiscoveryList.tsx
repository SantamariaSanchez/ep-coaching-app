"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Check } from "lucide-react";
import { chooseNewCoach } from "@/app/dashboard/client/coachs/actions";
import type { CoachDiscoveryEntry } from "@/utils/auth";

export default function CoachDiscoveryList({ coaches }: { coaches: CoachDiscoveryEntry[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChoose(coachId: string) {
    setError("");
    setPendingId(coachId);
    startTransition(async () => {
      const result = await chooseNewCoach(coachId);
      if (result.error) setError(result.error);
      else router.push("/dashboard/client");
    });
  }

  if (coaches.length === 0) {
    return (
      <div className="ep-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>
          Aucun coach tiers actif pour le moment. Contacte Emmanuel sur Instagram en attendant.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {coaches.map((coach) => (
        <div key={coach.id} className="ep-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <UserRound size={19} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
              {coach.full_name ?? "Coach"}
            </p>
            {coach.bio && (
              <p style={{
                margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {coach.bio}
              </p>
            )}
          </div>
          <button
            onClick={() => handleChoose(coach.id)}
            disabled={isPending}
            className="ep-btn-primary"
            style={{ fontSize: 10.5, padding: "9px 14px", flexShrink: 0 }}
          >
            {isPending && pendingId === coach.id ? "..." : <><Check size={13} /> Choisir</>}
          </button>
        </div>
      ))}
      {error && <p style={{ color: "#ff6b6b", fontSize: 11.5, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
