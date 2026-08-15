"use client";

import { useActionState } from "react";
import { BedDouble, Sunrise, Flame } from "lucide-react";
import type { DailyLog } from "@/utils/daily-logs";

// Heure de coucher/lever + régularité (MASTERCLASS.md — bilan en 2 temps,
// 2026-08-15) : jusqu'ici "Sommeil" n'était qu'un logger de données
// biométriques (voir TrackingClient plus bas sur cette page), sans aucune
// heure cible ni notion de routine — juste des chiffres à retaper. Cette
// carte ajoute l'objectif (utilisé aussi par lib/daily-gate.ts pour
// déclencher le bilan du soir) et la régularité réellement tenue.

type ScheduleAction = (
  prev: { error?: string; success?: boolean } | null,
  formData: FormData
) => Promise<{ error?: string; success?: boolean }>;

const inp =
  "w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(137,4,4,0.3)] rounded-lg px-3 py-2.5 text-sm text-[#F5EDED] focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const lbl = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Écart en minutes entre une heure réelle et la cible, en tenant compte du
// passage de minuit pour le coucher (23:50 vs cible 23:30 -> 20 min, pas 1420).
function deviationMinutes(actual: string, target: string): number {
  const a = toMinutes(actual.slice(0, 5));
  const t = toMinutes(target.slice(0, 5));
  const diff = Math.abs(a - t);
  return Math.min(diff, 1440 - diff);
}

const TOLERANCE_MIN = 30;

function computeStreak(logs: DailyLog[], targetBedtime: string | null, targetWakeTime: string | null): number {
  if (!targetBedtime && !targetWakeTime) return 0;
  // logs est trié du plus récent au plus ancien (voir getClientDailyLogs).
  let streak = 0;
  for (const log of logs) {
    const bedtimeOk = !targetBedtime || (log.bedtime_actual != null && deviationMinutes(log.bedtime_actual, targetBedtime) <= TOLERANCE_MIN);
    const wakeOk = !targetWakeTime || (log.wake_time_actual != null && deviationMinutes(log.wake_time_actual, targetWakeTime) <= TOLERANCE_MIN);
    // Un jour sans aucune heure loggée casse la série sans compter comme raté.
    if (log.bedtime_actual == null && log.wake_time_actual == null) break;
    if (bedtimeOk && wakeOk) streak++;
    else break;
  }
  return streak;
}

export default function SleepScheduleCard({
  targetBedtime,
  targetWakeTime,
  recentLogs,
  updateAction,
}: {
  targetBedtime: string | null;
  targetWakeTime: string | null;
  recentLogs: DailyLog[];
  updateAction: ScheduleAction;
}) {
  const [state, formAction, pending] = useActionState(updateAction, null);
  const streak = computeStreak(recentLogs, targetBedtime, targetWakeTime);
  const last7 = recentLogs.slice(0, 7);

  return (
    <div className="ep-card" style={{ padding: "18px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <BedDouble size={14} style={{ color: "#E01E1E" }} strokeWidth={2} />
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.5)", margin: 0, flex: 1 }}>
          Routine de sommeil
        </p>
        {streak > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>
            <Flame size={13} /> {streak}j
          </span>
        )}
      </div>

      <form action={formAction} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label className={lbl}>Heure de coucher visée</label>
            <input name="target_bedtime" type="time" defaultValue={targetBedtime?.slice(0, 5) ?? ""} className={inp} aria-label="Heure de coucher visée" />
          </div>
          <div>
            <label className={lbl}>Heure de lever visée</label>
            <input name="target_wake_time" type="time" defaultValue={targetWakeTime?.slice(0, 5) ?? ""} className={inp} aria-label="Heure de lever visée" />
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", margin: "0 0 10px", lineHeight: 1.5 }}>
          Le bilan du soir devient obligatoire 15 min avant l&apos;heure de coucher visée.
        </p>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", margin: "0 0 8px" }}>{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ep-btn-primary"
          style={{ fontSize: 11.5, padding: "9px 16px" }}
        >
          {pending ? "..." : state?.success ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </form>

      {last7.length > 0 && (targetBedtime || targetWakeTime) && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,237,237,0.35)", margin: "0 0 8px" }}>
            7 derniers jours
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {last7.map((log) => {
              const bedtimeOk = !targetBedtime || (log.bedtime_actual != null && deviationMinutes(log.bedtime_actual, targetBedtime) <= TOLERANCE_MIN);
              const wakeOk = !targetWakeTime || (log.wake_time_actual != null && deviationMinutes(log.wake_time_actual, targetWakeTime) <= TOLERANCE_MIN);
              const hasData = log.bedtime_actual != null || log.wake_time_actual != null;
              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                    borderRadius: 8, background: "rgba(0,0,0,0.25)",
                    fontSize: 11.5, color: "rgba(245,237,237,0.55)",
                  }}
                >
                  <span style={{ width: 42, flexShrink: 0, color: "rgba(245,237,237,0.35)" }}>
                    {new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(new Date(log.log_date + "T12:00:00"))}
                  </span>
                  {hasData ? (
                    <>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: bedtimeOk ? "#4ade80" : "#FDC4C4" }}>
                        <BedDouble size={11} /> {log.bedtime_actual?.slice(0, 5) ?? "N/A"}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: wakeOk ? "#4ade80" : "#FDC4C4" }}>
                        <Sunrise size={11} /> {log.wake_time_actual?.slice(0, 5) ?? "N/A"}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "rgba(245,237,237,0.25)" }}>Non renseigné</span>
                  )}
                  {log.sleep_hours != null && (
                    <span style={{ marginLeft: "auto", color: "rgba(245,237,237,0.35)" }}>{log.sleep_hours}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
