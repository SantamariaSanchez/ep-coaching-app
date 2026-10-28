"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useRef, useState, useTransition } from "react";
import { Target, Sliders, Flame, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, History, Lightbulb, AlertTriangle, Undo2, Pencil } from "lucide-react";
import {
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  PHASE_ORDER,
  PHASE_DEFAULT_WEEKS,
  phaseChangeKind,
  phaseWeekNumber,
  plannedPhaseEnd,
  type CoachingPhase,
  type CoachingPhaseState,
  type AdherenceSignal,
  type PhaseSuggestion,
  type CoachingPhaseHistoryEntry,
} from "@/lib/coaching-phase-helpers";
import { initCoachingPhase, advanceCoachingPhase, undoCoachingPhase, updateCoachingPhaseDetails, getCoachingPhaseHistoryAction } from "@/app/dashboard/coach/clients/[id]/coaching-phase/actions";
import { safeAction } from "@/lib/safe-action";

const PHASE_ICON: Record<CoachingPhase, typeof Target> = {
  calibrage: Target,
  optimisation: Sliders,
  performance: Flame,
};

function formatSince(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

// Panneau strictement côté coach — jamais rendu sur /dashboard/client/**.
// Montre la phase de coaching en cours, les signaux d'adhésion (calibrage
// uniquement) et les suggestions de décision, avec un bouton de transition
// explicite : le coach garde toujours la main, le système ne fait que
// suggérer (voir lib/coaching-phase-helpers.ts pour le détail des règles).
export default function CoachingPhasePanel({
  clientId,
  phase,
  signals,
  suggestions,
}: {
  clientId: string;
  phase: CoachingPhaseState | null;
  signals: AdherenceSignal[];
  suggestions: PhaseSuggestion[];
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CoachingPhaseHistoryEntry[] | null>(null);
  // Phase choisie dans la liste, en attente de confirmation (rien n'est appliqué au clic).
  const [target, setTarget] = useState<CoachingPhase | null>(null);
  const [startedOn, setStartedOn] = useState("");
  const [weeks, setWeeks] = useState("");
  // Bandeau « Annuler » juste après un changement.
  const [undo, setUndo] = useState<{ rowId: string; from: CoachingPhase | null; to: CoachingPhase } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editWeeks, setEditWeeks] = useState("");

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  function openTarget(p: CoachingPhase) {
    setError(null);
    setTarget(p);
    setNote("");
    setStartedOn("");
    setWeeks(String(PHASE_DEFAULT_WEEKS[p]));
  }

  function handleInit() {
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => initCoachingPhase(clientId));
      if (result.error) setError(result.error);
    });
  }

  function handleConfirm() {
    if (!target) return;
    setError(null);
    const to = target;
    startTransition(async () => {
      const w = weeks.trim() === "" ? null : Number(weeks);
      const result = await safeAction(() =>
        advanceCoachingPhase(clientId, to, note || undefined, { startedOn: startedOn || null, plannedWeeks: w })
      );
      if (result.error) {
        // Le formulaire reste ouvert : on corrige et on réessaie sans tout retaper.
        setError(result.error);
        return;
      }
      const data = result as { newId?: string; fromPhase?: CoachingPhase | null };
      setTarget(null);
      setNote("");
      setHistory(null);
      if (data.newId) {
        setUndo({ rowId: data.newId, from: data.fromPhase ?? null, to });
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndo(null), 30_000);
      }
    });
  }

  function handleUndo() {
    if (!undo) return;
    const rowId = undo.rowId;
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => undoCoachingPhase(clientId, rowId));
      if (result.error) {
        setError(result.error);
        return;
      }
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setUndo(null);
      setHistory(null);
    });
  }

  function openEdit() {
    setError(null);
    setEditStart(phase ? phase.since.slice(0, 10) : "");
    setEditWeeks(phase?.plannedWeeks ? String(phase.plannedWeeks) : "");
    setEditOpen(true);
  }

  function handleSaveEdit() {
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() =>
        updateCoachingPhaseDetails(clientId, {
          startedOn: editStart || null,
          plannedWeeks: editWeeks.trim() === "" ? null : Number(editWeeks),
        })
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditOpen(false);
      setHistory(null);
    });
  }

  function toggleHistory() {
    const willOpen = !historyOpen;
    setHistoryOpen(willOpen);
    if (willOpen && history === null) {
      getCoachingPhaseHistoryAction(clientId).then(setHistory);
    }
  }

  if (!phase) {
    return (
      <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Target size={18} className="text-(--ep-ink)/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-(--ep-strong)">{t("Phase de coaching non suivie")}</p>
            <p className="text-[11px] text-(--ep-ink)/40">
              {t("Ce client est coaché mais aucune phase n'a encore été démarrée (probablement actif avant l'ajout de cette fonctionnalité).")}
            </p>
          </div>
          <button
            onClick={handleInit}
            disabled={isPending}
            className="flex-shrink-0 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : t("Démarrer le calibrage")}
          </button>
        </div>
        {error && <p className="text-[11px] text-(--ep-accent) mt-2">{t(error)}</p>}
      </div>
    );
  }

  const Icon = PHASE_ICON[phase.phase];
    const age = daysSince(phase.since);

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-(--ep-accent)/12 border border-(--ep-accent)/25 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-(--ep-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-(--ep-strong)">
            {t("Phase")}{" "}{PHASE_LABELS[phase.phase]}
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--ep-line)/15 text-(--ep-ink)/45 border border-(--ep-line)/20">
              {t("depuis")}{" "}{age}{" "}{t("jour")}{age !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="text-[11px] text-(--ep-ink)/40 mt-0.5">
            {PHASE_DESCRIPTIONS[phase.phase]}{" "}{t("Débutée le")}{" "}{formatSince(phase.since)}.
          </p>
          {phase.plannedWeeks ? (
            <p className="text-[11px] text-(--ep-ink)/55 mt-0.5">
              {t("Semaine")}{" "}{Math.min(phaseWeekNumber(phase.since), phase.plannedWeeks)}{" "}{t("sur")}{" "}{phase.plannedWeeks}
              {plannedPhaseEnd(phase.since, phase.plannedWeeks) ? `${t(", fin prévue le")} ${formatSince(plannedPhaseEnd(phase.since, phase.plannedWeeks) as string)}` : ""}.
            </p>
          ) : null}
        </div>
      </div>

      {/* Signaux d'adhésion — calibrage uniquement, voir computeCalibrationSignals */}
      {phase.phase === "calibrage" && signals.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15 space-y-2">
          {signals.map((sig) => (
            <div key={sig.id} className="flex items-start gap-2.5">
              {sig.ok === null ? (
                <MinusCircle size={13} className="text-(--ep-ink)/25 mt-0.5 flex-shrink-0" />
              ) : sig.ok ? (
                <CheckCircle2 size={13} className="text-(--ep-strong) mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={13} className="text-(--ep-accent) mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-semibold text-(--ep-ink)/75">{sig.label}</p>
                <p className="text-[10.5px] text-(--ep-ink)/40">{sig.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions de décision — voir generateCoachingPhaseSuggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15 space-y-2.5">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-2.5">
              {s.severity === "warning" ? (
                <AlertTriangle size={13} className="text-(--ep-accent) mt-0.5 flex-shrink-0" />
              ) : (
                <Lightbulb size={13} className="text-(--ep-ink)/30 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-xs text-(--ep-ink)/70 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bandeau d'annulation juste après un changement */}
      {undo && (
        <div role="status" className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-(--ep-accent)/30 bg-(--ep-accent)/10 px-3 py-2.5">
          <p className="flex-1 text-xs text-(--ep-strong)">
            {undo.from ? `${t("Phase changée")} : ${PHASE_LABELS[undo.from]} → ${PHASE_LABELS[undo.to]}.` : `${t("Phase démarrée")} : ${PHASE_LABELS[undo.to]}.`}
          </p>
          <button
            onClick={handleUndo}
            disabled={isPending}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-2) disabled:opacity-50"
          >
            <Undo2 size={12} />
            {t("Annuler")}
          </button>
        </div>
      )}

      {/* Choix de la phase : rien ne s'applique au clic, une confirmation précède toujours. */}
      <div className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15">
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-2">{t("Changer de phase")}</p>
        <div className="grid grid-cols-3 gap-2">
          {PHASE_ORDER.map((p) => {
            const isCurrent = p === phase.phase;
            const PIcon = PHASE_ICON[p];
            return (
              <button
                key={p}
                type="button"
                disabled={isPending}
                aria-pressed={target === p}
                onClick={() => openTarget(p)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  target === p
                    ? "border-(--ep-accent) bg-(--ep-accent)/12 text-(--ep-strong)"
                    : isCurrent
                      ? "border-(--ep-accent)/40 bg-(--ep-accent)/6 text-(--ep-strong)"
                      : "border-(--ep-line)/25 text-(--ep-ink)/60 hover:border-(--ep-line)/50"
                }`}
              >
                <PIcon size={14} />
                {PHASE_LABELS[p]}
                {isCurrent && <span className="text-[8.5px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">{t("en cours")}</span>}
              </button>
            );
          })}
        </div>

        {target && (
          <div className="mt-3 rounded-lg border border-(--ep-line)/25 bg-(--ep-shade)/20 p-3 space-y-2.5">
            <p className="text-xs font-semibold text-(--ep-strong)">
              {target === phase.phase
                ? `${t("Ouvrir un nouveau bloc de")} ${PHASE_LABELS[target]} ?`
                : phaseChangeKind(phase.phase, target) === "backward"
                  ? `${t("Revenir à la phase")} ${PHASE_LABELS[target]} ?`
                  : `${t("Passer en phase")} ${PHASE_LABELS[target]} ?`}
            </p>
            <p className="text-[11px] text-(--ep-ink)/50 leading-relaxed">
              {t("La phase en cours sera clôturée à la date de début choisie. Le client ne voit jamais ces phases. Tu pourras annuler juste après, ou modifier et changer de phase librement ensuite.")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
                {t("Date de début")}
                <input
                  type="date"
                  value={startedOn}
                  onChange={(e) => setStartedOn(e.target.value)}
                  className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
                />
                <span className="block mt-0.5 normal-case tracking-normal font-normal text-(--ep-ink)/30">{t("Vide : aujourd'hui")}</span>
              </label>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
                {t("Durée prévue (semaines)")}
                <input
                  type="number"
                  min={1}
                  max={52}
                  inputMode="numeric"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
                />
              </label>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("Note optionnelle sur cette transition...")} aria-label={t("Note optionnelle sur cette transition...")}
              className="w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) placeholder-(--ep-ink)/20 focus:outline-none focus:border-(--ep-accent)/50"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : t("Confirmer")}
              </button>
              <button
                onClick={() => setTarget(null)}
                disabled={isPending}
                className="flex-shrink-0 text-(--ep-ink)/50 hover:text-(--ep-ink)/80 text-[11px] font-semibold uppercase tracking-widest px-3 py-2.5"
              >
                {t("Annuler")}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-[11px] text-(--ep-accent) mt-2">{t(error)}</p>}
      </div>

      {/* Modifier la phase en cours sans en changer */}
      <div className="mt-3 pt-3 border-t border-(--ep-line)/15">
        {!editOpen ? (
          <button
            onClick={openEdit}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-ink)/75 transition-colors"
          >
            <Pencil size={11} />
            {t("Modifier la phase en cours")}
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
                {t("Date de début")}
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
                />
              </label>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
                {t("Durée prévue (semaines)")}
                <input
                  type="number"
                  min={1}
                  max={52}
                  inputMode="numeric"
                  value={editWeeks}
                  onChange={(e) => setEditWeeks(e.target.value)}
                  className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isPending}
                className="flex-1 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : t("Enregistrer")}
              </button>
              <button
                onClick={() => setEditOpen(false)}
                disabled={isPending}
                className="flex-shrink-0 text-(--ep-ink)/50 hover:text-(--ep-ink)/80 text-[11px] font-semibold uppercase tracking-widest px-3 py-2.5"
              >
                {t("Annuler")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique des transitions */}
      <button
        onClick={toggleHistory}
        aria-expanded={historyOpen}
        className="w-full flex items-center justify-center gap-1.5 mt-3 text-[9px] font-semibold uppercase tracking-widest text-(--ep-ink)/25 hover:text-(--ep-ink)/50 transition-colors"
      >
        <History size={10} />
        {t("Historique des phases")}
        {historyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {historyOpen && history && history.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {history.map((h) => (
            <div key={h.id} className="text-[10.5px] text-(--ep-ink)/45 flex items-start gap-2">
              <span className="text-(--ep-ink)/25 flex-shrink-0">{formatSince(h.started_at)}</span>
              <span>
                {PHASE_LABELS[h.phase]}
                {h.ended_at ? ` (jusqu'au ${formatSince(h.ended_at)})` : t(" (en cours)")}
                {h.planned_weeks ? ` · ${h.planned_weeks} ${t("semaines prévues")}` : ""}
                {h.note ? ` · ${h.note}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
