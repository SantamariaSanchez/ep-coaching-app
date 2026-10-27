"use client";

// Page « Mon programme » (client coaché, membre gratuit, coach pour lui-même
// et aperçu « Voir comme mon client »). Deuxième refonte du 2026-10-20 sur
// retour direct du fondateur : « vraiment travaille bien sur l'onglet
// programme, ça doit être clairement meilleur que l'actuel » (après « qu'on
// voie bien le jour, l'heure, les accessoires, quelle salle et quel exo, et
// optimise l'espace »).
//
// - En tête : programme, fréquence et où on en est du bloc (semaine 3 sur 6,
//   semaine allégée à venir), sans jargon.
// - La semaine : 7 jours compacts, état de chaque jour (faite, en cours,
//   manquée, à venir avec l'heure, repos). Un tap affiche la séance du jour
//   choisi.
// - La séance du jour (ou la prochaine, « dans 2 jours ») en héros : quand,
//   où, durée, muscles travaillés, matériel et sac, bouton Démarrer /
//   Reprendre / Refaire, puis les exercices avec la DERNIÈRE PERFORMANCE
//   réelle, l'objectif du jour (double progression, la même règle que la
//   séance guidée) et la tendance sur le bloc. Consigne et vidéo au tap.
// - Les séries de la semaine par muscle (faites / prévues), à la place des
//   jauges MEV/MAV/MRV de VolumeIntensitySection, illisibles pour un client.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Backpack,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  ExternalLink,
  Link2,
  MapPin,
  Play,
  RotateCw,
  Timer,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useLocale, useT } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/lib/i18n";
import type { Exercise, ProgramDay, ProgramWithDays } from "@/utils/programs";
import type { ProgramWeekContext } from "@/utils/program-week";
import {
  WEEKDAY_LETTER,
  WEEKDAY_LONG,
  addDaysIso,
  equipmentForDay,
  equipmentKey,
  estimateMinutes,
  isoWeekday,
  musclesForDay,
  plannedSetsByMuscle,
  shortHour,
  type ExerciseHistory,
  type PerfSet,
} from "@/lib/program-week";
import { accessoriesForSession, ALWAYS_ACCESSORIES } from "@/lib/session-accessories";
import { computeMesocycleStatus } from "@/lib/mesocycle";
import { formatRest, techniqueHint, techniqueLabel, unitShort, isTimeUnit } from "@/lib/program-sheet";
import { parseRepScheme, rangeForSet, suggestSet, formatKg } from "@/lib/set-targets";
import { describeTempo } from "@/lib/live-session";
import { toBlocks } from "@/components/program-builder/ProgramExerciseList";
import { withAlpha } from "@/lib/theme-color";
import { safeExternalUrl } from "@/lib/sanitize";
import { useStartSession } from "@/hooks/useStartSession";
import EmbeddedVideo from "@/components/ui/EmbeddedVideo";
import MoveSession from "@/components/ui/MoveSession";
import { resolveVideoEmbed } from "@/lib/video-embed-utils";

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

// ── Performance d'un exercice ────────────────────────────────────────────────

const NBSP = " ";

/** « 80 kg × 10 · 9 · 8 » si la charge ne bouge pas, sinon « 82,5×8 · 80×9 ». */
function formatSets(sets: PerfSet[], unit: string | null | undefined, t: T): string {
  const timed = isTimeUnit(unit);
  const reps = (r: number | null) => (r == null ? "?" : timed ? `${r}${NBSP}s` : String(r));
  const weights = sets.map((s) => (s.w != null && s.w > 0 ? s.w : null));
  if (weights.every((w) => w == null)) {
    return `${sets.map((s) => reps(s.r)).join(" · ")}${timed ? "" : `${NBSP}${t("reps")}`}`;
  }
  const same = weights.every((w) => w === weights[0]);
  if (same) return `${formatKg(weights[0] as number)}${NBSP}kg × ${sets.map((s) => reps(s.r)).join(" · ")}`;
  return sets.map((s) => (s.w != null && s.w > 0 ? `${formatKg(s.w)}×${reps(s.r)}` : reps(s.r))).join(" · ");
}

/** Objectif de la première série, même règle que la séance guidée (lib/set-targets). */
function objectiveFor(ex: Exercise, hist: ExerciseHistory, t: T): { text: string; reason: string | null; up: boolean } | null {
  const range = rangeForSet(parseRepScheme(ex.reps, ex.sets), 0);
  const first = hist.lastSets[0];
  if (!range || !first || first.r == null) return null;
  if (first.w != null && first.w > 0) {
    const s = suggestSet({ range, prev: { weight: first.w, reps: String(first.r), rir: first.rir }, targetRir: ex.rir ?? null });
    if (!s) return null;
    return { text: `${formatKg(s.weightKg)}${NBSP}kg × ${s.reps}`, reason: t(s.reason), up: s.weightKg > first.w || s.reps > first.r };
  }
  // Poids du corps : une rep de plus, jusqu'au haut de la fourchette.
  if (isTimeUnit(ex.reps_unit)) return null;
  if (first.r >= range.max) return { text: t("lest ou tempo plus lent"), reason: null, up: true };
  return { text: `${Math.max(range.min, first.r + 1)}${NBSP}${t("reps")}`, reason: null, up: true };
}

function TrendBadge({ hist }: { hist: ExerciseHistory }) {
  const t = useT();
  const tr = hist.trend;
  if (!tr) return null;
  const up = tr.delta > 0;
  const down = tr.delta < 0;
  const amount =
    tr.kind === "kg"
      ? `${up ? "+" : "−"}${formatKg(Math.abs(tr.delta))}${NBSP}kg`
      : tr.kind === "reps"
        ? `${up ? "+" : "−"}${Math.abs(tr.delta)}${NBSP}${Math.abs(tr.delta) > 1 ? t("reps") : t("rep")}`
        : t("stable");
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums whitespace-nowrap"
      style={
        up
          ? { background: "rgba(var(--ep-ok-rgb),0.13)", color: "var(--ep-ok)" }
          : { background: "rgba(var(--ep-ink-rgb),0.07)", color: "rgba(var(--ep-ink-rgb),0.6)" }
      }
      title={t("Meilleure série, depuis {n} sem.", { n: tr.weeks })}
    >
      <Icon size={11} strokeWidth={2.75} aria-hidden />
      {amount}
      <span className="font-bold opacity-70 max-[399px]:hidden">
        {NBSP}
        {tr.weeks}
        {NBSP}
        {t("sem.")}
      </span>
    </span>
  );
}

// ── Un exercice ──────────────────────────────────────────────────────────────

function ExerciseRow({
  ex,
  index,
  tag,
  color,
  restShown,
  ctx,
  done,
}: {
  ex: Exercise;
  index: number;
  tag: string | null;
  color: string | null;
  restShown: string | null;
  ctx: ProgramWeekContext;
  done: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const key = equipmentKey(ex.name);
  const hist = ctx.history?.[key];
  const guide = ctx.guides?.[key];
  const equipment = ctx.equipmentByName[key];
  const unit = unitShort(ex.reps_unit);
  const tech = techniqueLabel(ex.technique);
  const target =
    ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}${NBSP}${unit}` : ex.sets ? `${ex.sets} ${t("séries")}` : ex.reps ? `${ex.reps} ${unit}` : null;
  const objective = hist && !done ? objectiveFor(ex, hist, t) : null;
  const tempoText = describeTempo(ex.tempo);
  const video = guide?.videoUrl ? safeExternalUrl(guide.videoUrl) : null;
  const image = guide?.imageUrl ? safeExternalUrl(guide.imageUrl) : null;
  const embeddable = video ? !!resolveVideoEmbed(video) : false;
  const accessories = ctx.accessoriesByName[ex.name] ?? [];
  const hasAnyHistory = Object.keys(ctx.history ?? {}).length > 0;
  const hasDetails = !!(guide?.instructions || guide?.tips.length || video || image || tech || tempoText || accessories.length || objective?.reason);
  const lastDate = hist
    ? new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${hist.lastDate}T12:00:00Z`))
    : null;

  return (
    <li className="py-2 first:pt-1 last:pb-1">
      <button
        type="button"
        onClick={() => hasDetails && setOpen(!open)}
        aria-expanded={hasDetails ? open : undefined}
        className={`w-full flex gap-2.5 text-left ${hasDetails ? "" : "cursor-default"}`}
      >
        <span
          className="mt-px w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums"
          style={
            tag
              ? { background: withAlpha(color, "26"), color: color ?? undefined }
              : { background: "rgba(var(--ep-ink-rgb),0.08)", color: "rgba(var(--ep-ink-rgb),0.6)" }
          }
        >
          {tag ?? index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5">
            <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug text-(--ep-strong) break-words">{ex.name}</span>
            {hasDetails && (
              <ChevronDown
                size={15}
                aria-hidden
                className="mt-0.5 shrink-0 text-(--ep-ink)/35 transition-transform"
                style={{ transform: open ? "rotate(180deg)" : undefined }}
              />
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] leading-4 text-(--ep-ink)/60">
            <span className="font-black text-(--ep-ink)/90 tabular-nums">{target ?? t("à définir avec ton coach")}</span>
            {ex.rir != null && <span className="tabular-nums">RIR {ex.rir}</span>}
            {restShown && (
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <Timer size={10} aria-hidden /> {restShown}
              </span>
            )}
            {tech && (
              <span className="rounded px-1.5 py-px text-[9.5px] font-black uppercase tracking-wide bg-(--ep-gold)/15 text-(--ep-gold)">{t(tech)}</span>
            )}
            {equipment && norm(equipment) !== "autre" && <span className="text-(--ep-ink)/40">{equipment}</span>}
          </span>
          {ex.notes && <span className="block mt-0.5 text-[11px] italic leading-snug text-(--ep-ink)/50">{ex.notes}</span>}

          {/* Dernière fois / objectif du jour */}
          {hist ? (
            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-lg bg-(--ep-ink)/[0.045] px-2 py-1.5 text-[11.5px] leading-4 sm:inline-flex sm:max-w-full">
              <span className="basis-full min-w-0 sm:basis-auto">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-(--ep-ink)/40">{lastDate}</span>{" "}
                <span className="font-bold tabular-nums text-(--ep-ink)/85">{formatSets(hist.lastSets, ex.reps_unit, t)}</span>
              </span>
              {objective && (
                <span className="min-w-0">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-(--ep-accent)">{t("Objectif")}</span>{" "}
                  <span className="font-black tabular-nums text-(--ep-strong) whitespace-nowrap">{objective.text}</span>
                </span>
              )}
              {hist.trend && (
                <span className="ml-auto sm:ml-0">
                  <TrendBadge hist={hist} />
                </span>
              )}
            </span>
          ) : (
            !done &&
            hasAnyHistory && (
              <span className="mt-1 block text-[11px] leading-4 text-(--ep-ink)/40">
                {ex.rir != null
                  ? ex.rir === 0
                    ? t("Première fois : trouve une charge qui t'amène à l'échec dans la fourchette")
                    : t(ex.rir === 1 ? "Première fois : trouve une charge qui te laisse 1 rep en réserve" : "Première fois : trouve une charge qui te laisse {n} reps en réserve", { n: ex.rir })
                  : t("Première fois : trouve ta charge de travail")}
              </span>
            )
          )}
        </span>
      </button>

      {open && hasDetails && (
        <div className="ml-[34px] mt-2 space-y-2 rounded-xl border border-(--ep-line)/20 bg-(--ep-s2)/70 px-3 py-2.5 text-[12px] leading-relaxed text-(--ep-ink)/75">
          {objective?.reason && (
            <p>
              <b className="text-(--ep-strong)">{t("Objectif :")}</b> {objective.reason}
            </p>
          )}
          {tech && techniqueHint(ex.technique) && (
            <p>
              <b className="text-(--ep-gold)">{t(tech)} :</b> {t(techniqueHint(ex.technique) ?? "")}
            </p>
          )}
          {(tempoText || ex.tempo) && (
            <p>
              <b className="text-(--ep-strong)">{t("Tempo")} {ex.tempo} :</b> {tempoText ?? t("vitesse imposée par ton coach")}
            </p>
          )}
          {guide?.instructions ? (
            <p className="whitespace-pre-wrap">{guide.instructions}</p>
          ) : guide?.tips.length ? (
            <ul className="space-y-0.5">
              {guide.tips.map((tip, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-(--ep-accent) font-black">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          ) : null}
          {accessories.length > 0 && (
            <p className="flex items-center gap-1.5">
              <Backpack size={12} className="shrink-0 text-(--ep-ink)/45" aria-hidden />
              {accessories.join(" · ")}
            </p>
          )}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={ex.name} loading="lazy" className="w-full max-w-[420px] rounded-lg border border-(--ep-line)/25 object-cover" />
          )}
          {video &&
            (embeddable ? (
              <EmbeddedVideo url={video} maxWidth={420} />
            ) : (
              <a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-11 font-bold text-(--ep-accent)">
                <ExternalLink size={12} /> {t("Voir la vidéo d'exemple")}
              </a>
            ))}
        </div>
      )}
    </li>
  );
}

function ExerciseList({ day, ctx, done }: { day: ProgramDay; ctx: ProgramWeekContext; done: boolean }) {
  const t = useT();
  const blocks = toBlocks(day.exercises);
  return (
    <div className="flex flex-col gap-1">
      {blocks.map((b, bi) => (
        <div
          key={bi}
          className={b.label ? "rounded-xl border-l-[3px] pl-2 pr-1.5 pt-1.5" : ""}
          style={b.color ? { borderColor: b.color, background: withAlpha(b.color, "0d") } : undefined}
        >
          {b.label && (
            <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-widest" style={{ color: b.color ?? undefined }}>
              <Link2 size={11} aria-hidden /> {t(b.label)}
              <span className="normal-case tracking-normal font-bold text-(--ep-ink)/50">· {t("enchaîne sans repos")}</span>
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
                ctx={ctx}
                done={done}
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
  weekComplete,
  program,
  ctx,
  sessionBasePath,
  gymsHref,
  agendaHref,
  canMove,
  onSelect,
}: {
  info: DayInfo;
  featured: Featured;
  nextAfter: { info: DayInfo; date: string | null } | null;
  weekComplete: boolean;
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  agendaHref: string;
  canMove: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { day, minutes, equipment, done, resume, missed } = info;
  const isFeatured = featured?.id === day.id;
  const date = isFeatured && featured?.kind === "nextweek" ? featured.date : info.date;
  const slot = ctx.slots[day.id] ?? null;
  const muscles = musclesForDay(day.exercises);
  const bag = accessoriesForSession(day.exercises.map((e) => e.name), ctx.accessoriesByName).filter(
    (a) => !ALWAYS_ACCESSORIES.some((al) => al.accessory === a.accessory)
  );
  const gymUrl = ctx.gym?.link ? safeExternalUrl(ctx.gym.link) : null;
  const isToday = date === ctx.today;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  const eyebrow = isToday
      ? t("Ta séance du jour")
      : isFeatured && featured?.kind === "nextweek" && weekComplete
        ? `${t("Semaine bouclée")} ✓ · ${t("Prochaine séance")}`
        : isFeatured && (featured?.kind === "next" || featured?.kind === "nextweek")
          ? `${t("Repos aujourd'hui")} · ${t("Prochaine séance")}`
        : !day.weekday
          ? t("Séance sans jour fixe")
          : t(WEEKDAY_LONG[day.weekday]);

  const status = resume
    ? { label: t("En cours"), color: "var(--ep-warn)", rgb: "--ep-warn-rgb" }
    : done
      ? { label: `${t("Faite")} ✓`, color: "var(--ep-ok)", rgb: "--ep-ok-rgb" }
      : missed
        ? { label: t("Manquée"), color: "var(--ep-bad)", rgb: "--ep-bad-rgb" }
        : null;

  const relative = date && !isToday ? relativeDay(t, ctx.today, date) : null;
  const factRow = "flex items-center gap-2 min-h-7 text-[12.5px] leading-snug";
  const linkCls = "inline-flex items-center gap-1 -my-2 min-h-11 font-bold text-(--ep-accent)";

  return (
    <section
      className="scroll-mt-16 rounded-2xl border bg-(--ep-s1) p-3.5 mb-3"
      style={{
        borderColor: isToday || resume ? "rgba(var(--ep-accent-rgb),0.45)" : "rgba(var(--ep-line-rgb),0.3)",
        boxShadow: isToday || resume ? "0 0 28px rgba(var(--ep-accent-rgb),0.10)" : undefined,
      }}
      aria-label={day.day_label}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-accent) truncate">{eyebrow}</p>
        {status && (
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide"
            style={{ color: status.color, background: `rgba(var(${status.rgb}),0.14)` }}
          >
            {status.label}
          </span>
        )}
      </div>
      <h2 className="mt-0.5 text-[26px] font-black uppercase tracking-tight leading-[1.05] text-(--ep-strong) break-words">{day.day_label}</h2>

      {/* Quand, où, combien de temps */}
      <div className="mt-2 space-y-0.5">
        <p className={factRow}>
          <Clock size={14} className="shrink-0 text-(--ep-accent)" aria-hidden />
          <span className="min-w-0">
            {date ? (
              <span className="font-bold text-(--ep-ink)/90 first-letter:uppercase inline-block">{fmtDate(date)}</span>
            ) : (
              <span className="font-bold text-(--ep-ink)/90">{t("Jour libre")}</span>
            )}
            {slot ? (
              <span className="font-black text-(--ep-strong) tabular-nums">
                {" · "}
                {shortHour(slot.start)}
                {slot.end ? `–${shortHour(slot.end)}` : ""}
              </span>
            ) : null}
            {relative && <span className="text-(--ep-ink)/50"> · {relative.toLowerCase()}</span>}
            {day.weekMoved && <span className="text-(--ep-warn)"> · {t("décalée cette semaine")}</span>}
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
        {!slot && (
          <p className={factRow}>
            <CalendarPlus size={14} className="shrink-0 text-(--ep-ink)/40" aria-hidden />
            <span className="text-(--ep-ink)/55">{day.weekday ? t("Pas encore d'heure.") : t("Pas encore de jour.")}</span>
            <Link href={agendaHref} className={linkCls}>
              {day.weekday ? t("La caler dans l'agenda") : t("Choisir un jour")} →
            </Link>
          </p>
        )}
        <p className={factRow}>
          <MapPin size={14} className={`shrink-0 ${ctx.gym ? "text-(--ep-accent)" : "text-(--ep-ink)/40"}`} aria-hidden />
          {ctx.gym ? (
            <>
              {gymUrl ? (
                <a href={gymUrl} target="_blank" rel="noopener noreferrer" className="-my-2 min-h-11 min-w-0 inline-flex items-center gap-1 font-bold text-(--ep-ink)/90">
                  <span className="truncate">{ctx.gym.name}</span>
                  <ExternalLink size={11} className="shrink-0 text-(--ep-ink)/35" aria-hidden />
                </a>
              ) : (
                <span className="min-w-0 truncate font-bold text-(--ep-ink)/90">{ctx.gym.name}</span>
              )}
              <Link href={gymsHref} className="shrink-0 -my-2 min-h-11 inline-flex items-center px-1 text-[11.5px] font-bold text-(--ep-ink)/45">
                {t("Changer")}
              </Link>
            </>
          ) : (
            <>
              <span className="text-(--ep-ink)/55">{t("Pas de salle choisie.")}</span>
              <Link href={gymsHref} className={linkCls}>
                {t("Choisir ma salle")} →
              </Link>
            </>
          )}
        </p>
        <p className={factRow}>
          <Timer size={14} className="shrink-0 text-(--ep-accent)" aria-hidden />
          <span className="font-bold text-(--ep-ink)/90 tabular-nums">
            {minutes != null ? `~${minutes} min · ` : ""}
            {day.exercises.length} {day.exercises.length > 1 ? t("exercices") : t("exercice")}
          </span>
        </p>
      </div>

      {/* Muscles travaillés */}
      {muscles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {muscles.map((m) => (
            <span
              key={m.group}
              className="inline-flex items-baseline gap-1 rounded-md px-2 py-1 text-[11px] font-bold bg-(--ep-accent)/10 text-(--ep-ink)/85"
            >
              {m.group}
              <span className="text-[10px] font-black tabular-nums text-(--ep-accent)">{m.sets}</span>
            </span>
          ))}
        </div>
      )}

      {/* Matériel et sac */}
      {(equipment.length > 0 || bag.length > 0) && (
        <div className="mt-2 space-y-1 text-[12px] leading-snug">
          {equipment.length > 0 && (
            <p className="flex items-start gap-2">
              <Dumbbell size={13} className="mt-0.5 shrink-0 text-(--ep-ink)/45" aria-hidden />
              <span className="min-w-0 text-(--ep-ink)/80">
                <span className="font-black uppercase tracking-wider text-[9.5px] text-(--ep-ink)/45 mr-1.5">{t("Matériel")}</span>
                {equipment.join(" · ")}
              </span>
            </p>
          )}
          {bag.length > 0 && (
            <p className="flex items-start gap-2">
              <Backpack size={13} className="mt-0.5 shrink-0 text-(--ep-ink)/45" aria-hidden />
              <span className="min-w-0 text-(--ep-ink)/80">
                <span className="font-black uppercase tracking-wider text-[9.5px] text-(--ep-ink)/45 mr-1.5">{t("Dans le sac")}</span>
                {bag.map((a, i) => (
                  <span key={a.accessory}>
                    {i > 0 && <span className="text-(--ep-ink)/35"> · </span>}
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-block py-1.5 -my-1.5 font-bold underline decoration-(--ep-line)/50 underline-offset-2">
                        {a.accessory}
                      </a>
                    ) : (
                      <span className="font-bold">{a.accessory}</span>
                    )}
                  </span>
                ))}
              </span>
            </p>
          )}
        </div>
      )}

      {day.notes && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-(--ep-ink)/75 bg-(--ep-accent)/[0.07] border border-(--ep-accent)/20 rounded-lg px-3 py-2">
          {day.notes}
        </p>
      )}

      {day.exercises.length > 0 && (
        <div className="mt-3">
          <StartButton day={day} programId={program.id} sessionBasePath={sessionBasePath} resume={resume} done={done} />
        </div>
      )}

      {done && !resume && nextAfter && (
        <button
          type="button"
          onClick={() => onSelect(nextAfter.info.day.id)}
          className="mt-2 w-full min-h-11 flex items-center justify-center gap-1.5 text-[12px] text-(--ep-ink)/60"
        >
          {t("Prochaine")} :<span className="font-black text-(--ep-strong)">{nextAfter.info.day.day_label}</span>
          {nextAfter.date && <span>· {relativeDay(t, ctx.today, nextAfter.date).toLowerCase()}</span>}
          <span className="text-(--ep-accent) font-black">→</span>
        </button>
      )}

      <div className="mt-3 border-t border-(--ep-line)/15 pt-2">
        {day.exercises.length > 0 && Object.keys(ctx.history ?? {}).length > 0 && (
          <p className="mb-0.5 flex items-baseline justify-between gap-2 text-[9.5px] font-black uppercase tracking-widest text-(--ep-ink)/40">
            {t("Exercices")}
            {!(done && !resume) && (
              <span className="normal-case tracking-normal font-bold text-[10.5px]">
                {t("ta dernière fois")} → <span className="text-(--ep-accent)">{t("objectif du jour")}</span>
              </span>
            )}
          </p>
        )}
        {day.exercises.length > 0 && Object.keys(ctx.history ?? {}).length === 0 && !done && (
          <p className="mb-1 rounded-lg bg-(--ep-ink)/[0.045] px-2.5 py-1.5 text-[11.5px] leading-snug text-(--ep-ink)/60">
            {t("Première séance : choisis des charges qui te laissent le RIR indiqué en réserve (RIR 2 = encore 2 reps possibles). Tes perfs s'afficheront ici ensuite.")}
          </p>
        )}
        {day.exercises.length === 0 ? (
          <p className="text-[12px] italic text-(--ep-ink)/40">{t("Aucun exercice")}</p>
        ) : (
          <ExerciseList day={day} ctx={ctx} done={done && !resume} />
        )}
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

// ── Séries par muscle sur la semaine ─────────────────────────────────────────

function WeekVolume({ program, ctx }: { program: ProgramWithDays; ctx: ProgramWeekContext }) {
  const t = useT();
  const planned = plannedSetsByMuscle(program.days);
  const rows = Object.entries(planned)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  if (rows.length === 0) return null;
  const doneBy = ctx.weekSetsByMuscle ?? {};
  const totalPlanned = rows.reduce((s, [, n]) => s + n, 0);
  const totalDone = rows.reduce((s, [g, n]) => s + Math.min(doneBy[g] ?? 0, n), 0);
  return (
    <section className="ep-card mb-3" style={{ padding: "12px 14px" }}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/50">{t("Séries par muscle")}</p>
        <p className="text-[11px] text-(--ep-ink)/50 tabular-nums">
          <span className="font-black text-(--ep-ink)/80">{totalDone}</span>/{totalPlanned} {t("cette semaine")}
        </p>
      </div>
      <ul className="space-y-1.5">
        {rows.map(([group, n]) => {
          const done = doneBy[group] ?? 0;
          const pct = Math.min(100, Math.round((done / n) * 100));
          const full = done >= n;
          return (
            <li key={group} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2.5 text-[11.5px]">
              <span className="truncate font-bold text-(--ep-ink)/80">{group}</span>
              <span className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(var(--ep-ink-rgb),0.08)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: full ? "var(--ep-ok)" : "var(--ep-accent)", minWidth: done > 0 ? 4 : 0 }}
                />
              </span>
              <span className="w-12 text-right tabular-nums text-(--ep-ink)/50">
                <span className={`font-black ${full ? "text-(--ep-ok)" : "text-(--ep-ink)/85"}`}>{done}</span>/{n}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
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
  canMove = false,
}: {
  program: ProgramWithDays;
  ctx: ProgramWeekContext;
  sessionBasePath: string;
  gymsHref: string;
  agendaHref: string;
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

  const meso =
    program.mesocycle_start_date && program.mesocycle_weeks
      ? computeMesocycleStatus(program.mesocycle_start_date, program.mesocycle_weeks, new Date(`${ctx.today}T12:00:00`))
      : null;
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
        <h1 className="ep-h1 uppercase" style={{ fontSize: 30 }}>
          {t("Mon programme")}
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-snug text-(--ep-ink)/55">
          <span className="font-bold text-(--ep-ink)/85">{program.name}</span>
          {` · ${program.days.length} ${program.days.length > 1 ? t("séances") : t("séance")} ${t("par semaine")}`}
        </p>
        {program.objective && <p className="mt-0.5 text-[12px] leading-snug text-(--ep-ink)/45">{program.objective}</p>}
        {meso && (
          <div className="mt-2">
            <p className="text-[11.5px] leading-snug text-(--ep-ink)/60">
              {meso.isOverdue ? (
                t("Bloc terminé : ton coach prépare la suite")
              ) : meso.isDeloadWeek ? (
                <>
                  <span className="font-black text-(--ep-warn)">{t("Semaine allégée")}</span> · {t("moins de séries, tu récupères")}
                </>
              ) : (
                <>
                  <span className="font-black text-(--ep-ink)/85">
                    {t("Semaine {n} sur {total}", { n: meso.currentWeek, total: meso.totalWeeks })}
                  </span>
                  {" · "}
                  {meso.totalWeeks - meso.currentWeek === 1
                    ? t("semaine allégée la semaine prochaine")
                    : t("semaine allégée dans {n} sem.", { n: meso.totalWeeks - meso.currentWeek })}
                </>
              )}
            </p>
            <div className="mt-1 flex gap-0.5" aria-hidden>
              {Array.from({ length: meso.totalWeeks }).map((_, i) => {
                const w = i + 1;
                const deload = w === meso.totalWeeks;
                const past = meso.isOverdue || w < meso.currentWeek;
                const current = !meso.isOverdue && w === meso.currentWeek;
                return (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background: current
                        ? deload
                          ? "var(--ep-warn)"
                          : "var(--ep-accent)"
                        : past
                          ? "rgba(var(--ep-accent-rgb),0.4)"
                          : deload
                            ? "rgba(var(--ep-warn-rgb),0.28)"
                            : "rgba(var(--ep-ink-rgb),0.12)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
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
            weekComplete={doneCount >= program.days.length}
            program={program}
            ctx={ctx}
            sessionBasePath={sessionBasePath}
            gymsHref={gymsHref}
            agendaHref={agendaHref}
            canMove={canMove}
            onSelect={select}
          />
        </div>
      )}

      <WeekVolume program={program} ctx={ctx} />
    </div>
  );
}

