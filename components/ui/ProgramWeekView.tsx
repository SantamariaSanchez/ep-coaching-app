"use client";

// Page « Mon programme » (client coaché, membre gratuit, coach pour lui-même
// et aperçu « Voir comme mon client »). Version condensée (retour d'Emmanuel,
// 2026-10-28) : seulement le nécessaire, les jours, la séance (nom), les exos
// (séries × reps, repos), la durée estimée, les accessoires et la salle de la
// séance. Aucune consigne ni note longue ici : elles vivent dans le logbook,
// pendant la séance. Une séance tient sur un écran de téléphone.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Backpack, Check, Clock, Link2, MapPin, Play, RotateCw } from "lucide-react";
import { useLocale, useT } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/lib/i18n";
import type { Exercise, ProgramDay, ProgramWithDays } from "@/utils/programs";
import type { ProgramWeekContext } from "@/utils/program-week";
import {
  WEEKDAY_LETTER,
  WEEKDAY_LONG,
  addDaysIso,
  equipmentForDay,
  estimateMinutes,
  isoWeekday,
  shortHour,
} from "@/lib/program-week";
import { accessoriesForSession, ALWAYS_ACCESSORIES } from "@/lib/session-accessories";
import { formatRest, unitShort } from "@/lib/program-sheet";
import { toBlocks } from "@/components/program-builder/ProgramExerciseList";
import { withAlpha } from "@/lib/theme-color";
import { useStartSession } from "@/hooks/useStartSession";
import MoveSession from "@/components/ui/MoveSession";

function norm(v: string): string {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

type T = ReturnType<typeof useT>;

/** « Aujourd'hui », « Demain », « Dans 3 jours », « Hier »... */
function relativeDay(t: T, today: string, date: string): string {
  const d = daysBetween(today, date);
  if (d === 0) return t("Aujourd'hui");
  if (d === 1) return t("Demain");
  if (d === -1) return t("Hier");
  return d > 0 ? t("Dans {n} jours", { n: d }) : t("Il y a {n} jours", { n: -d });
}

const NBSP = " ";

function ExerciseRow({ ex, index, tag, color, restShown }: { ex: Exercise; index: number; tag: string | null; color: string | null; restShown: string | null }) {
  const t = useT();
  const unit = unitShort(ex.reps_unit);
  const target = ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}${NBSP}${unit}` : ex.sets ? `${ex.sets} ${t("séries")}` : ex.reps ? `${ex.reps} ${unit}` : null;
  return (
    <li className="flex items-baseline gap-2 py-1.5 first:pt-0.5 last:pb-0.5">
      <span
        className="w-5 shrink-0 text-center text-[10px] font-black tabular-nums"
        style={tag ? { color: color ?? undefined } : { color: "rgba(var(--ep-ink-rgb),0.45)" }}
      >
        {tag ?? index}
      </span>
      <span className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-(--ep-strong) break-words">{ex.name}</span>
      <span className="shrink-0 text-right text-[12px] leading-4 tabular-nums">
        <span className="font-black text-(--ep-ink)/90">{target ?? t("à définir")}</span>
        {restShown && <span className="ml-1.5 text-(--ep-ink)/50">{restShown}</span>}
      </span>
    </li>
  );
}

function ExerciseList({ day }: { day: ProgramDay }) {
  const t = useT();
  const blocks = toBlocks(day.exercises);
  return (
    <div className="flex flex-col gap-0.5">
      {blocks.map((b, bi) => (
        <div
          key={bi}
          className={b.label ? "rounded-lg border-l-[3px] pl-2 pr-1.5 pt-1" : ""}
          style={b.color ? { borderColor: b.color, background: withAlpha(b.color, "0d") } : undefined}
        >
          {b.label && (
            <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-widest" style={{ color: b.color ?? undefined }}>
              <Link2 size={11} aria-hidden /> {t(b.label)}
            </p>
          )}
          <ul className={b.label ? "" : "divide-y divide-(--ep-line)/10"}>
            {b.items.map(({ ex, tag }, ii) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                index={day.exercises.indexOf(ex) + 1}
                tag={tag}
                color={b.color}
                // Dans un superset, le repos ne compte qu'après le dernier.
                restShown={!b.label || ii === b.items.length - 1 ? formatRest(ex.rest_seconds) : null}
              />
            ))}
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
}: {
  day: ProgramDay;
  programId: string;
  sessionBasePath: string;
  resume: boolean;
  done: boolean;
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
        className={`w-full min-h-12 flex items-center justify-center gap-2 rounded-xl text-[13px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
          secondary
            ? "border border-(--ep-line)/35 bg-(--ep-s2) text-(--ep-ink)/80"
            : "bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) shadow-[0_0_18px_rgba(var(--ep-accent-rgb),0.25)]"
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

// ── Données par séance ───────────────────────────────────────────────────────

type DayInfo = {
  day: ProgramDay;
  minutes: number | null;
  equipment: string[];
  done: boolean;
  resume: boolean;
  /** Date de la séance cette semaine (null : sans jour fixe). */
  date: string | null;
  missed: boolean;
};

type Featured = { id: string; kind: "today" | "next" | "free" | "nextweek"; date: string | null } | null;

// ── Carte séance (héros) ─────────────────────────────────────────────────────

function SessionCard({
  info,
  featured,
  nextAfter,
  program,
  ctx,
  sessionBasePath,
  gymsHref,
  canMove,
  onSelect,
}: {
  info: DayInfo;
  featured: Featured;
  nextAfter: { info: DayInfo; date: string | null } | null;
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  canMove: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { day, minutes, done, resume, missed } = info;
  const isFeatured = featured?.id === day.id;
  const date = isFeatured && featured?.kind === "nextweek" ? featured.date : info.date;
  const slot = ctx.slots[day.id] ?? null;
  const bag = accessoriesForSession(day.exercises.map((e) => e.name), ctx.accessoriesByName, ctx.equipmentByName).filter(
    (a) => !ALWAYS_ACCESSORIES.some((al) => al.accessory === a.accessory)
  );
  // Salle de la séance : celle rattachée à la séance, sinon la salle de la fiche.
  const dayGym = day.gym_id ? ctx.trainingGyms.find((g) => g.id === day.gym_id) ?? null : null;
  const gymLabel = dayGym ? [dayGym.name, dayGym.city && !dayGym.name.toLowerCase().includes(dayGym.city.toLowerCase()) ? dayGym.city : null].filter(Boolean).join(", ") : ctx.gym?.name ?? null;
  const isToday = date === ctx.today;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  const status = resume
    ? { label: t("En cours"), color: "var(--ep-warn)", rgb: "--ep-warn-rgb" }
    : done
      ? { label: `${t("Faite")} ✓`, color: "var(--ep-ok)", rgb: "--ep-ok-rgb" }
      : missed
        ? { label: t("Manquée"), color: "var(--ep-bad)", rgb: "--ep-bad-rgb" }
        : null;

  const factRow = "flex items-center gap-2 min-h-6 text-[12.5px] leading-snug";

  return (
    <section
      className="scroll-mt-16 rounded-2xl border bg-(--ep-s1) p-3 mb-3"
      style={{
        borderColor: isToday || resume ? "rgba(var(--ep-accent-rgb),0.45)" : "rgba(var(--ep-line-rgb),0.3)",
        boxShadow: isToday || resume ? "0 0 28px rgba(var(--ep-accent-rgb),0.10)" : undefined,
      }}
      aria-label={day.day_label}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-[22px] font-black uppercase tracking-tight leading-[1.05] text-(--ep-strong) break-words">{day.day_label}</h2>
        {status && (
          <span className="mt-1 shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide" style={{ color: status.color, background: `rgba(var(${status.rgb}),0.14)` }}>
            {status.label}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5">
        <p className={factRow}>
          <Clock size={13} className="shrink-0 text-(--ep-accent)" aria-hidden />
          <span className="min-w-0 font-bold text-(--ep-ink)/90">
            {date ? <span className="first-letter:uppercase inline-block">{fmtDate(date)}</span> : t("Jour libre")}
            {slot ? (
              <span className="font-black text-(--ep-strong) tabular-nums">
                {" · "}
                {shortHour(slot.start)}
                {slot.end ? `–${shortHour(slot.end)}` : ""}
              </span>
            ) : null}
            {day.weekMoved && <span className="text-(--ep-warn)"> · {t("décalée cette semaine")}</span>}
            {" · "}
            <span className="tabular-nums">
              {minutes != null ? `~${minutes} min` : ""}
              {minutes != null ? " · " : ""}
              {day.exercises.length} {day.exercises.length > 1 ? t("exos") : t("exo")}
            </span>
          </span>
          {canMove && !done && (
            <span className="ml-auto shrink-0">
              <MoveSession
                dayId={day.id}
                days={program.days.map((d) => ({ id: d.id, label: d.day_label, weekday: d.weekday ?? null }))}
                todayDow={isoWeekday(ctx.today)}
              />
            </span>
          )}
        </p>
        <p className={factRow}>
          <MapPin size={13} className={`shrink-0 ${gymLabel ? "text-(--ep-accent)" : "text-(--ep-ink)/40"}`} aria-hidden />
          {gymLabel ? (
            <span className="min-w-0 truncate font-bold text-(--ep-ink)/90">{gymLabel}</span>
          ) : (
            <>
              <span className="text-(--ep-ink)/55">{t("Pas de salle choisie.")}</span>
              <Link href={gymsHref} className="inline-flex items-center gap-1 -my-2 min-h-11 font-bold text-(--ep-accent)">
                {t("Ajouter ma salle")} →
              </Link>
            </>
          )}
        </p>
        {bag.length > 0 && (
          <p className={`${factRow} items-start`}>
            <Backpack size={13} className="mt-0.5 shrink-0 text-(--ep-ink)/45" aria-hidden />
            <span className="min-w-0 text-(--ep-ink)/85">
              <span className="font-black uppercase tracking-wider text-[9.5px] text-(--ep-ink)/45 mr-1.5">{t("Accessoires")}</span>
              {bag.map((a, i) => (
                <span key={a.accessory}>
                  {i > 0 && <span className="text-(--ep-ink)/35"> · </span>}
                  <span className="font-bold">{t(a.accessory)}</span>
                </span>
              ))}
            </span>
          </p>
        )}
      </div>

      {day.exercises.length > 0 && (
        <div className="mt-2.5">
          <StartButton day={day} programId={program.id} sessionBasePath={sessionBasePath} resume={resume} done={done} />
        </div>
      )}

      {done && !resume && nextAfter && (
        <button
          type="button"
          onClick={() => onSelect(nextAfter.info.day.id)}
          className="mt-1 w-full min-h-11 flex items-center justify-center gap-1.5 text-[12px] text-(--ep-ink)/60"
        >
          {t("Prochaine")} :<span className="font-black text-(--ep-strong)">{nextAfter.info.day.day_label}</span>
          {nextAfter.date && <span>· {relativeDay(t, ctx.today, nextAfter.date).toLowerCase()}</span>}
          <span className="text-(--ep-accent) font-black">→</span>
        </button>
      )}

      <div className="mt-2 border-t border-(--ep-line)/15 pt-2">
        {day.exercises.length === 0 ? <p className="text-[12px] italic text-(--ep-ink)/40">{t("Aucun exercice")}</p> : <ExerciseList day={day} />}
      </div>
    </section>
  );
}

// ── Bande des 7 jours ────────────────────────────────────────────────────────

function WeekStrip({
  ctx,
  ordered,
  selectedId,
  onSelect,
  doneCount,
  total,
}: {
  ctx: ProgramWeekContext;
  ordered: DayInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  doneCount: number;
  total: number;
}) {
  const t = useT();
  const todayDow = isoWeekday(ctx.today);
  const unplaced = ordered.filter((i) => !i.day.weekday);
  return (
    <div className="ep-card mb-3" style={{ padding: "10px 6px 8px" }}>
      <div className="flex items-center justify-between gap-2 px-1.5 mb-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/50">{t("Cette semaine")}</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className="h-1.5 w-3 rounded-full" style={{ background: i < doneCount ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.12)" }} />
            ))}
          </div>
          <p className="text-[11px] font-black text-(--ep-ink)/70 tabular-nums">
            {doneCount}/{total}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
          const date = addDaysIso(ctx.weekStart, wd - 1);
          const on = ordered.filter((i) => i.day.weekday === wd);
          const first = on[0];
          const slot = first ? ctx.slots[first.day.id] : null;
          const isToday = wd === todayDow;
          const selected = !!first && on.some((i) => i.day.id === selectedId);
          const tone = !first
            ? "rgba(var(--ep-ink-rgb),0.3)"
            : first.resume
              ? "var(--ep-warn)"
              : first.done
                ? "var(--ep-ok)"
                : first.missed
                  ? "rgba(var(--ep-ink-rgb),0.4)"
                  : "var(--ep-strong)";
          const content = (
            <>
              <span className={`text-[9.5px] font-black ${isToday ? "text-(--ep-accent)" : "text-(--ep-ink)/45"}`}>{t(WEEKDAY_LETTER[wd])}</span>
              <span
                className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[12.5px] font-black tabular-nums ${
                  isToday ? "bg-(--ep-accent) text-(--ep-strong)" : "text-(--ep-ink)/75"
                }`}
              >
                {parseInt(date.slice(8, 10), 10)}
              </span>
              {first ? (
                <>
                  <span
                    className="mt-1 w-full px-px text-center text-[9px] font-black leading-[11px] tracking-[-0.02em] break-words line-clamp-2"
                    style={{ color: tone, textDecoration: first.missed ? "line-through" : undefined }}
                  >
                    {first.day.day_label}
                  </span>
                  <span className="mt-auto pt-0.5 h-4 flex items-center justify-center text-[9.5px] font-bold tabular-nums leading-3">
                    {first.resume ? (
                      <span className="w-2 h-2 rounded-full bg-(--ep-warn) animate-pulse" aria-hidden />
                    ) : first.done ? (
                      <Check size={13} strokeWidth={3.25} className="text-(--ep-ok)" aria-hidden />
                    ) : first.missed ? (
                      <span className="text-(--ep-ink)/35">{t("manquée")}</span>
                    ) : slot ? (
                      <span className="text-(--ep-ink)/55">{shortHour(slot.start)}</span>
                    ) : (
                      <span className="text-(--ep-ink)/30">·</span>
                    )}
                  </span>
                  {on.length > 1 && <span className="text-[9px] font-black text-(--ep-accent)">+{on.length - 1}</span>}
                </>
              ) : (
                <span className="mt-1 text-[9px] leading-3 text-(--ep-ink)/30">{t("repos")}</span>
              )}
            </>
          );
          const cls = "min-h-[78px] min-w-0 rounded-xl flex flex-col items-center pt-1.5 pb-1 transition-colors";
          return first ? (
            <button
              key={wd}
              type="button"
              onClick={() => {
                const idx = on.findIndex((i) => i.day.id === selectedId);
                onSelect(on[(idx + 1) % on.length].day.id);
              }}
              aria-pressed={selected}
              className={cls}
              style={selected ? { background: "rgba(var(--ep-accent-rgb),0.12)", boxShadow: "inset 0 0 0 1px rgba(var(--ep-accent-rgb),0.5)" } : undefined}
              aria-label={`${t(WEEKDAY_LONG[wd])} : ${first.day.day_label}${slot ? ` ${slot.start}` : ""}${
                first.done ? `, ${t("faite")}` : first.missed ? `, ${t("manquée")}` : ""
              }`}
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
      {unplaced.length > 0 && (
        <div className="mt-1.5 px-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] text-(--ep-ink)/50">{t("Sans jour fixe")} :</span>
          {unplaced.map((i) => (
            <button
              key={i.day.id}
              type="button"
              onClick={() => onSelect(i.day.id)}
              aria-pressed={selectedId === i.day.id}
              className="min-h-9 inline-flex items-center gap-1 rounded-lg px-2.5 text-[11px] font-black border"
              style={
                selectedId === i.day.id
                  ? { borderColor: "rgba(var(--ep-accent-rgb),0.5)", background: "rgba(var(--ep-accent-rgb),0.12)", color: "var(--ep-strong)" }
                  : { borderColor: "rgba(var(--ep-line-rgb),0.3)", color: "rgba(var(--ep-ink-rgb),0.8)" }
              }
            >
              {i.done && <Check size={11} strokeWidth={3} className="text-(--ep-ok)" aria-hidden />}
              {i.day.day_label}
            </button>
          ))}
        </div>
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
  eyebrow,
  canMove = false,
}: {
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  /** Conservé pour compatibilité des appelants : la page ne propose plus de caler la séance. */
  agendaHref?: string;
  eyebrow: string;
  /** Propose « Décaler » sur chaque séance (le client ou le coach pour son propre programme). */
  canMove?: boolean;
}) {
  const t = useT();
  const todayDow = isoWeekday(ctx.today);

  const infos: DayInfo[] = useMemo(() => {
    const doneLabels = new Set(ctx.doneThisWeek.map((r) => norm(r.day_label)));
    return program.days.map((day) => {
      const done = doneLabels.has(norm(day.day_label));
      const resume = ctx.openSessionLabel != null && norm(ctx.openSessionLabel) === norm(day.day_label);
      return {
        day,
        minutes: estimateMinutes(day.exercises),
        equipment: equipmentForDay(day.exercises, ctx.equipmentByName),
        done,
        resume,
        date: day.weekday ? addDaysIso(ctx.weekStart, day.weekday - 1) : null,
        missed: !!day.weekday && day.weekday < todayDow && !done && !resume,
      };
    });
  }, [program.days, ctx, todayDow]);

  // Ordre de la semaine : jours placés d'abord (lundi → dimanche), puis les
  // séances sans jour fixe dans l'ordre du programme.
  const ordered = useMemo(
    () => [...infos].sort((a, b) => (a.day.weekday ?? 99) - (b.day.weekday ?? 99) || a.day.position - b.day.position),
    [infos]
  );

  // Séance mise en avant : celle en cours, celle d'aujourd'hui, sinon la
  // prochaine pas faite cette semaine, sinon une sans jour fixe pas faite,
  // sinon la première de la semaine prochaine.
  const featured: Featured = useMemo(() => {
    const resume = infos.find((i) => i.resume);
    if (resume) return { id: resume.day.id, kind: "today", date: ctx.today };
    const today = ordered.find((i) => i.day.weekday === todayDow);
    if (today) return { id: today.day.id, kind: "today", date: ctx.today };
    const next = ordered.find((i) => i.day.weekday && i.day.weekday > todayDow && !i.done);
    if (next) return { id: next.day.id, kind: "next", date: next.date };
    const free = ordered.find((i) => !i.day.weekday && !i.done);
    if (free) return { id: free.day.id, kind: "free", date: null };
    const first = ordered.find((i) => i.day.weekday);
    if (first?.day.weekday) return { id: first.day.id, kind: "nextweek", date: addDaysIso(ctx.weekStart, 7 + first.day.weekday - 1) };
    return ordered[0] ? { id: ordered[0].day.id, kind: "free", date: null } : null;
  }, [infos, ordered, todayDow, ctx.today, ctx.weekStart]);

  const [selectedId, setSelectedId] = useState<string | null>(featured?.id ?? null);
  const selected = infos.find((i) => i.day.id === selectedId) ?? infos.find((i) => i.day.id === featured?.id) ?? null;

  // Après une séance faite : la suivante (cette semaine, sinon la semaine prochaine).
  const nextAfter = useMemo(() => {
    if (!selected) return null;
    const upcoming = ordered.find((i) => i.day.weekday && i.day.weekday > todayDow && !i.done && i.day.id !== selected.day.id);
    if (upcoming) return { info: upcoming, date: upcoming.date };
    const first = ordered.find((i) => i.day.weekday && i.day.id !== selected.day.id);
    return first?.day.weekday ? { info: first, date: addDaysIso(ctx.weekStart, 7 + first.day.weekday - 1) } : null;
  }, [ordered, selected, todayDow, ctx.weekStart]);

  const doneCount = infos.filter((i) => i.done).length;

  function select(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById("ep-program-session")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  return (
    <div>
      {/* En-tête : programme, fréquence, avancée du bloc */}
      <div className="mb-3">
        <p className="ep-section-title" style={{ marginBottom: 2 }}>
          {eyebrow}
        </p>
        <h1 className="ep-h1 uppercase" style={{ fontSize: 26 }}>
          {t("Mon programme")}
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-snug text-(--ep-ink)/55">
          <span className="font-bold text-(--ep-ink)/85">{program.name}</span>
          {` · ${program.days.length} ${program.days.length > 1 ? t("séances") : t("séance")} ${t("par semaine")}`}
        </p>
      </div>

      <WeekStrip ctx={ctx} ordered={ordered} selectedId={selected?.day.id ?? null} onSelect={select} doneCount={doneCount} total={program.days.length} />

      {selected && (
        <div id="ep-program-session" className="scroll-mt-16">
          {featured?.id !== selected.day.id && featured && (
            <button
              type="button"
              onClick={() => setSelectedId(featured.id)}
              className="mb-1 -mt-1 min-h-9 inline-flex items-center gap-1 px-1 text-[11.5px] font-bold text-(--ep-ink)/55"
            >
              ← {featured.kind === "today" ? t("Revenir à la séance du jour") : t("Revenir à la prochaine séance")}
            </button>
          )}
          <SessionCard
            key={selected.day.id}
            info={selected}
            featured={featured}
            nextAfter={nextAfter}
            program={program}
            ctx={ctx}
            sessionBasePath={sessionBasePath}
            gymsHref={gymsHref}
            canMove={canMove}
            onSelect={select}
          />
        </div>
      )}

    </div>
  );
}

