import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import {
  getThisWeekCheckin,
  getClientPastCheckins,
  getISOWeek,
  getWeekStart,
  type CheckIn,
} from "@/utils/checkins";
import { getLastMeasurementDate } from "@/utils/measurements";
import CheckinForm from "@/components/ui/CheckinForm";
import { CheckCircle2, Clock, Star } from "lucide-react";

const FEELING_LABELS: Record<number, string> = {
  1: "Épuisé", 2: "Fatigué", 3: "Correct", 4: "Bien", 5: "Au top",
};
const DIGESTION_LABELS: Record<number, string> = {
  1: "Difficile", 2: "Inconfort", 3: "Correcte", 4: "Bien", 5: "Parfaite",
};

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      padding: "10px 0",
      borderBottom: "1px solid rgba(137,4,4,0.08)",
    }}>
      <span className="ep-label">{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#F5EDED", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function BilanRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < rating ? "#fbbf24" : "rgba(137,4,4,0.2)",
        }} />
      ))}
      <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 900, color: "#fbbf24" }}>
        {rating}
        <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(251,191,36,0.4)" }}>/10</span>
      </span>
    </div>
  );
}

function PastCheckinCard({ checkin }: { checkin: CheckIn }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(checkin.created_at));

  const hasBilan = checkin.bilan_sent_at != null;

  return (
    <div className="ep-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>
            Semaine {checkin.week_number}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.3)" }}>{date}</p>
        </div>
        {hasBilan ? (
          <span className="ep-badge-green" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <CheckCircle2 size={10} /> Bilan reçu
          </span>
        ) : (
          <span className="ep-badge-amber" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Clock size={10} /> En attente
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <DataRow label="Poids" value={checkin.weight != null ? `${checkin.weight} kg` : null} />
        <DataRow label="Adhérence" value={checkin.nutrition_adherence != null ? `${checkin.nutrition_adherence}%` : null} />
        <DataRow label="Sommeil" value={checkin.sleep_hours != null ? `${checkin.sleep_hours}h` : null} />
        <DataRow label="HRV" value={checkin.hrv != null ? String(checkin.hrv) : null} />
        <DataRow label="Ressenti" value={checkin.general_feeling != null ? `${checkin.general_feeling}/5 — ${FEELING_LABELS[checkin.general_feeling]}` : null} />
      </div>

      {hasBilan && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.1)" }}>
          <p className="ep-section-title" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={10} />
            Bilan de ton coach
          </p>
          {checkin.bilan_rating != null && (
            <div style={{ marginBottom: 8 }}>
              <BilanRating rating={checkin.bilan_rating} />
            </div>
          )}
          {checkin.bilan_text && (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0 }}>
              {checkin.bilan_text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default async function CheckinPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [existing, pastCheckins, lastMeasurementDate] = await Promise.all([
    getThisWeekCheckin(user.id),
    getClientPastCheckins(user.id),
    getLastMeasurementDate(user.id),
  ]);
  const weekNum = getISOWeek(new Date(getWeekStart()));

  const now = new Date();
  const dayOfMonth = now.getDate();
  const isFirstWeekOfMonth = dayOfMonth <= 7;
  const daysSinceLastMeasurement = lastMeasurementDate
    ? Math.floor((now.getTime() - new Date(lastMeasurementDate + "T12:00:00").getTime()) / 86400000)
    : Infinity;
  const showMeasurements = isFirstWeekOfMonth || daysSinceLastMeasurement > 28;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Semaine {weekNum}</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Check-in
        </h1>
      </div>

      {existing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sent confirmation */}
          <div className="ep-card animate-scale-in" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                  Check-in envoyé
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.3)" }}>
                  {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                    .format(new Date(existing.created_at))}
                </p>
              </div>
            </div>
          </div>

          {/* This week recap */}
          <div className="ep-card" style={{ padding: "18px" }}>
            <p className="ep-section-title">Ton bilan de la semaine</p>
            <DataRow label="Poids" value={existing.weight != null ? `${existing.weight} kg` : null} />
            <DataRow label="Poids moyen" value={existing.weight_avg != null ? `${existing.weight_avg} kg` : null} />
            <DataRow label="Adhérence nutrition" value={existing.nutrition_adherence != null ? `${existing.nutrition_adherence}%` : null} />
            <DataRow label="Calories/jour" value={existing.calories_per_day != null ? `${existing.calories_per_day} kcal` : null} />
            <DataRow label="Pas/jour" value={existing.steps_per_day != null ? existing.steps_per_day.toLocaleString("fr-FR") : null} />
            <DataRow label="Sommeil" value={existing.sleep_hours != null ? `${existing.sleep_hours}h` : null} />
            <DataRow label="HRV" value={existing.hrv != null ? String(existing.hrv) : null} />
            <DataRow label="FC repos" value={existing.resting_hr != null ? `${existing.resting_hr} bpm` : null} />
            <DataRow label="Digestion" value={existing.digestion != null ? `${existing.digestion}/5 — ${DIGESTION_LABELS[existing.digestion]}` : null} />
            <DataRow label="Ressenti général" value={existing.general_feeling != null ? `${existing.general_feeling}/5 — ${FEELING_LABELS[existing.general_feeling]}` : null} />
            {existing.client_notes && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.08)" }}>
                <p className="ep-label" style={{ marginBottom: 8 }}>Tes notes</p>
                <p style={{ fontSize: 13, color: "rgba(245,237,237,0.7)", lineHeight: 1.6, margin: 0 }}>
                  {existing.client_notes}
                </p>
              </div>
            )}
          </div>

          {/* Coach bilan */}
          {existing.bilan_sent_at ? (
            <div className="ep-card-highlighted" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Star size={13} style={{ color: "#E01E1E" }} />
                <p className="ep-section-title" style={{ margin: 0 }}>
                  Bilan de ton coach
                  {existing.bilan_rating != null && (
                    <span style={{ marginLeft: 8, color: "#fbbf24" }}>{existing.bilan_rating}/10</span>
                  )}
                </p>
              </div>
              {existing.bilan_rating != null && (
                <div style={{ marginBottom: 12 }}>
                  <BilanRating rating={existing.bilan_rating} />
                </div>
              )}
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", lineHeight: 1.65, margin: 0 }}>
                {existing.bilan_text}
              </p>
            </div>
          ) : (
            <div className="ep-card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={14} style={{ color: "rgba(251,191,36,0.5)" }} />
                <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
                  En attente du bilan coach...
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ep-card">
          <CheckinForm showMeasurements={showMeasurements} />
        </div>
      )}

      {/* Past checkins */}
      {pastCheckins.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <p className="ep-section-title" style={{ marginBottom: 4 }}>Historique</p>
          <h2 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#F5EDED", marginBottom: 16,
          }}>
            Mes bilans
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pastCheckins.map((c) => (
              <PastCheckinCard key={c.id} checkin={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
