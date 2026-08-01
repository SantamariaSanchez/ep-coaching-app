"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { addAvailabilityRule, deleteAvailabilityRule, type AvailabilityRule } from "@/app/dashboard/coach/live/actions";

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

export default function AvailabilityManager({ initialRules }: { initialRules: AvailabilityRule[] }) {
  const router = useRouter();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError("");
    startTransition(async () => {
      const result = await addAvailabilityRule({
        dayOfWeek,
        startTime,
        endTime,
        slotDurationMinutes: slotDuration,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAvailabilityRule(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="ep-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Ajouter un créneau récurrent
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="ep-input"
            style={{ fontSize: 13 }}
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="ep-input"
            style={{ fontSize: 13 }}
          >
            <option value={15}>Créneaux de 15 min</option>
            <option value={30}>Créneaux de 30 min</option>
            <option value={45}>Créneaux de 45 min</option>
            <option value={60}>Créneaux de 60 min</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="ep-input" style={{ fontSize: 13 }} />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="ep-input" style={{ fontSize: 13 }} />
        </div>
        <button onClick={handleAdd} disabled={isPending} className="ep-btn-primary" style={{ fontSize: 11, width: "100%" }}>
          <Plus size={13} /> Ajouter ce créneau
        </button>
        {error && <p className="text-red-400 text-xs font-semibold mt-2">{error}</p>}
      </div>

      <div className="space-y-2">
        {initialRules.length === 0 ? (
          <p className="text-[12px] text-[#F5EDED]/30 italic">Aucune disponibilité définie pour l&apos;instant.</p>
        ) : (
          initialRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/20 rounded-lg px-3.5 py-2.5">
              <p className="text-xs text-[#F5EDED]/70">
                <strong className="text-white">{DAYS.find((d) => d.value === rule.day_of_week)?.label}</strong>
                {" "}{rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)} · créneaux de {rule.slot_duration_minutes} min
              </p>
              <button onClick={() => handleDelete(rule.id)} disabled={isPending} className="text-[#F5EDED]/25 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
