"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Footprints, Plus, Trash2, Check, Target, Flame, Bell, Watch, X, Activity, AlertTriangle, ChevronDown, RefreshCw, Smartphone, Pencil, Undo2 } from "lucide-react";
import type { StepSettings, StepRoutineItem, StepLog, StepsSyncStatus } from "@/utils/steps";
import { usePedometer, PEDOMETER_ENABLED_KEY } from "@/lib/pedometer";
import { todayInParis } from "@/lib/dates";

// Onglet Steps, refonte du 2026-10-14. Retour direct du fondateur : « qu'est
// ce que je veux quand je vais sur l'onglet steps ? Savoir combien j'ai fait
// de pas. Actuellement ça met de la friction, c'est un truc à remplir. »
// Donc, dans l'ordre :
// 1. le chiffre du jour en très gros, l'objectif et la progression ;
// 2. la semaine en mini graphique ;
// 3. la synchro automatique (Raccourci iOS, Health Connect, Oura) pour ne
//    plus rien saisir, et une saisie rapide en un tap en secours ;
// 4. la routine de marche (créneaux) et l'historique, repliés.

const HEATMAP_WEEKS = 4;
const STEPS_PER_MINUTE = 100;
const KM_PER_STEP = 0.00075;
const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function todayStr(): string {
  return todayInParis();
}

function shortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(dateStr + "T12:00:00"));
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nf(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k` : String(Math.round(n));
}

// Il y a combien de temps, en français court (« il y a 5 min »).
function ago(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

// Série en cours et record sur la fenêtre chargée. Un jour sans log compte 0.
function computeStreaks(logs: StepLog[], goal: number, today: string, todaySteps: number): { current: number; best: number } {
  if (goal <= 0) return { current: 0, best: 0 };
  const map = new Map(logs.map((l) => [l.log_date, l.steps_actual]));
  map.set(today, todaySteps);
  const dates = Array.from(map.keys()).sort();
  if (dates.length === 0) return { current: 0, best: 0 };
  const cursor = new Date(dates[0] + "T12:00:00");
  const end = new Date(today + "T12:00:00");
  let best = 0;
  let run = 0;
  let currentRun = 0;
  while (cursor.getTime() <= end.getTime()) {
    const iso = isoOf(cursor);
    const met = (map.get(iso) ?? 0) >= goal;
    if (met) {
      run++;
      best = Math.max(best, run);
    } else if (iso !== today) {
      run = 0;
    }
    currentRun = run;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Aujourd'hui pas encore atteint ne casse pas la série d'hier.
  return { current: currentRun, best };
}

interface DayCell {
  date: string;
  steps: number;
  future: boolean;
  isToday: boolean;
}

// Semaines calendaires (lundi à dimanche), de la plus ancienne à la courante.
function buildWeeks(logs: StepLog[], today: string, todaySteps: number, weeks: number): DayCell[][] {
  const map = new Map(logs.map((l) => [l.log_date, l.steps_actual]));
  map.set(today, todaySteps);
  const todayDate = new Date(today + "T12:00:00");
  const dow = todayDate.getDay() === 0 ? 7 : todayDate.getDay();
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow - 1));
  const start = new Date(monday);
  start.setDate(monday.getDate() - (weeks - 1) * 7);
  const rows: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = isoOf(date);
      const future = iso > today;
      row.push({ date: iso, steps: future ? 0 : map.get(iso) ?? 0, future, isToday: iso === today });
    }
    rows.push(row);
  }
  return rows;
}

function cellColor(steps: number, goal: number, future: boolean): string {
  if (future) return "transparent";
  if (steps <= 0) return "rgba(var(--ep-ink-rgb),0.05)";
  if (goal <= 0) return "rgba(var(--ep-ink-rgb),0.15)";
  const ratio = steps / goal;
  if (ratio >= 1) return "var(--ep-ok)";
  if (ratio >= 0.5) return "rgba(var(--ep-accent-rgb),0.55)";
  return "rgba(var(--ep-accent-rgb),0.25)";
}

const SOURCE_LABELS: Record<string, string> = {
  raccourci: "iPhone",
  android: "Android",
  oura: "Oura",
  manuel: "saisie",
  podometre: "podomètre",
  bilan: "bilan",
};

export default function StepsClient({
  settings,
  routineItems,
  logs,
  readOnly = false,
  hasOura = false,
  ouraTrackingHref = "/dashboard/client/tracking",
  syncHref,
  syncStatus,
  updateStepGoal,
  addRoutineItem,
  deleteRoutineItem,
  logSteps,
  setManualStepsTotal,
  getTodayStepsLive,
  createReminderFromRoutine,
}: {
  settings: StepSettings;
  routineItems: StepRoutineItem[];
  logs: StepLog[];
  readOnly?: boolean;
  hasOura?: boolean;
  ouraTrackingHref?: string;
  /** Bilan quotidien : gardé pour compatibilité des appelants, plus affiché. */
  bilanHref?: string;
  /** Page d'installation de la synchro automatique. */
  syncHref?: string;
  syncStatus?: StepsSyncStatus | null;
  updateStepGoal?: (goal: number) => Promise<{ error?: string }>;
  addRoutineItem?: (label: string, timeLabel: string) => Promise<{ error?: string; id?: string }>;
  deleteRoutineItem?: (id: string) => Promise<{ error?: string }>;
  logSteps?: (logDate: string, stepsActual: number, completedItems: string[]) => Promise<{ error?: string }>;
  setManualStepsTotal?: (logDate: string, total: number) => Promise<{ error?: string }>;
  getTodayStepsLive?: () => Promise<{ steps: number | null; source: string | null; syncedAt: string | null }>;
  createReminderFromRoutine?: (label: string, time: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const today = todayStr();
  const todayLog = logs.find((l) => l.log_date === today) ?? null;

  const [goal, setGoal] = useState(settings.daily_goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [items, setItems] = useState(routineItems);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set(todayLog?.completed_items ?? []));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reminderOpenFor, setReminderOpenFor] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState("12:00");
  const [reminderStatus, setReminderStatus] = useState<Record<string, "idle" | "saving" | "done">>({});

  // Resynchronisation prop -> state (même piège que dans ClientNutritionView) :
  // ajustée pendant le rendu quand le serveur renvoie de nouvelles valeurs.
  const [prevProps, setPrevProps] = useState({ goal: settings.daily_goal, routineItems, logs });
  if (prevProps.goal !== settings.daily_goal || prevProps.routineItems !== routineItems || prevProps.logs !== logs) {
    setPrevProps({ goal: settings.daily_goal, routineItems, logs });
    if (prevProps.goal !== settings.daily_goal) setGoal(settings.daily_goal);
    if (prevProps.routineItems !== routineItems) setItems(routineItems);
    if (prevProps.logs !== logs) setCompleted(new Set(todayLog?.completed_items ?? []));
  }

  // ── Total du jour : base, synchro en direct, saisie rapide, podomètre ──
  // `live` reprend une synchro arrivée pendant que la page est ouverte (le
  // raccourci « à l'ouverture de l'appli » répond quelques secondes après
  // l'affichage), `manual` la dernière saisie rapide en attente du serveur.
  const [live, setLive] = useState<{ steps: number; source: string | null; syncedAt: string | null } | null>(null);
  const [manual, setManual] = useState<number | null>(null);
  const baseSteps = manual ?? live?.steps ?? todayLog?.steps_actual ?? 0;
  const completedRef = useRef(completed);
  const todayStepsRef = useRef(0);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  const handlePedometerSync = useCallback(
    async (pedometerTotal: number) => {
      if (!logSteps) return;
      // Jamais un écrasement vers le bas : une synchro plus haute reste.
      const merged = Math.max(pedometerTotal, todayStepsRef.current);
      await logSteps(today, merged, [...completedRef.current]);
    },
    [logSteps, today]
  );
  const pedometer = usePedometer(todayLog?.steps_actual ?? 0, handlePedometerSync);
  const pedometerOn = pedometer.status === "active";
  const todaySteps = pedometerOn ? Math.max(baseSteps, pedometer.steps) : baseSteps;
  useEffect(() => {
    todayStepsRef.current = todaySteps;
  }, [todaySteps]);

  // Reprise silencieuse du podomètre (Android, pas de geste exigé).
  useEffect(() => {
    if (readOnly) return;
    let enabled = false;
    try {
      enabled = localStorage.getItem(PEDOMETER_ENABLED_KEY) === "1";
    } catch {
      // ignore
    }
    if (enabled && !pedometer.needsGesture) pedometer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontairement au montage uniquement
  }, []);

  // Relecture du total en base : au montage, au retour sur l'appli, puis
  // toutes les 20 s pendant 2 min (le temps qu'une automatisation lancée à
  // l'ouverture de l'appli envoie ses pas).
  useEffect(() => {
    if (readOnly || !getTodayStepsLive) return;
    let alive = true;
    let ticks = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function pull() {
      const res = await getTodayStepsLive!().catch(() => null);
      if (!alive || !res || res.steps == null) return;
      setLive({ steps: res.steps, source: res.source, syncedAt: res.syncedAt });
      setManual(null);
    }
    function burst() {
      ticks = 0;
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        ticks++;
        if (ticks > 6 || document.visibilityState !== "visible") {
          if (timer) clearInterval(timer);
          timer = null;
          return;
        }
        pull();
      }, 20000);
    }
    const first = setTimeout(() => {
      pull();
      burst();
    }, 2500);
    function onVisible() {
      if (document.visibilityState === "visible") {
        pull();
        burst();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(first);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [readOnly, getTodayStepsLive]);

  // Horloge pour « il y a 5 min » (une fois par minute suffit).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round((todaySteps / Math.max(1, goal)) * 100));
  const remaining = Math.max(0, goal - todaySteps);
  const reached = goal > 0 && todaySteps >= goal;

  const weeks = useMemo(() => buildWeeks(logs, today, todaySteps, HEATMAP_WEEKS), [logs, today, todaySteps]);
  const thisWeek = weeks[weeks.length - 1];
  const pastCells = useMemo(() => weeks.flat().filter((c) => !c.future), [weeks]);
  const last7 = useMemo(() => pastCells.slice(-7), [pastCells]);
  const avg7 = useMemo(() => (last7.length ? Math.round(last7.reduce((s, c) => s + c.steps, 0) / last7.length) : 0), [last7]);
  const met7 = useMemo(() => (goal > 0 ? last7.filter((c) => c.steps >= goal).length : 0), [last7, goal]);
  const bestDay = useMemo(() => pastCells.reduce((m, c) => Math.max(m, c.steps), 0), [pastCells]);
  const streaks = useMemo(() => computeStreaks(logs, goal, today, todaySteps), [logs, goal, today, todaySteps]);
  const weekMax = Math.max(goal, ...thisWeek.map((c) => c.steps), 1);

  // ── Statut de la synchro ──────────────────────────────────────────────
  const autoSyncAt = live?.syncedAt ?? todayLog?.synced_at ?? null;
  const autoSource = live?.source ?? todayLog?.source ?? null;
  const shortcutActive = !!syncStatus?.hasToken && !!syncStatus.lastUsedAt;
  const lastShortcutAgo = ago(syncStatus?.lastUsedAt, now);
  const shortcutStale = shortcutActive && now - new Date(syncStatus!.lastUsedAt!).getTime() > 36 * 3600 * 1000;
  const hasAutoSync = shortcutActive || hasOura;

  let syncLine: { tone: "ok" | "warn" | "muted"; text: string } | null = null;
  if (!readOnly) {
    if (shortcutActive && !shortcutStale) {
      const when = autoSource === "raccourci" || autoSource === "android" ? ago(autoSyncAt, now) : lastShortcutAgo;
      syncLine = { tone: "ok", text: `${t("Synchro auto")}${syncStatus?.lastSource ? ` (${SOURCE_LABELS[syncStatus.lastSource] ?? syncStatus.lastSource})` : ""} · ${when ?? ""}` };
    } else if (shortcutStale) {
      syncLine = { tone: "warn", text: `${t("Dernière synchro")} ${lastShortcutAgo}. ${t("Vérifie ton automatisation.")}` };
    } else if (hasOura) {
      syncLine = { tone: "ok", text: t("Oura : tes pas d'hier arrivent chaque matin") };
    } else if (todayLog?.source === "manuel" || manual != null) {
      syncLine = { tone: "muted", text: t("Saisi à la main") };
    }
  }

  // ── Saisie rapide ─────────────────────────────────────────────────────
  const [quickBusy, setQuickBusy] = useState(false);
  const [undo, setUndo] = useState<{ previous: number; label: string } | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const canQuick = !readOnly && (!!setManualStepsTotal || !!logSteps);

  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(id);
  }, [undo]);

  async function writeTotal(total: number, label: string | null) {
    const previous = todaySteps;
    const next = Math.max(0, Math.min(200000, Math.round(total)));
    setManual(next);
    setQuickBusy(true);
    setSaveError(null);
    const res = setManualStepsTotal ? await setManualStepsTotal(today, next) : await logSteps!(today, next, [...completed]);
    setQuickBusy(false);
    if (res.error) {
      setManual(null);
      setSaveError(res.error);
      return;
    }
    setUndo(label ? { previous, label } : null);
  }

  async function handlePedometerToggle() {
    if (pedometer.status === "active") pedometer.stop();
    else await pedometer.start();
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

  async function handleCreateReminder(item: StepRoutineItem) {
    if (!createReminderFromRoutine) return;
    setReminderStatus((prev) => ({ ...prev, [item.id]: "saving" }));
    const res = await createReminderFromRoutine(item.label, reminderTime);
    setReminderStatus((prev) => ({ ...prev, [item.id]: res.error ? "idle" : "done" }));
    if (!res.error) setReminderOpenFor(null);
  }

  const doneCount = items.filter((i) => completed.has(i.id)).length;

  return (
    <div className="space-y-4">
      {saveError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-(--ep-bad) bg-(--ep-bad)/5 border border-(--ep-bad)/20 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="flex-shrink-0" /> {t(saveError)}
        </p>
      )}

      {/* 1. Combien de pas aujourd'hui */}
      <section aria-label={t("Pas d'aujourd'hui")} className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45">
            <Footprints size={14} className="text-(--ep-accent)" /> {t("Aujourd'hui")}
          </p>
          {streaks.current > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-(--ep-accent-hi2)">
              <Flame size={12} /> {streaks.current} {t("j d'affilée")}
            </span>
          )}
        </div>

        <p className="mt-2 text-[56px] leading-none font-black tracking-tight text-(--ep-strong) tabular-nums" aria-live="polite">
          {nf(todaySteps)}
        </p>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap text-sm text-(--ep-ink)/55">
          <span>{t("sur")}</span>
          {!readOnly && updateStepGoal && editingGoal ? (
            <span className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={goal}
                onChange={(e) => setGoal(parseInt(e.target.value) || 0)}
                aria-label={t("Objectif de pas")}
                className="w-24 h-11 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-2 text-sm text-(--ep-strong) focus:outline-none"
              />
              <button onClick={handleSaveGoal} className="h-11 px-3 text-xs font-bold text-(--ep-accent-hi2)">{t("OK")}</button>
            </span>
          ) : !readOnly && updateStepGoal ? (
            <button onClick={() => setEditingGoal(true)} className="inline-flex items-center gap-1 min-h-[44px] font-bold text-(--ep-ink)/75">
              {nf(goal)} {t("pas")} <Pencil size={12} className="text-(--ep-ink)/35" />
            </button>
          ) : (
            <span className="font-bold text-(--ep-ink)/75">{nf(goal)} {t("pas")}</span>
          )}
          <span className="text-(--ep-ink)/30">·</span>
          <span>≈ {(todaySteps * KM_PER_STEP).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km</span>
        </div>

        <div className="mt-4 h-3 bg-(--ep-ink)/[0.07] rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Progression vers l'objectif")}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: reached ? "var(--ep-ok)" : "var(--ep-accent)" }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-(--ep-ink)/75">
          {reached
            ? todaySteps > goal
              ? `${t("Objectif atteint")} (+${nf(todaySteps - goal)})`
              : t("Objectif atteint")
            : `${t("Encore")} ${nf(remaining)} ${t("pas")}, ${t("environ")} ${Math.max(1, Math.round(remaining / STEPS_PER_MINUTE))} ${t("min de marche")}`}
        </p>

        {syncLine && (
          <p
            className="mt-3 pt-3 border-t border-(--ep-line)/15 flex items-center gap-2 text-xs"
            style={{ color: syncLine.tone === "ok" ? "var(--ep-ok)" : syncLine.tone === "warn" ? "var(--ep-warn)" : "rgba(var(--ep-ink-rgb),0.45)" }}
          >
            {syncLine.tone === "ok" ? <RefreshCw size={12} /> : syncLine.tone === "warn" ? <AlertTriangle size={12} /> : <Pencil size={12} />}
            <span className="flex-1">{syncLine.text}</span>
            {syncHref && (
              <Link href={syncHref} className="min-h-[32px] inline-flex items-center text-(--ep-ink)/45 underline underline-offset-2">
                {t("Réglages")}
              </Link>
            )}
          </p>
        )}
      </section>

      {/* 2. La semaine en mini graphique */}
      <section aria-label={t("Cette semaine")} className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{t("Cette semaine")}</p>
          <p className="text-xs text-(--ep-ink)/50">
            {t("Moyenne 7 j")} <b className="text-(--ep-strong) tabular-nums">{nf(avg7)}</b>
          </p>
        </div>
        <div className="relative h-28">
          {/* Ligne d'objectif */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-(--ep-ink)/25 pointer-events-none"
            style={{ bottom: `${(goal / weekMax) * 100}%` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 grid grid-cols-7 gap-2 items-end">
            {thisWeek.map((c) => {
              const h = c.future ? 0 : Math.max(c.steps > 0 ? 4 : 2, (c.steps / weekMax) * 100);
              const ok = goal > 0 && c.steps >= goal;
              return (
                <div key={c.date} className="h-full flex flex-col justify-end items-center" title={c.future ? undefined : `${shortDate(c.date)} : ${nf(c.steps)} ${t("pas")}`}>
                  {c.isToday && c.steps > 0 && <span className="text-[9px] font-bold text-(--ep-strong) tabular-nums mb-0.5">{compact(c.steps)}</span>}
                  <div
                    className="w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${h}%`,
                      background: c.future ? "transparent" : ok ? "var(--ep-ok)" : c.isToday ? "var(--ep-accent)" : "rgba(var(--ep-accent-rgb),0.45)",
                      border: c.future ? "1px dashed rgba(var(--ep-ink-rgb),0.15)" : "none",
                      minHeight: c.future ? 8 : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mt-1.5">
          {thisWeek.map((c, i) => (
            <p key={c.date} className={`text-center text-[10px] font-bold ${c.isToday ? "text-(--ep-accent-hi2)" : "text-(--ep-ink)/35"}`}>{DAY_LETTERS[i]}</p>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-(--ep-line)/15 text-xs text-(--ep-ink)/55">
          <span>
            {t("Objectif atteint")} <b className="text-(--ep-strong)">{met7}/7</b> {t("j")}
          </span>
          <span>
            {t("Record")} <b className="text-(--ep-strong) tabular-nums">{nf(bestDay)}</b>
          </span>
          <span>
            {t("Série max")} <b className="text-(--ep-strong)">{streaks.best} {t("j")}</b>
          </span>
        </div>
      </section>

      {/* 3. Plus rien à remplir : synchro automatique */}
      {!readOnly && !hasAutoSync && syncHref && (
        <Link href={syncHref} className="block bg-(--ep-accent)/[0.07] border border-(--ep-accent)/30 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm font-black text-(--ep-strong)">
            <Smartphone size={16} className="text-(--ep-accent-hi2)" /> {t("Tes pas arrivent tout seuls")}
          </p>
          <p className="text-xs text-(--ep-ink)/60 mt-1 leading-relaxed">
            {syncStatus?.hasToken
              ? t("Ta clé est prête, il reste à installer le raccourci. Une minute, et tu n'auras plus rien à taper.")
              : t("Relie Santé (iPhone) ou Health Connect (Android) en une minute. Plus rien à taper, le chiffre se met à jour tout seul.")}
          </p>
          <span className="mt-3 inline-flex items-center justify-center w-full min-h-[44px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold">
            {syncStatus?.hasToken ? t("Terminer l'installation") : t("Activer la synchro auto")}
          </span>
        </Link>
      )}

      {/* Saisie rapide, en secours */}
      {canQuick && (
        <section aria-label={t("Ajouter des pas à la main")} className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{hasAutoSync ? t("Corriger à la main") : t("Ajouter à la main")}</p>
            {undo && (
              <button onClick={() => { const p = undo.previous; setUndo(null); writeTotal(p, null); }} className="inline-flex items-center gap-1 min-h-[32px] text-xs font-bold text-(--ep-accent-hi2)">
                <Undo2 size={12} /> {t("Annuler")} {undo.label}
              </button>
            )}
          </div>
          {typing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(typed.replace(/\D/g, ""), 10);
                if (!Number.isFinite(n)) return;
                setTyping(false);
                setTyped("");
                writeTotal(n, t("la saisie"));
              }}
            >
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9 ]*"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={nf(todaySteps)}
                aria-label={t("Total de pas aujourd'hui")}
                className="flex-1 min-w-0 h-11 bg-(--ep-s2) border border-(--ep-line)/30 rounded-xl px-3 text-base text-(--ep-strong) tabular-nums focus:outline-none focus:border-(--ep-accent)/60"
              />
              <button type="submit" disabled={quickBusy} className="h-11 px-4 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold disabled:opacity-50">{t("OK")}</button>
              <button type="button" aria-label={t("Fermer")} onClick={() => setTyping(false)} className="h-11 w-11 rounded-xl border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/60">
                <X size={16} />
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000].map((n) => (
                <button
                  key={n}
                  disabled={quickBusy}
                  onClick={() => writeTotal(todaySteps + n, `+${nf(n)}`)}
                  className="min-h-[44px] rounded-xl border border-(--ep-line)/30 bg-(--ep-s2) text-sm font-bold text-(--ep-strong) tabular-nums disabled:opacity-50 active:scale-[0.97] transition-transform"
                >
                  +{n >= 1000 ? `${n / 1000}k` : n}
                </button>
              ))}
              <button
                disabled={quickBusy}
                onClick={() => setTyping(true)}
                className="min-h-[44px] rounded-xl border border-(--ep-line)/30 text-xs font-bold text-(--ep-ink)/70 disabled:opacity-50"
              >
                {t("Total")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Synchro active : accès discret aux réglages et au podomètre */}
      {!readOnly && (
        <details className="group bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl">
          <summary className="list-none cursor-pointer flex items-center gap-2 px-4 min-h-[48px] text-sm font-bold text-(--ep-ink)/70">
            <RefreshCw size={14} className="text-(--ep-ink)/40" />
            <span className="flex-1">{t("Sources de tes pas")}</span>
            <ChevronDown size={16} className="text-(--ep-ink)/40 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 space-y-3">
            {syncHref && (
              <Link href={syncHref} className="flex items-center gap-3 min-h-[44px]">
                <Smartphone size={15} className="text-(--ep-accent-hi2) flex-shrink-0" />
                <span className="flex-1 text-sm text-(--ep-strong)">
                  {t("Santé iPhone ou Health Connect")}
                  <span className="block text-[11px] text-(--ep-ink)/45">
                    {shortcutActive ? `${t("Actif")}, ${t("dernière synchro")} ${lastShortcutAgo}` : syncStatus?.hasToken ? t("Clé créée, installation à terminer") : t("Pas encore activé")}
                  </span>
                </span>
              </Link>
            )}
            <Link href={ouraTrackingHref} className="flex items-center gap-3 min-h-[44px]">
              <Watch size={15} className="text-(--ep-accent-hi2) flex-shrink-0" />
              <span className="flex-1 text-sm text-(--ep-strong)">
                {t("Oura Ring")}
                <span className="block text-[11px] text-(--ep-ink)/45">{hasOura ? t("Connectée, tes pas d'hier arrivent chaque matin") : t("Pas connectée")}</span>
              </span>
            </Link>
            {logSteps && pedometer.status !== "unsupported" && (
              <div className="flex items-center gap-3">
                <Activity size={15} className={`flex-shrink-0 ${pedometerOn ? "text-(--ep-ok)" : "text-(--ep-accent-hi2)"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-(--ep-strong)">{t("Podomètre de l'appli")}</p>
                  <p className="text-[11px] text-(--ep-ink)/45 leading-snug">
                    {pedometerOn
                      ? t("Actif. Compte seulement tant que cette page reste ouverte à l'écran.")
                      : pedometer.status === "denied"
                      ? t("Mouvement refusé sur cet appareil.")
                      : t("Compte seulement tant que cette page reste ouverte. Préfère la synchro auto.")}
                  </p>
                </div>
                <button
                  onClick={handlePedometerToggle}
                  className={`min-h-[44px] px-3 rounded-lg text-xs font-bold flex-shrink-0 ${pedometerOn ? "text-(--ep-ink)/50 border border-(--ep-line)/30" : "bg-(--ep-accent) text-(--ep-strong)"}`}
                >
                  {pedometerOn ? t("Arrêter") : t("Activer")}
                </button>
              </div>
            )}
            {pedometer.error && (
              <p className="flex items-start gap-1.5 text-[11px] text-(--ep-bad) leading-relaxed">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" /> {pedometer.error}
              </p>
            )}
          </div>
        </details>
      )}

      {/* 4. Routine de marche, repliée */}
      {(items.length > 0 || (!readOnly && addRoutineItem)) && (
        <details className="group bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl">
          <summary className="list-none cursor-pointer flex items-center gap-2 px-4 min-h-[48px] text-sm font-bold text-(--ep-ink)/70">
            <Target size={14} className="text-(--ep-ink)/40" />
            <span className="flex-1">{t("Ma routine de marche")}</span>
            {items.length > 0 && <span className="text-xs font-semibold text-(--ep-ink)/45 tabular-nums">{doneCount}/{items.length}</span>}
            <ChevronDown size={16} className="text-(--ep-ink)/40 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {items.length === 0 ? (
              <p className="text-xs text-(--ep-ink)/40 mb-3">{t("Ajoute des créneaux de marche dans ta journée (ex. après le déjeuner), avec un rappel si tu veux.")}</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {items.map((item) => {
                  const done = completed.has(item.id);
                  const rStatus = reminderStatus[item.id] ?? "idle";
                  return (
                    <div key={item.id} className="bg-(--ep-s2) border border-(--ep-line)/15 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 pr-1">
                        {!readOnly ? (
                          <button
                            onClick={() => toggleCompleted(item.id)}
                            aria-pressed={done}
                            aria-label={done ? t("Décocher") : t("Cocher")}
                            className="w-11 h-11 flex items-center justify-center flex-shrink-0"
                          >
                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${done ? "bg-(--ep-accent) border-(--ep-accent)" : "border-(--ep-line)/40"}`}>
                              {done && <Check size={12} className="text-(--ep-strong)" />}
                            </span>
                          </button>
                        ) : (
                          <span className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${done ? "bg-(--ep-accent) border-(--ep-accent)" : "border-(--ep-line)/40"}`}>
                              {done && <Check size={12} className="text-(--ep-strong)" />}
                            </span>
                          </span>
                        )}
                        <div className="flex-1 min-w-0 py-2">
                          <p className={`text-sm font-semibold ${done ? "text-(--ep-ink)/40 line-through" : "text-(--ep-strong)"}`}>{item.label}</p>
                          {item.time_label && <p className="text-[11px] text-(--ep-ink)/40">{item.time_label}</p>}
                        </div>
                        {!readOnly && createReminderFromRoutine && (
                          <button
                            onClick={() => { setReminderOpenFor(reminderOpenFor === item.id ? null : item.id); setReminderTime("12:00"); }}
                            title={t("Créer un rappel push")} aria-label={t("Créer un rappel push")}
                            className={`w-10 h-10 flex items-center justify-center ${rStatus === "done" ? "text-(--ep-ok)" : "text-(--ep-ink)/30"}`}
                          >
                            {rStatus === "done" ? <Check size={14} /> : <Bell size={14} />}
                          </button>
                        )}
                        {!readOnly && deleteRoutineItem && (
                          <button onClick={() => handleDeleteItem(item.id)} aria-label={t("Supprimer l'activité")} className="w-10 h-10 flex items-center justify-center text-(--ep-ink)/30">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {reminderOpenFor === item.id && (
                        <div className="flex items-center gap-2 px-3 py-2 border-t border-(--ep-line)/15">
                          <input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            aria-label={t("Heure du rappel")}
                            className="h-10 bg-(--ep-bg) border border-(--ep-line)/25 rounded-md px-2 text-sm text-(--ep-strong) focus:outline-none"
                          />
                          <button onClick={() => handleCreateReminder(item)} disabled={rStatus === "saving"} className="flex-1 min-h-[40px] text-xs font-bold text-(--ep-accent-hi2) disabled:opacity-40">
                            {rStatus === "saving" ? "…" : t("Rappel chaque jour à cette heure")}
                          </button>
                          <button onClick={() => setReminderOpenFor(null)} aria-label={t("Fermer")} className="w-10 h-10 flex items-center justify-center text-(--ep-ink)/40">
                            <X size={14} />
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
                    placeholder={t("Heure")} aria-label={t("Heure")}
                    className="w-20 h-11 bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg px-2 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none"
                  />
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t("Ex. Marche après le déjeuner")} aria-label={t("Nom de l'activité")}
                    className="flex-1 min-w-0 h-11 bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg px-2 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none"
                  />
                  <button onClick={handleAddItem} className="h-11 px-3 text-xs font-bold text-(--ep-accent-hi2)">{t("OK")}</button>
                </div>
              ) : (
                <button onClick={() => setShowAddItem(true)} className="flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-(--ep-accent-hi2)">
                  <Plus size={13} /> {t("Ajouter un créneau")}
                </button>
              )
            )}
          </div>
        </details>
      )}

      {/* Historique 4 semaines, replié */}
      <details className="group bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl">
        <summary className="list-none cursor-pointer flex items-center gap-2 px-4 min-h-[48px] text-sm font-bold text-(--ep-ink)/70">
          <Flame size={14} className="text-(--ep-ink)/40" />
          <span className="flex-1">{HEATMAP_WEEKS} {t("dernières semaines")}</span>
          <ChevronDown size={16} className="text-(--ep-ink)/40 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {DAY_LETTERS.map((d, i) => (
              <p key={i} className="text-center text-[9px] font-bold text-(--ep-ink)/30">{d}</p>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {weeks.map((row, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {row.map((cell) => (
                  <div
                    key={cell.date}
                    title={cell.future ? undefined : `${shortDate(cell.date)} : ${nf(cell.steps)} ${t("pas")}`}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 5,
                      background: cellColor(cell.steps, goal, cell.future),
                      border: cell.isToday ? "1.5px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.04)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
