"use client";

import { useState, useTransition } from "react";
import { Plus, X, Target, Check, Trash2, ChevronDown, Minus } from "lucide-react";
import type { BusinessGoal, GoalMetricType } from "@/lib/coach-business-goals";
import {
  createBusinessGoal,
  updateManualGoalValue,
  setGoalStatus,
  deleteBusinessGoal,
} from "@/app/dashboard/coach/business/goals-actions";

// Objectifs business chiffrés (Axe 6, passe "masterclass" 2026-09-09) : le
// coach fixe un objectif avec une date, la progression se lit d'un coup
// d'oeil plutôt que de devoir se souvenir où il en est. "clients_actifs" et
// "revenu_mois" avancent tout seuls (données déjà réelles dans l'appli),
// "personnalisé" se met à jour à la main (ex. abonnés Instagram).

const METRIC_LABELS: Record<GoalMetricType, string> = {
  clients_actifs: "Clients actifs",
  revenu_mois: "Revenu du mois",
  custom: "Personnalisé",
};

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + "€";
}

function formatValue(goal: BusinessGoal, value: number): string {
  if (goal.metric_type === "revenu_mois") return eur(value);
  if (goal.metric_type === "custom" && goal.unit) return `${value} ${goal.unit}`;
  return String(value);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T12:00:00").getTime();
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function GoalCard({
  goal,
  currentValue,
}: {
  goal: BusinessGoal;
  currentValue: number;
}) {
  const [value, setValue] = useState(currentValue);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pct = Math.min(100, Math.round((value / goal.target_value) * 100));
  const editable = goal.metric_type === "custom" && goal.status === "active";

  function adjust(delta: number) {
    const next = Math.max(0, value + delta);
    setValue(next);
    startTransition(async () => {
      const res = await updateManualGoalValue(goal.id, next);
      if (res.error) setValue(value); // revert
    });
  }

  function complete() {
    setBusy(true);
    startTransition(async () => {
      await setGoalStatus(goal.id, "done");
      setBusy(false);
    });
  }

  function abandon() {
    setBusy(true);
    startTransition(async () => {
      await setGoalStatus(goal.id, "abandoned");
      setBusy(false);
    });
  }

  function remove() {
    setBusy(true);
    startTransition(async () => {
      // MASTERCLASS.md Axe B (repasse 2026-09-10) : `busy` n'était jamais
      // remis à false en cas d'échec — la carte se retrouvait figée à
      // moitié transparente indéfiniment (pas de crash, mais elle a l'air
      // à moitié supprimée sans jamais l'être vraiment). En cas de succès,
      // le parent démonte de toute façon la carte via la revalidation, donc
      // ce reset n'a d'effet visible que sur l'échec.
      const res = await deleteBusinessGoal(goal.id);
      if (res.error) setBusy(false);
    });
  }

  const overdue = goal.target_date && goal.status === "active" && daysUntil(goal.target_date) < 0;

  return (
    <div className="ep-card" style={{ padding: "16px 18px", opacity: busy ? 0.5 : 1 }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white truncate">{goal.title}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mt-0.5">
            {METRIC_LABELS[goal.metric_type]}
            {goal.target_date && (
              <span className={overdue ? "text-[#E01E1E]" : ""}>
                {" "}
                · {overdue
                  ? `en retard de ${Math.abs(daysUntil(goal.target_date))}j`
                  : goal.status === "active"
                  ? `dans ${daysUntil(goal.target_date)}j`
                  : new Date(goal.target_date + "T12:00:00").toLocaleDateString("fr-FR")}
              </span>
            )}
          </p>
        </div>
        {goal.status === "active" ? (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={complete} title="Marquer terminé" aria-label="Marquer terminé" className="text-[#F5EDED]/25 hover:text-green-400 p-1">
              <Check size={14} />
            </button>
            <button onClick={abandon} title="Abandonner" aria-label="Abandonner" className="text-[#F5EDED]/25 hover:text-amber-400 p-1">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={remove} title="Supprimer" aria-label="Supprimer" className="text-[#F5EDED]/20 hover:text-red-400 p-1 flex-shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="h-2 bg-[#150000] rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: goal.status === "done" ? "#4ade80" : pct >= 100 ? "#4ade80" : "#E01E1E",
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#F5EDED]/45">
          {formatValue(goal, value)} <span className="text-[#F5EDED]/25">/ {formatValue(goal, goal.target_value)}</span>
          <span className="ml-1.5 font-bold text-[#F5EDED]/60">{pct}%</span>
        </p>
        {editable && (
          <div className="flex items-center gap-1">
            <button onClick={() => adjust(-1)} disabled={isPending} className="w-6 h-6 rounded-full border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white flex items-center justify-center">
              <Minus size={11} />
            </button>
            <button onClick={() => adjust(1)} disabled={isPending} className="w-6 h-6 rounded-full border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white flex items-center justify-center">
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewGoalForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [metricType, setMetricType] = useState<GoalMetricType>("clients_actifs");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const res = await createBusinessGoal({
      title,
      metric_type: metricType,
      unit: metricType === "custom" ? unit : null,
      target_value: Number(targetValue),
      target_date: targetDate || null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div className="rounded-lg border border-[#890404]/25 bg-[#150000] p-3.5 space-y-2.5 mb-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex. 10 clients actifs avant la fin de l'année"
        aria-label="Titre de l'objectif"
        className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
      />
      <div className="flex gap-1.5">
        {(Object.keys(METRIC_LABELS) as GoalMetricType[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetricType(m)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
            style={{
              background: metricType === m ? "rgba(224,30,30,0.15)" : "transparent",
              borderColor: metricType === m ? "rgba(224,30,30,0.5)" : "rgba(137,4,4,0.25)",
              color: metricType === m ? "#fff" : "rgba(245,237,237,0.45)",
            }}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={metricType === "revenu_mois" ? "Objectif en €" : "Objectif chiffré"}
          aria-label="Valeur cible"
          className="bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        />
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          aria-label="Date cible (optionnel)"
          className="bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#E01E1E]/60"
        />
      </div>
      {metricType === "custom" && (
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unité (ex. abonnés, clients, avis)"
          aria-label="Unité"
          className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        />
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !title.trim() || !targetValue}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg py-2.5"
        >
          {saving ? "Création…" : "Créer l'objectif"}
        </button>
      </div>
    </div>
  );
}

export default function BusinessGoals({
  goalsWithProgress,
}: {
  goalsWithProgress: { goal: BusinessGoal; currentValue: number }[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = goalsWithProgress.filter((g) => g.goal.status === "active");
  const archived = goalsWithProgress.filter((g) => g.goal.status !== "active");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
          {active.length} objectif{active.length !== 1 ? "s" : ""} en cours
        </p>
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444]"
          >
            <Plus size={12} /> Nouvel objectif
          </button>
        )}
      </div>

      {formOpen && <NewGoalForm onClose={() => setFormOpen(false)} />}

      {active.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center">
          <Target size={22} className="text-[#F5EDED]/15 mx-auto mb-2.5" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun objectif en cours. Fixe-en un pour te donner un cap.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {active.map(({ goal, currentValue }) => (
            <GoalCard key={goal.id} goal={goal} currentValue={currentValue} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
          >
            <ChevronDown size={12} style={{ transform: showArchived ? "rotate(180deg)" : "none" }} />
            {archived.length} terminé{archived.length !== 1 ? "s" : ""}/abandonné{archived.length !== 1 ? "s" : ""}
          </button>
          {showArchived && (
            <div className="grid sm:grid-cols-2 gap-2.5 mt-2.5">
              {archived.map(({ goal, currentValue }) => (
                <GoalCard key={goal.id} goal={goal} currentValue={currentValue} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
