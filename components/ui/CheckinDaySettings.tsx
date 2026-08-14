"use client";

import { useActionState } from "react";
import { updateCheckinDay } from "@/app/dashboard/coach/clients/[id]/checkins/actions";

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

export default function CheckinDaySettings({
  clientId,
  currentDay,
}: {
  clientId: string;
  currentDay: number;
}) {
  const bound = updateCheckinDay.bind(null, clientId);
  const [state, action, isPending] = useActionState(bound, null);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      background: "rgba(31,1,1,0.6)", border: "1px solid rgba(137,4,4,0.25)",
      borderRadius: 10, padding: "10px 14px", marginBottom: 20,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>
        Jour de check-in fixe
      </span>
      <form action={action} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <select
          key={currentDay}
          name="checkin_day"
          defaultValue={currentDay}
          disabled={isPending}
          aria-label="Jour de check-in fixe"
          style={{
            background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#F5EDED", outline: "none",
          }}
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          style={{
            background: "#E01E1E", color: "#fff", border: "none", borderRadius: 8,
            padding: "6px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            cursor: isPending ? "wait" : "pointer", opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "…" : "Enregistrer"}
        </button>
      </form>
      {state && "success" in state && (
        <span style={{ fontSize: 11, color: "#4ade80" }}>✓ Enregistré</span>
      )}
      {state && "error" in state && (
        <span style={{ fontSize: 11, color: "#FDC4C4" }}>{state.error}</span>
      )}
    </div>
  );
}
