"use client";

// Agenda hebdomadaire, outil de productivité (refonte 2026-10-20, retour
// direct du fondateur : « je dois te demander de modifier mon agenda, ça ne
// devrait pas être le cas »). Principes :
//  - la grille suit les heures de la personne (réglages, 6h-22h par défaut,
//    journée de nuit possible) et montre ses créneaux libres : zéro trou
//    caché ;
//  - un bloc se pose en 2 taps (créneau libre -> type -> durée), se glisse
//    et s'étire à la souris ou au doigt (appui long), se copie sur d'autres
//    jours en un geste ;
//  - les journées types et « Construire ma semaine » remplissent plusieurs
//    jours d'un coup, avec aperçu, sans rien détruire sans confirmation ;
//  - trajets / pas : une fine ligne avec une pastille, pas un gros bloc ;
//  - un bloc séance ouvre la séance du programme, un bloc repas ouvre le
//    repas de la diète (lien résolu à l'affichage, jamais figé).
// Le calcul pur vit dans lib/agenda-engine.ts, les panneaux dans
// components/agenda/.

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock, Check, ChevronLeft, ChevronRight, Clock, Copy, Footprints, Layers, MoreHorizontal, Plus, Timer, Trash2, Wand2,
  Car, Bike, TramFront, CircleCheck,
} from "lucide-react";
import type { ScheduleBlock } from "@/utils/agenda";
import { AGENDA_PRESETS, AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import { withAlpha } from "@/lib/theme-color";
import {
  ALL_DAYS,
  DAY_LABELS,
  DAY_SHORT,
  DEFAULT_PREFS,
  DEFAULT_WINDOW,
  KIND_STYLE,
  MEAL_SLOT_NAMES,
  absOfClock,
  blockKind,
  clockLabel,
  defaultMealAbs,
  durationLabel,
  findFreeStart,
  findGaps,
  formatSteps,
  isOvernight,
  mealSlotOf,
  placeAll,
  placeBlock,
  prevDay,
  snap,
  toCalendar,
  toMin,
  travelModeOf,
  travelSteps,
  windowSpan,
  type AgendaPrefs,
  type DayTemplate,
  type DayWindow,
  type Placed,
  type TemplateBlock,
} from "@/lib/agenda-engine";
import { EMPTY_CONTEXT, dietSlotsForDay, sessionForDay, type AgendaContext } from "@/lib/agenda-links";
import QuickAddSheet, { type RecentBlock } from "@/components/agenda/QuickAddSheet";
import BlockSheet from "@/components/agenda/BlockSheet";
import BlockFormSheet from "@/components/agenda/BlockFormSheet";
import WeekBuilderSheet from "@/components/agenda/WeekBuilderSheet";
import AgendaSettingsSheet from "@/components/agenda/AgendaSettingsSheet";
import DayTemplatesSheet from "@/components/agenda/DayTemplatesSheet";
import Sheet from "@/components/nutrition/Sheet";
import { DayPicker, ErrorText, SectionLabel } from "@/components/agenda/ui";
import type { AgendaActions, AgendaSettingsProp, BlockFormData, ColumnBlockInput, PlaceResult } from "@/components/agenda/types";

export type { BlockFormData } from "@/components/agenda/types";

const ROW_DAY = 56;
const ROW_WEEK = 40;
const TRAVEL_ICON = { marche: Footprints, transports: TramFront, velo: Bike, voiture: Car } as const;

// ── Semaine courante ─────────────────────────────────────────────────────

function isoWeekday(d: Date): number {
  const w = d.getDay();
  return w === 0 ? 7 : w;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentWeekBounds(now: Date): { start: string; end: string } {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - (isoWeekday(now) - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateStr(monday), end: toDateStr(sunday) };
}

function dateOfDow(weekStart: string, dow: number): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dow - 1);
  return d.toISOString().slice(0, 10);
}

// Un bloc ponctuel (specific_date) ne s'affiche que la semaine où il tombe ;
// un bloc récurrent remplacé ce jour-là par une copie décalée est masqué.
function isRelevantThisWeek(block: ScheduleBlock, weekBounds: { start: string; end: string } | null): boolean {
  if (!block.specific_date) return !weekBounds || !(block.skipped_dates ?? []).includes(dateOfDow(weekBounds.start, block.day_of_week));
  if (!weekBounds) return true;
  return block.specific_date >= weekBounds.start && block.specific_date <= weekBounds.end;
}

const isReveilLabel = (label: string) => /r[ée]veil/i.test(label);

// Un bloc ouvre la bonne page (2026-09-30) quand il n'a pas de contenu lié.
function destinationFor(block: ScheduleBlock, space: "coach" | "client"): { label: string; href: string } | null {
  const me = space === "coach" ? "/dashboard/coach/moi" : "/dashboard/client";
  const text = `${block.label} ${block.notes ?? ""}`;
  if (space === "coach" && /(contenu|tourn|script|montage|reel|vid[ée]o|post|story|youtube|tiktok|insta)/i.test(text)) return { label: "Voir mes scripts à tourner", href: "/dashboard/coach/studio" };
  if (/live/i.test(text)) return { label: "Ouvrir les lives", href: space === "coach" ? "/dashboard/coach/live" : "/dashboard/client/live" };
  if (space === "coach" && /(appel|call|closing|vente|découverte|decouverte)/i.test(text)) return { label: "Ouvrir mes appels de vente", href: "/dashboard/coach/admin/ventes" };
  if (block.icon === "sommeil") return { label: "Ouvrir mon sommeil", href: `${me}/tracking` };
  if (block.icon === "etude") return { label: "Ouvrir mes formations", href: `${me}/formations` };
  if (block.icon === "bilan" || /bilan/i.test(block.label)) return { label: "Faire mon bilan", href: `${me}/bilan` };
  return null;
}

function formOf(b: ScheduleBlock): BlockFormData {
  return {
    day_of_week: b.day_of_week,
    start_time: b.start_time.slice(0, 5),
    end_time: b.end_time.slice(0, 5),
    label: b.label,
    color: b.color,
    icon: b.icon,
    notes: b.notes,
    tasks: b.tasks ?? [],
    notify: b.notify ?? false,
    link_ref: b.link_ref ?? null,
  };
}

/** Voies (colonnes internes) pour des blocs qui se chevauchent. */
function assignLanes<T extends { s: number; e: number }>(items: T[]): Map<T, { lane: number; lanes: number }> {
  const res = new Map<T, { lane: number; lanes: number }>();
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e);
  let cluster: T[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const it of cluster) res.set(it, { lane: res.get(it)!.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.e);
    } else laneEnds[lane] = it.e;
    res.set(it, { lane, lanes: 0 });
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  flush();
  return res;
}

interface DragState {
  id: string;
  col: number;
  mode: "move" | "resize";
  startY: number;
  origS: number;
  origE: number;
  row: number;
  pointerType: string;
  active: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export default function WeeklyAgenda({
  blocks: initialBlocks,
  editable,
  today,
  initialCompletedTaskKeys,
  space = "client",
  settings,
  context,
  ...actions
}: AgendaActions & {
  blocks: ScheduleBlock[];
  editable: boolean;
  /** Espace de la personne (liens des blocs vers la bonne page). */
  space?: "coach" | "client";
  /** Date du jour (YYYY-MM-DD, heure de Paris) — clé des tâches cochées. */
  today?: string;
  /** Clés "{block_id}:{task_index}" déjà cochées aujourd'hui. */
  initialCompletedTaskKeys?: string[];
  /** Réglages d'agenda (heures, préférences, journées types). */
  settings?: AgendaSettingsProp;
  /** Programme et diète actifs, pour les blocs liés et « Construire ma semaine ». */
  context?: AgendaContext;
}) {
  const t = useT();
  const router = useRouter();
  const ctx = context ?? EMPTY_CONTEXT;
  const [blocks, setBlocks] = useState(initialBlocks);
  useEffect(() => {
    // Resynchronise après router.refresh() : useState ne relit pas un nouveau prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  const [win, setWin] = useState<DayWindow>(settings?.window ?? DEFAULT_WINDOW);
  const [prefs, setPrefs] = useState<AgendaPrefs>(settings?.prefs ?? DEFAULT_PREFS);
  const [templates, setTemplates] = useState<DayTemplate[]>(settings?.templates ?? []);
  const ready = settings?.ready ?? false;

  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set(initialCompletedTaskKeys ?? []));
  useEffect(() => {
    // Même raison que pour les blocs : nouvelles clés après rafraîchissement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedKeys(new Set(initialCompletedTaskKeys ?? []));
  }, [initialCompletedTaskKeys]);

  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [now, setNow] = useState<Date | null>(null);
  const [selectedCol, setSelectedCol] = useState(1);

  const [quickAdd, setQuickAdd] = useState<{ col: number; start: number; gapEnd: number | null } | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [form, setForm] = useState<{ initial: BlockFormData; editingId: string | null } | null>(null);
  const [builder, setBuilder] = useState<{ scopeCol: number | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesFor, setTemplatesFor] = useState<number | null>(null);
  const [dayOptionsFor, setDayOptionsFor] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void; tone?: "ok" | "bad" } | null>(null);

  // Minuteur facultatif du bloc en cours (purement local).
  const [timerBlockId, setTimerBlockId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // Vue par défaut (semaine sur grand écran) et heure courante : uniquement
  // côté navigateur, après montage.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewMode(mq.matches ? "week" : "day");
    const n = new Date();
    setNow(n);
    const w = settings?.window ?? DEFAULT_WINDOW;
    const nowMin = n.getHours() * 60 + n.getMinutes();
    setSelectedCol(isOvernight(w) && nowMin < w.end ? prevDay(isoWeekday(n)) : isoWeekday(n));
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, [settings?.window]);

  // ── Données dérivées ──────────────────────────────────────────────────
  const weekBounds = now ? currentWeekBounds(now) : null;
  const relevant = useMemo(() => blocks.filter((b) => isRelevantThisWeek(b, weekBounds)), [blocks, weekBounds?.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const gridBlocks = useMemo(() => relevant.filter((b) => !isReveilLabel(b.label)), [relevant]);
  const placed = useMemo(() => placeAll(gridBlocks, win), [gridBlocks, win]);
  const placedById = useMemo(() => new Map(placed.map((p) => [p.block.id, p])), [placed]);
  const colPlaced = (col: number) => placed.filter((p) => p.col === col).sort((a, b) => a.s - b.s);
  const recurringPlaced = useMemo(() => placeAll(blocks.filter((b) => !b.specific_date && !isReveilLabel(b.label)), win), [blocks, win]);
  const alarmCols = useMemo(() => [...new Set(placeAll(blocks.filter((b) => isReveilLabel(b.label) && !b.specific_date), win).map((p) => p.col))], [blocks, win]);

  const todayDow = now ? isoWeekday(now) : null;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const nowCol = todayDow !== null && nowMin !== null ? (isOvernight(win) && nowMin < win.end ? prevDay(todayDow) : todayDow) : null;
  const nowAbs = nowCol !== null && nowMin !== null ? (nowCol !== todayDow ? nowMin + 1440 : nowMin) : null;
  const { s: ws, e: we } = windowSpan(win);

  const currentPlaced = nowCol !== null && nowAbs !== null ? placed.find((p) => p.col === nowCol && p.s <= nowAbs && p.e > nowAbs && blockKind(p.block) !== "trajet") ?? null : null;

  const reveilFor = (col: number) => {
    const r = relevant.filter((b) => isReveilLabel(b.label)).map((b) => placeBlock(b, win)).find((p) => p.col === col);
    return r ?? null;
  };

  const recents: RecentBlock[] = useMemo(() => {
    const map = new Map<string, { b: ScheduleBlock; count: number; durations: Map<number, number> }>();
    for (const b of blocks) {
      if (isReveilLabel(b.label)) continue;
      const key = `${b.label}|${b.icon}`;
      const d = Math.max(5, toMin(b.end_time) - toMin(b.start_time));
      const cur = map.get(key) ?? { b, count: 0, durations: new Map() };
      cur.count++;
      cur.durations.set(d, (cur.durations.get(d) ?? 0) + 1);
      map.set(key, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(({ b, durations }) => ({
        label: b.label,
        icon: b.icon,
        color: b.color,
        minutes: [...durations.entries()].sort((a, c) => c[1] - a[1])[0][0],
        link_ref: b.link_ref ?? null,
        tasks: b.tasks ?? [],
        notify: b.notify,
      }));
  }, [blocks]);

  // ── Actions ───────────────────────────────────────────────────────────
  function notify(text: string, undo?: () => void, tone: "ok" | "bad" = "ok") {
    setToast({ text, undo, tone });
  }

  async function toggleTaskKey(key: string) {
    if (!actions.saveTaskCompletion || !today) return;
    const prev = completedKeys;
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCompletedKeys(next);
    const res = await actions.saveTaskCompletion(today, [...next]).catch(() => ({ error: "Connexion perdue." }));
    if (res.error) setCompletedKeys(prev);
  }

  const tmpSeq = useRef(0);
  /** Pose un bloc exprimé dans une colonne (coupé en deux s'il passe minuit). */
  async function createInColumn(col: number, tb: TemplateBlock, opts: { toast?: boolean } = {}): Promise<boolean> {
    if (!actions.addScheduleBlock) return false;
    const pieces = toCalendar(col, tb.s, tb.e);
    const created: ScheduleBlock[] = [];
    for (const piece of pieces) {
      tmpSeq.current += 1;
      const tmpId = `tmp-${tmpSeq.current}`;
      const data: BlockFormData = { ...piece, start_time: piece.start_time.slice(0, 5), end_time: piece.end_time.slice(0, 5), label: tb.label, color: tb.color, icon: tb.icon, notes: tb.notes, tasks: tb.tasks, notify: tb.notify, link_ref: tb.link_ref };
      const temp = { id: tmpId, owner_id: "", created_at: "", last_notified_at: null, specific_date: null, ...data, start_time: piece.start_time, end_time: piece.end_time } as ScheduleBlock;
      setBlocks((prev) => [...prev, temp]);
      const res = await actions.addScheduleBlock(data).catch(() => ({ error: "Connexion perdue, réessaie." }) as { error?: string; block?: ScheduleBlock });
      if (res.error || !res.block) {
        setBlocks((prev) => prev.filter((b) => b.id !== tmpId));
        notify(res.error ?? "Erreur.", undefined, "bad");
        return false;
      }
      created.push(res.block);
      setBlocks((prev) => prev.map((b) => (b.id === tmpId ? res.block! : b)));
    }
    if (opts.toast !== false) {
      notify(`${tb.label} · ${clockLabel(tb.s)}`, () => {
        for (const c of created) {
          setBlocks((prev) => prev.filter((b) => b.id !== c.id));
          actions.deleteScheduleBlock?.(c.id);
        }
      });
    }
    return true;
  }

  async function commitTimes(p: Placed<ScheduleBlock>, s: number, e: number) {
    if (!actions.setScheduleBlockTimes) return;
    let ns = Math.max(0, snap(s));
    let ne = Math.min(2880, snap(e));
    if (ne - ns < 5) ne = ns + 5;
    // Un bloc ne traverse pas minuit : il reste du côté où il est le plus.
    const boundary = Math.floor(ns / 1440) * 1440 + 1440;
    if (ns < boundary && ne > boundary) {
      if (boundary - ns >= ne - boundary) ne = boundary;
      else ns = boundary;
    }
    const piece = toCalendar(p.col, ns, ne)[0];
    if (!piece) return;
    const before = p.block;
    const updated = { ...before, day_of_week: piece.day_of_week, start_time: piece.start_time, end_time: piece.end_time };
    setBlocks((prev) => prev.map((b) => (b.id === before.id ? updated : b)));
    const res = await actions.setScheduleBlockTimes(before.id, piece.day_of_week, piece.start_time, piece.end_time).catch(() => ({ error: "Connexion perdue, réessaie." }));
    if (res.error) {
      setBlocks((prev) => prev.map((b) => (b.id === before.id ? before : b)));
      notify(res.error, undefined, "bad");
    } else {
      notify(`${before.label} · ${clockLabel(ns)} – ${clockLabel(ne)}`, () => {
        setBlocks((prev) => prev.map((b) => (b.id === before.id ? before : b)));
        actions.setScheduleBlockTimes?.(before.id, before.day_of_week, before.start_time, before.end_time);
      });
    }
  }

  async function removeBlock(b: ScheduleBlock) {
    setSheetId(null);
    setForm(null);
    setBlocks((prev) => prev.filter((x) => x.id !== b.id));
    const res = await actions.deleteScheduleBlock?.(b.id).catch(() => ({ error: "Connexion perdue, réessaie." }));
    if (res?.error) {
      setBlocks((prev) => [...prev, b]);
      return notify(res.error, undefined, "bad");
    }
    notify(`${b.label} ${t("supprimé")}`, async () => {
      const again = await actions.addScheduleBlock?.(formOf(b));
      if (again?.block) setBlocks((prev) => [...prev, again.block!]);
    });
  }

  async function updateBlock(b: ScheduleBlock, patch: Partial<BlockFormData>): Promise<string | null> {
    if (!actions.updateScheduleBlock) return null;
    const data = { ...formOf(b), ...patch };
    const before = b;
    setBlocks((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...data, start_time: `${data.start_time}:00`, end_time: `${data.end_time}:00` } : x)));
    const res = await actions.updateScheduleBlock(b.id, data).catch(() => ({ error: "Connexion perdue, réessaie." }));
    if (res.error) {
      setBlocks((prev) => prev.map((x) => (x.id === b.id ? before : x)));
      return res.error;
    }
    return null;
  }

  async function placeItems(items: ColumnBlockInput[], mode: "completer" | "remplacer"): Promise<string | null> {
    if (!actions.placeColumnBlocks) return "Indisponible.";
    const res: PlaceResult = await actions.placeColumnBlocks(items, mode).catch(() => ({ error: "Connexion perdue, réessaie." }));
    if (res.error) return res.error;
    const removed = new Set(res.removedIds ?? []);
    setBlocks((prev) => [...prev.filter((b) => !removed.has(b.id)), ...(res.blocks ?? [])]);
    router.refresh();
    return null;
  }

  function columnItemsFrom(p: Placed<ScheduleBlock>, col: number): ColumnBlockInput {
    const b = p.block;
    return { col, s: p.s, e: p.e, label: b.label, icon: b.icon, color: b.color, tasks: b.tasks ?? [], notes: b.notes, notify: b.notify, link_ref: b.link_ref ?? null };
  }

  async function copyBlockTo(p: Placed<ScheduleBlock>, cols: number[]): Promise<string> {
    if (!actions.placeColumnBlocks) return "";
    const res = await actions.placeColumnBlocks(cols.map((c) => columnItemsFrom(p, c)), "completer").catch(() => ({ error: "Connexion perdue, réessaie." }) as { error?: string; blocks?: ScheduleBlock[]; skipped?: number });
    if (res.error) return res.error;
    setBlocks((prev) => [...prev, ...(res.blocks ?? [])]);
    const added = cols.length - (res.skipped ?? 0);
    return `${t("Copié sur")} ${added} ${added > 1 ? t("jours") : t("jour")}${res.skipped ? ` · ${res.skipped} ${t("déjà occupé(s) à cette heure, laissé(s) tel(s) quel(s)")}` : ""}.`;
  }

  /** « À caler » : séance / repas prévus par le programme ou la diète mais absents de la journée. */
  function missingFor(col: number): { key: string; label: string; make: () => TemplateBlock | null }[] {
    const list = colPlaced(col);
    const out: { key: string; label: string; make: () => TemplateBlock | null }[] = [];
    const busy = list.map((p) => ({ s: p.s, e: p.e }));
    const session = sessionForDay(ctx, col);
    if (session && !list.some((p) => blockKind(p.block) === "seance")) {
      out.push({
        key: "seance",
        label: `${t("Séance")} ${session.label}`,
        make: () => {
          const a = findFreeStart(absOfClock(prefs.sessionTime, win), prefs.sessionMinutes, busy, ws, we);
          return a === null ? null : { s: a, e: a + prefs.sessionMinutes, label: `Séance : ${session.label}`, icon: "salle", color: KIND_STYLE.seance.color, tasks: [], notes: null, notify: prefs.notify, link_ref: session.label };
        },
      });
    }
    const present = new Set(list.filter((p) => blockKind(p.block) === "repas").map((p) => mealSlotOf(p.block)));
    for (const slot of dietSlotsForDay(ctx, col)) {
      if (present.has(slot)) continue;
      out.push({
        key: slot,
        label: t(MEAL_SLOT_NAMES[slot] ?? "Repas"),
        make: () => {
          const a = findFreeStart(defaultMealAbs(slot, win), prefs.mealMinutes, busy, ws, we);
          return a === null ? null : { s: a, e: a + prefs.mealMinutes, label: MEAL_SLOT_NAMES[slot] ?? "Repas", icon: "repas", color: KIND_STYLE.repas.color, tasks: [], notes: null, notify: prefs.notify, link_ref: slot };
        },
      });
    }
    return out;
  }

  // ── Glisser / étirer ──────────────────────────────────────────────────
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<{ id: string; s: number; e: number } | null>(null);

  function startDrag(e: React.PointerEvent, p: Placed<ScheduleBlock>, mode: "move" | "resize", row: number) {
    if (!editable || !actions.setScheduleBlockTimes || p.block.id.startsWith("tmp-")) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (mode === "resize") e.stopPropagation();
    const st: DragState = { id: p.block.id, col: p.col, mode, startY: e.clientY, origS: p.s, origE: p.e, row, pointerType: e.pointerType, active: mode === "resize", timer: null };
    if (mode === "resize") e.preventDefault();
    if (mode === "move" && e.pointerType !== "mouse") {
      st.timer = setTimeout(() => {
        st.active = true;
        navigator.vibrate?.(12);
        setDragPreview({ id: st.id, s: st.origS, e: st.origE });
      }, 380);
    }
    dragRef.current = st;
    if (st.active) setDragPreview({ id: st.id, s: st.origS, e: st.origE });

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = ev.clientY - d.startY;
      if (!d.active) {
        if (d.pointerType === "mouse" && Math.abs(dy) > 4) {
          d.active = true;
        } else {
          if (Math.abs(dy) > 8) cleanup(); // c'est un défilement
          return;
        }
      }
      const delta = snap((dy / d.row) * 60);
      let s = d.origS;
      let en = d.origE;
      if (d.mode === "move") {
        s = Math.max(0, d.origS + delta);
        en = s + (d.origE - d.origS);
      } else en = Math.max(d.origS + 5, d.origE + delta);
      setDragPreview({ id: d.id, s, e: en });
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (dragRef.current?.active) ev.preventDefault();
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d?.active) {
        suppressClickRef.current = true;
        setDragPreview((prev) => {
          if (prev && (prev.s !== d.origS || prev.e !== d.origE)) {
            const target = placedById.get(d.id);
            if (target) void commitTimes(target, prev.s, prev.e);
          }
          return null;
        });
      }
      cleanup();
    };
    function cleanup() {
      const d = dragRef.current;
      if (d?.timer) clearTimeout(d.timer);
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("touchmove", onTouchMove);
      if (!d?.active) setDragPreview(null);
    }
    const onCancel = () => {
      setDragPreview(null);
      cleanup();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
  }

  // ── Rendu d'une colonne ───────────────────────────────────────────────
  function rangeOf(list: Placed[]): { from: number; to: number } {
    let from = ws;
    let to = we;
    for (const p of list) {
      from = Math.min(from, p.s);
      to = Math.max(to, p.e);
    }
    return { from: Math.floor(from / 60) * 60, to: Math.ceil(to / 60) * 60 };
  }

  function openAddAt(col: number, abs: number) {
    if (!editable || !actions.addScheduleBlock) return;
    const gaps = findGaps(colPlaced(col), win, 5);
    const gap = gaps.find((g) => abs >= g.s && abs < g.e) ?? null;
    if (gap && gap.e - gap.s <= 180) return setQuickAdd({ col, start: gap.s, gapEnd: gap.e });
    const start = Math.max(gap?.s ?? 0, Math.floor(abs / 15) * 15);
    setQuickAdd({ col, start, gapEnd: gap?.e ?? null });
  }

  function renderColumn(col: number, row: number, range: { from: number; to: number }, compact: boolean) {
    const list = colPlaced(col);
    const height = ((range.to - range.from) / 60) * row;
    const y = (abs: number) => ((abs - range.from) / 60) * row;
    const gaps = editable ? findGaps(list, win, 5) : [];
    const lanes = assignLanes(list);
    const isNowCol = nowCol === col;
    const hours: number[] = [];
    for (let h = range.from; h < range.to; h += 60) hours.push(h);

    return (
      <div
        className="relative"
        style={{ height, background: isNowCol ? "rgba(var(--ep-accent-rgb),0.03)" : "transparent", borderLeft: "1px solid rgba(var(--ep-line-rgb),0.12)", cursor: editable ? "copy" : "default" }}
        onClick={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          openAddAt(col, range.from + ((e.clientY - rect.top) / row) * 60);
        }}
      >
        {hours.map((h) => (
          <div key={h} className="absolute left-0 right-0 pointer-events-none" style={{ top: y(h), height: row, borderTop: "1px solid rgba(var(--ep-line-rgb),0.09)" }} />
        ))}
        {/* Hors de la journée réglée (affiché seulement si un bloc y est) */}
        {range.from < ws && <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 0, height: y(ws), background: "rgba(var(--ep-ink-rgb),0.035)" }} />}
        {range.to > we && <div className="absolute left-0 right-0 pointer-events-none" style={{ top: y(we), bottom: 0, background: "rgba(var(--ep-ink-rgb),0.035)" }} />}

        {gaps.map((g) => {
          const top = y(g.s);
          const h = y(g.e) - top;
          return (
            <div
              key={`gap-${g.s}`}
              className="absolute left-0.5 right-0.5 rounded-md flex items-center justify-center gap-1 pointer-events-none"
              style={{ top: top + 1, height: Math.max(3, h - 2), border: "1.5px dashed rgba(var(--ep-accent-rgb),0.35)", background: "rgba(var(--ep-accent-rgb),0.04)" }}
            >
              {h >= 18 && (
                <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "rgba(var(--ep-accent-rgb),0.85)" }}>
                  <Plus size={11} />
                  {!compact && <>{t("Libre")} · {clockLabel(g.s)} · {durationLabel(g.e - g.s)}</>}
                  {compact && h >= 26 && durationLabel(g.e - g.s)}
                </span>
              )}
            </div>
          );
        })}

        {list.map((p) => {
          const b = p.block;
          const preview = dragPreview?.id === b.id ? dragPreview : null;
          const s = preview?.s ?? p.s;
          const e = preview?.e ?? p.e;
          const top = y(s);
          const h = Math.max(4, y(e) - top);
          const lane = lanes.get(p) ?? { lane: 0, lanes: 1 };
          const widthPct = 100 / Math.max(1, lane.lanes);
          const leftPct = lane.lane * widthPct;
          const kind = blockKind(b);
          const common = {
            onPointerDown: (ev: React.PointerEvent) => startDrag(ev, p, "move", row),
            onClick: (ev: React.MouseEvent) => {
              ev.stopPropagation();
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              setSheetId(b.id);
            },
            onContextMenu: (ev: React.MouseEvent) => ev.preventDefault(),
          };
          const dragging = !!preview;

          if (kind === "trajet") {
            const mode = travelModeOf(b);
            const steps = travelSteps(mode, e - s);
            const TIcon = TRAVEL_ICON[mode];
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                aria-label={`${b.label}, ${clockLabel(s)}, ${durationLabel(e - s)}`}
                {...common}
                className="absolute select-none"
                style={{ top, height: h, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, zIndex: dragging ? 30 : 6, touchAction: "pan-y", WebkitUserSelect: "none" }}
              >
                <div className="absolute top-0 bottom-0" style={{ left: 10, borderLeft: "2px dashed rgba(var(--ep-ok-rgb),0.7)" }} />
                <span
                  className="absolute flex items-center gap-1 rounded-full whitespace-nowrap font-bold"
                  style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                    right: 2,
                    height: compact ? 16 : 20,
                    padding: compact ? "0 5px" : "0 8px",
                    fontSize: compact ? 9 : 10.5,
                    background: "var(--ep-s2)",
                    border: "1px solid rgba(var(--ep-ok-rgb),0.5)",
                    color: "var(--ep-ink)",
                    boxShadow: dragging ? "0 4px 16px rgba(var(--ep-shade-rgb),0.5)" : "none",
                  }}
                >
                  <TIcon size={compact ? 9 : 11} style={{ color: "var(--ep-ok)" }} />
                  {durationLabel(e - s)}
                  {!compact && steps > 0 && <span style={{ color: "rgba(var(--ep-ink-rgb),0.55)" }}>· ~{formatSteps(steps)} {t("pas")}</span>}
                </span>
              </div>
            );
          }

          const Icon = b.icon ? AGENDA_ICON_MAP[b.icon] : null;
          const tasks = b.tasks ?? [];
          const isTodayBlock = todayDow === b.day_of_week;
          const done = isTodayBlock ? tasks.filter((_, i) => completedKeys.has(`${b.id}:${i}`)).length : 0;
          const linked = kind === "seance" || kind === "repas";
          return (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              aria-label={`${b.label}, ${clockLabel(s)} à ${clockLabel(e)}`}
              {...common}
              onKeyDown={(ev) => ev.key === "Enter" && setSheetId(b.id)}
              className="absolute overflow-hidden rounded-md text-left select-none"
              style={{
                top: top + 0.5,
                height: Math.max(3, h - 1),
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                background: withAlpha(b.color, dragging ? "40" : "24"),
                borderLeft: `3px solid ${b.color}`,
                boxShadow: dragging ? "0 8px 24px rgba(var(--ep-shade-rgb),0.55)" : "none",
                zIndex: dragging ? 30 : 5,
                padding: h >= 26 ? (compact ? "2px 4px" : "4px 8px") : "0 6px",
                touchAction: "pan-y",
                WebkitUserSelect: "none",
                cursor: editable ? "grab" : "pointer",
              }}
            >
              <p className="flex items-center gap-1 font-bold text-(--ep-strong) leading-tight" style={{ fontSize: compact ? 9.5 : 12, lineHeight: h < 26 ? `${Math.max(3, h - 1)}px` : undefined }}>
                {Icon && !compact && h >= 22 && <Icon size={12} style={{ color: b.color, flexShrink: 0 }} strokeWidth={2.2} />}
                <span className="truncate">{b.label}</span>
                {!compact && h < 40 && <span className="text-(--ep-ink)/45 font-semibold flex-shrink-0 tabular-nums">{clockLabel(s)}</span>}
                {linked && !compact && <ChevronRight size={12} className="text-(--ep-ink)/35 flex-shrink-0 ml-auto" />}
              </p>
              {h >= 40 && (
                <p className="flex items-center gap-1.5 tabular-nums text-(--ep-ink)/55" style={{ fontSize: compact ? 8.5 : 10.5 }}>
                  {dragging ? <b className="text-(--ep-strong)">{clockLabel(s)} – {clockLabel(e)}</b> : <>{clockLabel(s)} – {clockLabel(e)}</>}
                  {tasks.length > 0 && !compact && (
                    <span className="flex items-center gap-0.5 font-bold" style={{ color: done === tasks.length && done > 0 ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.5)" }}>
                      <CircleCheck size={10} /> {isTodayBlock ? `${done}/${tasks.length}` : tasks.length}
                    </span>
                  )}
                </p>
              )}
              {dragging && h < 40 && (
                <span className="absolute right-1 top-0 text-[10px] font-black tabular-nums text-(--ep-strong)">{clockLabel(s)} – {clockLabel(e)}</span>
              )}
              {editable && actions.setScheduleBlockTimes && h >= 22 && (
                <div
                  aria-hidden
                  onPointerDown={(ev) => startDrag(ev, p, "resize", row)}
                  onClick={(ev) => ev.stopPropagation()}
                  className="absolute left-0 right-0 bottom-0 flex justify-center items-end"
                  style={{ height: 12, cursor: "ns-resize", touchAction: "none" }}
                >
                  <span className="mb-[3px] rounded-full" style={{ width: 22, height: 3, background: "rgba(var(--ep-ink-rgb),0.28)" }} />
                </div>
              )}
            </div>
          );
        })}

        {isNowCol && nowAbs !== null && nowAbs >= range.from && nowAbs <= range.to && (
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: y(nowAbs), zIndex: 20 }}>
            <div style={{ height: 2, background: "var(--ep-accent)", boxShadow: "0 0 6px rgba(var(--ep-accent-rgb),0.7)" }} />
            <div style={{ position: "absolute", left: -3, top: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--ep-accent)" }} />
          </div>
        )}
      </div>
    );
  }

  function renderHourLabels(row: number, range: { from: number; to: number }) {
    const hours: number[] = [];
    for (let h = range.from; h <= range.to; h += 60) hours.push(h);
    return (
      <div className="relative" style={{ height: ((range.to - range.from) / 60) * row }}>
        {hours.map((h) => (
          <p key={h} className="absolute right-1.5 text-[10px] font-semibold tabular-nums" style={{ top: ((h - range.from) / 60) * row - 7, color: h >= ws && h <= we ? "rgba(var(--ep-ink-rgb),0.35)" : "rgba(var(--ep-ink-rgb),0.18)" }}>
            {(h / 60) % 24}h
          </p>
        ))}
      </div>
    );
  }

  // ── Statistiques ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0;
    let steps = 0;
    const byIcon: Record<string, number> = {};
    for (const p of placed) {
      const d = p.e - p.s;
      total += d;
      if (blockKind(p.block) === "trajet") steps += travelSteps(travelModeOf(p.block), d);
      const key = p.block.icon && AGENDA_ICON_MAP[p.block.icon] ? p.block.icon : "autre";
      byIcon[key] = (byIcon[key] ?? 0) + d;
    }
    return { total, steps, top: Object.entries(byIcon).sort((a, b) => b[1] - a[1]).slice(0, 4) };
  }, [placed]);

  const sel = selectedCol;
  const selList = colPlaced(sel);
  const selGaps = findGaps(selList, win, 5);
  const selGapMin = selGaps.reduce((s, g) => s + g.e - g.s, 0);
  const selSteps = selList.filter((p) => blockKind(p.block) === "trajet").reduce((s, p) => s + travelSteps(travelModeOf(p.block), p.e - p.s), 0);
  const missing = editable ? missingFor(sel) : [];
  const reveilSel = reveilFor(sel);
  const sheetPlaced = sheetId ? placedById.get(sheetId) ?? null : null;
  const weekRange = rangeOf(placed);
  const dayRange = rangeOf(selList);

  function shiftCol(delta: number) {
    setSelectedCol((prev) => (((prev - 1 + delta) % 7) + 7) % 7 + 1);
  }

  return (
    <div className="space-y-3">
      {/* Bloc en cours : ce que je suis censé faire là, avec ses cases. */}
      {currentPlaced && (() => {
        const b = currentPlaced.block;
        const Icon = b.icon ? AGENDA_ICON_MAP[b.icon] : null;
        return (
          <div className="ep-card" style={{ padding: "14px 16px", borderLeft: `3px solid ${b.color}` }}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={13} style={{ color: b.color, flexShrink: 0 }} strokeWidth={2.2} />}
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.4)", margin: 0 }}>
                  {t("En ce moment jusqu'à")} {clockLabel(currentPlaced.e)}
                </p>
              </div>
              {editable && (
                <button
                  onClick={() => {
                    if (timerBlockId !== b.id) {
                      setTimerBlockId(b.id);
                      setTimerSeconds(0);
                      setTimerRunning(true);
                    } else setTimerRunning((r) => !r);
                  }}
                  className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums"
                  style={timerBlockId === b.id && timerRunning ? { background: "rgba(var(--ep-accent-rgb),0.15)", color: "var(--ep-accent)" } : { background: "rgba(var(--ep-ink-rgb),0.06)", color: "rgba(var(--ep-ink-rgb),0.45)" }}
                  title={t("Minuteur")}
                >
                  <Timer size={12} />
                  {timerBlockId === b.id ? `${String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:${String(timerSeconds % 60).padStart(2, "0")}` : "00:00"}
                </button>
              )}
            </div>
            <button type="button" onClick={() => setSheetId(b.id)} className="text-left w-full">
              <p style={{ fontSize: 15, fontWeight: 900, color: "var(--ep-strong)", margin: "0 0 6px" }}>{b.label}</p>
            </button>
            {(b.tasks ?? []).length > 0 && (
              <ul className="flex flex-col gap-1">
                {(b.tasks ?? []).map((task, i) => {
                  const key = `${b.id}:${i}`;
                  const done = completedKeys.has(key);
                  return (
                    <li key={i}>
                      <button onClick={() => toggleTaskKey(key)} disabled={!actions.saveTaskCompletion || !today} className="flex items-center gap-2 w-full text-left min-h-8 disabled:cursor-default" style={{ fontSize: 12.5, color: done ? "rgba(var(--ep-ink-rgb),0.4)" : "rgba(var(--ep-ink-rgb),0.85)" }}>
                        <span className="flex-shrink-0 rounded flex items-center justify-center" style={{ width: 17, height: 17, border: `1.5px solid ${done ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.3)"}`, background: done ? "var(--ep-ok)" : "transparent" }}>
                          {done && <Check size={11} strokeWidth={3} style={{ color: "var(--ep-bg)" }} />}
                        </span>
                        <span style={{ textDecoration: done ? "line-through" : "none" }}>{task}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })()}

      {/* Barre d'outils */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-(--ep-line)/30 p-0.5">
          {(["day", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              aria-pressed={viewMode === m}
              className="px-3 h-8 rounded-md text-[11px] font-black uppercase tracking-widest"
              style={{ background: viewMode === m ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent", color: viewMode === m ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.45)" }}
            >
              {m === "day" ? t("Jour") : t("Semaine")}
            </button>
          ))}
        </div>
        {editable && (
          <button type="button" onClick={() => setSettingsOpen(true)} className="ml-auto flex items-center gap-1.5 h-9 px-3 rounded-lg border border-(--ep-line)/30 text-[11px] font-bold text-(--ep-ink)/70" aria-label={t("Mes heures")}>
            <Clock size={13} /> {clockLabel(ws)} – {clockLabel(we)}
          </button>
        )}
      </div>
      {editable && actions.placeColumnBlocks && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => setBuilder({ scopeCol: null })} className="flex items-center justify-center gap-2 h-11 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap" style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}>
            <Wand2 size={15} /> {t("Construire ma semaine")}
          </button>
          <button type="button" onClick={() => setTemplatesFor(sel)} className="flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border border-(--ep-line)/35 text-[11px] font-bold text-(--ep-ink)/80">
            <Layers size={14} /> {t("Modèles")}
          </button>
        </div>
      )}

      {viewMode === "week" ? (
        <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex" style={{ minWidth: 760 }}>
            <div style={{ width: 34, flexShrink: 0 }}>
              <div style={{ height: 28 }} />
              {renderHourLabels(ROW_WEEK, weekRange)}
            </div>
            {ALL_DAYS.map((col) => {
              const r = reveilFor(col);
              return (
                <div key={col} style={{ flex: 1, minWidth: 100 }}>
                  <div className="flex items-center justify-center gap-1" style={{ height: 28 }}>
                    <button type="button" onClick={() => { setSelectedCol(col); setViewMode("day"); }} className="text-[10px] font-black uppercase tracking-widest" style={{ color: nowCol === col ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.45)" }}>
                      {DAY_SHORT[col]}
                    </button>
                    {r && <span className="flex items-center gap-0.5 text-[9px] font-bold text-(--ep-violet)"><AlarmClock size={9} />{clockLabel(r.s)}</span>}
                    {editable && (
                      <button onClick={() => setDayOptionsFor(col)} className="text-(--ep-ink)/30 hover:text-(--ep-accent)" aria-label={`${t("Options du")} ${DAY_LABELS[col]}`}>
                        <MoreHorizontal size={12} />
                      </button>
                    )}
                  </div>
                  {renderColumn(col, ROW_WEEK, weekRange, true)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1">
            {ALL_DAYS.map((d) => {
              const active = d === sel;
              const count = placed.filter((p) => p.col === d).length;
              const holes = findGaps(colPlaced(d), win, 5).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedCol(d)}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg border"
                  style={{ background: active ? "rgba(var(--ep-accent-rgb),0.15)" : "transparent", borderColor: active ? "rgba(var(--ep-accent-rgb),0.5)" : nowCol === d ? "rgba(var(--ep-accent-rgb),0.3)" : "transparent" }}
                >
                  <span className="text-[10px] font-black" style={{ color: active ? "var(--ep-strong)" : nowCol === d ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.4)" }}>{DAY_SHORT[d]}</span>
                  <span className="rounded-full" style={{ width: 5, height: 5, background: count === 0 ? "transparent" : holes === 0 ? "var(--ep-ok)" : "rgba(var(--ep-accent-rgb),0.55)", border: count === 0 ? "1px solid rgba(var(--ep-ink-rgb),0.2)" : "none" }} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-1">
            <button onClick={() => shiftCol(-1)} aria-label={t("Jour précédent")} className="w-9 h-9 flex items-center justify-center text-(--ep-ink)/40">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <p className="text-sm font-black uppercase tracking-widest text-(--ep-strong)">{DAY_LABELS[sel]}</p>
                {sel === nowCol && (
                  <span className="text-[9.5px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5" style={{ color: "var(--ep-accent)", background: "rgba(var(--ep-accent-rgb),0.12)" }}>{t("Aujourd'hui")}</span>
                )}
                {reveilSel && (
                  <button
                    type="button"
                    onClick={() => editable && setForm({ initial: formOf(reveilSel.block as ScheduleBlock), editingId: reveilSel.block.id })}
                    title={t("Heure de réveil (alarme réelle)")}
                    className="flex items-center gap-1 text-[10px] font-bold text-(--ep-violet) bg-(--ep-violet)/10 border border-(--ep-violet)/25 rounded-full px-1.5 py-0.5"
                  >
                    <AlarmClock size={10} /> {clockLabel(reveilSel.s)}
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-0.5 truncate">
                {selList.length === 0 ? (
                  <span className="text-(--ep-ink)/45">{t("Journée vide")}</span>
                ) : selGaps.length === 0 ? (
                  <span className="inline-flex items-center gap-1 font-bold" style={{ color: "var(--ep-ok)" }}><CircleCheck size={12} /> {t("Aucun trou")}</span>
                ) : (
                  <span className="font-bold" style={{ color: "var(--ep-accent)" }}>{selGaps.length} {selGaps.length > 1 ? t("trous") : t("trou")} · {durationLabel(selGapMin)} {t("libres")}</span>
                )}
                {selSteps > 0 && <span className="text-(--ep-ink)/45"> · ~{formatSteps(selSteps)} {t("pas")}</span>}
              </p>
            </div>
            <div className="flex items-center">
              {editable && (
                <button onClick={() => setDayOptionsFor(sel)} className="w-9 h-9 flex items-center justify-center text-(--ep-ink)/40" aria-label={t("Options du jour")}>
                  <MoreHorizontal size={18} />
                </button>
              )}
              <button onClick={() => shiftCol(1)} aria-label={t("Jour suivant")} className="w-9 h-9 flex items-center justify-center text-(--ep-ink)/40">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {editable && (missing.length > 0 || (selGaps.length > 0 && actions.placeColumnBlocks)) && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {missing.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={async () => {
                    const tb = m.make();
                    if (!tb) return notify(t("Pas de place libre pour ça ce jour-là."), undefined, "bad");
                    await createInColumn(sel, tb);
                  }}
                  className="flex-shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                  style={{ border: "1px dashed rgba(var(--ep-warn-rgb),0.6)", color: "var(--ep-strong)", background: "rgba(var(--ep-warn-rgb),0.08)" }}
                >
                  <Plus size={12} /> {m.label}
                </button>
              ))}
              {selGaps.length > 0 && actions.placeColumnBlocks && (
                <button type="button" onClick={() => setBuilder({ scopeCol: sel })} className="flex-shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ border: "1px solid rgba(var(--ep-accent-rgb),0.5)", color: "var(--ep-strong)", background: "rgba(var(--ep-accent-rgb),0.1)" }}>
                  <Wand2 size={12} /> {t("Combler les trous")}
                </button>
              )}
            </div>
          )}

          <div className="flex">
            <div style={{ width: 34, flexShrink: 0 }}>{renderHourLabels(ROW_DAY, dayRange)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>{renderColumn(sel, ROW_DAY, dayRange, false)}</div>
          </div>
          {editable && (
            <p className="text-[10.5px] text-(--ep-ink)/35 text-center leading-relaxed">
              {t("Tape un créneau pour ajouter · appui long pour déplacer · tire le bas d'un bloc pour l'allonger")}
            </p>
          )}
        </div>
      )}

      {/* Semaine en chiffres */}
      {placed.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="ep-card flex-shrink-0" style={{ padding: "8px 14px" }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.4)", margin: 0 }}>{t("Planifié / sem.")}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: "var(--ep-strong)", margin: 0 }}>{durationLabel(stats.total)}</p>
          </div>
          {stats.steps > 0 && (
            <div className="ep-card flex-shrink-0 flex items-center gap-1.5" style={{ padding: "8px 14px" }}>
              <Footprints size={12} style={{ color: "var(--ep-ok)" }} />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)", margin: 0 }}>{t("Pas en trajets")}</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: "var(--ep-strong)", margin: 0 }}>~{formatSteps(stats.steps)}</p>
              </div>
            </div>
          )}
          {stats.top.map(([key, mins]) => {
            const preset = AGENDA_PRESETS.find((p) => p.key === key);
            const Icon = preset?.icon;
            return (
              <div key={key} className="ep-card flex-shrink-0 flex items-center gap-1.5" style={{ padding: "8px 14px" }}>
                {Icon && <Icon size={12} style={{ color: preset!.color }} />}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)", margin: 0 }}>{t(preset?.label ?? "Autre")}</p>
                  <p style={{ fontSize: 12, fontWeight: 800, color: "var(--ep-strong)", margin: 0 }}>{durationLabel(mins)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Panneaux ── */}
      {quickAdd && (
        <QuickAddSheet
          col={quickAdd.col}
          start={quickAdd.start}
          gapEnd={quickAdd.gapEnd}
          window={win}
          prefs={prefs}
          ctx={ctx}
          recents={recents}
          onClose={() => setQuickAdd(null)}
          onCreate={(tb) => {
            const col = quickAdd.col;
            setQuickAdd(null);
            void createInColumn(col, tb);
          }}
          onMore={(prefill) => {
            const col = quickAdd.col;
            setQuickAdd(null);
            const piece = toCalendar(col, prefill.s, prefill.e)[0];
            setForm({
              initial: {
                day_of_week: piece?.day_of_week ?? col,
                start_time: (piece?.start_time ?? "09:00").slice(0, 5),
                end_time: (piece?.end_time ?? "10:00").slice(0, 5),
                label: prefill.label ?? "",
                color: prefill.color ?? "var(--ep-info)",
                icon: prefill.icon ?? null,
                notes: null,
                tasks: prefill.tasks ?? [],
                notify: prefill.notify ?? false,
                link_ref: prefill.link_ref ?? null,
              },
              editingId: null,
            });
          }}
        />
      )}

      {sheetPlaced && (
        <BlockSheet
          placed={sheetPlaced}
          ctx={ctx}
          space={space}
          editable={editable}
          isToday={todayDow === sheetPlaced.block.day_of_week}
          nowAbs={nowCol === sheetPlaced.col ? nowAbs : null}
          completedKeys={completedKeys}
          destination={destinationFor(sheetPlaced.block, space)}
          canCheck={editable && !!actions.saveTaskCompletion && !!today && todayDow === sheetPlaced.block.day_of_week}
          onClose={() => setSheetId(null)}
          handlers={
            editable
              ? {
                  onToggleTask: toggleTaskKey,
                  onSetTasks: actions.setScheduleBlockTasks
                    ? async (tasks, removedIndex) => {
                        const b = sheetPlaced.block;
                        const before = b.tasks ?? [];
                        setBlocks((prev) => prev.map((x) => (x.id === b.id ? { ...x, tasks } : x)));
                        const res = await actions.setScheduleBlockTasks!(b.id, tasks).catch(() => ({ error: "Connexion perdue, réessaie." }));
                        if (res.error) {
                          setBlocks((prev) => prev.map((x) => (x.id === b.id ? { ...x, tasks: before } : x)));
                          return res.error;
                        }
                        // Les cases cochées suivent leur tâche quand une tâche au-dessus disparaît.
                        if (removedIndex !== undefined && today && actions.saveTaskCompletion) {
                          const next = new Set<string>();
                          for (const k of completedKeys) {
                            const [id, idx] = k.split(":");
                            if (id !== b.id) next.add(k);
                            else if (Number(idx) < removedIndex) next.add(k);
                            else if (Number(idx) > removedIndex) next.add(`${id}:${Number(idx) - 1}`);
                          }
                          if (next.size !== completedKeys.size || [...next].some((k) => !completedKeys.has(k))) {
                            setCompletedKeys(next);
                            void actions.saveTaskCompletion(today, [...next]);
                          }
                        }
                        return null;
                      }
                    : undefined,
                  onCopy: actions.placeColumnBlocks ? (cols) => copyBlockTo(sheetPlaced, cols) : undefined,
                  onShift:
                    actions.shiftDayFromBlock && weekBounds
                      ? async (delta, scope) => {
                          const res = await actions.shiftDayFromBlock!({ blockId: sheetPlaced.block.id, deltaMinutes: delta, scope, date: dateOfDow(weekBounds.start, sheetPlaced.block.day_of_week) }).catch(() => ({ error: "Connexion perdue, réessaie." }));
                          if (res.error) return res.error;
                          setSheetId(null);
                          notify(t("Journée décalée."));
                          router.refresh();
                          return null;
                        }
                      : undefined,
                  onResize: actions.setScheduleBlockTimes ? (d) => void commitTimes(sheetPlaced, sheetPlaced.s, sheetPlaced.e + d) : undefined,
                  onSetLink: actions.updateScheduleBlock
                    ? (patch) => {
                        void updateBlock(sheetPlaced.block, { link_ref: patch.link_ref, ...(patch.label ? { label: patch.label } : {}), ...(patch.icon ? { icon: patch.icon } : {}) }).then((e) => e && notify(e, undefined, "bad"));
                      }
                    : undefined,
                  onMoveToDay: actions.setScheduleBlockTimes
                    ? (day) => {
                        setSheetId(null);
                        void commitTimes({ ...sheetPlaced, col: day }, sheetPlaced.s, sheetPlaced.e).then(() => setSelectedCol(day));
                      }
                    : undefined,
                  onEdit: actions.updateScheduleBlock ? () => { const b = sheetPlaced.block; setSheetId(null); setForm({ initial: formOf(b), editingId: b.id }); } : undefined,
                  onDelete: actions.deleteScheduleBlock ? () => void removeBlock(sheetPlaced.block) : undefined,
                }
              : {}
          }
        />
      )}
      {form && (
        <BlockFormSheet
          initial={form.initial}
          editing={!!form.editingId}
          allowRepeat={!form.editingId && !!actions.addScheduleBlocksBulk}
          overlapsFor={(f) => {
            const s = toMin(f.start_time);
            const e = f.end_time === "00:00" ? 1440 : toMin(f.end_time);
            return relevant
              .filter((b) => b.day_of_week === f.day_of_week && b.id !== form.editingId && !isReveilLabel(b.label) && toMin(b.start_time) < e && toMin(b.end_time) > s)
              .map((b) => `${b.label} (${b.start_time.slice(0, 5)} à ${b.end_time.slice(0, 5)})`);
          }}
          onClose={() => setForm(null)}
          onDelete={form.editingId ? () => { const b = blocks.find((x) => x.id === form.editingId); if (b) void removeBlock(b); } : undefined}
          onSave={async (data, repeat) => {
            if (form.editingId) {
              const b = blocks.find((x) => x.id === form.editingId);
              if (!b) return "Bloc introuvable.";
              const e = await updateBlock(b, data);
              if (e) return e;
            } else {
              const days = [...new Set([data.day_of_week, ...repeat])];
              if (days.length > 1 && actions.addScheduleBlocksBulk) {
                const res = await actions.addScheduleBlocksBulk(data, days).catch(() => ({ error: "Connexion perdue, réessaie." }) as { error?: string; blocks?: ScheduleBlock[] });
                if (res.error || !res.blocks) return res.error ?? "Erreur.";
                setBlocks((prev) => [...prev, ...res.blocks!]);
              } else {
                const res = await actions.addScheduleBlock?.(data).catch(() => ({ error: "Connexion perdue, réessaie." }) as { error?: string; block?: ScheduleBlock });
                if (!res || res.error || !res.block) return res?.error ?? "Erreur.";
                setBlocks((prev) => [...prev, res.block!]);
              }
            }
            setForm(null);
            return null;
          }}
        />
      )}

      {builder && (
        <WeekBuilderSheet
          window={win}
          prefs={prefs}
          ctx={ctx}
          existing={recurringPlaced}
          alarmCols={alarmCols}
          scopeCol={builder.scopeCol}
          onClose={() => setBuilder(null)}
          onApply={async (items, mode, w2, p2) => {
            // Les réglages choisis sont gardés pour la prochaine fois (sans bloquer si la base n'est pas à jour).
            if (actions.saveAgendaPrefs) void actions.saveAgendaPrefs(p2).catch(() => null);
            if (actions.saveAgendaWindow && (w2.start !== win.start || w2.end !== win.end)) void actions.saveAgendaWindow(w2.start, w2.end).catch(() => null);
            setPrefs(p2);
            setWin(w2);
            const e = await placeItems(items, mode);
            if (e) return e;
            setBuilder(null);
            notify(builder.scopeCol ? t("Journée complétée.") : t("Semaine construite."));
            return null;
          }}
        />
      )}

      {settingsOpen && (
        <AgendaSettingsSheet
          window={win}
          ready={ready}
          onClose={() => setSettingsOpen(false)}
          onSave={async (w2) => {
            const prev = win;
            setWin(w2);
            const res = await actions.saveAgendaWindow?.(w2.start, w2.end).catch(() => ({ error: "Connexion perdue, réessaie." }));
            if (res?.error) {
              setWin(prev);
              return res.error;
            }
            return null;
          }}
        />
      )}

      {templatesFor !== null && (
        <DayTemplatesSheet
          templates={templates}
          col={templatesFor}
          colPlaced={colPlaced(templatesFor).filter((p) => !p.block.specific_date)}
          ready={ready}
          replaceCount={(days) => recurringPlaced.filter((p) => days.includes(p.col)).length}
          onClose={() => setTemplatesFor(null)}
          onSaveTemplates={async (list) => {
            const prev = templates;
            setTemplates(list);
            const res = await actions.saveDayTemplates?.(list).catch(() => ({ error: "Connexion perdue, réessaie." }));
            if (res?.error) {
              setTemplates(prev);
              return res.error;
            }
            return null;
          }}
          onApply={async (tpl, days, mode) => {
            const items: ColumnBlockInput[] = days.flatMap((col) => tpl.blocks.map((b) => ({ ...b, col })));
            const e = await placeItems(items, mode);
            if (!e) notify(`${tpl.name} ${t("appliquée sur")} ${days.length} ${days.length > 1 ? t("jours") : t("jour")}.`);
            return e;
          }}
        />
      )}

      {dayOptionsFor !== null && (
        <DayOptionsSheet
          col={dayOptionsFor}
          list={colPlaced(dayOptionsFor)}
          canBuild={!!actions.placeColumnBlocks}
          onClose={() => setDayOptionsFor(null)}
          onFill={() => { const c = dayOptionsFor; setDayOptionsFor(null); setBuilder({ scopeCol: c }); }}
          onTemplates={() => { const c = dayOptionsFor; setDayOptionsFor(null); setTemplatesFor(c); }}
          onDuplicate={async (cols) => {
            const items = cols.flatMap((c) => colPlaced(dayOptionsFor).filter((p) => !p.block.specific_date).map((p) => columnItemsFrom(p, c)));
            const e = await placeItems(items, "completer");
            if (!e) {
              setDayOptionsFor(null);
              notify(`${DAY_LABELS[dayOptionsFor]} ${t("copié sur")} ${cols.length} ${cols.length > 1 ? t("jours (créneaux libres)") : t("jour (créneaux libres)")}.`);
            }
            return e;
          }}
          onClear={async () => {
            const list = colPlaced(dayOptionsFor);
            setBlocks((prev) => prev.filter((b) => !list.some((p) => p.block.id === b.id)));
            const results = await Promise.all(list.map((p) => actions.deleteScheduleBlock?.(p.block.id).catch(() => ({ error: "Connexion perdue." }))));
            setDayOptionsFor(null);
            if (results.some((r) => r?.error)) {
              router.refresh();
              return t("Certains blocs n'ont pas pu être supprimés.");
            }
            notify(`${DAY_LABELS[dayOptionsFor]} ${t("vidé (réveil conservé).")}`);
            return null;
          }}
        />
      )}

      {toast && (
        <div className="fixed left-0 right-0 z-[2147483002] flex justify-center px-4 pointer-events-none" style={{ bottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}>
          <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-xl max-w-sm w-full" style={{ background: "var(--ep-s3)", border: `1px solid ${toast.tone === "bad" ? "rgba(var(--ep-bad-rgb),0.5)" : "rgba(var(--ep-line-rgb),0.4)"}` }}>
            <span className="text-xs font-bold flex-1 min-w-0 truncate" style={{ color: toast.tone === "bad" ? "var(--ep-bad)" : "var(--ep-strong)" }}>{t(toast.text)}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo!(); setToast(null); }} className="text-[11px] font-black uppercase tracking-widest flex-shrink-0" style={{ color: "var(--ep-accent)" }}>
                {t("Annuler")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayOptionsSheet({
  col,
  list,
  canBuild,
  onClose,
  onFill,
  onTemplates,
  onDuplicate,
  onClear,
}: {
  col: number;
  list: Placed<ScheduleBlock>[];
  canBuild: boolean;
  onClose: () => void;
  onFill: () => void;
  onTemplates: () => void;
  onDuplicate: (cols: number[]) => Promise<string | null>;
  onClear: () => Promise<string | null>;
}) {
  const t = useT();
  const [targets, setTargets] = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet title={DAY_LABELS[col]} subtitle={`${list.length} ${t("blocs")}`} onClose={onClose}>
      <div className="space-y-5 pb-2">
        {canBuild && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onFill} className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-[11px] font-black uppercase tracking-widest" style={{ background: "rgba(var(--ep-accent-rgb),0.15)", border: "1px solid rgba(var(--ep-accent-rgb),0.5)", color: "var(--ep-strong)" }}>
              <Wand2 size={14} /> {t("Combler les trous")}
            </button>
            <button type="button" onClick={onTemplates} className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-(--ep-line)/35 text-[11px] font-bold text-(--ep-ink)/80">
              <Layers size={14} /> {t("Journées types")}
            </button>
          </div>
        )}
        {canBuild && list.length > 0 && (
          <section>
            <SectionLabel>{t("Copier cette journée vers")}</SectionLabel>
            <DayPicker value={targets} onChange={setTargets} exclude={col} />
            <p className="text-[11px] text-(--ep-ink)/45 mt-1.5">{t("Seuls les créneaux libres de ces jours sont remplis, rien n'est écrasé.")}</p>
            <button
              type="button"
              disabled={busy || targets.length === 0}
              onClick={async () => {
                setBusy(true);
                const e = await onDuplicate(targets);
                setBusy(false);
                if (e) setErr(e);
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40"
              style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}
            >
              <Copy size={13} /> {busy ? "…" : `${t("Copier")} (${targets.length})`}
            </button>
          </section>
        )}
        {list.length > 0 && (
          <section className="pt-1 border-t border-(--ep-line)/15">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm) return setConfirm(true);
                setBusy(true);
                const e = await onClear();
                setBusy(false);
                if (e) setErr(e);
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-bold uppercase tracking-widest"
              style={{ border: "1px solid rgba(var(--ep-bad-rgb),0.4)", color: "var(--ep-bad)", background: confirm ? "rgba(var(--ep-bad-rgb),0.1)" : "transparent" }}
            >
              <Trash2 size={13} /> {confirm ? `${t("Confirmer : supprimer")} ${list.length} ${t("blocs")}` : t("Vider ce jour")}
            </button>
          </section>
        )}
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  );
}
