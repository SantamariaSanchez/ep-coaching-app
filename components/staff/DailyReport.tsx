"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check } from "lucide-react";
import type { ReportMetric } from "@/lib/staff-roles";
import type { StaffRecord } from "@/lib/staff-kpis";
import { saveDailyReport } from "@/app/equipe/actions";

function lastDays(today: string, count: number): string[] {
  const base = new Date(`${today}T12:00:00`);
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() - i * 86_400_000).toISOString().slice(0, 10));
}

const fmt = (m: ReportMetric, v: number) =>
  m.type === "money" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` : v.toLocaleString("fr-FR");

export default function DailyReport({
  metrics,
  reports,
  today,
}: {
  metrics: ReportMetric[];
  reports: StaffRecord[];
  today: string;
}) {
  const router = useRouter();
  const byDate = useMemo(() => new Map(reports.map((r) => [r.occurred_on ?? "", r])), [reports]);
  const [date, setDate] = useState(today);
  const existing = byDate.get(date);
  const existingMetrics = (existing?.data?.metrics as Record<string, number> | undefined) ?? {};

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(metrics.map((m) => [m.key, existingMetrics[m.key] !== undefined ? String(existingMetrics[m.key]) : ""]))
  );
  const [win, setWin] = useState<string>((existing?.data?.win as string) ?? "");
  const [blocker, setBlocker] = useState<string>((existing?.data?.blocker as string) ?? "");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function selectDate(d: string) {
    setDate(d);
    setMessage(null);
    const r = byDate.get(d);
    const rm = (r?.data?.metrics as Record<string, number> | undefined) ?? {};
    setValues(Object.fromEntries(metrics.map((m) => [m.key, rm[m.key] !== undefined ? String(rm[m.key]) : ""])));
    setWin((r?.data?.win as string) ?? "");
    setBlocker((r?.data?.blocker as string) ?? "");
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const r = await saveDailyReport(date, values, win, blocker);
      if ("error" in r) setMessage({ text: r.error, ok: false });
      else {
        setMessage({ text: "Rapport enregistré.", ok: true });
        router.refresh();
      }
    });
  }

  const month = today.slice(0, 7);
  const monthReports = reports.filter((r) => (r.occurred_on ?? "").startsWith(month));
  const totals = metrics.map((m) => ({
    metric: m,
    total: monthReports.reduce((s, r) => s + Number((r.data?.metrics as Record<string, number> | undefined)?.[m.key] ?? 0), 0),
  }));

  return (
    <div>
      <div className="ep-card-hero" style={{ padding: "18px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
          {lastDays(today, 7).map((d) => {
            const done = byDate.has(d);
            const label = d === today ? "Aujourd'hui" : new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
            return (
              <button
                key={d}
                type="button"
                onClick={() => selectDate(d)}
                aria-pressed={date === d}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 999, cursor: "pointer",
                  color: date === d ? "#F5EDED" : "rgba(245,237,237,0.5)",
                  background: date === d ? "rgba(224,30,30,0.16)" : "rgba(245,237,237,0.03)",
                  border: `1px solid ${date === d ? "rgba(224,30,30,0.4)" : "rgba(245,237,237,0.08)"}`,
                }}
              >
                {done && <Check size={11} style={{ color: "#4ade80" }} />}
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 12 }}>
          {metrics.map((m) => (
            <div key={m.key}>
              <label htmlFor={`rep-${m.key}`} style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>
                {m.label}
              </label>
              <input
                id={`rep-${m.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={m.type === "money" ? "0.01" : "1"}
                value={values[m.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [m.key]: e.target.value }))}
                className="ep-input"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          <div>
            <label htmlFor="rep-win" style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>
              Victoire du jour
            </label>
            <textarea id="rep-win" rows={2} value={win} onChange={(e) => setWin(e.target.value)} className="ep-input" placeholder="Ce qui a bien marché" style={{ resize: "vertical" }} />
          </div>
          <div>
            <label htmlFor="rep-blocker" style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>
              Blocage ou besoin
            </label>
            <textarea id="rep-blocker" rows={2} value={blocker} onChange={(e) => setBlocker(e.target.value)} className="ep-input" placeholder="Ce qui t'a freiné, ce dont tu as besoin" style={{ resize: "vertical" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={save} disabled={pending} className="ep-btn-primary" style={{ height: 42, padding: "0 20px", fontSize: 12 }}>
            <Save size={14} />
            {pending ? "Enregistrement..." : existing ? "Mettre à jour le rapport" : "Envoyer le rapport"}
          </button>
          {message && <p role="status" style={{ fontSize: 12, margin: 0, color: message.ok ? "#4ade80" : "#FDC4C4" }}>{message.text}</p>}
        </div>
      </div>

      <p className="ep-label" style={{ marginBottom: 8 }}>Total du mois</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
        {totals.map(({ metric, total }) => (
          <div key={metric.key} className="ep-card" style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", margin: "0 0 4px" }}>{metric.label}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{fmt(metric, total)}</p>
          </div>
        ))}
      </div>

      <p className="ep-label" style={{ marginBottom: 8 }}>Historique</p>
      {reports.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)" }}>Aucun rapport envoyé pour l&apos;instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.slice(0, 30).map((r) => {
            const rm = (r.data?.metrics as Record<string, number> | undefined) ?? {};
            return (
              <div key={r.id} className="ep-card" style={{ padding: "11px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED", margin: "0 0 4px", textTransform: "capitalize" }}>
                  {new Date(`${r.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.55)", margin: 0, lineHeight: 1.55 }}>
                  {metrics.filter((m) => rm[m.key] !== undefined).map((m) => `${m.label} : ${fmt(m, rm[m.key])}`).join(" · ") || "Aucun chiffre"}
                </p>
                {typeof r.data?.win === "string" && <p style={{ fontSize: 11.5, color: "#4ade80", margin: "4px 0 0" }}>Victoire : {r.data.win as string}</p>}
                {typeof r.data?.blocker === "string" && <p style={{ fontSize: 11.5, color: "#facc15", margin: "2px 0 0" }}>Blocage : {r.data.blocker as string}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
