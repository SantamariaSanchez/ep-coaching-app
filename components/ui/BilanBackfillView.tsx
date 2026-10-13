"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { ChevronDown, CalendarClock, Check, CircleDashed } from "lucide-react";
import DailyBilanForm, { type BilanAction } from "@/components/ui/DailyBilanForm";
import { onKeyActivate } from "@/lib/a11y";
import type { DailyLog } from "@/utils/daily-logs";
import { todayInParis, BILAN_BACKFILL_DAYS } from "@/lib/dates";

function isMorningDone(log: DailyLog | undefined): boolean {
  return !!log && log.weight_morning != null && log.sleep_hours != null && log.sleep_rating != null;
}
function isEveningDone(log: DailyLog | undefined): boolean {
  return !!log && log.steps != null && log.digestion != null && log.stress != null && log.hunger != null;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(iso + "T12:00:00")
  );
}

// Rattrapage de bilans manqués (demande explicite 2026-08-17 : "même si on
// loupe un jour, on peut logger quand même par la suite les jours
// passés"). Réutilise DailyBilanForm tel quel — son prop `today` n'est en
// réalité qu'un log_date générique, voir lib/dates.ts pour la fenêtre
// autorisée côté serveur (30 jours).
export default function BilanBackfillView({
  logs,
  action,
  daysShown = 14,
}: {
  logs: DailyLog[];
  action: BilanAction;
  daysShown?: number;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const today = todayInParis();
  const logsByDate = new Map(logs.map((l) => [l.log_date, l]));

  const visibleDays = showAll ? BILAN_BACKFILL_DAYS : daysShown;
  // Hier en premier : aujourd'hui a déjà son propre écran (bilan du jour),
  // pas la peine de le dupliquer ici.
  const days = Array.from({ length: visibleDays }, (_, i) => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - (i + 1));
    return d.toISOString().split("T")[0];
  });

  return (
    <div>
      <p className="text-[12px] text-(--ep-ink)/40 leading-relaxed mb-4">
        {t("Un jour manqué ? Complète-le ici, jusqu'à")}{" "}{BILAN_BACKFILL_DAYS}{" "}{t("jours en arrière.")}
      </p>
      <div className="space-y-2">
        {days.map((date) => {
          const log = logsByDate.get(date);
          const morningDone = isMorningDone(log);
          const eveningDone = isEveningDone(log);
          const complete = morningDone && eveningDone;
          const partial = (morningDone || eveningDone) && !complete;
          const isOpen = expanded === date;

          return (
            <div key={date} className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isOpen ? null : date)}
                onKeyDown={onKeyActivate(() => setExpanded(isOpen ? null : date))}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock size={14} className="text-(--ep-ink)/30 flex-shrink-0" />
                  <span className="text-[13px] font-bold text-(--ep-strong) capitalize">{fmtDate(date)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={
                      complete
                        ? { background: "rgba(var(--ep-ok-rgb),0.1)", color: "var(--ep-ok)" }
                        : partial
                        ? { background: "rgba(var(--ep-warn-rgb),0.1)", color: "var(--ep-warn)" }
                        : { background: "rgba(var(--ep-ink-rgb),0.06)", color: "rgba(var(--ep-ink-rgb),0.35)" }
                    }
                  >
                    {complete ? <Check size={10} /> : <CircleDashed size={10} />}
                    {complete ? t("Complet") : partial ? t("Partiel") : t("Manquant")}
                  </span>
                  <ChevronDown
                    size={15}
                    className="text-(--ep-ink)/30 transition-transform flex-shrink-0"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </div>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-(--ep-line)/15">
                  <DailyBilanForm today={date} existing={log ?? null} action={action} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showAll && visibleDays < BILAN_BACKFILL_DAYS && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/30 hover:text-(--ep-ink)/60 transition-colors"
        >
          {t("Voir les")}{" "}{BILAN_BACKFILL_DAYS}{" "}{t("derniers jours")}
        </button>
      )}
    </div>
  );
}
