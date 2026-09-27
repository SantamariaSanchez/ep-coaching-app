import Link from "next/link";
import type { DailyLog } from "@/utils/daily-logs";

// Choisir le jour du bilan (demande directe 2026-09-27 : "on peut pas faire
// les bilans d'hier, pas simple quand on a oublié de logger"). Les 7
// derniers jours en un tap, avec leur état, et n'importe quel jour des 30
// derniers via le champ date. Liens simples, aucun JavaScript nécessaire.

function shift(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function bilanState(log: DailyLog | undefined): "complet" | "partiel" | "vide" {
  if (!log) return "vide";
  const morning = log.weight_morning != null && log.sleep_hours != null && log.sleep_rating != null;
  const evening = log.steps != null && log.digestion != null && log.stress != null && log.hunger != null;
  if (morning && evening) return "complet";
  return "partiel";
}

export default function BilanDayPicker({ basePath, today, selected, logs }: { basePath: string; today: string; selected: string; logs: DailyLog[] }) {
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const days = Array.from({ length: 7 }, (_, i) => shift(today, -6 + i));
  const missing = days.filter((d) => d !== today && bilanState(byDate.get(d)) !== "complet").length;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d) => {
          const st = bilanState(byDate.get(d));
          const active = d === selected;
          const dt = new Date(`${d}T12:00:00`);
          const color = st === "complet" ? "#4ade80" : st === "partiel" ? "#facc15" : "rgba(245,237,237,0.25)";
          return (
            <Link
              key={d}
              href={d === today ? basePath : `${basePath}?jour=${d}`}
              aria-current={active ? "date" : undefined}
              aria-label={`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(dt)}, bilan ${st}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 0",
                borderRadius: 12,
                border: `1px solid ${active ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.3)"}`,
                background: active ? "rgba(224,30,30,0.14)" : "rgba(0,0,0,0.25)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,237,237,0.45)" }}>
                {d === today ? "Auj." : new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(dt).replace(".", "")}
              </span>
              <span style={{ fontSize: 15, fontWeight: 900, color: active ? "#fff" : "rgba(245,237,237,0.8)" }}>{dt.getDate()}</span>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
            </Link>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          {missing > 0 ? `${missing} bilan${missing > 1 ? "s" : ""} à compléter cette semaine, touche un jour pour le rattraper.` : "Semaine à jour."}
        </p>
        <form action={basePath} method="get" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            name="jour"
            min={shift(today, -30)}
            max={today}
            defaultValue={selected}
            aria-label="Choisir un autre jour"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8, padding: "5px 8px", fontSize: 12, color: "#F5EDED", colorScheme: "dark" }}
          />
          <button type="submit" style={{ fontSize: 11, fontWeight: 800, color: "#ff6b6b", background: "none", border: "none", cursor: "pointer" }}>
            Ouvrir
          </button>
        </form>
      </div>
    </div>
  );
}
