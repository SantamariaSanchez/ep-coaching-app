"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProgramWithDays } from "@/utils/programs";
import type { WorkoutLog } from "@/utils/workout-logs";
import VolumeIntensitySection from "./VolumeIntensitySection";
import { accessoriesForSession } from "@/lib/session-accessories";
import { Pencil, Plus, Backpack, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function ClientProgramView({
  clientId,
  program,
  workoutLogs,
  sessionsThisWeek,
  accessoriesByName,
}: {
  clientId: string;
  program: ProgramWithDays | null;
  workoutLogs: WorkoutLog[];
  sessionsThisWeek: number;
  /** Bagage d'accessoires choisi par exercice (exercise_library.accessories). */
  accessoriesByName?: Record<string, string[]>;
}) {
  // Jours repliés par défaut (retour direct 2026-09-09 : "fermer pas
  // dérouler direct") : le label + les accessoires à prévoir suffisent
  // pour un coup d'oeil, la liste complète des exercices s'ouvre au clic.
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0">
          {program?.objective && (
            <p className="text-xs text-[#F5EDED]/45">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 mr-2">
                Objectif de phase
              </span>
              {program.objective}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/coach/clients/${clientId}/program/edit`}
          className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 ml-auto"
        >
          {program ? (
            <>
              <Pencil size={13} />
              Concevoir / modifier
            </>
          ) : (
            <>
              <Plus size={13} />
              Concevoir le programme
            </>
          )}
        </Link>
      </div>

      {/* Retour direct 2026-09-09 : "dans programme je veux les séances en
          haut et le reste en bas" — séances réelles d'abord, stats volume/
          intensité après. */}
      {!program || program.days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-[#F5EDED]/40 uppercase tracking-widest">
            Aucun programme actif
          </p>
          <p className="text-xs text-[#F5EDED]/25 mt-1">
            Crée le premier programme d&apos;entraînement pour ce client.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className="flex gap-4"
            style={{ minWidth: `${program.days.length * 280}px` }}
          >
            {program.days.map((day) => {
              const accessories = accessoriesForSession(day.exercises.map((ex) => ex.name), accessoriesByName);
              const isOpen = !!openDays[day.id];
              return (
              <div
                key={day.id}
                className="flex-1 min-w-[260px] bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4"
              >
                <button
                  type="button"
                  onClick={() => setOpenDays((prev) => ({ ...prev, [day.id]: !prev[day.id] }))}
                  aria-expanded={isOpen}
                  className={`flex items-center justify-between w-full text-left ${isOpen ? "mb-4 pb-2 border-b border-[#890404]/20" : ""}`}
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[#E01E1E]">
                    {day.day_label}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[#F5EDED]/30 font-semibold">
                      {day.exercises.length} exercice{day.exercises.length > 1 ? "s" : ""}
                    </span>
                    {isOpen ? <ChevronUp size={14} className="text-[#F5EDED]/30" /> : <ChevronDown size={14} className="text-[#F5EDED]/30" />}
                  </span>
                </button>

                {isOpen && (
                <>
                {accessories.length > 0 && (
                  <div className="bg-black/30 border border-[#890404]/20 rounded-lg px-3 py-2.5 mb-3">
                    <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                      <Backpack size={11} /> À prévoir
                    </p>
                    <div className="flex flex-col gap-1">
                      {accessories.map((a) =>
                        // ALWAYS_ACCESSORIES (trépied, shaker) n'ont pas de
                        // fiche produit, voir lib/session-accessories.ts.
                        a.url ? (
                          <a
                            key={a.accessory}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11.5px] font-bold text-white hover:text-[#E01E1E] transition-colors"
                          >
                            {a.accessory}
                            <ExternalLink size={9} className="text-[#F5EDED]/30" />
                          </a>
                        ) : (
                          <span key={a.accessory} className="flex items-center gap-1 text-[11.5px] font-bold text-white">
                            {a.accessory}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {day.exercises.length === 0 ? (
                  <p className="text-xs text-[#F5EDED]/25 italic">
                    Aucun exercice
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5"
                      >
                        <p className="text-sm font-semibold text-white leading-tight">
                          {ex.name}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {ex.sets != null && ex.reps && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              {ex.sets} × {ex.reps}
                            </span>
                          )}
                          {ex.rir !== null && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              RIR {ex.rir}
                            </span>
                          )}
                          {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                            <span className="text-[10px] text-[#F5EDED]/50">
                              {ex.rest_seconds >= 60
                                ? `${Math.floor(ex.rest_seconds / 60)}min`
                                : `${ex.rest_seconds}s`}{" "}
                              repos
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-[10px] text-[#F5EDED]/35 mt-1 italic">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {program && program.days.length > 0 && (
        <div className="mt-6">
          <VolumeIntensitySection program={program} workoutLogs={workoutLogs} sessionsThisWeek={sessionsThisWeek} />
        </div>
      )}
    </div>
  );
}
