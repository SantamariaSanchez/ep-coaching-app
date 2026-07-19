"use client";

import { useMemo, useState } from "react";
import { Footprints, Plus, Trash2, Check, Target, Flame } from "lucide-react";
import type { StepSettings, StepRoutineItem, StepLog } from "@/utils/steps";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dayLabel(dateStr: string): string {
  const s = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(
    new Date(dateStr + "T12:00:00")
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function StepsClient({
  settings,
  routineItems,
  logs,
  readOnly = false,
  updateStepGoal,
  addRoutineItem,
  deleteRoutineItem,
  logSteps,
}: {
  settings: StepSettings;
  routineItems: StepRoutineItem[];
  logs: StepLog[];
  readOnly?: boolean;
  updateStepGoal?: (goal: number) => Promise<{ error?: string }>;
  addRoutineItem?: (label: string, timeLabel: string) => Promise<{ error?: string; id?: string }>;
  deleteRoutineItem?: (id: string) => Promise<{ error?: string }>;
  logSteps?: (logDate: string, stepsActual: number, completedItems: string[]) => Promise<{ error?: string }>;
}) {
  const today = todayStr();
  const todayLog = logs.find((l) => l.log_date === today) ?? null;

  const [goal, setGoal] = useState(settings.daily_goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [items, setItems] = useState(routineItems);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);

  const [stepsInput, setStepsInput] = useState(String(todayLog?.steps_actual ?? ""));
  const [completed, setCompleted] = useState<Set<string>>(new Set(todayLog?.completed_items ?? []));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const todaySteps = parseInt(stepsInput) || 0;
  const pct = Math.min(100, Math.round((todaySteps / Math.max(1, goal)) * 100));

  const last14 = useMemo(() => {
    const map = new Map(logs.map((l) => [l.log_date, l.steps_actual]));
    const days: { date: string; steps: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      days.push({ date: ds, steps: ds === today ? todaySteps : map.get(ds) ?? 0 });
    }
    return days;
  }, [logs, today, todaySteps]);

  async function handleSaveGoal() {
    if (!updateStepGoal) return;
    await updateStepGoal(goal);
    setEditingGoal(false);
  }

  async function handleAddItem() {
    if (!addRoutineItem || !newLabel.trim()) return;
    const res = await addRoutineItem(newLabel, newTime);
    if (!res.error && res.id) {
      setItems((prev) => [...prev, { id: res.id!, client_id: "", label: newLabel.trim(), time_label: newTime.trim() || null, position: prev.length }]);
      setNewLabel("");
      setNewTime("");
      setShowAddItem(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!deleteRoutineItem) return;
    const res = await deleteRoutineItem(id);
    if (!res.error) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleCompleted(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveToday() {
    if (!logSteps) return;
    setSaving(true);
    await logSteps(today, todaySteps, [...completed]);
    setSaving(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  const maxSteps = Math.max(goal, ...last14.map((d) => d.steps), 1);

  return (
    <div className="space-y-5">
      {/* Goal + today's progress */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-[#E01E1E]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
              Objectif quotidien
            </p>
          </div>
          {!readOnly && updateStepGoal ? (
            editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(parseInt(e.target.value) || 0)}
                  className="w-20 bg-[#150000] border border-[#890404]/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                />
                <button onClick={handleSaveGoal} className="text-[10px] font-bold text-[#E01E1E]">OK</button>
              </div>
            ) : (
              <button onClick={() => setEditingGoal(true)} className="text-[10px] font-bold text-[#F5EDED]/40 flex items-center gap-1">
                <Target size={11} /> {goal.toLocaleString("fr-FR")} pas
              </button>
            )
          ) : (
            <span className="text-[10px] font-bold text-[#F5EDED]/40 flex items-center gap-1">
              <Target size={11} /> {goal.toLocaleString("fr-FR")} pas/jour
            </span>
          )}
        </div>

        <div className="flex items-end gap-4 mb-3">
          <div>
            <p className="text-3xl font-black text-white tabular-nums">{todaySteps.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-[#F5EDED]/30">pas aujourd&apos;hui</p>
          </div>
          {!readOnly && logSteps && (
            <input
              type="number"
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              placeholder="Mettre à jour"
              className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
            />
          )}
        </div>

        <div className="h-2 bg-[#890404]/15 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-[#E01E1E]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-[#F5EDED]/30">{pct}% de l&apos;objectif</p>
      </div>

      {/* Routine */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Ma routine du jour
        </p>
        {items.length === 0 ? (
          <p className="text-xs text-[#F5EDED]/30 italic mb-3">Aucune habitude programmée, ajoute des créneaux de marche dans ta journée.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {items.map((item) => {
              const done = completed.has(item.id);
              return (
                <div key={item.id} className="flex items-center gap-2.5 bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5">
                  {!readOnly ? (
                    <button
                      onClick={() => toggleCompleted(item.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                        done ? "bg-[#E01E1E] border-[#E01E1E]" : "border-[#890404]/40"
                      }`}
                    >
                      {done && <Check size={12} className="text-white" />}
                    </button>
                  ) : (
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${done ? "bg-[#E01E1E] border-[#E01E1E]" : "border-[#890404]/40"}`}>
                      {done && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${done ? "text-[#F5EDED]/40 line-through" : "text-white"}`}>{item.label}</p>
                    {item.time_label && <p className="text-[10px] text-[#F5EDED]/30">{item.time_label}</p>}
                  </div>
                  {!readOnly && deleteRoutineItem && (
                    <button onClick={() => handleDeleteItem(item.id)} className="text-[#F5EDED]/20 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!readOnly && addRoutineItem && (
          showAddItem ? (
            <div className="flex gap-1.5">
              <input
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Heure"
                className="w-20 bg-[#150000] border border-[#890404]/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none"
              />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex. Marche après le déjeuner"
                className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none"
              />
              <button onClick={handleAddItem} className="text-[10px] font-bold text-[#E01E1E] px-2">OK</button>
            </div>
          ) : (
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-1 text-[10px] font-bold text-[#E01E1E]">
              <Plus size={11} /> Ajouter une habitude
            </button>
          )
        )}

        {!readOnly && logSteps && (
          <button
            onClick={handleSaveToday}
            disabled={saving}
            className="w-full mt-4 flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Sauvegarde…" : savedAt ? <><Check size={13} /> Enregistré</> : "Enregistrer aujourd'hui"}
          </button>
        )}
      </div>

      {/* History */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={14} className="text-[#E01E1E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            14 derniers jours
          </p>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {last14.map((d) => {
            const h = Math.max(4, (d.steps / maxSteps) * 100);
            const reached = d.steps >= goal;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t ${reached ? "bg-green-500" : d.steps > 0 ? "bg-[#E01E1E]/60" : "bg-[#890404]/15"}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="text-[8px] text-[#F5EDED]/25">{dayLabel(d.date).slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
