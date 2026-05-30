"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Measurement } from "@/utils/measurements";

function fmt(n: number | null, unit = ""): string {
  if (n == null) return "—";
  return `${n}${unit}`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[#F5EDED]/25">—</span>;
  const positive = delta > 0;
  const zero = delta === 0;
  if (zero) return <span className="text-[#F5EDED]/40">±0</span>;
  return (
    <span
      className={`font-semibold ${positive ? "text-amber-400" : "text-blue-400"}`}
    >
      {positive ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

const INITIAL_ROWS = 5;

export default function MeasurementHistoryTable({
  measurements,
}: {
  measurements: Measurement[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (measurements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 bg-[#1f0101] border border-[#890404]/30 rounded-xl">
        <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
          Aucune mensuration enregistrée
        </p>
      </div>
    );
  }

  const visible = expanded ? measurements : measurements.slice(0, INITIAL_ROWS);

  function delta(
    idx: number,
    key: keyof Pick<Measurement, "weight" | "waist" | "arm_flexed" | "thigh">
  ): number | null {
    if (idx >= measurements.length - 1) return null;
    const curr = measurements[idx][key];
    const prev = measurements[idx + 1][key];
    if (curr == null || prev == null) return null;
    return parseFloat((curr - prev).toFixed(1));
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-[#890404]/20">
              {[
                "Date",
                "Poids (kg)",
                "Taille (cm)",
                "Bras fl. (cm)",
                "Cuisse (cm)",
                "Δ Poids",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((m, idx) => (
              <tr
                key={m.id}
                className="border-b border-[#890404]/10 last:border-0 hover:bg-[#890404]/5 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {formatDate(m.measured_at)}
                </td>
                <td className="px-4 py-3 text-sm text-[#F5EDED]/80">
                  {fmt(m.weight, " kg")}
                </td>
                <td className="px-4 py-3 text-sm text-[#F5EDED]/80">
                  {fmt(m.waist)}
                </td>
                <td className="px-4 py-3 text-sm text-[#F5EDED]/80">
                  {fmt(m.arm_flexed)}
                </td>
                <td className="px-4 py-3 text-sm text-[#F5EDED]/80">
                  {fmt(m.thigh)}
                </td>
                <td className="px-4 py-3 text-xs">
                  <DeltaBadge delta={delta(idx, "weight")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {measurements.length > INITIAL_ROWS && (
        <div className="border-t border-[#890404]/15">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                Voir tout ({measurements.length} sessions)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
