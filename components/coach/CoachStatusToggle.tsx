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

  function toggle() {
    const next = current === "active" ? "canceled" : "active";
    startTransition(async () => {
      const result = await setCoachPlatformStatus(coachId, next);
      if (result.success) setCurrent(next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
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
