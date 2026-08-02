"use client";

import { useState, useTransition } from "react";
import { setCoachPlatformStatus } from "@/app/dashboard/coach/admin/actions";

export default function CoachStatusToggle({
  coachId,
  status,
}: {
  coachId: string;
  status: "inactive" | "active" | "canceled";
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const [confirming, setConfirming] = useState(false);

  function apply(next: "inactive" | "active" | "canceled") {
    startTransition(async () => {
      const result = await setCoachPlatformStatus(coachId, next);
      if (result.success) setCurrent(next);
      setConfirming(false);
    });
  }

  function handleClick() {
    if (current === "active") {
      // Désactive l'accès d'un coach potentiellement payant : jamais en un
      // seul clic, un mis-clic ne doit pas couper son accès sans confirmation.
      setConfirming(true);
    } else {
      apply("active");
    }
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.6)" }}>Désactiver ce coach ?</span>
        <button
          type="button"
          onClick={() => apply("canceled")}
          disabled={pending}
          style={{ fontSize: 11, fontWeight: 700, color: "#ff6b6b", background: "none", border: "none", cursor: "pointer" }}
        >
          {pending ? "…" : "Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.4)", background: "none", border: "none", cursor: "pointer" }}
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        height: 32, padding: "0 14px", borderRadius: 8, border: "none",
        background: current === "active" ? "rgba(74,222,128,0.15)" : "#E01E1E",
        color: current === "active" ? "#4ade80" : "#fff",
        fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
        cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      {pending ? "…" : current === "active" ? "Actif · désactiver" : "Activer"}
    </button>
  );
}
