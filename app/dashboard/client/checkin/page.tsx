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
import Card from "@/components/ui/Card";
import CheckinForm from "@/components/ui/CheckinForm";
import { CheckCircle2, Clock, Star } from "lucide-react";

const FEELING_LABELS: Record<number, string> = {
  1: "Épuisé",
  2: "Fatigué",
  3: "Correct",
  4: "Bien",
  5: "Au top",
};

const DIGESTION_LABELS: Record<number, string> = {
  1: "Difficile",
  2: "Inconfort",
  3: "Correcte",
  4: "Bien",
  5: "Parfaite",
};

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#890404]/10 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        {label}
      </span>
      <span className="text-sm font-medium text-white text-right">{value}</span>
    </div>
  );
}

function BilanRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < rating ? "bg-amber-400" : "bg-[#890404]/20"
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-black text-amber-400">
        {rating}
        <span className="text-[10px] font-normal text-[#F5EDED]/40">/10</span>
      </span>
    </div>
  );
}

function PastCheckinCard({ checkin }: { checkin: CheckIn }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(checkin.created_at));

  const hasBilan = checkin.bilan_sent_at != null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-white">
            Semaine {checkin.week_number}
          </p>
          <p className="text-[10px] text-[#F5EDED]/30">{date}</p>
        </div>
        {hasBilan ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            <CheckCircle2 size={10} />
            Bilan reçu
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Clock size={10} />
            En attente du bilan
          </span>
        )}
      </div>

      {/* Data recap */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0">
        <DataRow
          label="Poids"
          value={checkin.weight != null ? `${checkin.weight} kg` : null}
        />
        <DataRow
          label="Adhérence"
          value={
            checkin.nutrition_adherence != null
              ? `${checkin.nutrition_adherence}%`
              : null
          }
        />
        <DataRow
          label="Sommeil"
          value={checkin.sleep_hours != null ? `${checkin.sleep_hours}h` : null}
        />
        <DataRow
          label="HRV"
          value={checkin.hrv != null ? String(checkin.hrv) : null}
        />
        <DataRow
          label="Ressenti"
          value={
            checkin.general_feeling != null
              ? `${checkin.general_feeling}/5 — ${FEELING_LABELS[checkin.general_feeling]}`
              : null
          }
        />
      </div>

      {/* Coach bilan */}
      {hasBilan && (
        <div className="pt-3 border-t border-[#890404]/15 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E]/70 flex items-center gap-1.5">
            <Star size={10} />
            Bilan de ton coach
          </p>
          {checkin.bilan_rating != null && (
            <BilanRating rating={checkin.bilan_rating} />
          )}
          {checkin.bilan_text && (
            <p className="text-sm text-[#F5EDED]/75 leading-relaxed">
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

  // Show measurements section if first week of month OR last measurement > 28 days ago
  const now = new Date();
  const dayOfMonth = now.getDate();
  const isFirstWeekOfMonth = dayOfMonth <= 7;
  const daysSinceLastMeasurement = lastMeasurementDate
    ? Math.floor((now.getTime() - new Date(lastMeasurementDate + "T12:00:00").getTime()) / 86400000)
    : Infinity;
  const showMeasurements = isFirstWeekOfMonth || daysSinceLastMeasurement > 28;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto page-transition pb-24 md:pb-8">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Semaine {weekNum}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Check-in
        </h1>
      </div>

      {existing ? (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                <span className="text-green-400 text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="text-sm font-bold text-green-400">
                  Check-in envoyé
                </p>
                <p className="text-[10px] text-[#F5EDED]/35">
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(existing.created_at))}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Ton bilan de la semaine">
            <DataRow
              label="Poids"
              value={existing.weight != null ? `${existing.weight} kg` : null}
            />
            <DataRow
              label="Poids moyen"
              value={
                existing.weight_avg != null
                  ? `${existing.weight_avg} kg`
                  : null
              }
            />
            <DataRow
              label="Adhérence nutrition"
              value={
                existing.nutrition_adherence != null
                  ? `${existing.nutrition_adherence}%`
                  : null
              }
            />
            <DataRow
              label="Calories/jour"
              value={
                existing.calories_per_day != null
                  ? `${existing.calories_per_day} kcal`
                  : null
              }
            />
            <DataRow
              label="Pas/jour"
              value={
                existing.steps_per_day != null
                  ? `${existing.steps_per_day.toLocaleString("fr-FR")}`
                  : null
              }
            />
            <DataRow
              label="Sommeil"
              value={
                existing.sleep_hours != null
                  ? `${existing.sleep_hours}h`
                  : null
              }
            />
            <DataRow
              label="HRV"
              value={existing.hrv != null ? String(existing.hrv) : null}
            />
            <DataRow
              label="FC repos"
              value={
                existing.resting_hr != null
                  ? `${existing.resting_hr} bpm`
                  : null
              }
            />
            <DataRow
              label="Digestion"
              value={
                existing.digestion != null
                  ? `${existing.digestion}/5 — ${DIGESTION_LABELS[existing.digestion]}`
                  : null
              }
            />
            <DataRow
              label="Ressenti général"
              value={
                existing.general_feeling != null
                  ? `${existing.general_feeling}/5 — ${FEELING_LABELS[existing.general_feeling]}`
                  : null
              }
            />
            {existing.client_notes && (
              <div className="mt-3 pt-3 border-t border-[#890404]/10">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                  Tes notes
                </p>
                <p className="text-sm text-[#F5EDED]/70 leading-relaxed">
                  {existing.client_notes}
                </p>
              </div>
            )}
          </Card>

          {/* Bilan coach pour cette semaine */}
          {existing.bilan_sent_at ? (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-[#E01E1E]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E]">
                  Bilan de ton coach
                  {existing.bilan_rating != null && (
                    <span className="ml-2 text-amber-400">
                      {existing.bilan_rating}/10
                    </span>
                  )}
                </p>
              </div>
              {existing.bilan_rating != null && (
                <div className="mb-3">
                  <BilanRating rating={existing.bilan_rating} />
                </div>
              )}
              <p className="text-sm text-[#F5EDED]/80 leading-relaxed">
                {existing.bilan_text}
              </p>
            </Card>
          ) : (
            <Card>
              <div className="flex items-center gap-2 py-2">
                <Clock size={14} className="text-amber-400/60" />
                <p className="text-xs text-[#F5EDED]/30">
                  En attente du bilan coach...
                </p>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CheckinForm showMeasurements={showMeasurements} />
        </Card>
      )}

      {/* ── Historique bilans ──────────────────────────────────────────────── */}
      {pastCheckins.length > 0 && (
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Historique
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Mes bilans
            </h2>
          </div>
          <div className="space-y-3">
            {pastCheckins.map((c) => (
              <PastCheckinCard key={c.id} checkin={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
