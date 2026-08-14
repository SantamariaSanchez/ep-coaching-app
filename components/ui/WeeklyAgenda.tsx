"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, X, Bell, Copy, MoreHorizontal, ChevronLeft, ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { ScheduleBlock } from "@/utils/agenda";
import { AGENDA_PRESETS, AGENDA_ICON_MAP, type AgendaPreset } from "@/lib/agenda-presets";

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass = "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";
const chipClass =
  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors";
const chipActive = "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white";
const chipInactive = "border-[#890404]/25 text-[#F5EDED]/40";

const COLOR_OPTIONS = ["#E01E1E", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6"];
const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_LABELS_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const DURATION_PRESETS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1h" },
  { minutes: 90, label: "1h30" },
  { minutes: 120, label: "2h" },
];

// Grille horaire 6h-23h — couvre la quasi-totalité des blocs réels (travail,
// salle, repas, sommeil du soir) sans avoir à scroller une grille de 24h.
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
// Rangées plus hautes en vue jour (mobile, une seule colonne) qu'en vue
// semaine (desktop, 7 colonnes côte à côte) — meilleure lisibilité et cibles
// tactiles plus grandes là où l'espace horizontal n'est plus la contrainte.
const ROW_HEIGHT_WEEK = 44;
const ROW_HEIGHT_DAY = 60;

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function minutesToTime(mins: number): string {
  const clamped = clamp(mins, 0, 23 * 60 + 59);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isoWeekday(d: Date): number {
  const w = d.getDay();
  return w === 0 ? 7 : w;
}

function blockTop(startTime: string, rowHeight: number): number {
  const mins = clamp(timeToMinutes(startTime), START_HOUR * 60, END_HOUR * 60) - START_HOUR * 60;
  return (mins / 60) * rowHeight;
}

function blockHeight(startTime: string, endTime: string, rowHeight: number): number {
  const startMins = clamp(timeToMinutes(startTime), START_HOUR * 60, END_HOUR * 60);
  const endMins = clamp(timeToMinutes(endTime), START_HOUR * 60, END_HOUR * 60);
  return Math.max(18, ((endMins - startMins) / 60) * rowHeight);
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function findOverlaps(
  blocks: ScheduleBlock[],
  day: number,
  start: string,
  end: string,
  excludeId: string | null
): ScheduleBlock[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (e <= s) return [];
  return blocks.filter(
    (b) =>
      b.day_of_week === day &&
      b.id !== excludeId &&
      timeToMinutes(b.start_time) < e &&
      timeToMinutes(b.end_time) > s
  );
}

function computeStats(blocks: ScheduleBlock[]) {
  let totalMinutes = 0;
  const byIcon: Record<string, number> = {};
  for (const b of blocks) {
    const mins = Math.max(0, timeToMinutes(b.end_time) - timeToMinutes(b.start_time));
    totalMinutes += mins;
    const key = b.icon && AGENDA_ICON_MAP[b.icon] ? b.icon : "autre";
    byIcon[key] = (byIcon[key] ?? 0) + mins;
  }
  const topCategories = Object.entries(byIcon).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return { totalMinutes, topCategories };
}

// ── Form types ───────────────────────────────────────────────────────────────

interface BlockFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  icon: string | null;
  notes: string | null;
  tasks: string[];
  notify: boolean;
}

function emptyForm(day: number, hour = 9): BlockFormData {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00`;
  return { day_of_week: day, start_time: start, end_time: end, label: "", color: COLOR_OPTIONS[0], icon: null, notes: null, tasks: [], notify: false };
}

// ── Day switcher (vue jour, mobile) ─────────────────────────────────────────

function DaySwitcher({
  selectedDay,
  onSelect,
  blocksByDay,
  todayDow,
}: {
  selectedDay: number;
  onSelect: (d: number) => void;
  blocksByDay: Record<number, number>;
  todayDow: number | null;
}) {
  return (
    <div className="flex gap-1.5">
      {ALL_DAYS.map((d) => {
        const active = d === selectedDay;
        const isToday = d === todayDow;
        const count = blocksByDay[d] ?? 0;
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-colors"
            style={{
              background: active ? "rgba(224,30,30,0.15)" : "transparent",
              borderColor: active ? "rgba(224,30,30,0.5)" : isToday ? "rgba(224,30,30,0.3)" : "transparent",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: active ? "#F5EDED" : isToday ? "#E01E1E" : "rgba(245,237,237,0.35)",
              }}
            >
              {DAY_LABELS_SHORT[d]}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: count > 0 ? (active ? "#E01E1E" : "rgba(224,30,30,0.45)") : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WeeklyAgenda({
  blocks: initialBlocks,
  editable,
  addScheduleBlock,
  addScheduleBlocksBulk,
  updateScheduleBlock,
  deleteScheduleBlock,
  duplicateDayBlocks,
  clearDayBlocks,
}: {
  blocks: ScheduleBlock[];
  editable: boolean;
  addScheduleBlock?: (data: BlockFormData) => Promise<{ error?: string; block?: ScheduleBlock }>;
  addScheduleBlocksBulk?: (data: BlockFormData, days: number[]) => Promise<{ error?: string; blocks?: ScheduleBlock[] }>;
  updateScheduleBlock?: (blockId: string, data: BlockFormData) => Promise<{ error?: string }>;
  deleteScheduleBlock?: (blockId: string) => Promise<{ error?: string }>;
  duplicateDayBlocks?: (fromDay: number, toDays: number[]) => Promise<{ error?: string; blocks?: ScheduleBlock[] }>;
  clearDayBlocks?: (day: number) => Promise<{ error?: string }>;
}) {
  const [blocks, setBlocks] = useState(initialBlocks);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialBlocks change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);
  // Avant, la vue semaine n'existait que sur desktop (un isDesktop détecté
  // au resize). Maintenant un vrai bouton Jour/Semaine, disponible sur tous
  // les écrans ; l'effet ci-dessous choisit juste un défaut raisonnable une
  // fois au montage (semaine sur grand écran, jour sur mobile).
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [now, setNow] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [form, setForm] = useState<BlockFormData>(emptyForm(1));
  const [newTaskText, setNewTaskText] = useState("");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewingBlock, setViewingBlock] = useState<ScheduleBlock | null>(null);

  const [dayOptionsFor, setDayOptionsFor] = useState<number | null>(null);
  const [duplicateTargets, setDuplicateTargets] = useState<number[]>([]);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [dayOptionsBusy, setDayOptionsBusy] = useState(false);
  const [dayOptionsError, setDayOptionsError] = useState<string | null>(null);

  // window.matchMedia n'existe pas côté serveur : ce choix de vue par
  // défaut ne peut être fait qu'après montage, d'où l'effet (même compromis
  // déjà accepté ailleurs dans ce fichier pour "now"/"selectedDay" plus bas).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setViewMode(mq.matches ? "week" : "day");
  }, []);

  // Ligne "maintenant" + jour du jour surligné, recalculés chaque minute.
  // Sélectionne aussi le jour courant par défaut dans la vue mobile, une
  // seule fois au montage.
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setSelectedDay(isoWeekday(n));
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const todayDow = now ? isoWeekday(now) : null;
  const blocksByDay = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.day_of_week] = (acc[b.day_of_week] ?? 0) + 1;
    return acc;
  }, {});

  function openAddAt(day: number, hour: number) {
    if (!editable) return;
    setForm(emptyForm(day, hour));
    setRepeatDays([]);
    setEditingBlockId(null);
    setModalOpen(true);
    setNewTaskText("");
    setError(null);
  }

  function openEdit(block: ScheduleBlock) {
    if (!editable) return;
    setForm({
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      label: block.label,
      color: block.color,
      icon: block.icon,
      notes: block.notes,
      tasks: block.tasks ?? [],
      notify: block.notify ?? false,
    });
    setRepeatDays([]);
    setEditingBlockId(block.id);
    setModalOpen(true);
    setNewTaskText("");
    setError(null);
  }

  function openBlock(block: ScheduleBlock) {
    if (editable) openEdit(block);
    else setViewingBlock(block);
  }

  function quickStart(preset: AgendaPreset) {
    if (!editable) return;
    setForm({ ...emptyForm(todayDow ?? 1, 9), label: preset.label, icon: preset.key, color: preset.color });
    setRepeatDays([]);
    setEditingBlockId(null);
    setModalOpen(true);
    setNewTaskText("");
    setError(null);
  }

  function close() {
    setModalOpen(false);
    setEditingBlockId(null);
    setRepeatDays([]);
    setNewTaskText("");
  }

  function addTaskToForm() {
    const t = newTaskText.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tasks: [...f.tasks, t] }));
    setNewTaskText("");
  }

  function removeTaskFromForm(index: number) {
    setForm((f) => ({ ...f, tasks: f.tasks.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.label.trim()) {
      setError("Nom du bloc obligatoire.");
      return;
    }
    if (form.end_time <= form.start_time) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: BlockFormData = { ...form, notes: form.notes?.trim() || null };

    if (editingBlockId) {
      const res = await updateScheduleBlock?.(editingBlockId, payload);
      setSaving(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId
            ? { ...b, ...payload, start_time: payload.start_time + ":00", end_time: payload.end_time + ":00" }
            : b
        )
      );
    } else {
      const days = Array.from(new Set([form.day_of_week, ...repeatDays]));
      if (days.length > 1 && addScheduleBlocksBulk) {
        const res = await addScheduleBlocksBulk(payload, days);
        setSaving(false);
        if (res?.error || !res?.blocks) {
          setError(res?.error ?? "Erreur.");
          return;
        }
        setBlocks((prev) => [...prev, ...res.blocks!]);
      } else {
        const res = await addScheduleBlock?.(payload);
        setSaving(false);
        if (res?.error || !res?.block) {
          setError(res?.error ?? "Erreur.");
          return;
        }
        setBlocks((prev) => [...prev, res.block!]);
      }
    }
    close();
  }

  async function handleDelete(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    await deleteScheduleBlock?.(blockId);
    close();
  }

  function openDayOptions(day: number) {
    if (!editable) return;
    setDayOptionsFor(day);
    setDuplicateTargets([]);
    setClearConfirm(false);
    setDayOptionsError(null);
  }

  function closeDayOptions() {
    setDayOptionsFor(null);
  }

  async function handleDuplicateDay() {
    if (dayOptionsFor === null || duplicateTargets.length === 0) return;
    setDayOptionsBusy(true);
    setDayOptionsError(null);
    const res = await duplicateDayBlocks?.(dayOptionsFor, duplicateTargets);
    setDayOptionsBusy(false);
    if (res?.error) {
      setDayOptionsError(res.error);
      return;
    }
    setBlocks((prev) => [...prev, ...(res?.blocks ?? [])]);
    closeDayOptions();
  }

  async function handleClearDay() {
    if (dayOptionsFor === null) return;
    setDayOptionsBusy(true);
    setDayOptionsError(null);
    const res = await clearDayBlocks?.(dayOptionsFor);
    setDayOptionsBusy(false);
    if (res?.error) {
      setDayOptionsError(res.error);
      return;
    }
    const cleared = dayOptionsFor;
    setBlocks((prev) => prev.filter((b) => b.day_of_week !== cleared));
    closeDayOptions();
  }

  function shiftDay(delta: number) {
    setSelectedDay((prev) => (((prev - 1 + delta) % 7 + 7) % 7) + 1);
  }

  // ── Rendu d'une colonne jour (grille horaire + blocs + ligne "maintenant") ──
  // Partagé entre la vue semaine (7 colonnes étroites, desktop) et la vue
  // jour (1 colonne large, mobile) pour ne pas dupliquer le positionnement.
  function renderDayContent(day: number, rowHeight: number) {
    const dayBlocks = blocks
      .filter((b) => b.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    const totalHeight = HOURS.length * rowHeight;
    const isToday = todayDow === day;
    const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
    const showNowLine = isToday && nowMinutes !== null && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

    return (
      <div
        className="relative border-l border-[#890404]/10"
        style={{ height: totalHeight, background: isToday ? "rgba(224,30,30,0.025)" : "transparent" }}
      >
        {HOURS.map((h) => (
          <div
            key={h}
            onClick={() => openAddAt(day, h)}
            className="absolute w-full border-t border-[#890404]/8 hover:bg-[#890404]/5 transition-colors"
            style={{ top: (h - START_HOUR) * rowHeight, height: rowHeight, cursor: editable ? "pointer" : "default" }}
          />
        ))}
        {dayBlocks.map((block) => {
          const top = blockTop(block.start_time, rowHeight);
          const height = blockHeight(block.start_time, block.end_time, rowHeight);
          const Icon = block.icon ? AGENDA_ICON_MAP[block.icon] : null;
          const showIcon = !!Icon && height >= 30;
          return (
            <button
              key={block.id}
              onClick={() => openBlock(block)}
              className="absolute left-0.5 right-0.5 rounded-md overflow-hidden text-left px-1.5 py-1 border"
              style={{
                top,
                height,
                background: `${block.color}20`,
                borderColor: `${block.color}55`,
                cursor: "pointer",
              }}
            >
              <p className="flex items-center gap-1 text-[9px] font-bold text-white leading-tight truncate">
                {showIcon && Icon && <Icon size={9} style={{ flexShrink: 0 }} strokeWidth={2.2} />}
                <span className="truncate">{block.label}</span>
                {block.tasks && block.tasks.length > 0 && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: block.color, flexShrink: 0 }} title="Des tâches sont prévues" />
                )}
              </p>
              <p className="text-[8px] text-[#F5EDED]/50 leading-tight">
                {block.start_time.slice(0, 5)} à {block.end_time.slice(0, 5)}
              </p>
            </button>
          );
        })}
        {showNowLine && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: ((nowMinutes! - START_HOUR * 60) / 60) * rowHeight, zIndex: 5 }}
          >
            <div style={{ height: 2, background: "#E01E1E", boxShadow: "0 0 6px rgba(224,30,30,0.7)" }} />
            <div style={{ position: "absolute", left: -3, top: -3, width: 8, height: 8, borderRadius: "50%", background: "#E01E1E" }} />
          </div>
        )}
      </div>
    );
  }

  function renderHourLabels(rowHeight: number) {
    return (
      <div className="relative" style={{ height: HOURS.length * rowHeight }}>
        {HOURS.map((h) => (
          <p
            key={h}
            className="absolute right-1 text-[9px] text-[#F5EDED]/25 font-semibold"
            style={{ top: (h - START_HOUR) * rowHeight - 6 }}
          >
            {h}h
          </p>
        ))}
      </div>
    );
  }

  const overlapBlocks = modalOpen ? findOverlaps(blocks, form.day_of_week, form.start_time, form.end_time, editingBlockId) : [];
  const { totalMinutes, topCategories } = computeStats(blocks);

  // Bloc en cours : celui qu'on est censé être en train de vivre là,
  // maintenant — pour répondre "je suis dans quel bloc, qu'est-ce que
  // j'étais censé y faire" sans avoir à chercher dans la grille.
  const nowMinutesForCurrent = now ? now.getHours() * 60 + now.getMinutes() : null;
  const currentBlock =
    todayDow !== null && nowMinutesForCurrent !== null
      ? blocks.find(
          (b) =>
            b.day_of_week === todayDow &&
            timeToMinutes(b.start_time) <= nowMinutesForCurrent &&
            timeToMinutes(b.end_time) > nowMinutesForCurrent
        ) ?? null
      : null;

  return (
    <div className="space-y-3">
      {/* Bloc en cours, avec ses tâches — le rappel visuel "je fais quoi là" */}
      {currentBlock && (
        <div className="ep-card" style={{ padding: "14px 16px", borderLeft: `3px solid ${currentBlock.color}` }}>
          <div className="flex items-center gap-2 mb-1.5">
            {currentBlock.icon && AGENDA_ICON_MAP[currentBlock.icon] && (() => {
              const Icon = AGENDA_ICON_MAP[currentBlock.icon!];
              return <Icon size={13} style={{ color: currentBlock.color, flexShrink: 0 }} strokeWidth={2.2} />;
            })()}
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", margin: 0 }}>
              En ce moment jusqu&apos;à {currentBlock.end_time.slice(0, 5)}
            </p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: "0 0 6px" }}>{currentBlock.label}</p>
          {currentBlock.tasks && currentBlock.tasks.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {currentBlock.tasks.map((t, i) => (
                <li key={i} style={{ display: "flex", gap: 6, fontSize: 12, color: "rgba(245,237,237,0.65)", lineHeight: 1.4 }}>
                  <span style={{ color: currentBlock.color, flexShrink: 0 }}>•</span> {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Stats de la semaine */}
      {blocks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="ep-card" style={{ padding: "8px 14px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
              Planifié / sem.
            </span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED" }}>{formatHours(totalMinutes)}</span>
          </div>
          {topCategories.map(([key, mins]) => {
            const preset = AGENDA_PRESETS.find((p) => p.key === key);
            const Icon = preset?.icon;
            return (
              <div key={key} className="ep-card" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {Icon && <Icon size={12} style={{ color: preset!.color, flexShrink: 0 }} strokeWidth={2} />}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(245,237,237,0.5)" }}>{preset?.label ?? "Autre"}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>{formatHours(mins)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Démarrage rapide quand l'agenda est vide */}
      {blocks.length === 0 && editable && (
        <div className="ep-card" style={{ padding: 16 }}>
          <p className={labelClass} style={{ marginBottom: 10 }}>Démarrage rapide</p>
          <div className="flex flex-wrap gap-1.5">
            {AGENDA_PRESETS.map((p) => {
              const PIcon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => quickStart(p)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors"
                  style={{ background: "transparent", borderColor: "rgba(137,4,4,0.25)", color: "rgba(245,237,237,0.5)" }}
                >
                  <PIcon size={12} style={{ color: p.color }} strokeWidth={2} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bascule Semaine / Jour — disponible sur tous les écrans, plus
          seulement en fonction de la largeur (mobile ne pouvait avant que
          voir un jour à la fois, jamais toute la semaine d'un coup). */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setViewMode("day")}
          className={`${chipClass} ${viewMode === "day" ? chipActive : chipInactive}`}
        >
          Jour
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={`${chipClass} ${viewMode === "week" ? chipActive : chipInactive}`}
        >
          Semaine
        </button>
      </div>

      {viewMode === "week" ? (
        <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex" style={{ minWidth: 760 }}>
            <div style={{ width: 40, flexShrink: 0 }}>
              <div style={{ height: 24 }} />
              {renderHourLabels(ROW_HEIGHT_WEEK)}
            </div>
            {ALL_DAYS.map((day) => (
              <div key={day} style={{ flex: 1, minWidth: 100 }}>
                <div className="flex items-center justify-center gap-1" style={{ height: 24 }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40">
                    {DAY_LABELS_SHORT[day]}
                  </p>
                  {editable && (
                    <>
                      <button onClick={() => openAddAt(day, 9)} className="text-[#F5EDED]/20 hover:text-[#E01E1E]" title={`Ajouter le ${DAY_LABELS[day]}`} aria-label={`Ajouter le ${DAY_LABELS[day]}`}>
                        <Plus size={10} />
                      </button>
                      <button onClick={() => openDayOptions(day)} className="text-[#F5EDED]/20 hover:text-[#E01E1E]" title={`Options du ${DAY_LABELS[day]}`} aria-label={`Options du ${DAY_LABELS[day]}`}>
                        <MoreHorizontal size={10} />
                      </button>
                    </>
                  )}
                </div>
                {renderDayContent(day, ROW_HEIGHT_WEEK)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <DaySwitcher selectedDay={selectedDay} onSelect={setSelectedDay} blocksByDay={blocksByDay} todayDow={todayDow} />
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDay(-1)} className="text-[#F5EDED]/25 hover:text-white p-1">
              <ChevronLeft size={16} />
            </button>
            <p className="text-xs font-black uppercase tracking-widest text-white">
              {DAY_LABELS[selectedDay]}
              {selectedDay === todayDow && <span style={{ color: "#E01E1E" }}> · Aujourd&apos;hui</span>}
            </p>
            <div className="flex items-center gap-2">
              {editable && (
                <>
                  <button onClick={() => openAddAt(selectedDay, 9)} className="text-[#F5EDED]/25 hover:text-[#E01E1E] p-1" title="Ajouter" aria-label="Ajouter">
                    <Plus size={15} />
                  </button>
                  <button onClick={() => openDayOptions(selectedDay)} className="text-[#F5EDED]/25 hover:text-[#E01E1E] p-1" title="Options du jour" aria-label="Options du jour">
                    <MoreHorizontal size={15} />
                  </button>
                </>
              )}
              <button onClick={() => shiftDay(1)} className="text-[#F5EDED]/25 hover:text-white p-1">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex">
            <div style={{ width: 34, flexShrink: 0 }}>{renderHourLabels(ROW_HEIGHT_DAY)}</div>
            <div style={{ flex: 1 }}>{renderDayContent(selectedDay, ROW_HEIGHT_DAY)}</div>
          </div>
        </div>
      )}

      {/* Détail en lecture seule (fiche client vue par le coach) */}
      {viewingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ep-modal-overlay absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewingBlock(null)} />
          <div className="ep-modal-panel relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {viewingBlock.icon && AGENDA_ICON_MAP[viewingBlock.icon] && (() => {
                  const Icon = AGENDA_ICON_MAP[viewingBlock.icon!];
                  return <Icon size={15} style={{ color: viewingBlock.color, flexShrink: 0 }} strokeWidth={2} />;
                })()}
                <p className="text-sm font-black uppercase tracking-widest text-white truncate">{viewingBlock.label}</p>
              </div>
              <button onClick={() => setViewingBlock(null)} className="text-[#F5EDED]/40 hover:text-white flex-shrink-0">
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)" }}>
              {DAY_LABELS[viewingBlock.day_of_week]} · {viewingBlock.start_time.slice(0, 5)} à {viewingBlock.end_time.slice(0, 5)}
            </p>
            {viewingBlock.tasks && viewingBlock.tasks.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {viewingBlock.tasks.map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 6, fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.4 }}>
                    <span style={{ color: viewingBlock.color, flexShrink: 0 }}>•</span> {t}
                  </li>
                ))}
              </ul>
            )}
            {viewingBlock.notes && (
              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,237,237,0.06)", borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 4px" }}>
                  Notes
                </p>
                <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", whiteSpace: "pre-wrap", margin: 0 }}>{viewingBlock.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options du jour : dupliquer / vider */}
      {dayOptionsFor !== null && (() => {
        const day = dayOptionsFor;
        const dayBlocks = blocks.filter((b) => b.day_of_week === day);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="ep-modal-overlay absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDayOptions} />
            <div className="ep-modal-panel relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-widest text-white">{DAY_LABELS[day]}</p>
                <button onClick={closeDayOptions} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className={labelClass}>
                  Dupliquer {dayBlocks.length} bloc{dayBlocks.length > 1 ? "s" : ""} vers
                </label>
                {dayBlocks.length === 0 ? (
                  <p style={{ fontSize: 11, color: "rgba(245,237,237,0.3)" }}>Ce jour est vide, rien à copier.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ALL_DAYS.filter((d) => d !== day).map((d) => {
                        const active = duplicateTargets.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => setDuplicateTargets((prev) => (active ? prev.filter((x) => x !== d) : [...prev, d]))}
                            className={`${chipClass} ${active ? chipActive : chipInactive}`}
                          >
                            {DAY_LABELS_SHORT[d]}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleDuplicateDay}
                      disabled={duplicateTargets.length === 0 || dayOptionsBusy}
                      className="ep-btn-secondary"
                      style={{ width: "100%", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Copy size={12} /> {dayOptionsBusy ? "…" : "Dupliquer"}
                    </button>
                  </>
                )}
              </div>

              {dayBlocks.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(245,237,237,0.06)", paddingTop: 14 }}>
                  <button
                    onClick={clearConfirm ? handleClearDay : () => setClearConfirm(true)}
                    disabled={dayOptionsBusy}
                    className="w-full flex items-center justify-center gap-1.5 border border-red-500/30 text-red-400 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-widest"
                  >
                    <Trash2 size={13} /> {clearConfirm ? "Confirmer : tout supprimer" : "Vider ce jour"}
                  </button>
                </div>
              )}

              {dayOptionsError && <p className="text-xs text-red-400">{dayOptionsError}</p>}
            </div>
          </div>
        );
      })()}

      {/* Création / édition d'un bloc */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ep-modal-overlay absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <div
            className="ep-modal-panel relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-3 overflow-y-auto"
            style={{ maxHeight: "88vh" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {editingBlockId ? "Modifier le bloc" : `Nouveau bloc : ${DAY_LABELS[form.day_of_week]}`}
              </p>
              <button onClick={close} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className={labelClass}>Modèles rapides</label>
              <div className="flex flex-wrap gap-1.5">
                {AGENDA_PRESETS.map((p) => {
                  const PIcon = p.icon;
                  const active = form.icon === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, label: p.label, icon: p.key, color: p.color }))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors"
                      style={{
                        background: active ? `${p.color}22` : "transparent",
                        borderColor: active ? `${p.color}77` : "rgba(137,4,4,0.25)",
                        color: active ? "#fff" : "rgba(245,237,237,0.45)",
                      }}
                    >
                      <PIcon size={11} strokeWidth={2.2} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Jour</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm((f) => ({ ...f, day_of_week: d }))}
                    className={`${chipClass} ${form.day_of_week === d ? chipActive : chipInactive}`}
                  >
                    {DAY_LABELS_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>

            {!editingBlockId && addScheduleBlocksBulk && (
              <div>
                <label className={labelClass}>Répéter aussi le (optionnel)</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.filter((d) => d !== form.day_of_week).map((d) => {
                    const active = repeatDays.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setRepeatDays((prev) => (active ? prev.filter((x) => x !== d) : [...prev, d]))}
                        className={`${chipClass} ${active ? chipActive : chipInactive}`}
                      >
                        {DAY_LABELS_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Nom</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex. Salle, Travail, Repas..." aria-label="Ex. Salle, Travail, Repas..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Durée rapide</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DURATION_PRESETS.map(({ minutes, label }) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, end_time: minutesToTime(timeToMinutes(f.start_time) + minutes) }))}
                    className={`${chipClass} ${chipInactive}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Début</label>
                  <input aria-label="Début" type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fin</label>
                  <input aria-label="Fin" type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={inputClass} />
                </div>
              </div>
            </div>

            {overlapBlocks.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: "#fbbf24", margin: 0, lineHeight: 1.4 }}>
                  Chevauche {overlapBlocks.map((b) => `${b.label} (${b.start_time.slice(0, 5)} à ${b.end_time.slice(0, 5)})`).join(", ")}.
                </p>
              </div>
            )}

            <div>
              <label className={labelClass}>Couleur</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-transform"
                    style={{ background: c, borderColor: form.color === c ? "#fff" : "transparent", transform: form.color === c ? "scale(1.1)" : "scale(1)" }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes (optionnel)</label>
              <textarea aria-label="Notes (optionnel)"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>
                À faire dans ce bloc (optionnel)
              </label>
              <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", margin: "0 0 8px", lineHeight: 1.4 }}>
                Une tâche, un objectif du jour, ou même un prompt à coller dans Claude — ça s&apos;affiche dès que tu arrives dans ce bloc.
              </p>
              {form.tasks.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {form.tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#0D0000] border border-[#890404]/20 rounded-lg px-3 py-2">
                      <span style={{ fontSize: 12, color: "#F5EDED", flex: 1, wordBreak: "break-word" }}>{t}</span>
                      <button type="button" onClick={() => removeTaskFromForm(i)} className="text-[#F5EDED]/25 hover:text-red-400 flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTaskToForm();
                    }
                  }}
                  placeholder="Ex. Tourner 3 reels, ou un objectif du jour..." aria-label="Ex. Tourner 3 reels, ou un objectif du jour..."
                  className={inputClass}
                />
                <button type="button" onClick={addTaskToForm} aria-label="Ajouter la tâche" className="ep-btn-secondary" style={{ padding: "0 14px", fontSize: 11 }}>
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, notify: !f.notify }))}
              className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 border transition-colors"
              style={{
                borderColor: form.notify ? "rgba(74,222,128,0.4)" : "rgba(224,30,30,0.25)",
                background: form.notify ? "rgba(74,222,128,0.08)" : "transparent",
              }}
            >
              <span className="flex items-center gap-2" style={{ fontSize: 11.5, fontWeight: 600, color: form.notify ? "#4ade80" : "rgba(245,237,237,0.55)" }}>
                <Bell size={13} /> Me notifier au début de ce bloc
              </span>
              <span
                style={{
                  width: 34, height: 19, borderRadius: 10, flexShrink: 0, position: "relative",
                  background: form.notify ? "#4ade80" : "rgba(245,237,237,0.15)", transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute", top: 2, left: form.notify ? 17 : 2, width: 15, height: 15,
                    borderRadius: "50%", background: "#fff", transition: "left 0.15s",
                  }}
                />
              </span>
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              {editingBlockId && (
                <button
                  onClick={() => handleDelete(editingBlockId)}
                  className="flex items-center justify-center gap-1.5 border border-red-500/30 text-red-400 rounded-lg px-3 py-2.5"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg py-2.5 transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
