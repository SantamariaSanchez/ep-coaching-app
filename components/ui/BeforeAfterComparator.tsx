import type { Measurement } from "@/utils/measurements";
import type { CheckIn } from "@/utils/checkins";
import { ArrowRight, ArrowDown, ArrowUp } from "lucide-react";
import PhotoCompareSlider from "./PhotoCompareSlider";

const FIELDS: { key: keyof Measurement; label: string }[] = [
  { key: "weight", label: "Poids" },
  { key: "waist", label: "Taille" },
  { key: "hips", label: "Hanches" },
  { key: "abdomen", label: "Abdomen" },
  { key: "chest", label: "Poitrine" },
  { key: "shoulders", label: "Épaules" },
  { key: "arm_relaxed", label: "Bras relâché" },
  { key: "arm_flexed", label: "Bras contracté" },
  { key: "forearm", label: "Avant-bras" },
  { key: "thigh", label: "Cuisse" },
  { key: "calf", label: "Mollet" },
  { key: "neck", label: "Cou" },
];

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d + "T12:00:00"));
}

function DeltaRow({ label, oldVal, newVal }: { label: string; oldVal: number | null; newVal: number | null }) {
  if (oldVal == null && newVal == null) return null;
  const delta = oldVal != null && newVal != null ? Math.round((newVal - oldVal) * 10) / 10 : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(137,4,4,0.08)" }}>
      <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.35)", fontWeight: 700, minWidth: 44, textAlign: "right" }}>
        {oldVal != null ? `${oldVal}` : "···"}
      </span>
      <span style={{ fontSize: 12.5, color: "#F5EDED", fontWeight: 800, minWidth: 44, textAlign: "right" }}>
        {newVal != null ? `${newVal}` : "···"}
      </span>
      <span
        style={{
          display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 800, minWidth: 48, justifyContent: "flex-end",
          color: delta == null ? "rgba(245,237,237,0.2)" : delta < 0 ? "#4ade80" : delta > 0 ? "#fb923c" : "rgba(245,237,237,0.35)",
        }}
      >
        {delta != null && delta !== 0 && (delta < 0 ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
        {delta != null ? `${delta > 0 ? "+" : ""}${delta}` : "···"}
      </span>
    </div>
  );
}

// Comparateur avant/après (item 13) : plutôt que de reconstituer la
// tendance à l'œil en scrollant les bilans un par un, la première et la
// dernière mensuration (et les premières/dernières photos de check-in
// disponibles) sont mises côte à côte automatiquement.
export default function BeforeAfterComparator({
  measurements,
  checkins,
}: {
  /** Triées du plus récent au plus ancien (voir getClientMeasurementsAsCoach). */
  measurements: Measurement[];
  checkins: CheckIn[];
}) {
  // Rien à comparer avec une seule mensuration ou moins — pas d'état vide
  // ici, ce module n'apporte rien tant qu'il n'y a pas au moins deux points.
  if (measurements.length < 2) return null;

  const newest = measurements[0];
  const oldest = measurements[measurements.length - 1];

  const withPhotos = [...checkins]
    .filter((c) => c.photo_urls.length > 0)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
  const oldestPhoto = withPhotos[0]?.photo_urls[0] ?? null;
  const newestPhoto = withPhotos[withPhotos.length - 1]?.photo_urls[0] ?? null;
  const showPhotos = oldestPhoto && newestPhoto && oldestPhoto !== newestPhoto;

  return (
    <div className="ep-card" style={{ padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)", margin: 0 }}>
          Avant / Après
        </p>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(245,237,237,0.35)", fontWeight: 600 }}>
          {fmtDate(oldest.measured_at)} <ArrowRight size={11} /> {fmtDate(newest.measured_at)}
        </span>
      </div>

      {showPhotos && (
        <div style={{ marginBottom: 16 }}>
          {/* Item 35 : curseur glissant plutôt que côte-à-côte statique —
              lecture bien plus parlante de la différence réelle. */}
          <PhotoCompareSlider beforeUrl={oldestPhoto} afterUrl={newestPhoto} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0 10px", marginBottom: 4 }}>
        <span />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", textAlign: "right" }}>Avant</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", textAlign: "right" }}>Après</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", textAlign: "right" }}>Écart</span>
      </div>
      {FIELDS.map(({ key, label }) => (
        <DeltaRow key={key} label={label} oldVal={oldest[key] as number | null} newVal={newest[key] as number | null} />
      ))}
    </div>
  );
}
