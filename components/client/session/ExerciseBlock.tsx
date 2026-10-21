"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Video,
  Loader2,
  Send,
  RotateCw,
  AlertCircle,
  Clock3,
  Repeat,
  MoreHorizontal,
  Pencil,
  Timer,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Stepper from "./Stepper";
import type { ExerciseState, LibraryTip, PrevWeight, SetState, VideoState } from "./types";
import {
  techniqueForm,
  segmentLabel,
  describeTempo,
  repsStep,
  weightStep,
  dropWeight,
  formatSetLine,
  parseDetails,
  buildDetails,
  type SegmentDraft,
} from "@/lib/live-session";
import { parseRepScheme, rangeForSet, formatRange, suggestSet, formatKg, type RepRange } from "@/lib/set-targets";
import { techniqueLabel, techniqueHint, unitShort, formatRest } from "@/lib/program-sheet";
import { TENSION_FOCUS_LABELS } from "@/lib/exercise-library-content";
import { getTips } from "@/lib/execution-tips";
import {
  BODYWEIGHT_MODES,
  RPE_CHOICES,
  estimateE1rm,
  formatIntensity,
  loadForPercent,
  mainLiftFor,
  parseIntensity,
  rpeToRir,
  skillFor,
  stepFromName,
  stepIndex,
  isBodyweightMode,
} from "@/lib/training-styles";
import { loadModeOf, setExtra } from "./strength";
import { safeExternalUrl } from "@/lib/sanitize";

// Un exercice de la séance en cours (retour direct du fondateur 2026-10-14 :
// « en pleine séance je veux savoir l'exo, combien de sets, mon repos »,
// « pas que ce soit hyper long et gros chaque exo »). Replié : une ligne
// serrée (nom, séries × reps, repos, dernière charge, progression). Déplié
// (l'exercice en cours) : les séries faites sur une ligne chacune et UNE
// série active, pré-remplie, validable en un tap.

const RIR_CHOICES = [0, 1, 2, 3, 4, 5] as const;
const SCORE_CHOICES = [1, 2, 3, 4, 5] as const;

type Panel = "technique" | "tempo" | "consigne" | "history" | "tips" | "note" | "more" | null;

function num(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Meilleur 1RM estimé des séries de la dernière séance. */
function bestE1rm(prevSets: PrevWeight[]): number | null {
  let best: number | null = null;
  for (const s of prevSets) {
    const reps = s.reps != null ? parseInt(s.reps, 10) : null;
    const e = estimateE1rm(s.weight, reps, parseDetails(s.details)?.rpe ?? null);
    if (e != null && (best == null || e > best)) best = e;
  }
  return best;
}

/** Valeurs proposées d'office pour une série : la dernière perf ou la cible. */
export function prefillFor(
  ex: ExerciseState,
  setIdx: number,
  prevSets: PrevWeight[],
  prevWeight: PrevWeight | null
): { w: string; r: string } {
  const ranges = parseRepScheme(ex.exercise.reps, ex.exercise.sets);
  const range = rangeForSet(ranges, setIdx);
  const before = [...ex.sets.slice(0, setIdx)].reverse().find((s) => s.validated);
  const prev = prevSets[setIdx] ?? prevSets[prevSets.length - 1] ?? prevWeight ?? null;
  const suggestion = range ? suggestSet({ range, prev, targetRir: ex.exercise.rir ?? null }) : null;

  let w = "";
  const first = ex.sets.slice(0, setIdx).find((s) => s.validated && s.weightKg);
  const intensity = parseIntensity(ex.exercise.intensity);
  const e1rm = bestE1rm(prevSets);
  if (ex.exercise.technique === "top_backoff" && setIdx > 0 && first) {
    // Back-off : environ -10 % du top set.
    w = String(loadForPercent(parseFloat(first.weightKg.replace(",", ".")), 90, weightStep(parseFloat(first.weightKg))));
  } else if (before && before.weightKg) w = before.weightKg;
  else if (intensity?.kind === "pct" && e1rm) w = String(loadForPercent(e1rm, (intensity.min + intensity.max) / 2));
  else if (suggestion) w = String(suggestion.weightKg);
  else if (prev?.weight != null) w = String(prev.weight);

  let r = "";
  if (before && before.repsActual) r = before.repsActual;
  else if (suggestion) r = String(suggestion.reps);
  else if (prev?.reps != null) r = prev.reps;
  else if (range) r = String(range.min);
  return { w, r };
}

function targetText(range: RepRange | null, unit: string, amrap: boolean, raw: string | null): string {
  if (amrap) return "max";
  if (range) return `${formatRange(range)} ${unit}`;
  return raw ? `${raw} ${unit}` : "";
}

function ProgressBubble({ done, total, complete }: { done: number; total: number; complete: boolean }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <span className="relative w-10 h-10 shrink-0 flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(var(--ep-line-rgb),0.25)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={complete ? "var(--ep-ok)" : "var(--ep-accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      {complete ? (
        <Check size={16} strokeWidth={3} className="text-(--ep-ok)" />
      ) : (
        <span className="text-[11px] font-black tabular-nums text-(--ep-strong)">
          {done}/{total}
        </span>
      )}
    </span>
  );
}

// Bouton caméra / état de la vidéo d'une série.
function VideoControl({
  set,
  video,
  onFilm,
  onRetry,
  onSend,
  hasCoach,
}: {
  set: SetState;
  video: VideoState | undefined;
  onFilm: (file: File) => void;
  onRetry: () => void;
  onSend: () => void;
  hasCoach: boolean;
}) {
  const t = useT();
  if (video?.status === "uploading" || video?.status === "sending") {
    return (
      <span className="h-11 min-w-11 px-2 inline-flex items-center justify-center gap-1 text-[10px] font-black text-(--ep-ink)/60 tabular-nums">
        <Loader2 size={14} className="animate-spin" />
        {video.status === "uploading" && video.progress != null ? `${Math.round(video.progress * 100)} %` : null}
      </span>
    );
  }
  if (video?.status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="h-11 px-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-(--ep-bad)"
        title={video.error}
      >
        <RotateCw size={13} />
        {t("Réessayer")}
      </button>
    );
  }
  if (set.hasVideo && set.videoSentAt) {
    return (
      <span className="h-11 px-1.5 inline-flex items-center gap-1 text-[10px] font-black text-(--ep-ok)" title={t("Vidéo envoyée à ton coach")}>
        <Video size={13} />
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (set.hasVideo && hasCoach) {
    return (
      <button
        type="button"
        onClick={onSend}
        className="h-11 px-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-(--ep-accent)"
      >
        <Send size={13} />
        {t("Coach")}
      </button>
    );
  }
  if (set.hasVideo) {
    return (
      <span className="h-11 px-1.5 inline-flex items-center text-(--ep-ok)" title={t("Vidéo enregistrée")}>
        <Video size={14} />
      </span>
    );
  }
  return (
    <label
      className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl text-(--ep-ink)/45 active:bg-(--ep-line)/15 cursor-pointer"
      aria-label={t("Filmer cette série")}
      title={t("Filmer cette série")}
    >
      <Video size={17} />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFilm(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

// Chrono d'une série au temps (gainage, chaise) : démarre, s'arrête, remplit.
function HoldTimer({ onDone }: { onDone: (seconds: number) => void }) {
  const t = useT();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt]);
  return (
    <button
      type="button"
      onClick={() => {
        if (startedAt == null) {
          setElapsed(0);
          setStartedAt(Date.now());
        } else {
          onDone(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
          setStartedAt(null);
        }
      }}
      className={`w-full min-h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border ${
        startedAt != null
          ? "border-(--ep-yellow)/50 bg-(--ep-yellow)/10 text-(--ep-yellow)"
          : "border-(--ep-line)/30 bg-(--ep-s2) text-(--ep-ink)/70"
      }`}
    >
      <Timer size={14} />
      {startedAt != null ? `${elapsed} s · ${t("Stop")}` : t("Lancer le chrono")}
    </button>
  );
}

function SetEditor({
  ex,
  set,
  setIdx,
  totalSets,
  prefill,
  range,
  prevSet,
  isPRCandidate,
  video,
  hasCoach,
  onChange,
  onValidate,
  onRemove,
  onFilm,
  onRetryVideo,
  onSendVideo,
  onPause,
}: {
  ex: ExerciseState;
  set: SetState;
  setIdx: number;
  totalSets: number;
  prefill: { w: string; r: string };
  range: RepRange | null;
  prevSet: PrevWeight | null;
  isPRCandidate: (weight: number | null) => boolean;
  video: VideoState | undefined;
  hasCoach: boolean;
  onChange: (patch: Partial<SetState>) => void;
  onValidate: (values: Partial<SetState>) => void;
  onRemove: (() => void) | null;
  onFilm: (file: File) => void;
  onRetryVideo: () => void;
  onSendVideo: () => void;
  onPause: (seconds: number, label: string) => void;
}) {
  const t = useT();
  const [showScore, setShowScore] = useState(!!set.standardizationScore);
  const unitKey = ex.exercise.reps_unit;
  const unit = unitShort(unitKey);
  const form = techniqueForm(ex.exercise.technique, setIdx, totalSets);
  const w = set.weightKg !== "" ? set.weightKg : prefill.w;
  const r = set.repsActual !== "" ? set.repsActual : prefill.r;
  const weightNum = num(w);

  // Force et calisthenics : champs selon le type d'exercice (poids du corps,
  // lest, assistance), étape de skill, RPE, tentative de compétition.
  const loadMode = loadModeOf(ex.exercise, set);
  const bodyweight = isBodyweightMode(loadMode);
  const showCharge = !bodyweight || loadMode === "lest";
  const skill = skillFor(ex.exercise.name);
  const lastStep = parseDetails(prevSet?.details)?.step ?? null;
  const step = set.step ?? lastStep ?? (skill ? stepFromName(skill, ex.exercise.name) : null);
  const intensity = parseIntensity(ex.exercise.intensity);
  const mainLift = mainLiftFor(ex.exercise.name);
  const showRpe = intensity?.kind === "rpe" || !!form.attempt || !!form.backoff || form.mainLabel === "Top set" || (!!mainLift && ex.exercise.rir == null);
  const rpeNum = num(set.rpe ?? "");
  const e1rm = mainLift || intensity ? estimateE1rm(weightNum, r ? parseInt(r, 10) : null, rpeNum) : null;
  const showPR = showCharge && isPRCandidate(weightNum);

  // Sous-séries : lignes proposées d'office (vides) tant que rien n'est saisi.
  const segs: SegmentDraft[] =
    set.segs ?? (form.segments ? Array.from({ length: form.defaultCount }, () => ({ r: "" })) : []);
  const segWeight = (i: number): string => {
    if (segs[i]?.w) return segs[i].w as string;
    let base = weightNum;
    for (let k = 0; k <= i; k++) {
      const typed = k < i ? num(segs[k]?.w ?? "") : null;
      base = typed ?? dropWeight(base);
    }
    return base != null ? String(base) : "";
  };
  // Reps proposées pour une sous-série : celles de la dernière fois, sinon
  // un repère courant (5 pour une mini-série de myo-reps).
  const segReps = (i: number): string => {
    const last = prevDetailsSegs?.[i]?.reps;
    if (last != null) return String(last);
    if (form.segments === "myo") return "5";
    if (form.segments === "cluster" || form.segments === "drop") return prefill.r || "3";
    return "3";
  };
  const setSeg = (i: number, patch: Partial<SegmentDraft>) => {
    const next = segs.map((s, k) => (k === i ? { ...s, ...patch } : s));
    onChange({ segs: next });
  };

  const prevDetails = parseDetails(prevSet?.details);
  const prevDetailsSegs = prevDetails?.technique === ex.exercise.technique ? prevDetails?.segments : undefined;
  const lastLine =
    prevSet && (prevSet.weight != null || prevSet.reps != null)
      ? formatSetLine({
          weight: prevSet.weight,
          reps: prevSet.reps != null ? parseInt(prevSet.reps, 10) : null,
          unit: unitKey,
          details: prevDetails,
        })
      : null;

  const editing = !!set.wasValidated;

  return (
    <div className="rounded-xl border border-(--ep-accent)/45 bg-(--ep-s1) p-2.5 space-y-2.5">
      <div className="flex items-center gap-2 min-h-6">
        <span className="text-[11px] font-black uppercase tracking-wider text-(--ep-accent)">
          {form.mainLabel ? t(form.mainLabel) : `${t("Série")} ${setIdx + 1}/${totalSets}`}
        </span>
        <span className="text-[11px] text-(--ep-ink)/55 truncate">
          {form.amrap ? t("AMRAP : max de reps propres") : range ? `${t("cible")} ${targetText(range, unit, false, null)}` : ex.exercise.reps ? `${t("cible")} ${ex.exercise.reps} ${unit}` : ""}
          {ex.exercise.intensity ? ` · ${ex.exercise.intensity}` : ex.exercise.rir != null ? ` · RIR ${ex.exercise.rir}` : ""}
        </span>
        {showPR && (
          <span className="ml-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-(--ep-gold)/20 text-(--ep-gold) border border-(--ep-gold)/35">
            {t("🏆 PR")}
          </span>
        )}
        {onRemove && !showPR && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto -my-2 -mr-1.5 h-11 w-11 flex items-center justify-center text-(--ep-ink)/35"
            aria-label={t("Retirer cette série")}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {lastLine && (
        <p className="text-[11px] text-(--ep-ink)/50 -mt-1.5 truncate">
          {t("Dernière fois :")} <span className="font-bold text-(--ep-ink)/70">{lastLine}</span>
        </p>
      )}

      {(skill || (bodyweight && !mainLift) || set.mode) && (
        <div className="flex gap-1.5" role="group" aria-label={t("Type de charge")}>
          {BODYWEIGHT_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={loadMode === m.key}
              onClick={() => onChange({ mode: m.key })}
              className={`flex-1 min-h-11 rounded-xl border text-[11px] font-black uppercase tracking-wide ${
                loadMode === m.key
                  ? "bg-(--ep-accent)/15 border-(--ep-accent)/50 text-(--ep-accent)"
                  : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
              }`}
            >
              {t(m.label)}
            </button>
          ))}
        </div>
      )}

      {skill && (
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/40">
            {t("Étape")} · {t(skill.label)}
          </span>
          <div className="flex gap-1.5 mt-1 overflow-x-auto pb-0.5" role="group" aria-label={t("Étape de la progression")}>
            {skill.steps.map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={step === st}
                onClick={() => onChange({ step: st })}
                className={`shrink-0 min-h-11 px-3 rounded-xl border text-xs font-black whitespace-nowrap ${
                  step === st
                    ? "bg-(--ep-gold)/20 border-(--ep-gold)/60 text-(--ep-gold)"
                    : stepIndex(skill, step) > skill.steps.indexOf(st)
                      ? "bg-(--ep-okbg) border-(--ep-ok)/25 text-(--ep-ink)/70"
                      : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
                }`}
              >
                {t(st)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {showCharge && (
          <Stepper
            label={loadMode === "lest" ? t("Lest") : t("Charge")}
            unit={loadMode === "lest" ? t("+ kg") : "kg"}
            decimal
            value={set.weightKg}
            placeholder={prefill.w || undefined}
            step={weightStep(weightNum)}
            onChange={(v) => onChange({ weightKg: v })}
          />
        )}
        {loadMode === "assistance" && (
          <Stepper
            label={t("Aide")}
            unit={t("− kg")}
            decimal
            value={set.assistKg ?? ""}
            placeholder={parseDetails(prevSet?.details)?.assist_kg ? String(parseDetails(prevSet?.details)?.assist_kg) : undefined}
            step={2.5}
            onChange={(v) => onChange({ assistKg: v })}
          />
        )}
        <Stepper
          label={unitKey === "sec" ? t("Secondes") : unitKey === "m" ? t("Mètres") : t("Reps")}
          unit={unitKey === "sec" ? t("secondes") : unitKey === "m" ? t("mètres") : t("reps")}
          value={set.repsActual}
          placeholder={prefill.r || undefined}
          step={repsStep(unitKey)}
          onChange={(v) => onChange({ repsActual: v })}
        />
      </div>

      {(unitKey === "sec" || ex.exercise.technique === "isometric") && (
        <HoldTimer onDone={(s) => onChange({ repsActual: String(s) })} />
      )}

      {(e1rm != null || intensity?.kind === "pct") && (
        <p className="text-[11px] text-(--ep-ink)/55 -mt-1">
          {e1rm != null && (
            <>
              {t("1RM estimé")} <span className="font-black text-(--ep-strong)">≈ {formatKg(e1rm)}{"\u00a0"}kg</span>
            </>
          )}
          {intensity?.kind === "pct" && ex.exercise.intensity ? ` · ${formatIntensity(ex.exercise.intensity)}` : ""}
        </p>
      )}

      {form.attempt && (
        <div className="flex gap-1.5" role="group" aria-label={t("Résultat de la barre")}>
          {[
            { v: true, label: t("Barre validée") },
            { v: false, label: t("Barre ratée") },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              aria-pressed={set.made === o.v}
              onClick={() => onChange({ made: set.made === o.v ? undefined : o.v })}
              className={`flex-1 min-h-11 rounded-xl border text-xs font-black uppercase tracking-wide ${
                set.made === o.v
                  ? o.v
                    ? "bg-(--ep-okbg) border-(--ep-ok)/60 text-(--ep-ok)"
                    : "bg-(--ep-warn)/15 border-(--ep-warn)/60 text-(--ep-warn)"
                  : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {form.segments && (
        <div className="space-y-1.5">
          {segs.map((s, i) => (
            <div
              key={i}
              className={form.segments === "drop" ? "grid grid-cols-2 gap-x-2 gap-y-1" : "flex items-center gap-1.5"}
            >
              <span
                className={`text-[10px] font-black uppercase leading-tight text-(--ep-ink)/50 ${
                  form.segments === "drop" ? "col-span-2" : "w-[54px] shrink-0"
                }`}
              >
                {t(segmentLabel(form.segments!, i))}
                {form.segments === "drop" ? ` · ${t("sans repos")}` : ""}
              </span>
              {form.segments === "drop" && (
                <Stepper
                  compact
                  label={`${t(segmentLabel(form.segments, i))} ${t("charge")}`}
                  unit="kg"
                  decimal
                  value={s.w ?? ""}
                  placeholder={segWeight(i)}
                  step={weightStep(num(segWeight(i)))}
                  onChange={(v) => setSeg(i, { w: v })}
                />
              )}
              <Stepper
                compact
                label={`${t(segmentLabel(form.segments!, i))} ${t("reps")}`}
                unit={unit}
                value={s.r}
                placeholder={segReps(i)}
                step={1}
                onChange={(v) => setSeg(i, { r: v, ...(form.segments === "drop" && !s.w ? { w: segWeight(i) } : {}) })}
              />
              {form.pauseSeconds && form.segments !== "drop" && (
                <button
                  type="button"
                  onClick={() => onPause(form.pauseSeconds!, `${t(techniqueLabel(ex.exercise.technique) ?? "Pause")} · ${t(segmentLabel(form.segments!, i))}`)}
                  className="h-11 w-11 shrink-0 rounded-xl border border-(--ep-line)/25 bg-(--ep-s2) flex flex-col items-center justify-center text-(--ep-ink)/60"
                  aria-label={`${t("Pause de")} ${form.pauseSeconds} ${t("secondes")}`}
                >
                  <Timer size={12} />
                  <span className="text-[9px] font-black leading-3">{form.pauseSeconds}s</span>
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ segs: [...segs, { r: "" }] })}
              className="min-h-11 flex-1 rounded-xl border border-dashed border-(--ep-line)/30 text-[10px] font-black uppercase tracking-wider text-(--ep-ink)/55 flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              {form.segments === "drop" ? t("Palier") : form.segments === "cluster" ? t("Bloc") : form.segments === "myo" ? t("Mini-série") : t("Pause")}
            </button>
            {segs.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ segs: segs.slice(0, -1) })}
                className="min-h-11 px-3 rounded-xl border border-dashed border-(--ep-line)/30 text-[10px] font-black uppercase tracking-wider text-(--ep-ink)/45"
                aria-label={t("Retirer la dernière")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {form.partials && (
        <div className="flex items-center gap-1.5">
          <span className="w-[54px] shrink-0 text-[10px] font-black uppercase leading-tight text-(--ep-ink)/50">
            {t("Partielles")}
          </span>
          <Stepper
            compact
            label={t("Reps partielles")}
            unit={t("reps")}
            value={set.partials ?? ""}
            step={1}
            onChange={(v) => onChange({ partials: v })}
          />
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{showRpe ? t("RPE réel") : t("RIR réel")}</span>
          <button
            type="button"
            onClick={() => setShowScore((v) => !v)}
            className="min-h-11 -my-3.5 px-1 inline-flex items-center text-[10px] font-bold text-(--ep-ink)/45"
          >
            {showScore ? t("Masquer l'exécution") : t("+ Exécution")}
          </button>
        </div>
        {showRpe ? (
          <div className="grid grid-cols-8 gap-1" role="group" aria-label={t("RPE réel")}>
            {RPE_CHOICES.map((v) => {
              const selected = set.rpe === String(v);
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`RPE ${v}`}
                  onClick={() => onChange(selected ? { rpe: "", rirActual: "" } : { rpe: String(v), rirActual: String(rpeToRir(v)) })}
                  className={`h-11 rounded-lg border text-[12px] font-black tabular-nums ${
                    selected
                      ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)"
                      : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
                  }`}
                >
                  {String(v).replace(".", ",")}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1" role="group" aria-label={t("RIR réel")}>
          {RIR_CHOICES.map((v) => {
            const selected = set.rirActual === String(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={selected}
                aria-label={`RIR ${v}`}
                onClick={() => onChange({ rirActual: selected ? "" : String(v) })}
                className={`h-11 rounded-lg border text-sm font-black tabular-nums ${
                  selected
                    ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)"
                    : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
                }`}
              >
                {v}
              </button>
            );
          })}
          </div>
        )}
        {showScore && (
          <div className="grid grid-cols-5 gap-1 mt-1.5" role="group" aria-label={t("Exécution")}>
            {SCORE_CHOICES.map((v) => {
              const selected = set.standardizationScore === String(v);
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${t("Exécution")} ${v} / 5`}
                  onClick={() => onChange({ standardizationScore: selected ? "" : String(v) })}
                  className={`h-11 rounded-lg border text-sm font-black ${
                    selected
                      ? "bg-(--ep-gold)/20 border-(--ep-gold)/60 text-(--ep-gold)"
                      : "bg-(--ep-s2) border-(--ep-line)/25 text-(--ep-ink)/60"
                  }`}
                >
                  ★{v}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-xl border border-(--ep-line)/25 bg-(--ep-s2)">
          <VideoControl set={set} video={video} onFilm={onFilm} onRetry={onRetryVideo} onSend={onSendVideo} hasCoach={hasCoach} />
        </span>
        <button
          type="button"
          disabled={set.saving}
          onClick={() =>
            onValidate({
              weightKg: showCharge ? w : "",
              repsActual: r,
              ...(skill && step ? { step } : {}),
              // Sous-séries non retouchées : la valeur proposée est retenue,
              // comme pour la charge et les reps de la série principale.
              ...(form.segments
                ? {
                    segs: segs.map((s, i) => ({
                      ...s,
                      r: s.r || segReps(i),
                      ...(form.segments === "drop" ? { w: s.w || segWeight(i) } : {}),
                    })),
                  }
                : {}),
            })
          }
          className="flex-1 min-h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-(--ep-strong) bg-(--ep-accent) disabled:opacity-60"
        >
          {set.saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
          {editing ? t("Mettre à jour") : t("Valider")}
          {!editing && (w || r || bodyweight) ? (
            <span className="font-bold normal-case tracking-normal opacity-85 truncate">
              {formatSetLine({
                weight: showCharge ? num(w) : null,
                reps: r ? parseInt(r, 10) : null,
                unit: unitKey,
                details: buildDetails(null, form, undefined, undefined, setExtra(ex.exercise, { ...set, step: skill ? step ?? undefined : undefined })),
              })}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export default function ExerciseBlock({
  ex,
  focused,
  deferred,
  supersetTag,
  chainNextName,
  prevSets,
  prevWeight,
  recordHolderId,
  getPrThreshold,
  libraryTip,
  videoStates,
  hasCoach,
  canMoveUp,
  canMoveDown,
  onFocus,
  onSetChange,
  onValidateSet,
  onEditSet,
  onRemoveSet,
  onAddSet,
  onRetrySave,
  onBusy,
  onReplace,
  onRemove,
  onMove,
  onNotesChange,
  onFilm,
  onRetryVideo,
  onSendVideo,
  onPause,
}: {
  ex: ExerciseState;
  focused: boolean;
  deferred: boolean;
  supersetTag: string | null;
  chainNextName: string | null;
  prevSets: PrevWeight[];
  prevWeight: PrevWeight | null;
  recordHolderId: string | null;
  getPrThreshold: (excludeLocalId: string) => number | null;
  libraryTip?: LibraryTip;
  videoStates: Record<string, VideoState>;
  hasCoach: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onFocus: () => void;
  onSetChange: (setIdx: number, patch: Partial<SetState>) => void;
  onValidateSet: (setIdx: number, values: Partial<SetState>) => void;
  onEditSet: (setIdx: number) => void;
  onRemoveSet: (setIdx: number) => void;
  onAddSet: () => void;
  onRetrySave: (setIdx: number) => void;
  onBusy: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onNotesChange: (notes: string) => void;
  onFilm: (setIdx: number, file: File) => void;
  onRetryVideo: (setIdx: number) => void;
  onSendVideo: (setIdx: number) => void;
  onPause: (seconds: number, label: string) => void;
}) {
  const t = useT();
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const exercise = ex.exercise;
  const unitKey = exercise.reps_unit;
  const unit = unitShort(unitKey);
  const total = ex.sets.length;
  const done = ex.sets.filter((s) => s.validated).length;
  const complete = total > 0 && done === total;
  const ranges = parseRepScheme(exercise.reps, exercise.sets);
  const rangesDiffer = ranges != null && ranges.some((rg) => rg.min !== ranges[0].min || rg.max !== ranges[0].max);
  const technique = techniqueLabel(exercise.technique);
  const techniqueTip = techniqueHint(exercise.technique);
  const tempoText = describeTempo(exercise.tempo);
  const programNotes = exercise.notes?.trim() || null;
  const tensionLabel = exercise.tension_focus ? TENSION_FOCUS_LABELS[exercise.tension_focus] ?? null : null;
  const libraryInstructions = libraryTip?.instructions?.trim() || null;
  const hasPR = recordHolderId != null && ex.sets.some((s) => s.localId === recordHolderId);

  // Série active : celle choisie au doigt, sinon la première pas encore faite.
  const firstOpen = ex.sets.findIndex((s) => !s.validated);
  const chosen = selected ? ex.sets.findIndex((s) => s.localId === selected && !s.validated) : -1;
  const activeIdx = chosen !== -1 ? chosen : firstOpen;

  // Déplié par le parent (exercice en cours) : remonte en haut de l'écran.
  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focused]);

  const prescription = (() => {
    const parts: string[] = [];
    if (ranges && rangesDiffer) parts.push(`${total} × ${ranges.map(formatRange).join("/")} ${unit}`);
    else if (ranges) parts.push(`${total} × ${formatRange(ranges[0])} ${unit}`);
    else if (exercise.reps) parts.push(`${total} × ${exercise.reps} ${unit}`);
    else parts.push(`${total} ${total > 1 ? t("séries") : t("série")}`);
    if (chainNextName) parts.push(t("sans repos"));
    else if (exercise.rest_seconds) parts.push(formatRest(exercise.rest_seconds) ?? "");
    return parts.filter(Boolean).join(" · ");
  })();
  const last = prevSets[0] ?? prevWeight;
  const lastText =
    last && last.weight != null
      ? `${formatKg(last.weight)}\u00a0kg${last.reps ? `\u00a0×\u00a0${last.reps}` : ""}`
      : last?.reps
        ? `${last.reps}\u00a0${unit}`
        : null;

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const chip = (p: Panel, label: string, active = false) => (
    <button
      key={p}
      type="button"
      onClick={() => togglePanel(p)}
      aria-expanded={panel === p}
      className="min-h-11 flex items-center shrink-0"
    >
      <span
        className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
          panel === p
            ? "bg-(--ep-accent)/15 text-(--ep-accent) border-(--ep-accent)/40"
            : active
              ? "bg-(--ep-gold)/12 text-(--ep-gold) border-(--ep-gold)/35"
              : "bg-(--ep-s2) text-(--ep-ink)/60 border-(--ep-line)/25"
        }`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div
      ref={rootRef}
      className={`scroll-mt-20 rounded-2xl border transition-colors ${
        focused ? "border-(--ep-accent)/50 bg-(--ep-s3)" : "border-(--ep-line)/20 bg-(--ep-s1)"
      }`}
    >
      {/* Ligne serrée : tout ce qu'il faut savoir sans déplier. */}
      <button
        type="button"
        onClick={onFocus}
        aria-expanded={focused}
        className="w-full min-h-14 flex items-center gap-2.5 px-2.5 py-2 text-left"
      >
        <ProgressBubble done={done} total={total} complete={complete} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            {supersetTag && (
              <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-(--ep-accent)/15 text-(--ep-accent)">
                {supersetTag}
              </span>
            )}
            <span className={`min-w-0 line-clamp-2 break-words text-sm leading-[18px] font-black ${complete && !focused ? "text-(--ep-ink)/55" : "text-(--ep-strong)"}`}>
              {exercise.name}
            </span>
            {hasPR && <span className="shrink-0 text-xs" aria-label={t("Record")}>🏆</span>}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-(--ep-ink)/55 leading-4 mt-0.5 min-w-0">
            <span className="line-clamp-2">
              {prescription}
              {lastText ? ` · ${t("Dern.")}\u00a0${lastText}` : ""}
            </span>
          </span>
          {(deferred || (technique && !focused) || exercise.replaces) && (
            <span className="flex flex-wrap gap-1 mt-1">
              {deferred && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-(--ep-yellow)/12 text-(--ep-yellow)">
                  <Clock3 size={9} />
                  {t("À reprendre")}
                </span>
              )}
              {technique && !focused && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-(--ep-gold)/12 text-(--ep-gold)">
                  {t(technique)}
                </span>
              )}
              {exercise.replaces && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-(--ep-s2) text-(--ep-ink)/55 truncate max-w-[180px]">
                  {t("remplace")} {exercise.replaces}
                </span>
              )}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-(--ep-ink)/35 transition-transform"
          style={{ transform: focused ? "rotate(180deg)" : undefined }}
        />
      </button>

      {focused && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {/* Repères du programme, un seul ouvert à la fois. */}
          <div className="flex gap-1.5 overflow-x-auto -mx-2.5 px-2.5 -my-1 [scrollbar-width:none]">
            {technique && chip("technique", t(technique), true)}
            {exercise.tempo && chip("tempo", `${t("Tempo")} ${exercise.tempo}`, true)}
            {programNotes && chip("consigne", t("Consigne"))}
            {prevSets.length > 0 && chip("history", t("Dernière fois"))}
            {chip("tips", t("Conseils"))}
            {chip("note", ex.clientNotes ? t("Ma note ✓") : t("Ma note"))}
          </div>

          {chainNextName && (
            <p className="text-[11px] font-bold text-(--ep-accent) leading-snug">
              {t("Superset : enchaîne avec")} {chainNextName}
            </p>
          )}

          {panel && panel !== "more" && (
            <div className="rounded-xl bg-(--ep-s2) border border-(--ep-line)/20 px-3 py-2.5 text-xs text-(--ep-ink)/75 leading-relaxed">
              {panel === "technique" && techniqueTip && (
                <p>
                  <b className="text-(--ep-gold)">{t(technique ?? "")} :</b> {t(techniqueTip)}
                </p>
              )}
              {panel === "tempo" && (
                <p>
                  <b className="text-(--ep-gold)">{t("Tempo")} {exercise.tempo} :</b> {tempoText ?? exercise.tempo}
                </p>
              )}
              {panel === "consigne" && <p className="whitespace-pre-wrap break-words">{programNotes}</p>}
              {panel === "history" && (
                <ul className="space-y-1">
                  {prevSets.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-12 shrink-0 text-(--ep-ink)/40 font-bold">
                        {t("Série")} {i + 1}
                      </span>
                      <span className="font-bold text-(--ep-strong)">
                        {formatSetLine({
                          weight: s.weight,
                          reps: s.reps != null ? parseInt(s.reps, 10) : null,
                          unit: unitKey,
                          details: parseDetails(s.details),
                        })}
                        {s.rir != null ? ` · RIR ${s.rir}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {panel === "tips" && (
                <div className="space-y-2">
                  {tensionLabel && (
                    <p>
                      <b>{t("Focus :")}</b> {tensionLabel}
                    </p>
                  )}
                  {libraryInstructions ? (
                    <p className="whitespace-pre-wrap">{libraryInstructions}</p>
                  ) : (
                    <ul className="space-y-1">
                      {getTips(exercise.name).map((tip, i) => (
                        <li key={i}>
                          {i + 1}. {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                  {libraryTip?.video_url && safeExternalUrl(libraryTip.video_url) && (
                    <a
                      href={safeExternalUrl(libraryTip.video_url) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-11 font-bold text-(--ep-accent)"
                    >
                      <ExternalLink size={12} />
                      {t("Voir la vidéo d'exemple")}
                    </a>
                  )}
                </div>
              )}
              {panel === "note" && (
                <textarea
                  value={ex.clientNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder={t("Ex. réglage du siège, gêne à l'épaule, ressenti...")}
                  aria-label={t("Ta note sur cet exercice")}
                  rows={2}
                  className="w-full bg-(--ep-s1) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) placeholder:text-(--ep-ink)/30 focus:outline-none focus:border-(--ep-accent)/50 resize-none"
                />
              )}
            </div>
          )}

          {/* Séries */}
          <div className="space-y-1.5">
            {ex.sets.map((s, idx) => {
              const range = rangeForSet(ranges, idx);
              const form = techniqueForm(exercise.technique, idx, total);
              if (idx === activeIdx) {
                return (
                  <SetEditor
                    key={s.localId}
                    ex={ex}
                    set={s}
                    setIdx={idx}
                    totalSets={total}
                    prefill={prefillFor(ex, idx, prevSets, prevWeight)}
                    range={range}
                    prevSet={prevSets[idx] ?? null}
                    isPRCandidate={(w) => {
                      const th = getPrThreshold(s.localId);
                      return w != null && w > 0 && (th == null || w > th);
                    }}
                    video={videoStates[s.localId]}
                    hasCoach={hasCoach}
                    onChange={(patch) => onSetChange(idx, patch)}
                    onValidate={(values) => {
                      setSelected(null);
                      onValidateSet(idx, values);
                    }}
                    onRemove={total > 1 ? () => onRemoveSet(idx) : null}
                    onFilm={(file) => onFilm(idx, file)}
                    onRetryVideo={() => onRetryVideo(idx)}
                    onSendVideo={() => onSendVideo(idx)}
                    onPause={onPause}
                  />
                );
              }
              if (s.validated) {
                const isRecord = s.localId === recordHolderId;
                return (
                  <div
                    key={s.localId}
                    className="flex items-center gap-1 rounded-xl bg-(--ep-okbg) border border-(--ep-ok)/20 pl-1"
                  >
                    <button
                      type="button"
                      onClick={() => onEditSet(idx)}
                      className="flex-1 min-w-0 min-h-11 flex items-center gap-2 text-left"
                      aria-label={`${t("Modifier la série")} ${idx + 1}`}
                    >
                      <span className="w-7 h-7 shrink-0 rounded-full bg-(--ep-ok)/20 text-(--ep-ok) flex items-center justify-center text-[11px] font-black">
                        {idx + 1}
                      </span>
                      <span className="min-w-0 truncate text-sm font-black text-(--ep-strong) tabular-nums">
                        {formatSetLine({
                          weight: num(s.weightKg),
                          reps: s.repsActual ? parseInt(s.repsActual, 10) : null,
                          unit: unitKey,
                          details: buildDetails(exercise.technique, form, s.segs, s.partials, setExtra(exercise, s)),
                        })}
                      </span>
                      {s.rirActual !== "" && !s.rpe && (
                        <span className="shrink-0 text-[11px] font-bold text-(--ep-ink)/50">RIR {s.rirActual}</span>
                      )}
                      {isRecord && <span className="shrink-0 text-xs">🏆</span>}
                      <Pencil size={11} className="shrink-0 text-(--ep-ink)/25 ml-auto" />
                    </button>
                    {s.saveFailed ? (
                      <button
                        type="button"
                        onClick={() => onRetrySave(idx)}
                        disabled={s.saving}
                        className="h-11 px-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-(--ep-warn)"
                        title={t("Pas encore enregistrée, vérifie ta connexion.")}
                      >
                        {s.saving ? <Loader2 size={13} className="animate-spin" /> : <AlertCircle size={13} />}
                        {t("Renvoyer")}
                      </button>
                    ) : (
                      <VideoControl
                        set={s}
                        video={videoStates[s.localId]}
                        onFilm={(file) => onFilm(idx, file)}
                        onRetry={() => onRetryVideo(idx)}
                        onSend={() => onSendVideo(idx)}
                        hasCoach={hasCoach}
                      />
                    )}
                  </div>
                );
              }
              return (
                <div key={s.localId} className="flex items-center gap-1 rounded-xl border border-(--ep-line)/15 pl-1">
                  <button
                    type="button"
                    onClick={() => setSelected(s.localId)}
                    className="flex-1 min-w-0 min-h-11 flex items-center gap-2 text-left"
                    aria-label={`${t("Passer à la série")} ${idx + 1}`}
                  >
                    <span className="w-7 h-7 shrink-0 rounded-full border border-(--ep-line)/35 text-(--ep-ink)/45 flex items-center justify-center text-[11px] font-black">
                      {idx + 1}
                    </span>
                    <span className="truncate text-xs text-(--ep-ink)/50">
                      {form.amrap ? t("AMRAP") : targetText(range, unit, false, exercise.reps)}
                      {form.segments ? ` · ${t(techniqueLabel(exercise.technique) ?? "")}` : ""}
                    </span>
                  </button>
                  {total > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSet(idx)}
                      className="h-11 w-11 shrink-0 flex items-center justify-center text-(--ep-ink)/30"
                      aria-label={`${t("Retirer la série")} ${idx + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions de l'exercice : 4 gros boutons, le reste dans « Plus ». */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[
              { key: "add", icon: <Plus size={15} />, label: t("Série"), onClick: onAddSet },
              { key: "busy", icon: <Clock3 size={15} />, label: t("Occupée"), onClick: onBusy },
              { key: "swap", icon: <Repeat size={15} />, label: t("Changer"), onClick: onReplace },
              { key: "more", icon: <MoreHorizontal size={15} />, label: t("Plus"), onClick: () => togglePanel("more") },
            ].map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                aria-expanded={a.key === "more" ? panel === "more" : undefined}
                className={`min-h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase tracking-wide ${
                  a.key === "more" && panel === "more"
                    ? "border-(--ep-accent)/40 text-(--ep-accent) bg-(--ep-accent)/10"
                    : "border-(--ep-line)/25 text-(--ep-ink)/65 bg-(--ep-s2)"
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
          {panel === "more" && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => onMove(-1)}
                className="min-h-11 rounded-xl border border-(--ep-line)/25 bg-(--ep-s2) text-[10px] font-black uppercase text-(--ep-ink)/65 flex items-center justify-center gap-1 disabled:opacity-30"
              >
                <ChevronUp size={14} />
                {t("Monter")}
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => onMove(1)}
                className="min-h-11 rounded-xl border border-(--ep-line)/25 bg-(--ep-s2) text-[10px] font-black uppercase text-(--ep-ink)/65 flex items-center justify-center gap-1 disabled:opacity-30"
              >
                <ChevronDown size={14} />
                {t("Descendre")}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="min-h-11 rounded-xl border border-(--ep-bad)/35 bg-(--ep-bad)/10 text-[10px] font-black uppercase text-(--ep-bad) flex items-center justify-center gap-1"
              >
                <Trash2 size={13} />
                {t("Retirer")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
