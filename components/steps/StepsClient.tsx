"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Footprints, Plus, Trash2, Check, Target, Flame, Bell, Watch, X, RotateCcw, Activity, AlertTriangle } from "lucide-react";
import type { StepSettings, StepRoutineItem, StepLog } from "@/utils/steps";
import { usePedometer, PEDOMETER_ENABLED_KEY } from "@/lib/pedometer";

const QUICK_ADD_AMOUNTS = [500, 1000, 2500, 5000];
const HEATMAP_WEEKS = 4;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function shortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(dateStr + "T12:00:00"));
}

// Compte les jours consécutifs (objectif atteint) en remontant depuis
// aujourd'hui pour la série en cours, et la plus longue série sur toute la
// fenêtre de logs disponible pour le record. Un jour sans log compte comme 0
// (casse la série), contrairement à un simple parcours des clés du log qui
// sauterait silencieusement les trous.
function computeStreaks(
  logs: StepLog[],
  goal: number,
  today: string,
  todaySteps: number
): { current: number; best: number } {
  if (goal <= 0) return { current: 0, best: 0 };
  const map = new Map(logs.map((l) => [l.log_date, l.steps_actual]));
  map.set(today, todaySteps);

  const dates = Array.from(map.keys()).sort();
  if (dates.length === 0) return { current: 0, best: 0 };

  const cursor = new Date(dates[0] + "T12:00:00");
  const end = new Date(today + "T12:00:00");
  let best = 0;
  let run = 0;
  while (cursor.getTime() <= end.getTime()) {
    const iso = cursor.toISOString().split("T")[0];
    const met = (map.get(iso) ?? 0) >= goal;
    if (met) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { current: run, best };
}

interface HeatmapCell {
  date: string;
  steps: number;
  future: boolean;
  isToday: boolean;
}

// Grille alignée sur les semaines calendaires (lundi à dimanche) plutôt
// qu'un simple "N derniers jours" — se lit comme un vrai historique
// hebdomadaire, pas une bande glissante illisible.
function buildHeatmapWeeks(logs: StepLog[], today: string, todaySteps: number, weeks: number): HeatmapCell[][] {
  const map = new Map(logs.map((l) => [l.log_date, l.steps_actual]));
  map.set(today, todaySteps);

  const todayDate = new Date(today + "T12:00:00");
  const dow = todayDate.getDay() === 0 ? 7 : todayDate.getDay();
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow - 1));
  const start = new Date(monday);
  start.setDate(monday.getDate() - (weeks - 1) * 7);

  const rows: HeatmapCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = date.toISOString().split("T")[0];
      const future = iso > today;
      row.push({ date: iso, steps: future ? 0 : map.get(iso) ?? 0, future, isToday: iso === today });
    }
    rows.push(row);
  }
  return rows;
}

function cellColor(steps: number, goal: number, future: boolean): string {
  if (future) return "transparent";
  if (steps <= 0) return "rgba(245,237,237,0.05)";
  if (goal <= 0) return "rgba(245,237,237,0.15)";
  const ratio = steps / goal;
  if (ratio >= 1) return "#4ade80";
  if (ratio >= 0.5) return "rgba(224,30,30,0.55)";
  return "rgba(224,30,30,0.25)";
}

export default function StepsClient({
  settings,
  routineItems,
  logs,
  readOnly = false,
  hasOura = false,
  ouraTrackingHref = "/dashboard/client/tracking",
  updateStepGoal,
  addRoutineItem,
  deleteRoutineItem,
  logSteps,
  createReminderFromRoutine,
}: {
  settings: StepSettings;
  routineItems: StepRoutineItem[];
  logs: StepLog[];
  readOnly?: boolean;
  hasOura?: boolean;
  ouraTrackingHref?: string;
  updateStepGoal?: (goal: number) => Promise<{ error?: string }>;
  addRoutineItem?: (label: string, timeLabel: string) => Promise<{ error?: string; id?: string }>;
  deleteRoutineItem?: (id: string) => Promise<{ error?: string }>;
  logSteps?: (logDate: string, stepsActual: number, completedItems: string[]) => Promise<{ error?: string }>;
  createReminderFromRoutine?: (label: string, time: string) => Promise<{ error?: string }>;
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

  // MASTERCLASS.md Axe E (même piège que todayLogs dans ClientNutritionView) :
  // goal/items/stepsInput/completed venaient tous de props serveur mais ne se
  // resynchronisaient jamais sur un nouveau prop après le premier rendu — un
  // objectif changé, un item de routine ajouté/supprimé ailleurs, ou un pas
  // loggé puis la page rechargée pouvaient rester affichés à l'ancienne valeur.
  useEffect(() => {
    setGoal(settings.daily_goal);
  }, [settings.daily_goal]);
  useEffect(() => {
    setItems(routineItems);
  }, [routineItems]);
  useEffect(() => {
    setStepsInput(String(todayLog?.steps_actual ?? ""));
    setCompleted(new Set(todayLog?.completed_items ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayLog est recalculé chaque rendu depuis logs/today, la vraie dépendance stable est logs
  }, [logs]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // MASTERCLASS.md Axe B : ces handlers affichaient "Enregistré ✓" même
  // quand logSteps/updateStepGoal échouait côté serveur — pire qu'un échec
  // silencieux, un faux positif qui affirme que ça a marché.
  const [saveError, setSaveError] = useState<string | null>(null);

  const [reminderOpenFor, setReminderOpenFor] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState("12:00");
  const [reminderStatus, setReminderStatus] = useState<Record<string, "idle" | "saving" | "done">>({});

  // "completed" et le total du jour changent souvent (à chaque pas détecté) —
  // on les reflète dans des refs (tenues à jour via un effet, jamais lues ni
  // écrites pendant le rendu lui-même) pour que le callback de synchro auto
  // garde une identité stable — sinon le podomètre réattacherait son
  // listener devicemotion à chaque pas détecté, voir lib/pedometer.ts — tout
  // en lisant toujours la valeur la plus fraîche au moment où il se
  // déclenche vraiment.
  const manualSteps = parseInt(stepsInput) || 0;
  const completedRef = useRef(completed);
  const todayStepsRef = useRef(0);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  const handlePedometerSync = useCallback(
    async (pedometerTotal: number) => {
      if (!logSteps) return;
      // Jamais un simple écrasement : si une saisie manuelle plus haute a été
      // enregistrée entre deux synchros auto (ex. copie du chiffre d'une
      // montre connectée), le podomètre ne doit jamais la faire reculer.
      const merged = Math.max(pedometerTotal, todayStepsRef.current);
      await logSteps(today, merged, [...completedRef.current]);
    },
    [logSteps, today]
  );

  const pedometer = usePedometer(todayLog?.steps_actual ?? 0, handlePedometerSync);

  // Le total affiché/utilisé partout (barre de progression, heatmap, séries)
  // est le plus grand des deux sources — jamais une simple bascule qui
  // ferait disparaître l'un des deux apports.
  const todaySteps = Math.max(manualSteps, pedometer.steps);

  useEffect(() => {
    todayStepsRef.current = todaySteps;
  }, [todaySteps]);

  // Reprise silencieuse au montage si le podomètre était actif lors d'une
  // session précédente — uniquement quand la plateforme ne demande pas de
  // geste explicite (Android). Sur iOS, DeviceMotionEvent.requestPermission()
  // hors interaction directe est ignoré par le navigateur (même constat que
  // Notification.requestPermission(), voir PushPermission.tsx) : il faut un
  // vrai tap, donc on affiche plutôt un bouton "Reprendre" dans ce cas.
  useEffect(() => {
    if (readOnly) return;
    let enabled = false;
    try {
      enabled = localStorage.getItem(PEDOMETER_ENABLED_KEY) === "1";
    } catch {
      // ignore
    }
    if (enabled && !pedometer.needsGesture) {
      pedometer.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontairement au montage uniquement, voir commentaire ci-dessus
  }, []);

  const pct = Math.min(100, Math.round((todaySteps / Math.max(1, goal)) * 100));

  const heatmapWeeks = useMemo(
    () => buildHeatmapWeeks(logs, today, todaySteps, HEATMAP_WEEKS),
    [logs, today, todaySteps]
  );
  const pastCells = useMemo(() => heatmapWeeks.flat().filter((c) => !c.future), [heatmapWeeks]);
  const avg7 = useMemo(() => {
    const last7 = pastCells.slice(-7);
    if (last7.length === 0) return 0;
    return Math.round(last7.reduce((s, c) => s + c.steps, 0) / last7.length);
  }, [pastCells]);
  const bestDay = useMemo(() => pastCells.reduce((m, c) => Math.max(m, c.steps), 0), [pastCells]);
  const goalMetCount = useMemo(
    () => (goal > 0 ? pastCells.filter((c) => c.steps >= goal).length : 0),
    [pastCells, goal]
  );
  const streaks = useMemo(() => computeStreaks(logs, goal, today, todaySteps), [logs, goal, today, todaySteps]);

  // Trois points d'entrée (quick add, reset, saisie manuelle) partagent la
  // même mécanique de sauvegarde, en trois fonctions "handle*" distinctes
  // plutôt qu'un helper commun : la règle purity du linter React exige que
  // l'appel impur (Date.now) reste directement dans le gestionnaire
  // d'évènement pour prouver qu'il ne peut pas s'exécuter pendant le rendu.
  async function handleQuickAdd(amount: number) {
    if (!logSteps) return;
    const next = Math.max(0, todaySteps + amount);
    setStepsInput(String(next));
    setSaving(true);
    const res = await logSteps(today, next, [...completed]);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function handleReset() {
    if (!logSteps) return;
    setStepsInput("0");
    // Sans ça, le podomètre republierait son propre cumul au prochain envoi
    // automatique et annulerait silencieusement la remise à zéro.
    pedometer.resetCount(0);
    setSaving(true);
    const res = await logSteps(today, 0, [...completed]);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function handlePedometerToggle() {
    if (pedometer.status === "active") {
      pedometer.stop();
    } else {
      await pedometer.start();
    }
  }

  async function handleSaveGoal() {
    if (!updateStepGoal) return;
    const res = await updateStepGoal(goal);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
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

  // Sauvegarde immédiate au clic, comme la checklist du plan de diète —
  // avant, cocher un item de routine ne persistait qu'en cliquant ensuite
  // sur "Enregistrer" (le même bouton que la saisie manuelle de pas) : trop
  // facile de cocher, quitter la page sans avoir remarqué qu'il fallait
  // encore valider, et retrouver la case décochée au retour.
  async function toggleCompleted(id: string) {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    if (!logSteps) return;
    const res = await logSteps(today, todaySteps, [...next]);
    if (res.error) {
      setCompleted(completed);
      setSaveError(res.error);
    }
  }

  async function handleSaveToday() {
    if (!logSteps) return;
    setSaving(true);
    const res = await logSteps(today, todaySteps, [...completed]);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function handleCreateReminder(item: StepRoutineItem) {
    if (!createReminderFromRoutine) return;
    setReminderStatus((prev) => ({ ...prev, [item.id]: "saving" }));
    const res = await createReminderFromRoutine(item.label, reminderTime);
    setReminderStatus((prev) => ({ ...prev, [item.id]: res.error ? "idle" : "done" }));
    if (!res.error) setReminderOpenFor(null);
  }

  return (
    <div className="space-y-5">
      {/* Statut Oura */}
      {!readOnly && (
        hasOura ? (
          <div className="flex items-center gap-2" style={{ fontSize: 11, color: "rgba(74,222,128,0.85)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
            Connecté à Oura. Tes pas d&apos;hier se synchronisent automatiquement chaque matin.
          </div>
        ) : (
          <Link
            href={ouraTrackingHref}
            className="flex items-center gap-2"
            style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", textDecoration: "none" }}
          >
            <Watch size={12} style={{ flexShrink: 0 }} />
            Connecte ta Oura Ring pour ne plus saisir tes pas à la main
          </Link>
        )
      )}

      {/* Podomètre automatique — voir lib/pedometer.ts pour la limite honnête :
          ça ne compte que pendant que cette page est ouverte à l'écran, pas
          en tâche de fond façon montre connectée (impossible depuis le web). */}
      {!readOnly && logSteps && pedometer.status !== "unsupported" && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Activity size={15} className={pedometer.status === "active" ? "text-green-400 flex-shrink-0" : "text-[#E01E1E] flex-shrink-0"} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Podomètre automatique</p>
                <p className="text-[10px] text-[#F5EDED]/35 mt-0.5 leading-relaxed">
                  {pedometer.status === "active"
                    ? "Actif. Compte tes pas tant que l'appli reste ouverte à l'écran."
                    : pedometer.status === "denied"
                    ? "Mouvement refusé sur cet appareil."
                    : pedometer.needsGesture
                    ? "Compte tes pas tout seul, sans rien taper. Un tap pour démarrer (exigé par ton navigateur)."
                    : "Compte tes pas tout seul, sans rien taper."}
                </p>
              </div>
            </div>
            <button
              onClick={handlePedometerToggle}
              className={
                pedometer.status === "active"
                  ? "text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-red-400 px-2.5 py-2 flex-shrink-0 transition-colors"
                  : "flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
              }
            >
              {pedometer.status === "active" ? "Désactiver" : "Activer"}
            </button>
          </div>
          {pedometer.error && (
            <p className="flex items-start gap-1.5 text-[10.5px] text-red-400 mt-2.5 leading-relaxed">
              <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" /> {pedometer.error}
            </p>
          )}
        </div>
      )}

      {/* Goal + today's progress */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-[#E01E1E]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
              Objectif quotidien
            </p>
          </div>
          <div className="flex items-center gap-3">
            {streaks.current > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#E01E1E]">
                <Flame size={11} /> {streaks.current}j d&apos;affilée
              </span>
            )}
            {!readOnly && updateStepGoal ? (
              editingGoal ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={goal}
                    onChange={(e) => setGoal(parseInt(e.target.value) || 0)}
                    aria-label="Objectif de pas"
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
        </div>

        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <p className="text-3xl font-black text-white tabular-nums">{todaySteps.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-[#F5EDED]/30">pas aujourd&apos;hui</p>
          </div>
          {!readOnly && logSteps && todaySteps > 0 && (
            <button onClick={handleReset} title="Réinitialiser" aria-label="Réinitialiser" className="text-[#F5EDED]/20 hover:text-red-400 transition-colors mb-1">
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <div className="h-2 bg-[#890404]/15 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-[#E01E1E]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-[#F5EDED]/30 mb-4">{pct}% de l&apos;objectif</p>

        {!readOnly && logSteps && (
          <>
            {pedometer.status === "active" && (
              <p className="text-[10px] text-[#F5EDED]/25 mb-2">
                Le podomètre compte pour toi, utilise ceci seulement pour corriger un chiffre.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_ADD_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAdd(amount)}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#890404]/30 text-[#F5EDED]/60 hover:text-white hover:border-[#E01E1E]/50 transition-colors disabled:opacity-40"
                >
                  <Plus size={10} /> {amount.toLocaleString("fr-FR")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                placeholder="Saisie précise" aria-label="Saisie précise"
                className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
              />
              <button
                onClick={handleSaveToday}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {saving ? "…" : savedAt ? <><Check size={13} /> Ok</> : "Enregistrer"}
              </button>
            </div>
            {saveError && (
              <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-2">
                <AlertTriangle size={12} /> {saveError}
              </p>
            )}
          </>
        )}
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
              const rStatus = reminderStatus[item.id] ?? "idle";
              return (
                <div key={item.id} className="bg-[#150000] border border-[#890404]/15 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
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
                    {!readOnly && createReminderFromRoutine && (
                      <button
                        onClick={() => { setReminderOpenFor(reminderOpenFor === item.id ? null : item.id); setReminderTime("12:00"); }}
                        title="Créer un rappel push" aria-label="Créer un rappel push"
                        className={rStatus === "done" ? "text-green-400" : "text-[#F5EDED]/20 hover:text-[#E01E1E] transition-colors"}
                      >
                        {rStatus === "done" ? <Check size={13} /> : <Bell size={13} />}
                      </button>
                    )}
                    {!readOnly && deleteRoutineItem && (
                      <button onClick={() => handleDeleteItem(item.id)} className="text-[#F5EDED]/20 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {reminderOpenFor === item.id && (
                    <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#890404]/15">
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        aria-label="Heure du rappel"
                        className="bg-[#0D0000] border border-[#890404]/25 rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleCreateReminder(item)}
                        disabled={rStatus === "saving"}
                        className="flex-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] disabled:opacity-40"
                      >
                        {rStatus === "saving" ? "…" : "Rappel chaque jour à cette heure"}
                      </button>
                      <button onClick={() => setReminderOpenFor(null)} className="text-[#F5EDED]/25 hover:text-white">
                        <X size={13} />
                      </button>
                    </div>
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
                placeholder="Heure" aria-label="Heure"
                className="w-20 bg-[#150000] border border-[#890404]/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none"
              />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex. Marche après le déjeuner" aria-label="Nom de l'activité"
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
      </div>

      {/* Historique */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={14} className="text-[#E01E1E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            {HEATMAP_WEEKS} dernières semaines
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <p key={i} style={{ textAlign: "center", fontSize: 8, fontWeight: 700, color: "rgba(245,237,237,0.25)" }}>{d}</p>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {heatmapWeeks.map((row, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {row.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.future ? undefined : `${shortDate(cell.date)} : ${cell.steps.toLocaleString("fr-FR")} pas`}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 5,
                    background: cellColor(cell.steps, goal, cell.future),
                    border: cell.isToday ? "1.5px solid #E01E1E" : "1px solid rgba(245,237,237,0.04)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5 mt-4 pt-4" style={{ borderTop: "1px solid rgba(245,237,237,0.06)" }}>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 2px" }}>Moyenne 7j</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{avg7.toLocaleString("fr-FR")}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 2px" }}>Record</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{bestDay.toLocaleString("fr-FR")}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 2px" }}>Objectif atteint</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{goalMetCount}/{pastCells.length}</p>
          </div>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 2px" }}>Record série</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{streaks.best}j</p>
          </div>
        </div>
      </div>
    </div>
  );
}
