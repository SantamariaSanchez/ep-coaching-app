"use client";

import { Plus, X, CalendarDays } from "lucide-react";
import { DAY_LABELS, type ScheduleBlock } from "@/utils/agenda";
import type { DayRow } from "./ProgramEditor";

// Avant de choisir un seul exercice, la première vraie décision de structure
// est : quels jours réels de la semaine ce client s'entraîne-t-il, compte
// tenu de ce qu'il fait déjà les autres jours (travail, sommeil, autres
// créneaux) ? Un nombre de séances/semaine abstrait ("fréquence : 4") ne dit
// rien de ça — cet outil croise directement les séances du programme avec
// l'agenda réel du client (schedule_blocks, déjà alimenté côté client) pour
// que le placement soit une vraie décision informée, pas une supposition.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

function timeShort(t: string): string {
  return t.slice(0, 5);
}

export default function WeeklyStructurePlanner({
  scheduleBlocks,
  days,
  onSetWeekday,
  onAddDay,
  onRemoveDay,
  subjectLabel = "ce client",
}: {
  scheduleBlocks: ScheduleBlock[];
  days: DayRow[];
  onSetWeekday: (dayLocalId: string, weekday: number | null) => void;
  onAddDay: (weekday: number) => void;
  onRemoveDay: (dayLocalId: string) => void;
  subjectLabel?: string;
}) {
  const unassigned = days.filter((d) => !d.weekday);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        <CalendarDays size={12} />
        Planification hebdomadaire
      </p>
      <p className="text-[10.5px] text-[#F5EDED]/30 mb-4 leading-relaxed max-w-2xl">
        Place chaque séance sur un vrai jour de la semaine, en tenant compte de ce que {subjectLabel} fait déjà ce
        jour-là (travail, sommeil, autres créneaux, depuis son agenda). Un jour libre sur le papier peut être un
        mauvais jour dans les faits (rentre tard, dort peu la veille...).
      </p>

      {scheduleBlocks.length === 0 && (
        <p className="text-[10.5px] text-amber-300/70 italic mb-4">
          Ce client n&apos;a pas encore renseigné son agenda (onglet Agenda), le placement ci-dessous se fait à
          l&apos;aveugle pour l&apos;instant.
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: `${WEEKDAYS.length * 172}px` }}>
          {WEEKDAYS.map((wd) => {
            const blocksForDay = scheduleBlocks.filter((b) => b.day_of_week === wd).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const daysForWeekday = days.filter((d) => d.weekday === wd);
            return (
              <div key={wd} className="w-40 flex-shrink-0 bg-[#150000] border border-[#890404]/20 rounded-lg p-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#E01E1E] mb-2">
                  {DAY_LABELS[wd]}
                </p>

                {/* Agenda réel du client ce jour-là */}
                <div className="space-y-1 mb-2.5 min-h-[1px]">
                  {blocksForDay.map((b) => (
                    <div
                      key={b.id}
                      className="text-[9px] leading-tight px-1.5 py-1 rounded"
                      style={{ backgroundColor: `${b.color}18`, color: b.color, border: `1px solid ${b.color}40` }}
                    >
                      <span className="font-bold">{timeShort(b.start_time)}-{timeShort(b.end_time)}</span> {b.label}
                    </div>
                  ))}
                </div>

                {/* Séances du programme déjà placées ici */}
                <div className="space-y-1.5 mb-2">
                  {daysForWeekday.map((d) => (
                    <div
                      key={d.localId}
                      className="flex items-center justify-between gap-1 bg-[#E01E1E]/10 border border-[#E01E1E]/30 rounded px-1.5 py-1"
                    >
                      <span className="text-[10px] font-bold text-white truncate">{d.day_label || "Séance"}</span>
                      <button
                        type="button"
                        onClick={() => onSetWeekday(d.localId, null)}
                        title="Détacher de ce jour" aria-label="Détacher de ce jour"
                        className="text-[#F5EDED]/30 hover:text-red-400 flex-shrink-0"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onAddDay(wd)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 border border-dashed border-[#890404]/25 hover:border-[#890404]/45 rounded transition-colors"
                >
                  <Plus size={10} />
                  Séance
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#890404]/15">
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-300/80 mb-2">
            Séances pas encore placées sur un jour précis
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((d) => (
              <div key={d.localId} className="flex items-center gap-1.5 bg-[#150000] border border-amber-500/25 rounded-lg px-2 py-1.5">
                <span className="text-[10px] font-bold text-white">{d.day_label || "Séance"}</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && onSetWeekday(d.localId, parseInt(e.target.value, 10))}
                  aria-label={`Placer ${d.day_label || "la séance"}`}
                  className="bg-[#1f0101] border border-[#890404]/30 rounded px-1 py-0.5 text-[9px] text-[#F5EDED]/70 focus:outline-none"
                >
                  <option value="">Placer…</option>
                  {WEEKDAYS.map((wd) => (
                    <option key={wd} value={wd}>{DAY_LABELS[wd]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveDay(d.localId)}
                  title="Supprimer cette séance" aria-label="Supprimer cette séance"
                  className="text-[#F5EDED]/25 hover:text-red-400"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
