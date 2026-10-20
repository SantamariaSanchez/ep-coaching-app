"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { formatClockSeconds, type LiveRest } from "@/lib/live-session";

// Chrono de séance de l'en-tête, visible en permanence (retour direct du
// fondateur 2026-10-20 : « il faut tout le temps voir le temps de séance »).
// Il vivait dans la barre du bas, masquée pendant un repos et cachée par le
// clavier. Son propre tick : la séance entière ne se re-rend pas chaque
// seconde pour une horloge.
//
// `showRest` : la barre du bas est masquée (clavier ouvert pour une note ou
// une charge), le repos en cours reste lisible ici.

export function formatSessionClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 3600) return formatClockSeconds(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function SessionClock({
  sessionStart,
  rest,
  showRest,
}: {
  sessionStart: number;
  rest: LiveRest | null;
  showRest: boolean;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const elapsed = sessionStart > 0 ? (now - sessionStart) / 1000 : 0;
  const restLeft = rest ? Math.ceil((rest.startedAt + rest.seconds * 1000 - now) / 1000) : null;

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      {showRest && restLeft != null && (
        <span
          className="h-7 px-2 rounded-full flex items-center text-[11px] font-black tabular-nums border"
          style={{
            color: restLeft > 0 ? "var(--ep-yellow)" : "var(--ep-ok)",
            borderColor: restLeft > 0 ? "rgba(var(--ep-yellow-rgb),0.4)" : "rgba(var(--ep-ok-rgb),0.4)",
            background: restLeft > 0 ? "rgba(var(--ep-yellow-rgb),0.1)" : "rgba(var(--ep-ok-rgb),0.1)",
          }}
        >
          {restLeft > 0 ? `${t("Repos")} ${formatClockSeconds(restLeft)}` : t("Repos fini")}
        </span>
      )}
      <span
        className="h-7 px-2 rounded-full flex items-center gap-1 text-[13px] font-black tabular-nums text-(--ep-strong) bg-(--ep-s1) border border-(--ep-line)/30"
        role="timer"
        aria-label={`${t("Temps de séance")} ${formatSessionClock(elapsed)}`}
      >
        <Timer size={13} className="text-(--ep-accent)" aria-hidden />
        {formatSessionClock(elapsed)}
      </span>
    </span>
  );
}
