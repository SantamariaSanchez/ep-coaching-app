"use client";

import { useState, useTransition } from "react";
import { Target, Sliders, Flame, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, History, Lightbulb, AlertTriangle } from "lucide-react";
import {
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  nextPhase,
  type CoachingPhase,
  type CoachingPhaseState,
  type AdherenceSignal,
  type PhaseSuggestion,
  type CoachingPhaseHistoryEntry,
} from "@/lib/coaching-phase-helpers";
import { initCoachingPhase, advanceCoachingPhase, getCoachingPhaseHistoryAction } from "@/app/dashboard/coach/clients/[id]/coaching-phase/actions";

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
// Montre la phase de coaching en cours, les signaux d'adhérence (calibrage
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CoachingPhaseHistoryEntry[] | null>(null);

  function handleInit() {
    setError(null);
    startTransition(async () => {
      const result = await initCoachingPhase(clientId);
      if (result.error) setError(result.error);
    });
  }

  function handleAdvance(toPhase: CoachingPhase) {
    setError(null);
    startTransition(async () => {
      const result = await advanceCoachingPhase(clientId, toPhase, note || undefined);
      if (result.error) setError(result.error);
      setNote("");
      setShowNote(false);
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
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Target size={18} className="text-[#F5EDED]/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Phase de coaching non suivie</p>
            <p className="text-[11px] text-[#F5EDED]/40">
              Ce client est coaché mais aucune phase n&apos;a encore été démarrée (probablement actif avant
              l&apos;ajout de cette fonctionnalité).
            </p>
          </div>
          <button
            onClick={handleInit}
            disabled={isPending}
            className="flex-shrink-0 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Démarrer le calibrage"}
          </button>
        </div>
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  const Icon = PHASE_ICON[phase.phase];
  const upcoming = nextPhase(phase.phase);
  const age = daysSince(phase.since);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-[#E01E1E]/12 border border-[#E01E1E]/25 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-[#E01E1E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            Phase {PHASE_LABELS[phase.phase]}
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/45 border border-[#890404]/20">
              depuis {age} jour{age !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="text-[11px] text-[#F5EDED]/40 mt-0.5">
            {PHASE_DESCRIPTIONS[phase.phase]} Débutée le {formatSince(phase.since)}.
          </p>
        </div>
      </div>

      {/* Signaux d'adhérence — calibrage uniquement, voir computeCalibrationSignals */}
      {phase.phase === "calibrage" && signals.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-[#890404]/15 space-y-2">
          {signals.map((sig) => (
            <div key={sig.id} className="flex items-start gap-2.5">
              {sig.ok === null ? (
                <MinusCircle size={13} className="text-[#F5EDED]/25 mt-0.5 flex-shrink-0" />
              ) : sig.ok ? (
                <CheckCircle2 size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={13} className="text-[#E01E1E] mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-semibold text-[#F5EDED]/75">{sig.label}</p>
                <p className="text-[10.5px] text-[#F5EDED]/40">{sig.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions de décision — voir generateCoachingPhaseSuggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-[#890404]/15 space-y-2.5">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-2.5">
              {s.severity === "warning" ? (
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Lightbulb size={13} className="text-[#F5EDED]/30 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-xs text-[#F5EDED]/70 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Transition manuelle — le coach décide toujours, le système ne fait que suggérer */}
      <div className="mt-3.5 pt-3.5 border-t border-[#890404]/15">
        {upcoming ? (
          <>
            {showNote && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note optionnelle sur cette transition..." aria-label="Note optionnelle sur cette transition..."
                className="w-full mb-2 bg-black/30 border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
              />
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdvance(upcoming)}
                disabled={isPending}
                className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : `Passer en phase ${PHASE_LABELS[upcoming]}`}
              </button>
              <button
                onClick={() => setShowNote((v) => !v)}
                className="flex-shrink-0 text-[#F5EDED]/30 hover:text-[#F5EDED]/60 text-[10px] font-semibold uppercase tracking-widest px-2 py-2"
              >
                Note
              </button>
            </div>
          </>
        ) : (
          <p className="text-[10.5px] text-[#F5EDED]/30 text-center">Phase la plus avancée du parcours.</p>
        )}
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </div>

      {/* Historique des transitions */}
      <button
        onClick={toggleHistory}
        aria-expanded={historyOpen}
        className="w-full flex items-center justify-center gap-1.5 mt-3 text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/25 hover:text-[#F5EDED]/50 transition-colors"
      >
        <History size={10} />
        Historique des phases
        {historyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {historyOpen && history && history.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {history.map((h) => (
            <div key={h.id} className="text-[10.5px] text-[#F5EDED]/45 flex items-start gap-2">
              <span className="text-[#F5EDED]/25 flex-shrink-0">{formatSince(h.started_at)}</span>
              <span>
                {PHASE_LABELS[h.phase]}
                {h.ended_at ? ` (jusqu'au ${formatSince(h.ended_at)})` : " (en cours)"}
                {h.note ? ` · ${h.note}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
