import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientMeasurements } from "@/utils/measurements";
import { getNutritionProfile } from "@/utils/nutrition";
import { getClientCheckins } from "@/utils/checkins";
import ClientProgressCharts from "@/components/ui/ClientProgressCharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Measurement } from "@/utils/measurements";
import type { CheckIn } from "@/utils/checkins";

// ── Measurement delta cards ───────────────────────────────────────────────────

const PROGRESSION_METRICS: {
  key: keyof Measurement;
  label: string;
  unit: string;
  goodDir: "up" | "down" | "neutral";
}[] = [
  { key: "weight", label: "Poids", unit: "kg", goodDir: "neutral" },
  { key: "waist", label: "Tour de taille", unit: "cm", goodDir: "down" },
  { key: "hips", label: "Hanches", unit: "cm", goodDir: "down" },
  { key: "chest", label: "Poitrine", unit: "cm", goodDir: "neutral" },
  { key: "arm_flexed", label: "Bras fléchi", unit: "cm", goodDir: "up" },
  { key: "thigh", label: "Cuisse", unit: "cm", goodDir: "up" },
  { key: "abdomen", label: "Abdomen", unit: "cm", goodDir: "down" },
];

function DeltaBadge({
  delta,
  unit,
  goodDir,
}: {
  delta: number | null;
  unit: string;
  goodDir: "up" | "down" | "neutral";
}) {
  if (delta == null) return <span className="text-sm text-[#F5EDED]/25">—</span>;
  if (delta === 0)
    return (
      <div className="flex items-center gap-1 text-[#F5EDED]/40">
        <Minus size={12} />
        <span className="text-xs font-bold">0 {unit}</span>
      </div>
    );

  const isGood =
    goodDir === "neutral"
      ? null
      : goodDir === "down"
      ? delta < 0
      : delta > 0;

  const colorClass =
    isGood === true
      ? "text-green-400"
      : isGood === false
      ? "text-red-400"
      : "text-[#F5EDED]/60";

  const Icon = delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon size={12} strokeWidth={2} />
      <span className="text-xs font-bold">
        {delta > 0 ? "+" : ""}
        {delta} {unit}
      </span>
    </div>
  );
}

function MeasurementDeltaCard({
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
  const delta =
    current != null && start != null
      ? parseFloat((current - start).toFixed(1))
      : null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
        {label}
      </p>
      <p className="text-xl font-black text-white mb-1">
        {current != null ? (
          <>
            {current}
            <span className="text-xs font-normal text-[#F5EDED]/40 ml-0.5">
              {unit}
            </span>
          </>
        ) : (
          <span className="text-[#F5EDED]/25">—</span>
        )}
      </p>
      <DeltaBadge delta={delta} unit={unit} goodDir={goodDir} />
    </div>
  );
}

// ── Checkins table ────────────────────────────────────────────────────────────

const FEELING_LABELS: Record<number, string> = {
  1: "Épuisé",
  2: "Fatigué",
  3: "Correct",
  4: "Bien",
  5: "Au top",
};

function CheckinsTable({ checkins }: { checkins: CheckIn[] }) {
  const rows = checkins.slice(0, 12);
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 bg-[#1f0101] border border-[#890404]/20 rounded-xl">
        <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
          Aucun check-in enregistré
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#890404]/20">
      <table className="w-full text-left min-w-[560px]">
        <thead>
          <tr className="border-b border-[#890404]/20 bg-[#1f0101]">
            {["Semaine", "Poids", "Adhésion", "Pas/j", "Sommeil", "Ressenti"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              className="border-b border-[#890404]/10 last:border-0 bg-[#1a0101] hover:bg-[#1f0101] transition-colors"
            >
              <td className="px-4 py-3 text-xs font-bold text-white">
                S{c.week_number}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.weight != null ? `${c.weight} kg` : "—"}
              </td>
              <td className="px-4 py-3 text-xs">
                {c.nutrition_adherence != null ? (
                  <span
                    className={`font-bold ${
                      c.nutrition_adherence >= 80
                        ? "text-green-400"
                        : c.nutrition_adherence >= 60
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {c.nutrition_adherence}%
                  </span>
                ) : (
                  <span className="text-[#F5EDED]/30">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.steps_per_day != null
                  ? c.steps_per_day.toLocaleString("fr-FR")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.sleep_hours != null ? `${c.sleep_hours}h` : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.general_feeling != null
                  ? `${c.general_feeling}/5 — ${FEELING_LABELS[c.general_feeling] ?? ""}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientProgressPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [measurements, checkins, nutritionProfile] = await Promise.all([
    getClientMeasurements(user.id),
    getClientCheckins(user.id),
    getNutritionProfile(user.id),
  ]);

  const latest = measurements[0] ?? null;
  const first = measurements[measurements.length - 1] ?? null;

  // Override weight direction
  const weightDir: "up" | "down" | "neutral" =
    nutritionProfile?.phase === "deficit"
      ? "down"
      : nutritionProfile?.phase === "surplus"
      ? "up"
      : "neutral";

  const metrics = PROGRESSION_METRICS.map((m) =>
    m.key === "weight" ? { ...m, goodDir: weightDir } : m
  );

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Historique
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <TrendingUp size={26} className="text-[#E01E1E]" />
          Progression
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          {measurements.length} mensuration{measurements.length !== 1 ? "s" : ""}{" "}
          · {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Charts */}
      <section className="mb-10">
        <ClientProgressCharts measurements={measurements} checkins={checkins} />
      </section>

      {/* Checkins table */}
      <section className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Historique check-ins
        </p>
        <CheckinsTable checkins={checkins} />
      </section>

      {/* Measurement deltas */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Mensurations — variation depuis le début
        </p>

        {measurements.length === 0 ? (
          <div className="flex items-center justify-center py-10 bg-[#1f0101] border border-[#890404]/20 rounded-xl">
            <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
              Pas encore de mensurations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics
              .filter(
                (m) =>
                  (latest?.[m.key] as number | null) != null ||
                  (first?.[m.key] as number | null) != null
              )
              .map((m) => (
                <MeasurementDeltaCard
                  key={m.key}
                  label={m.label}
                  unit={m.unit}
                  goodDir={m.goodDir}
                  current={latest?.[m.key] as number | null}
                  start={first?.[m.key] as number | null}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
