import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientMeasurements } from "@/utils/measurements";
import { getNutritionProfile } from "@/utils/nutrition";
import MeasurementCharts from "@/components/ui/MeasurementCharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Measurement } from "@/utils/measurements";

const KEY_METRICS: {
  key: keyof Measurement;
  label: string;
  unit: string;
  goodDir: "up" | "down" | "neutral";
}[] = [
  { key: "weight",     label: "Poids",         unit: "kg", goodDir: "neutral" },
  { key: "waist",      label: "Taille",         unit: "cm", goodDir: "down" },
  { key: "hips",       label: "Hanches",        unit: "cm", goodDir: "down" },
  { key: "arm_flexed", label: "Bras fléchi",    unit: "cm", goodDir: "up" },
  { key: "thigh",      label: "Cuisse",         unit: "cm", goodDir: "up" },
  { key: "abdomen",    label: "Abdomen",        unit: "cm", goodDir: "down" },
];

function ProgressCard({
  label, unit, current, start, goodDir,
}: {
  label: string; unit: string; current: number | null;
  start: number | null; goodDir: "up" | "down" | "neutral";
}) {
  const delta = current != null && start != null
    ? parseFloat((current - start).toFixed(1))
    : null;

  let Icon: React.ElementType = Minus;
  let deltaColor = "rgba(245,237,237,0.4)";
  let goodColor  = "rgba(245,237,237,0.4)";

  if (delta != null && delta !== 0) {
    if (goodDir === "neutral") {
      Icon = delta > 0 ? TrendingUp : TrendingDown;
      deltaColor = "rgba(245,237,237,0.55)";
    } else if (goodDir === "down") {
      Icon = delta < 0 ? TrendingDown : TrendingUp;
      deltaColor = delta < 0 ? "#4ade80" : "#E01E1E";
    } else {
      Icon = delta > 0 ? TrendingUp : TrendingDown;
      deltaColor = delta > 0 ? "#4ade80" : "#E01E1E";
    }
    goodColor = deltaColor;
  }

  return (
    <div className="ep-card" style={{ padding: "16px 16px" }}>
      <p className="ep-label" style={{ marginBottom: 8 }}>{label}</p>

      {current == null ? (
        <p style={{ fontSize: 24, fontWeight: 900, color: "rgba(245,237,237,0.2)", margin: 0 }}>—</p>
      ) : (
        <>
          <p style={{
            fontSize: 24, fontWeight: 900, color: "#F5EDED",
            margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.03em",
          }}>
            {current}
            <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(245,237,237,0.35)", marginLeft: 3 }}>
              {unit}
            </span>
          </p>

          {delta != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon size={12} strokeWidth={2} style={{ color: goodColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: goodColor }}>
                {delta > 0 ? "+" : ""}{delta} {unit}
              </span>
            </div>
          )}

          {start != null && (
            <p style={{ fontSize: 10, color: "rgba(245,237,237,0.25)", margin: "4px 0 0" }}>
              Départ : {start} {unit}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default async function ClientMeasurementsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [measurements, nutritionProfile] = await Promise.all([
    getClientMeasurements(user.id),
    getNutritionProfile(user.id),
  ]);

  const latest = measurements[0] ?? null;
  const first  = measurements[measurements.length - 1] ?? null;

  const weightDir: "up" | "down" | "neutral" =
    nutritionProfile?.phase === "deficit"  ? "down"
    : nutritionProfile?.phase === "surplus" ? "up"
    : "neutral";

  const metrics = KEY_METRICS.map((m) =>
    m.key === "weight" ? { ...m, goodDir: weightDir } : m
  );

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 700, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Suivi corporel</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Mes mensurations
        </h1>
        {latest && (
          <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
            {measurements.length} session{measurements.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Dernière le{" "}
            {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              .format(new Date(latest.measured_at + "T12:00:00"))}
          </p>
        )}
      </div>

      {measurements.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          textAlign: "center",
          gap: 10,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,237,237,0.35)", margin: 0 }}>
            Aucune mensuration disponible
          </p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.2)", margin: 0 }}>
            Ton coach enregistrera tes mesures lors de chaque bilan.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          {/* Progress cards */}
          <section>
            <p className="ep-section-title">Progression globale</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {metrics.map((m) => (
                <ProgressCard
                  key={m.key}
                  label={m.label}
                  unit={m.unit}
                  goodDir={m.goodDir}
                  current={latest?.[m.key] as number | null}
                  start={first?.[m.key] as number | null}
                />
              ))}
            </div>
          </section>

          {/* Charts */}
          <section>
            <p className="ep-section-title">Évolution</p>
            <MeasurementCharts measurements={measurements} />
          </section>
        </div>
      )}
    </div>
  );
}
