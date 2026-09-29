"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { bookAvailabilitySlot, bookWeeklyCheckin } from "@/app/dashboard/client/live/actions";
import type { AvailabilitySlot } from "@/utils/live-events";
import { capitalize, formatLiveDateTime, formatLiveTime, formatParis, parisDateKey } from "@/lib/live-time";

// Tous les formats passent par lib/live-time (fuseau Europe/Paris fixé) :
// avant, ce composant était rendu d'abord côté serveur en UTC puis
// réhydraté en heure locale du navigateur, d'où des horaires qui
// changeaient sous les yeux et un écart d'hydratation React.
function formatDayLabel(iso: string): string {
  return capitalize(formatParis(iso, { weekday: "long", day: "numeric", month: "long" }));
}

// "du 3 novembre et du 10 novembre" : semaines sautées d'un suivi hebdo.
function formatSkippedWeeks(isos: string[]): string {
  const labels = isos.map((iso) => `du ${formatParis(iso, { day: "numeric", month: "long" })}`);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

interface BookingSuccess {
  message: string;
  /** Réservation incomplète : on laisse le message affiché au lieu de rediriger. */
  partial: boolean;
}

export default function SlotPicker({
  coachId,
  slots,
  mode,
}: {
  coachId: string;
  slots: AvailabilitySlot[];
  /** "single" réserve un créneau isolé (1:1) ; "recurring" réserve le même créneau chaque semaine pendant 8 semaines (suivi hebdo). */
  mode: "single" | "recurring";
}) {
  const router = useRouter();
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleBook(slot: AvailabilitySlot) {
    setError("");
    setPendingSlot(slot.startsAt);
    startTransition(async () => {
      try {
        if (mode === "recurring") {
          const result = await bookWeeklyCheckin({
            coachId,
            startsAt: slot.startsAt,
            durationMinutes: slot.durationMinutes,
          });
          if (result.error) {
            setError(result.error);
            // Créneau pris entre-temps : on recharge la liste pour ne plus
            // le proposer.
            router.refresh();
            return;
          }
          const created = result.created ?? 0;
          const skipped = result.skipped ?? [];
          const failed = result.failed ?? [];
          const weekday = formatParis(slot.startsAt, { weekday: "long" });
          let message = `${created} séance${created > 1 ? "s" : ""} réservée${created > 1 ? "s" : ""}, chaque ${weekday} à ${formatLiveTime(slot.startsAt)}.`;
          if (skipped.length > 0) {
            message += ` Semaine${skipped.length > 1 ? "s" : ""} ${formatSkippedWeeks(skipped)} déjà prise${skipped.length > 1 ? "s" : ""} chez ton coach.`;
          }
          if (failed.length > 0) {
            message += ` Semaine${failed.length > 1 ? "s" : ""} ${formatSkippedWeeks(failed)} non enregistrée${failed.length > 1 ? "s" : ""} : écris à ton coach pour ${failed.length > 1 ? "les" : "la"} caler.`;
          }
          const partial = skipped.length > 0 || failed.length > 0;
          setBookedSlot(slot.startsAt);
          setSuccess({ message, partial });
          if (!partial) setTimeout(() => router.push("/dashboard/client/live"), 1800);
          return;
        }

        const result = await bookAvailabilitySlot({
          coachId,
          startsAt: slot.startsAt,
          durationMinutes: slot.durationMinutes,
        });
        if (result.error) {
          setError(result.error);
          router.refresh();
          return;
        }
        setBookedSlot(slot.startsAt);
        setSuccess({ message: `Réservé : ${formatLiveDateTime(slot.startsAt)}.`, partial: false });
        setTimeout(() => router.push("/dashboard/client/live"), 1500);
      } catch {
        // Réseau coupé, session expirée... : jamais d'échec silencieux.
        setError("La réservation n'a pas abouti. Vérifie ta connexion et réessaie.");
      }
    });
  }

  if (slots.length === 0) {
    return (
      <div className="ep-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)", margin: 0 }}>
          Aucun créneau disponible pour l&apos;instant. Contacte ton coach directement.
        </p>
        <Link
          href="/dashboard/client/messages"
          style={{ display: "inline-block", marginTop: 10, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}
        >
          Lui écrire
        </Link>
      </div>
    );
  }

  // Regroupement par jour calendaire de Paris (et non toDateString(), qui
  // dépend du fuseau de l'appareil et du serveur).
  const byDay = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const dayKey = parisDateKey(slot.startsAt);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(slot);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: 0 }}>
        {mode === "recurring"
          ? "En choisissant un créneau, il sera automatiquement réservé chaque semaine à la même heure, pendant 8 semaines. "
          : ""}
        Horaires affichés en heure de Paris.
      </p>

      {success && (
        <div
          role="status"
          style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 10, padding: "10px 12px",
          }}
        >
          <Check size={14} style={{ color: "#4ade80", flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12.5, color: "#F5EDED", margin: 0, lineHeight: 1.5 }}>{success.message}</p>
            {success.partial && (
              <Link
                href="/dashboard/client/live"
                style={{ display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}
              >
                Voir mes lives
              </Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff6b6b", fontSize: 12, margin: 0 }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} /> {error}
        </p>
      )}

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
                  {isThisPending ? "..." : formatLiveTime(slot.startsAt)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
