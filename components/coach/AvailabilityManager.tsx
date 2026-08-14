"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, CalendarClock } from "lucide-react";
import { addAvailabilityRules, deleteAvailabilityRule, type AvailabilityRule } from "@/app/dashboard/coach/live/actions";

const DAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 7, label: "Dimanche", short: "Dim" },
];

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Semaine", days: [1, 2, 3, 4, 5] },
  { label: "Week end", days: [6, 7] },
  { label: "Tous les jours", days: [1, 2, 3, 4, 5, 6, 7] },
];

// Nombre de créneaux réservables générés par une règle : le coach voit
// directement ce qu'il ouvre à ses clients, au lieu de le calculer de tête.
function slotCount(startTime: string, endTime: string, slotMinutes: number): number {
  const toMin = (t: string) => {
    const [h, m] = t.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const span = toMin(endTime) - toMin(startTime);
  return span > 0 && slotMinutes > 0 ? Math.floor(span / slotMinutes) : 0;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export default function AvailabilityManager({ initialRules }: { initialRules: AvailabilityRule[] }) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleDay(day: number) {
    setError("");
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  function applyPreset(days: number[]) {
    setError("");
    // Un preset déjà appliqué se retire d'un second clic, plutôt que de
    // forcer à décocher les jours un par un.
    const same =
      days.length === selectedDays.length && days.every((d) => selectedDays.includes(d));
    setSelectedDays(same ? [] : days);
  }

  function handleAdd() {
    setError("");
    startTransition(async () => {
      const result = await addAvailabilityRules({
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        slotDurationMinutes: slotDuration,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(id: string) {
    setError("");
    startTransition(async () => {
      const result = await deleteAvailabilityRule(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const previewSlots = slotCount(startTime, endTime, slotDuration);
  const totalWeeklySlots = initialRules.reduce(
    (sum, r) => sum + slotCount(r.start_time, r.end_time, r.slot_duration_minutes),
    0
  );

  // Regroupé par jour et trié du lundi au dimanche : la liste brute suivait
  // l'ordre de la base, on ne voyait pas sa semaine d'un coup d'œil.
  const byDay = DAYS.map((d) => ({
    ...d,
    rules: initialRules
      .filter((r) => r.day_of_week === d.value)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((d) => d.rules.length > 0);

  return (
    <div>
      <div className="ep-card" style={{ padding: "16px 18px", marginBottom: 20 }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Ajouter un créneau récurrent
        </p>

        {/* Jours : plusieurs à la fois. Une seule saisie ouvre toute la semaine. */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {DAYS.map((d) => {
            const active = selectedDays.includes(d.value);
            return (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                aria-pressed={active}
                className="ep-press"
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s var(--ep-ease-out)",
                  background: active ? "rgba(224,30,30,0.16)" : "rgba(245,237,237,0.04)",
                  border: active ? "1px solid rgba(224,30,30,0.4)" : "1px solid rgba(137,4,4,0.25)",
                  color: active ? "#E01E1E" : "rgba(245,237,237,0.45)",
                }}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="text-[10px] font-bold uppercase tracking-wider text-[#F5EDED]/40 hover:text-[#E01E1E] transition-colors"
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(137,4,4,0.22)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            aria-label="Heure de début"
            className="ep-input"
            style={{ fontSize: 13 }}
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            aria-label="Heure de fin"
            className="ep-input"
            style={{ fontSize: 13 }}
          />
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            aria-label="Durée d'un créneau"
            className="ep-input col-span-2 sm:col-span-1"
            style={{ fontSize: 13 }}
          >
            <option value={15}>Créneaux de 15 min</option>
            <option value={30}>Créneaux de 30 min</option>
            <option value={45}>Créneaux de 45 min</option>
            <option value={60}>Créneaux de 60 min</option>
          </select>
        </div>

        {/* Aperçu avant validation : combien de rendez-vous cela ouvre. */}
        <p className="text-[11px] text-[#F5EDED]/40 mb-3">
          {selectedDays.length === 0 || previewSlots === 0 ? (
            "Choisis au moins un jour et une plage horaire valide."
          ) : (
            <>
              <span className="text-[#F5EDED]/70 font-bold">
                {previewSlots * selectedDays.length} créneau{previewSlots * selectedDays.length !== 1 ? "x" : ""}
              </span>{" "}
              réservables par semaine ({previewSlots} par jour sur {selectedDays.length} jour
              {selectedDays.length !== 1 ? "s" : ""}).
            </>
          )}
        </p>

        <button
          onClick={handleAdd}
          disabled={isPending || selectedDays.length === 0}
          className="ep-btn-primary"
          style={{ fontSize: 11, width: "100%", opacity: selectedDays.length === 0 ? 0.45 : 1 }}
        >
          <Plus size={13} /> {isPending ? "Ajout en cours…" : "Ajouter ce créneau"}
        </button>
        {error && <p className="text-red-400 text-xs font-semibold mt-2">{error}</p>}
      </div>

      {/* Semaine type, groupée par jour */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
          Ma semaine type
        </p>
        {totalWeeklySlots > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#E01E1E]">
            <CalendarClock size={11} />
            {totalWeeklySlots} créneau{totalWeeklySlots !== 1 ? "x" : ""} par semaine
          </span>
        )}
      </div>

      {byDay.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl py-10 text-center">
          <p className="text-[12px] text-[#F5EDED]/35 m-0">
            Aucune disponibilité définie pour l&apos;instant.
          </p>
          <p className="text-[11px] text-[#F5EDED]/22 mt-1 m-0">
            Tant que rien n&apos;est ouvert ici, tes clients ne peuvent pas réserver d&apos;appel 1:1 eux mêmes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {byDay.map((day) => (
            <div key={day.value}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-1.5">
                {day.label}
              </p>
              <div className="space-y-1.5">
                {day.rules.map((rule) => {
                  const count = slotCount(rule.start_time, rule.end_time, rule.slot_duration_minutes);
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/20 rounded-lg px-3.5 py-2.5 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white m-0">
                          {rule.start_time.slice(0, 5)} à {rule.end_time.slice(0, 5)}
                        </p>
                        <p className="text-[10.5px] text-[#F5EDED]/38 m-0 mt-0.5">
                          {count} créneau{count !== 1 ? "x" : ""} de {formatDuration(rule.slot_duration_minutes)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={isPending}
                        aria-label="Supprimer ce créneau"
                        className="text-[#F5EDED]/25 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
