"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { bookAvailabilitySlot, bookWeeklyCheckin } from "@/app/dashboard/client/live/actions";
import type { AvailabilitySlot } from "@/utils/live-events";

function formatDayLabel(iso: string): string {
  const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function SlotPicker({ coachId, slots }: { coachId: string; slots: AvailabilitySlot[] }) {
  const router = useRouter();
  const [recurring, setRecurring] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleBook(slot: AvailabilitySlot) {
    setError("");
    setPendingSlot(slot.startsAt);
    startTransition(async () => {
      const result = recurring
        ? await bookWeeklyCheckin({
            coachId,
            startsAt: slot.startsAt,
            durationMinutes: slot.durationMinutes,
          })
        : await bookAvailabilitySlot({
            coachId,
            startsAt: slot.startsAt,
            durationMinutes: slot.durationMinutes,
          });
      if (result.error) {
        setError(result.error);
      } else {
        setBookedSlot(slot.startsAt);
        setTimeout(() => router.push("/dashboard/client/live"), 1200);
      }
    });
  }

  if (slots.length === 0) {
    return (
      <div className="ep-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>
          Aucun créneau disponible pour l&apos;instant. Contacte ton coach directement.
        </p>
      </div>
    );
  }

  const byDay = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const dayKey = new Date(slot.startsAt).toDateString();
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(slot);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(245,237,237,0.55)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          style={{ accentColor: "#E01E1E", width: 15, height: 15 }}
        />
        Suivi hebdomadaire (répète ce créneau chaque semaine pendant 8 semaines)
      </label>
      {error && <p style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</p>}
      {[...byDay.entries()].map(([dayKey, daySlots]) => (
        <div key={dayKey}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {formatDayLabel(daySlots[0].startsAt)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {daySlots.map((slot) => {
              const isBooked = bookedSlot === slot.startsAt;
              const isThisPending = isPending && pendingSlot === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  onClick={() => handleBook(slot)}
                  disabled={isPending || bookedSlot !== null}
                  className={isBooked ? "" : "ep-btn-secondary"}
                  style={{
                    fontSize: 12,
                    padding: "8px 14px",
                    ...(isBooked
                      ? { background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", borderRadius: 10 }
                      : {}),
                  }}
                >
                  {isBooked ? <Check size={12} /> : null}
                  {isThisPending ? "..." : formatTime(slot.startsAt)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
