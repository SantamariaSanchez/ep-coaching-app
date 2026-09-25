"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Pencil, Save } from "lucide-react";
import type { TargetDef } from "@/lib/staff-playbooks";
import { setMyTargets } from "@/app/equipe/actions";

const fmt = (t: TargetDef, v: number) => (t.unit === "eur" ? `${Math.round(v).toLocaleString("fr-FR")} €` : Math.round(v).toLocaleString("fr-FR"));

export default function TargetsCard({
  defs,
  targets,
  actuals,
  monthLabel,
}: {
  defs: TargetDef[];
  targets: Record<string, number>;
  actuals: Record<string, number>;
  monthLabel: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(Object.keys(targets).length === 0);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(defs.map((d) => [d.key, targets[d.key] ? String(targets[d.key]) : ""])));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await setMyTargets(values);
      if ("error" in r) setError(r.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="ep-card" style={{ padding: "15px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Target size={12} /> Mes objectifs de {monthLabel}
        </p>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} aria-label="Modifier mes objectifs" style={{ background: "none", border: "none", color: "rgba(245,237,237,0.45)", cursor: "pointer", padding: 4 }}>
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: 0, lineHeight: 1.5 }}>
            Fixe-toi un chiffre réaliste mais ambitieux pour le mois. Il s&apos;affiche en barre de progression, calculée sur ce que tu notes.
          </p>
          {defs.map((d) => (
            <label key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "#F5EDED", fontWeight: 600 }}>{d.label}{d.unit === "eur" ? " (€)" : ""}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={values[d.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [d.key]: e.target.value }))}
                className="ep-input"
                style={{ width: 130 }}
                aria-label={`Objectif : ${d.label}`}
              />
            </label>
          ))}
          {error && <p role="alert" style={{ fontSize: 12, color: "#FDC4C4", margin: 0 }}>{error}</p>}
          <button type="button" onClick={save} disabled={pending} className="ep-btn-primary" style={{ height: 40, fontSize: 12 }}>
            <Save size={13} /> {pending ? "Enregistrement..." : "Enregistrer mes objectifs"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {defs.map((d) => {
            const goal = targets[d.key];
            const actual = actuals[d.key] ?? 0;
            const pct = goal ? Math.min(100, Math.round((actual / goal) * 100)) : 0;
            return (
              <div key={d.key}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, color: "#F5EDED", fontWeight: 700 }}>{d.label}</span>
                  <span style={{ fontSize: 12, color: pct >= 100 ? "#4ade80" : "rgba(245,237,237,0.6)", fontWeight: 700 }}>
                    {fmt(d, actual)}{goal ? ` / ${fmt(d, goal)}` : ""}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(224,30,30,0.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${goal ? pct : 0}%`, borderRadius: 3, background: pct >= 100 ? "linear-gradient(90deg,#4ade80,#22c55e)" : "linear-gradient(90deg,#890404,#E01E1E)" }} />
                </div>
                {!goal && <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "4px 0 0" }}>Pas d&apos;objectif fixé.</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
