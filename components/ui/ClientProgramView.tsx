"use client";

import { useT } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import type { ProgramWithDays } from "@/utils/programs";
import type { WorkoutLog } from "@/utils/workout-logs";
import { accessoriesForSession, ALWAYS_ACCESSORIES } from "@/lib/session-accessories";
import { estimateMinutes } from "@/lib/program-week";
import { formatRest, unitShort } from "@/lib/program-sheet";
import { Pencil, Plus, Backpack, MapPin } from "lucide-react";

export default function ClientProgramView({
  clientId,
  program,
  accessoriesByName,
  gyms = [],
}: {
  clientId: string;
  program: ProgramWithDays | null;
  /** Conservés pour compatibilité des appelants : le volume se lit dans l'éditeur, plus dans cette vue condensée. */
  workoutLogs?: WorkoutLog[];
  sessionsThisWeek?: number;
  /** Bagage d'accessoires choisi par exercice (exercise_library.accessories). */
  accessoriesByName?: Record<string, string[]>;
  /** Salles d'entraînement du client : la salle de chaque séance vient de program_days.gym_id. */
  gyms?: { id: string; name: string; city: string | null }[];
}) {
  const t = useT();

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0">
          {program?.objective && (
            <p className="text-xs text-(--ep-ink)/45">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/30 mr-2">
                {t("Objectif de phase")}
              </span>
              {program.objective}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/coach/clients/${clientId}/program/edit`}
          className="inline-flex items-center gap-2 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 ml-auto"
        >
          {program ? (
            <>
              <Pencil size={13} />
              {t("Concevoir / modifier")}
            </>
          ) : (
            <>
              <Plus size={13} />
              {t("Concevoir le programme")}
            </>
          )}
        </Link>
      </div>

      {/* Retour direct 2026-09-09 : "dans programme je veux les séances en
          haut et le reste en bas" — séances réelles d'abord, stats volume/
          intensité après. */}
      {!program || program.days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-(--ep-ink)/40 uppercase tracking-widest">
            {t("Aucun programme actif")}
          </p>
          <p className="text-xs text-(--ep-ink)/25 mt-1">
            {t("Crée le premier programme d'entraînement pour ce client.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {program.days.map((day) => {
            const accessories = accessoriesForSession(day.exercises.map((ex) => ex.name), accessoriesByName).filter(
              (a) => !ALWAYS_ACCESSORIES.some((al) => al.accessory === a.accessory)
            );
            const gym = day.gym_id ? gyms.find((g) => g.id === day.gym_id) ?? null : null;
            const minutes = estimateMinutes(day.exercises);
            return (
              <section key={day.id} className="bg-(--ep-s1) border border-(--ep-line)/40 rounded-xl p-3.5" aria-label={day.day_label}>
                <h3 className="text-sm font-black uppercase tracking-wide text-(--ep-accent)">{day.day_label}</h3>
                <p className="mt-0.5 text-[11.5px] text-(--ep-ink)/60 tabular-nums">
                  {minutes != null ? `~${minutes} min · ` : ""}
                  {day.exercises.length} {day.exercises.length > 1 ? t("exos") : t("exo")}
                </p>
                {gym && (
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-(--ep-ink)/85">
                    <MapPin size={12} className="text-(--ep-accent)" aria-hidden /> {gym.name}
                  </p>
                )}
                {accessories.length > 0 && (
                  <p className="mt-1 flex items-start gap-1.5 text-[12px] text-(--ep-ink)/80">
                    <Backpack size={12} className="mt-0.5 shrink-0 text-(--ep-ink)/45" aria-hidden />
                    <span className="font-bold">{accessories.map((a) => t(a.accessory)).join(" · ")}</span>
                  </p>
                )}
                {day.exercises.length === 0 ? (
                  <p className="mt-2 text-xs text-(--ep-ink)/25 italic">{t("Aucun exercice")}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-(--ep-line)/10">
                    {day.exercises.map((ex) => (
                      <li key={ex.id} className="flex items-baseline gap-2 py-1.5">
                        <span className="min-w-0 flex-1 text-[12.5px] font-bold text-(--ep-strong) break-words">{ex.name}</span>
                        <span className="shrink-0 text-[11.5px] tabular-nums text-(--ep-ink)/80">
                          <span className="font-black">{ex.sets && ex.reps ? `${ex.sets} × ${ex.reps} ${unitShort(ex.reps_unit)}` : ex.sets ? `${ex.sets} ${t("séries")}` : ex.reps ?? ""}</span>
                          {formatRest(ex.rest_seconds) && <span className="ml-1.5 text-(--ep-ink)/50">{formatRest(ex.rest_seconds)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
