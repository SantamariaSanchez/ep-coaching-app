"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// Les trois graphiques du récap de fin de séance. Sortis de SessionView pour
// que la librairie de graphiques ne soit téléchargée qu'au récap (chargement
// à la demande), jamais pendant la séance elle-même.

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--ep-s1)",
    border: "1px solid rgba(var(--ep-line-rgb),0.4)",
    borderRadius: "8px",
    color: "var(--ep-ink)",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(var(--ep-ink-rgb),0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 9 };

export interface SessionRecapChartsProps {
  volumeData: { name: string; sets: number; mev: number; mav: number }[];
  rirData: { name: string; rir: number }[];
  scoreData: { name: string; score: number }[];
}

export default function SessionRecapCharts({ volumeData, rirData, scoreData }: SessionRecapChartsProps) {
  const tr = useT();
  return (
    <>
      {volumeData.length > 0 && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
            {tr("Volume par muscle (sets)")}
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--ep-line-rgb),0.15)" />
                <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [`${v}`, name === "sets" ? "Sets" : "MEV"]} />
                <Bar dataKey="sets" radius={[3, 3, 0, 0]}>
                  {volumeData.map((entry, i) => (
                    <Cell key={i} fill={entry.sets < entry.mev ? "var(--ep-bad)" : entry.sets <= entry.mav ? "var(--ep-ok)" : "var(--ep-warn)"} />
                  ))}
                </Bar>
                <Bar dataKey="mev" fill="rgba(var(--ep-line-rgb),0.2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {rirData.length > 0 && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
            {tr("RIR moyen par exercice")}
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rirData} layout="vertical">
                <XAxis type="number" domain={[0, 5]} tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={55} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`RIR ${v}`, ""]} />
                <Bar dataKey="rir" fill="var(--ep-ok)" radius={[0, 3, 3, 0]}>
                  {rirData.map((entry, i) => (
                    <Cell key={i} fill={entry.rir <= 1 ? "var(--ep-bad)" : entry.rir <= 3 ? "var(--ep-ok)" : "var(--ep-info)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {scoreData.length > 0 && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
            {tr("Score standardisation par exercice")}
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} layout="vertical">
                <XAxis type="number" domain={[0, 5]} tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={55} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}/5`, "Score"]} />
                <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                  {scoreData.map((entry, i) => (
                    <Cell key={i} fill={entry.score < 3 ? "var(--ep-bad)" : entry.score < 4 ? "var(--ep-warn)" : "var(--ep-ok)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
