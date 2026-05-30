import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientMeasurements } from "@/utils/measurements";
import { getNutritionProfile } from "@/utils/nutrition";
import MeasurementCharts from "@/components/ui/MeasurementCharts";
import { TrendingDown, TrendingUp, Minus, Camera } from "lucide-react";
import type { Measurement } from "@/utils/measurements";

// ── Metric config ─────────────────────────────────────────────────────────────

const KEY_METRICS: {
  key: keyof Measurement;
  label: string;
  unit: string;
  goodDir: "up" | "down" | "neutral";
}[] = [
  { key: "weight", label: "Poids", unit: "kg", goodDir: "neutral" },
  { key: "waist", label: "Tour de taille", unit: "cm", goodDir: "down" },
  { key: "hips", label: "Hanches", unit: "cm", goodDir: "down" },
  { key: "arm_flexed", label: "Bras fléchi", unit: "cm", goodDir: "up" },
  { key: "thigh", label: "Cuisse", unit: "cm", goodDir: "up" },
  { key: "abdomen", label: "Abdomen", unit: "cm", goodDir: "down" },
];

function ProgressCard({
  label,
  unit,
  current,
  start,
  goodDir,
}: {
  label: string;
  unit: string;
  current: number | null;
  start: number | null;
  goodDir: "up" | "down" | "neutral";
}) {
  const hasData = current != null;
  const delta =
    current != null && start != null
      ? parseFloat((current - start).toFixed(1))
      : null;
  const pct =
    delta != null && start != null && start !== 0
      ? ((delta / start) * 100).toFixed(1)
      : null;

  let Icon = Minus;
  let deltaColor = "text-[#F5EDED]/40";
  if (delta != null && delta !== 0) {
    if (goodDir === "neutral") {
      Icon = delta > 0 ? TrendingUp : TrendingDown;
      deltaColor = "text-[#F5EDED]/60";
    } else if (goodDir === "down") {
      Icon = delta < 0 ? TrendingDown : TrendingUp;
      deltaColor = delta < 0 ? "text-green-400" : "text-red-400";
    } else {
      Icon = delta > 0 ? TrendingUp : TrendingDown;
      deltaColor = delta > 0 ? "text-green-400" : "text-red-400";
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
        {label}
      </p>

      {!hasData ? (
        <p className="text-2xl font-black text-[#F5EDED]/25">—</p>
      ) : (
        <>
          <p className="text-2xl font-black text-white">
            {current}
            <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">
              {unit}
            </span>
          </p>

          {start != null && start !== current && (
            <div className={`flex items-center gap-1.5 mt-2 ${deltaColor}`}>
              <Icon size={13} strokeWidth={2} />
              <span className="text-xs font-bold">
                {delta != null && delta > 0 ? "+" : ""}
                {delta} {unit}
              </span>
              {pct && (
                <span className="text-[10px] text-[#F5EDED]/30">
                  ({delta != null && delta > 0 ? "+" : ""}
                  {pct}%)
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-3 text-[10px] text-[#F5EDED]/30">
            <span>
              Départ :{" "}
              <span className="text-[#F5EDED]/50">{start ?? "—"}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientMeasurementsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [measurements, nutritionProfile] = await Promise.all([
    getClientMeasurements(user.id),
    getNutritionProfile(user.id),
  ]);

  // latest = [0], earliest = [length-1]
  const latest = measurements[0] ?? null;
  const first = measurements[measurements.length - 1] ?? null;

  // Override weight direction from nutrition phase
  const weightDir: "up" | "down" | "neutral" =
    nutritionProfile?.phase === "deficit"
      ? "down"
      : nutritionProfile?.phase === "surplus"
      ? "up"
      : "neutral";

  const metrics = KEY_METRICS.map((m) =>
    m.key === "weight" ? { ...m, goodDir: weightDir } : m
  );

  // Photo dates (measurement dates with photos placeholder)
  const photoDates = measurements.slice(0, 6);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi corporel
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Mes mensurations
        </h1>
        {latest && (
          <p className="mt-1 text-xs text-[#F5EDED]/30">
            {measurements.length} session{measurements.length !== 1 ? "s" : ""}{" "}
            · Dernière :{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(latest.measured_at + "T12:00:00"))}
          </p>
        )}
      </div>

      {measurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-[#F5EDED]/40 uppercase tracking-widest">
            Aucune mensuration disponible
          </p>
          <p className="text-xs text-[#F5EDED]/25 mt-1">
            Ton coach enregistrera tes mesures lors de chaque bilan.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Progress cards */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
              Progression globale
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {metrics.map((m) => (
                <ProgressCard
                  key={m.key}
                  label={m.label}
                  unit={m.unit}
                  goodDir={m.goodDir}
                  current={
                    latest?.[m.key] as number | null
                  }
                  start={
                    first?.[m.key] as number | null
                  }
                />
              ))}
            </div>
          </div>

          {/* Charts */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
              Évolution
            </p>
            <MeasurementCharts measurements={measurements} />
          </div>

          {/* Photos placeholder */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
              Photos de progression
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {photoDates.map((m) => (
                <div
                  key={m.id}
                  className="aspect-square bg-[#1f0101] border border-[#890404]/30 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2"
                >
                  <Camera
                    size={18}
                    className="text-[#F5EDED]/15"
                    strokeWidth={1.5}
                  />
                  <p className="text-[8px] text-[#F5EDED]/25 text-center font-semibold">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(m.measured_at + "T12:00:00"))}
                  </p>
                  <p className="text-[7px] text-[#F5EDED]/15 uppercase tracking-wider">
                    À venir
                  </p>
                </div>
              ))}
              {photoDates.length === 0 && (
                <div className="col-span-3 sm:col-span-6 flex items-center justify-center py-10 bg-[#1f0101] border border-dashed border-[#890404]/20 rounded-xl">
                  <p className="text-xs text-[#F5EDED]/25 uppercase tracking-widest font-semibold">
                    Photos disponibles prochainement
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
