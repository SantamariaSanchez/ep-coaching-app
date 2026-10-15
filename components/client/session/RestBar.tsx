"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";
import { Timer, SkipForward, Flag } from "lucide-react";
import { getDeviceSettings } from "@/lib/device-settings";
import { formatClockSeconds, type LiveRest } from "@/lib/live-session";

// Barre fixe en bas de la séance, visible en permanence (retour direct du
// fondateur 2026-10-14 : « je veux savoir l'exo, combien de sets, mon
// repos »). Pendant un repos : décompte calculé depuis l'heure de départ
// (Date.now), donc juste même si l'appli est passée en arrière-plan ou que
// l'écran s'est éteint, bip et vibration à la fin. Sinon : chrono de séance,
// progression et prochaine série.

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    // Un contexte audio par bip : refermé tout de suite, WebKit plafonne le
    // nombre de contextes ouverts.
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // audio indisponible
  }
}

// Fin de repos ratée de plus de 10 s (appli en fond) : pas de bip en retard
// au retour, l'écran affiche simplement que le repos est fini.
const LATE_ALERT_MS = 10_000;

export default function RestBar({
  rest,
  sessionStart,
  doneSets,
  totalSets,
  nextLabel,
  onAdjust,
  onSkip,
  onFinish,
}: {
  rest: LiveRest | null;
  sessionStart: number;
  doneSets: number;
  totalSets: number;
  nextLabel: string | null;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const alertedRef = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    // Retour au premier plan : recalcul immédiat, sans attendre le tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const endsAt = rest ? rest.startedAt + rest.seconds * 1000 : 0;
  const remainingMs = rest ? endsAt - now : 0;
  const finished = rest != null && remainingMs <= 0;

  useEffect(() => {
    if (!rest || !finished) return;
    const id = `${rest.startedAt}:${rest.seconds}`;
    if (alertedRef.current === id) return;
    alertedRef.current = id;
    if (Date.now() - endsAt > LATE_ALERT_MS) return;
    const prefs = getDeviceSettings();
    if (prefs.restSound) playBeep();
    if (prefs.restVibration) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
    }
  }, [rest, finished, endsAt]);

  const progress = rest ? Math.min(1, Math.max(0, 1 - remainingMs / (rest.seconds * 1000))) : totalSets > 0 ? doneSets / totalSets : 0;
  const elapsed = sessionStart > 0 ? Math.floor((now - sessionStart) / 1000) : 0;

  return (
    <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] md:bottom-4 z-50 px-3 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto max-w-md mx-auto rounded-2xl border overflow-hidden shadow-[0_8px_30px_rgba(var(--ep-shade-rgb),0.45)]"
        style={{
          background: finished ? "var(--ep-okbg)" : "var(--ep-s1)",
          borderColor: finished
            ? "rgba(var(--ep-ok-rgb),0.45)"
            : rest
              ? "rgba(var(--ep-yellow-rgb),0.45)"
              : "rgba(var(--ep-line-rgb),0.35)",
        }}
      >
        <div className="h-1 w-full bg-(--ep-line)/15">
          <div
            className="h-full transition-[width] duration-300"
            style={{
              width: `${progress * 100}%`,
              background: finished ? "var(--ep-ok)" : rest ? "var(--ep-yellow)" : "var(--ep-accent)",
            }}
          />
        </div>

        {rest ? (
          <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[26px] leading-7 font-black tabular-nums"
                  style={{ color: finished ? "var(--ep-ok)" : "var(--ep-strong)" }}
                >
                  {finished ? `+${formatClockSeconds(-remainingMs / 1000)}` : formatClockSeconds(Math.ceil(remainingMs / 1000))}
                </span>
                <span
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: finished ? "var(--ep-ok)" : "var(--ep-yellow)" }}
                >
                  {finished ? t("C'est reparti") : rest.kind === "pause" ? t("Pause") : t("Repos")}
                </span>
              </div>
              <p className="text-[11px] text-(--ep-ink)/55 truncate leading-4">
                {rest.label || nextLabel || ""}
              </p>
            </div>
            {!finished && (
              <>
                <button
                  type="button"
                  onClick={() => onAdjust(-15)}
                  className="h-11 min-w-11 px-2 rounded-xl text-xs font-black tabular-nums text-(--ep-ink)/70 bg-(--ep-s2) border border-(--ep-line)/25"
                  aria-label={t("Enlever 15 secondes")}
                >
                  -15
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(15)}
                  className="h-11 min-w-11 px-2 rounded-xl text-xs font-black tabular-nums text-(--ep-ink)/70 bg-(--ep-s2) border border-(--ep-line)/25"
                  aria-label={t("Ajouter 15 secondes")}
                >
                  +15
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onSkip}
              className="h-11 min-w-11 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-black text-(--ep-strong) bg-(--ep-accent)"
              aria-label={finished ? t("Fermer le repos") : t("Passer le repos")}
            >
              {finished ? t("OK") : <SkipForward size={16} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5">
            <Timer size={16} className="text-(--ep-accent) shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black tabular-nums text-(--ep-strong) leading-5">
                {formatClockSeconds(elapsed)}
                <span className="ml-2 text-[11px] font-bold text-(--ep-ink)/50">
                  {doneSets}/{totalSets} {t("séries")}
                </span>
              </p>
              {nextLabel && <p className="text-[11px] text-(--ep-ink)/55 truncate leading-4">{nextLabel}</p>}
            </div>
            <button
              type="button"
              onClick={onFinish}
              className="h-11 px-3.5 rounded-xl flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-(--ep-strong) bg-(--ep-accent)"
            >
              <Flag size={13} />
              {t("Terminer")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
