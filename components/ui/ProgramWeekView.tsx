"use client";

// Page « Mon programme » (client et coach pour lui-même), refaite le
// 2026-10-20 sur retour direct du fondateur : « je suis censé voir ma prog
// et que ce soit mieux fait : qu'on voie bien le jour, l'heure, les
// accessoires, quelle salle et quels exos, et optimise l'espace, que ce ne
// soit pas long pour rien ».
//
// - En tête : la semaine en un coup d'œil (7 jours, séance + heure, faites
//   cochées), la salle choisie.
// - La séance du jour (ou la prochaine) en avant, dépliée : créneau, salle,
//   durée estimée, matériel, sac, exercices, bouton démarrer.
// - Les autres séances repliées en une ligne (jour, heure, nombre d'exos,
//   durée, matériel), dépliées au tap.
//
// Remplace ProgramDaysGrid (cartes de 260 px en défilement horizontal, sans
// jour ni heure ni salle).

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Backpack,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  ExternalLink,
  Info,
  Link2,
  MapPin,
  Play,
  RotateCw,
  Timer,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { ProgramDay, ProgramWithDays } from "@/utils/programs";
import type { ProgramWeekContext } from "@/utils/program-week";
import {
  WEEKDAY_LETTER,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  addDaysIso,
  equipmentForDay,
  equipmentKey,
  estimateMinutes,
  isoWeekday,
  shortHour,
} from "@/lib/program-week";
import { accessoriesForSession, ALWAYS_ACCESSORIES } from "@/lib/session-accessories";
import { computeMesocycleStatus } from "@/lib/mesocycle";
import { formatRest, techniqueHint, techniqueLabel, unitShort } from "@/lib/program-sheet";
import { toBlocks } from "@/components/program-builder/ProgramExerciseList";
import { withAlpha } from "@/lib/theme-color";
import { safeExternalUrl } from "@/lib/sanitize";
import { useStartSession } from "@/hooks/useStartSession";

function norm(v: string): string {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function dayNumber(iso: string): number {
  return parseInt(iso.slice(8, 10), 10);
}

// ── Liste d'exercices compacte ───────────────────────────────────────────────

function ExerciseRows({
  day,
  equipmentByName,
}: {
  day: ProgramDay;
  equipmentByName: Record<string, string | null>;
}) {
  const t = useT();
  const [hintFor, setHintFor] = useState<string | null>(null);
  const blocks = toBlocks(day.exercises);

  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((b, bi) => (
        <div
          key={bi}
          className={b.label ? "rounded-xl border-l-[3px] pl-2 pr-1 py-1" : ""}
          style={b.color ? { borderColor: b.color, background: withAlpha(b.color, "0f") } : undefined}
        >
          {b.label && (
            <p className="flex items-center gap-1 pt-0.5 text-[9.5px] font-black uppercase tracking-widest" style={{ color: b.color ?? undefined }}>
              <Link2 size={11} /> {t(b.label)}
              <span className="normal-case tracking-normal font-bold text-(--ep-ink)/50">· {t("enchaîne sans repos")}</span>
            </p>
          )}
          <ul>
            {b.items.map(({ ex, tag }, ii) => {
              const n = day.exercises.indexOf(ex) + 1;
              const tech = techniqueLabel(ex.technique);
              const equipment = equipmentByName[equipmentKey(ex.name)];
              const unit = unitShort(ex.reps_unit);
              const target =
                ex.sets && ex.reps ? `${ex.sets} × ${ex.reps} ${unit}` : ex.sets ? `${ex.sets} ${t("séries")}` : ex.reps ? `${ex.reps} ${unit}` : null;
              // Dans un superset, le repos ne compte qu'après le dernier.
              const restShown = !b.label || ii === b.items.length - 1 ? formatRest(ex.rest_seconds) : null;
              return (
                <li key={ex.id} className="flex gap-2.5 py-1.5">
                  <span
                    className="mt-px w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums"
                    style={
                      tag
                        ? { background: withAlpha(b.color, "26"), color: b.color ?? undefined }
                        : { background: "rgba(var(--ep-line-rgb),0.14)", color: "rgba(var(--ep-ink-rgb),0.6)" }
                    }
                  >
                    {tag ?? n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-snug text-(--ep-strong) break-words">{ex.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] leading-4 text-(--ep-ink)/60">
                      <span className="font-black text-(--ep-ink)/90 tabular-nums">{target ?? t("à définir avec ton coach")}</span>
                      {ex.rir != null && <span className="tabular-nums">RIR {ex.rir}</span>}
                      {restShown && (
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          <Timer size={10} aria-hidden /> {restShown}
                        </span>
                      )}
                      {ex.tempo && <span className="tabular-nums">{t("tempo")} {ex.tempo}</span>}
                      {equipment && equipment !== "Autre" && <span className="text-(--ep-ink)/45">{equipment}</span>}
                      {tech && (
                        <button
                          type="button"
                          onClick={() => setHintFor(hintFor === ex.id ? null : ex.id)}
                          aria-expanded={hintFor === ex.id}
                          className="-my-3 min-h-11 inline-flex items-center"
                        >
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-(--ep-gold)/15 text-(--ep-gold)">
                            {t(tech)} <Info size={10} />
                          </span>
                        </button>
                      )}
                    </p>
                    {tech && hintFor === ex.id && (
                      <p className="mt-1 text-[11.5px] leading-relaxed text-(--ep-ink)/70">{t(techniqueHint(ex.technique) ?? "")}</p>
                    )}
                    {ex.notes && <p className="mt-0.5 text-[11px] italic leading-snug text-(--ep-ink)/45">{ex.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Bouton démarrer ──────────────────────────────────────────────────────────

function StartButton({
  day,
  programId,
  sessionBasePath,
  resume,
  done,
  large,
}: {
  day: ProgramDay;
  programId: string;
  sessionBasePath: string;
  resume: boolean;
  done: boolean;
  large: boolean;
}) {
  const t = useT();
  const { start, loading, error } = useStartSession(sessionBasePath);
  const secondary = done && !resume;
  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() =>
          start({
            dayLabel: day.day_label,
            programId,
            muscleGroups: [...new Set(day.exercises.map((ex) => ex.muscle_group).filter(Boolean) as string[])],
          })
        }
        className={`w-full flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
          large ? "min-h-12 text-[13px]" : "min-h-11 text-[11.5px]"
        } ${
          secondary
            ? "border border-(--ep-line)/35 bg-(--ep-s1) text-(--ep-ink)/80"
            : "bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) shadow-[0_0_18px_rgba(var(--ep-accent-rgb),0.22)]"
        }`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : secondary ? (
          <RotateCw size={14} />
        ) : (
          <Play size={14} fill="currentColor" />
        )}
        {loading ? t("Ouverture…") : resume ? t("Reprendre la séance") : secondary ? t("Refaire cette séance") : t("Démarrer la séance")}
      </button>
      {error && <p className="mt-1.5 text-xs text-(--ep-bad)">{t(error)}</p>}
    </div>
  );
}

// ── Une séance ───────────────────────────────────────────────────────────────

type DayInfo = {
  day: ProgramDay;
  minutes: number | null;
  equipment: string[];
  done: boolean;
  resume: boolean;
};

function DayDetails({
  info,
  program,
  ctx,
  sessionBasePath,
  gymsHref,
  agendaHref,
  featured,
}: {
  info: DayInfo;
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  agendaHref: string;
  featured: boolean;
}) {
  const t = useT();
  const { day, minutes, equipment, done, resume } = info;
  const slot = ctx.slots[day.id] ?? null;
  const bag = accessoriesForSession(day.exercises.map((e) => e.name), ctx.accessoriesByName).filter(
    (a) => !ALWAYS_ACCESSORIES.some((al) => al.accessory === a.accessory)
  );
  const gymUrl = ctx.gym?.link ? safeExternalUrl(ctx.gym.link) : null;

  const chip = "inline-flex items-center gap-1 rounded-lg px-2.5 min-h-9 text-[11.5px] font-bold border";
  const chipMuted = `${chip} border-(--ep-line)/25 bg-(--ep-s2) text-(--ep-ink)/75`;

  return (
    <div className="space-y-2.5">
      {/* Quand, où, combien de temps */}
      <div className="flex flex-wrap gap-1.5">
        {day.weekday ? (
          slot ? (
            <span className={chipMuted}>
              <Clock size={12} className="text-(--ep-accent)" />
              {t(WEEKDAY_LONG[day.weekday])} {slot.start}
              {slot.end ? `–${slot.end}` : ""}
              {minutes != null && <span className="font-semibold text-(--ep-ink)/50">· ~{minutes} min</span>}
            </span>
          ) : (
            <Link href={agendaHref} className={`${chip} border-dashed border-(--ep-line)/40 text-(--ep-ink)/60`}>
              <CalendarPlus size={12} />
              {t(WEEKDAY_LONG[day.weekday])} · {t("ajouter l'heure")}
            </Link>
          )
        ) : (
          <Link href={agendaHref} className={`${chip} border-dashed border-(--ep-line)/40 text-(--ep-ink)/60`}>
            <CalendarPlus size={12} />
            {t("Jour libre · le caler dans l'agenda")}
          </Link>
        )}
        {/* La salle est déjà dans l'en-tête : rappelée seulement sur la
            séance mise en avant, celle qu'on va faire. */}
        {!featured ? null : ctx.gym ? (
          gymUrl ? (
            <a href={gymUrl} target="_blank" rel="noopener noreferrer" className={chipMuted}>
              <MapPin size={12} className="text-(--ep-accent)" />
              <span className="max-w-[180px] truncate">{ctx.gym.name}</span>
            </a>
          ) : (
            <span className={chipMuted}>
              <MapPin size={12} className="text-(--ep-accent)" />
              <span className="max-w-[180px] truncate">{ctx.gym.name}</span>
            </span>
          )
        ) : (
          <Link href={gymsHref} className={`${chip} border-dashed border-(--ep-line)/40 text-(--ep-ink)/60`}>
            <MapPin size={12} />
            {t("Choisir ma salle")}
          </Link>
        )}
        {minutes != null && !(day.weekday && slot) && (
          <span className={chipMuted}>
            <Timer size={12} className="text-(--ep-accent)" />~{minutes} min
          </span>
        )}
      </div>

      {/* Matériel et sac */}
      {(equipment.length > 0 || bag.length > 0) && (
        <div className="rounded-xl border border-(--ep-line)/20 bg-(--ep-s2)/60 px-3 py-2 space-y-1.5">
          {equipment.length > 0 && (
            <p className="flex items-start gap-2 text-[12px] leading-snug">
              <Dumbbell size={13} className="mt-0.5 shrink-0 text-(--ep-ink)/45" />
              <span className="min-w-0">
                <span className="font-black uppercase tracking-wider text-[9.5px] text-(--ep-ink)/45 mr-1.5">{t("Matériel")}</span>
                <span className="font-bold text-(--ep-ink)/85">{equipment.join(" · ")}</span>
              </span>
            </p>
          )}
          {bag.length > 0 && (
            <p className="flex items-start gap-2 text-[12px] leading-snug">
              <Backpack size={13} className="mt-0.5 shrink-0 text-(--ep-ink)/45" />
              <span className="min-w-0">
                <span className="font-black uppercase tracking-wider text-[9.5px] text-(--ep-ink)/45 mr-1.5">{t("Dans le sac")}</span>
                {bag.map((a, i) => (
                  <span key={a.accessory}>
                    {i > 0 && <span className="text-(--ep-ink)/35"> · </span>}
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-block py-1.5 -my-1.5 font-bold text-(--ep-ink)/85 underline decoration-(--ep-line)/50 underline-offset-2">
                        {a.accessory}
                        <ExternalLink size={9} className="inline ml-0.5 -mt-0.5 text-(--ep-ink)/35" />
                      </a>
                    ) : (
                      <span className="font-bold text-(--ep-ink)/85">{a.accessory}</span>
                    )}
                  </span>
                ))}
              </span>
            </p>
          )}
        </div>
      )}

      {day.notes && (
        <p className="text-[11.5px] leading-relaxed text-(--ep-ink)/75 bg-(--ep-accent)/[0.07] border border-(--ep-accent)/20 rounded-lg px-3 py-2">
          {day.notes}
        </p>
      )}

      {day.exercises.length === 0 ? (
        <p className="text-[12px] italic text-(--ep-ink)/40">{t("Aucun exercice")}</p>
      ) : (
        <ExerciseRows day={day} equipmentByName={ctx.equipmentByName} />
      )}

      {day.exercises.length > 0 && (
        <StartButton day={day} programId={program.id} sessionBasePath={sessionBasePath} resume={resume} done={done} large={featured} />
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramWeekView({
  program,
  ctx,
  sessionBasePath,
  gymsHref,
  agendaHref,
  eyebrow,
}: {
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  agendaHref: string;
  eyebrow: string;
}) {
  const t = useT();
  const todayDow = isoWeekday(ctx.today);
  const [openId, setOpenId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const infos: DayInfo[] = useMemo(() => {
    const doneLabels = new Set(ctx.doneThisWeek.map((r) => norm(r.day_label)));
    return program.days.map((day) => ({
      day,
      minutes: estimateMinutes(day.exercises),
      equipment: equipmentForDay(day.exercises, ctx.equipmentByName),
      done: doneLabels.has(norm(day.day_label)),
      resume: ctx.openSessionLabel != null && norm(ctx.openSessionLabel) === norm(day.day_label),
    }));
  }, [program.days, ctx]);

  // Ordre de la semaine : jours placés d'abord (lundi → dimanche), puis les
  // séances sans jour fixe dans l'ordre du programme.
  const ordered = useMemo(
    () => [...infos].sort((a, b) => (a.day.weekday ?? 99) - (b.day.weekday ?? 99) || a.day.position - b.day.position),
    [infos]
  );

  // Séance mise en avant : celle d'aujourd'hui, sinon la prochaine pas
  // encore faite cette semaine, sinon la première pas faite.
  const featured = useMemo(() => {
    const resume = infos.find((i) => i.resume);
    if (resume) return { info: resume, kind: "today" as const };
    const today = infos.find((i) => i.day.weekday === todayDow);
    if (today) return { info: today, kind: "today" as const };
    const next = ordered.find((i) => i.day.weekday && i.day.weekday > todayDow && !i.done);
    if (next) return { info: next, kind: "next" as const };
    const undone = ordered.find((i) => !i.done);
    return undone ? { info: undone, kind: "free" as const } : null;
  }, [infos, ordered, todayDow]);

  const meso = program.mesocycle_start_date && program.mesocycle_weeks
    ? computeMesocycleStatus(program.mesocycle_start_date, program.mesocycle_weeks)
    : null;
  const doneCount = infos.filter((i) => i.done).length;
  const gymUrl = ctx.gym?.link ? safeExternalUrl(ctx.gym.link) : null;

  function jumpTo(dayId: string) {
    if (featured?.info.day.id === dayId) {
      cardRefs.current[dayId]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setOpenId(dayId);
    requestAnimationFrame(() => cardRefs.current[dayId]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const others = ordered.filter((i) => i.day.id !== featured?.info.day.id);
  const unplaced = infos.filter((i) => !i.day.weekday).length;

  return (
    <div>
      {/* En-tête serré : nom du programme, fréquence, bloc, salle */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/40 mb-0.5">{eyebrow}</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-(--ep-strong) leading-tight">{t("Mon programme")}</h1>
        <p className="mt-1 text-[12px] text-(--ep-ink)/55 leading-snug">
          <span className="font-bold text-(--ep-ink)/80">{program.name}</span>
          {` · ${program.days.length} ${program.days.length > 1 ? t("séances") : t("séance")}/${t("sem.")}`}
          {meso && (
            <span style={{ color: meso.isDeloadWeek || meso.isOverdue ? "var(--ep-warn)" : undefined }}>
              {" · "}
              {meso.isOverdue
                ? t("bloc terminé")
                : `${t("bloc")} ${t("sem.")} ${meso.currentWeek}/${meso.totalWeeks}${meso.isDeloadWeek ? ` · ${t("décharge")}` : ""}`}
            </span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <MapPin size={13} className="shrink-0 text-(--ep-accent)" />
          {ctx.gym ? (
            <>
              {gymUrl ? (
                <a href={gymUrl} target="_blank" rel="noopener noreferrer" className="-my-2 min-h-11 min-w-0 inline-flex items-center font-bold text-(--ep-ink)/85">
                  <span className="truncate">
                  {ctx.gym.name}</span>
                </a>
              ) : (
                <span className="min-w-0 truncate font-bold text-(--ep-ink)/85">{ctx.gym.name}</span>
              )}
              <Link href={gymsHref} className="shrink-0 -my-2 min-h-11 inline-flex items-center px-1 font-bold text-(--ep-accent)">
                {t("Changer")}
              </Link>
            </>
          ) : (
            <Link href={gymsHref} className="-my-2 min-h-11 inline-flex items-center font-bold text-(--ep-accent)">
              {t("Choisir ma salle")} →
            </Link>
          )}
        </div>
      </div>

      {/* La semaine en un coup d'œil */}
      <div className="ep-card mb-3" style={{ padding: "10px 8px" }}>
        <div className="flex items-baseline justify-between px-1 mb-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Cette semaine")}</p>
          <p className="text-[11px] font-bold text-(--ep-ink)/55 tabular-nums">
            {doneCount}/{program.days.length} {t("faites")}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
            const date = addDaysIso(ctx.weekStart, wd - 1);
            const on = ordered.filter((i) => i.day.weekday === wd);
            const first = on[0];
            const slot = first ? ctx.slots[first.day.id] : null;
            const isToday = wd === todayDow;
            const isPast = wd < todayDow;
            const content = (
              <>
                <span className={`text-[10px] font-black ${isToday ? "text-(--ep-accent)" : "text-(--ep-ink)/45"}`}>
                  {t(WEEKDAY_LETTER[wd])}
                </span>
                <span className={`text-[13px] font-black tabular-nums leading-4 ${isToday ? "text-(--ep-strong)" : "text-(--ep-ink)/70"}`}>
                  {dayNumber(date)}
                </span>
                {first ? (
                  <>
                    <span
                      className="mt-1 w-full truncate rounded px-0.5 py-0.5 text-center text-[9px] font-black leading-3"
                      style={{
                        background: first.done ? "rgba(var(--ep-ok-rgb),0.16)" : "rgba(var(--ep-accent-rgb),0.14)",
                        color: first.done ? "var(--ep-ok)" : "var(--ep-accent)",
                      }}
                    >
                      {first.done ? <Check size={10} strokeWidth={3} className="inline -mt-px" /> : null}
                      {first.done ? "" : first.day.day_label}
                    </span>
                    <span className="mt-0.5 text-[9.5px] font-bold tabular-nums leading-3 text-(--ep-ink)/50">
                      {slot ? shortHour(slot.start) : on.length > 1 ? `+${on.length - 1}` : " "}
                    </span>
                  </>
                ) : (
                  <span className={`mt-1 text-[9px] leading-3 ${isPast ? "text-(--ep-ink)/25" : "text-(--ep-ink)/35"}`}>{t("repos")}</span>
                )}
              </>
            );
            const cls = `min-h-[64px] min-w-0 rounded-lg flex flex-col items-center justify-start pt-1.5 pb-1 px-0.5 ${
              isToday ? "bg-(--ep-accent)/10 ring-1 ring-(--ep-accent)/45" : ""
            }`;
            return first ? (
              <button
                key={wd}
                type="button"
                onClick={() => jumpTo(first.day.id)}
                className={cls}
                aria-label={`${t(WEEKDAY_LONG[wd])} : ${first.day.day_label}${slot ? ` ${slot.start}` : ""}${first.done ? `, ${t("faite")}` : ""}`}
              >
                {content}
              </button>
            ) : (
              <div key={wd} className={cls}>
                {content}
              </div>
            );
          })}
        </div>
        {unplaced > 0 && (
          <p className="mt-1.5 px-1 text-[11px] text-(--ep-ink)/50">
            + {unplaced} {unplaced > 1 ? t("séances sans jour fixe") : t("séance sans jour fixe")}
          </p>
        )}
      </div>

      {/* La séance du jour (ou la prochaine), dépliée */}
      {featured && (
        <div
          ref={(el) => {
            cardRefs.current[featured.info.day.id] = el;
          }}
          className="scroll-mt-16 rounded-2xl border border-(--ep-accent)/40 bg-(--ep-s1) p-3 mb-3 shadow-[0_0_24px_rgba(var(--ep-accent-rgb),0.08)]"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">
            {featured.kind === "today"
              ? `${t("Aujourd'hui")} · ${t(WEEKDAY_LONG[todayDow])}`
              : featured.kind === "next" && featured.info.day.weekday
                ? `${t("Prochaine séance")} · ${t(WEEKDAY_LONG[featured.info.day.weekday])}`
                : t("Prochaine séance")}
            {featured.info.done && <span className="text-(--ep-ok)"> · {t("faite")} ✓</span>}
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-0.5 mb-2.5">
            <h2 className="text-lg font-black uppercase tracking-tight text-(--ep-strong) leading-tight break-words min-w-0">
              {featured.info.day.day_label}
            </h2>
            <span className="shrink-0 text-[11px] font-bold text-(--ep-ink)/50 tabular-nums">
              {featured.info.day.exercises.length} {featured.info.day.exercises.length > 1 ? t("exos") : t("exo")}
            </span>
          </div>
          <DayDetails
            info={featured.info}
            program={program}
            ctx={ctx}
            sessionBasePath={sessionBasePath}
            gymsHref={gymsHref}
            agendaHref={agendaHref}
            featured
          />
        </div>
      )}

      {/* Le reste de la semaine, une ligne par séance */}
      {others.length > 0 && (
        <>
          <p className="px-1 mb-1.5 text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/45">
            {featured ? t("Les autres séances") : t("Mes séances")}
          </p>
          <div className="space-y-1.5">
            {others.map((info) => {
              const { day } = info;
              const isOpen = openId === day.id;
              const slot = ctx.slots[day.id] ?? null;
              const meta = [
                `${day.exercises.length} ${day.exercises.length > 1 ? t("exos") : t("exo")}`,
                info.minutes != null ? `~${info.minutes} min` : null,
                info.equipment.slice(0, 3).join(", ") || null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={day.id}
                  ref={(el) => {
                    cardRefs.current[day.id] = el;
                  }}
                  className={`scroll-mt-16 rounded-2xl border bg-(--ep-s1) ${isOpen ? "border-(--ep-accent)/35" : "border-(--ep-line)/20"}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : day.id)}
                    aria-expanded={isOpen}
                    className="w-full min-h-14 flex items-center gap-3 px-3 py-2 text-left"
                  >
                    <span
                      className="w-11 shrink-0 flex flex-col items-center justify-center rounded-lg py-1"
                      style={{
                        background: day.weekday === todayDow ? "rgba(var(--ep-accent-rgb),0.12)" : "rgba(var(--ep-line-rgb),0.1)",
                      }}
                    >
                      <span className="text-[10px] font-black uppercase leading-3 text-(--ep-ink)/70">
                        {day.weekday ? t(WEEKDAY_SHORT[day.weekday]) : t("Libre")}
                      </span>
                      <span className="mt-0.5 text-[10.5px] font-black tabular-nums leading-3 text-(--ep-accent)">
                        {slot ? shortHour(slot.start) : "–"}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[14px] font-black text-(--ep-strong) leading-tight break-words min-w-0">{day.day_label}</span>
                        {info.done && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-black uppercase bg-(--ep-ok)/15 text-(--ep-ok)">
                            <Check size={9} strokeWidth={3} /> {t("faite")}
                          </span>
                        )}
                        {info.resume && (
                          <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase bg-(--ep-warn)/15 text-(--ep-warn)">
                            {t("en cours")}
                          </span>
                        )}
                      </span>
                      <span className="block mt-0.5 text-[11.5px] leading-4 text-(--ep-ink)/55 line-clamp-2">{meta}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-(--ep-ink)/40 transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <DayDetails
                        info={info}
                        program={program}
                        ctx={ctx}
                        sessionBasePath={sessionBasePath}
                        gymsHref={gymsHref}
                        agendaHref={agendaHref}
                        featured={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
