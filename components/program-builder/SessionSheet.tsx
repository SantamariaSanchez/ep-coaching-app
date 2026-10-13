"use client";

import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Trash2,
  RefreshCw,
  CornerDownRight,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { ClientIntake } from "@/utils/client-intake";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/volume-data";
import { checkExerciseConflicts, conflictSourceLabel } from "@/lib/plan-generator";
import { TECHNIQUES, REPS_UNITS, defaultUnitForExercise, supersetLabels, type RepsUnit } from "@/lib/program-sheet";
import ExerciseCell from "./ExerciseCell";
import {
  type SheetDay,
  type SheetRow,
  emptyRow,
  isRowFilled,
  normalizeRepsInput,
  normalizeRestInput,
  normalizeSupersets,
  toggleLinkWithNext,
  rowsFromPaste,
  estimateMinutes,
  countSets,
} from "./sheet-model";

const WEEKDAY_SHORT = ["", "L", "M", "M", "J", "V", "S", "D"];
const WEEKDAY_LONG = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SUPERSET_COLORS = ["var(--ep-accent)", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6"];

// Colonnes navigables au clavier, dans l'ordre de Tab.
const COLS = ["name", "sets", "reps", "rir", "rest", "tempo", "technique", "notes"] as const;
type Col = (typeof COLS)[number];

export function cellSelector(dayId: string, row: number, col: number) {
  return `[data-cell="${dayId}:${row}:${col}"]`;
}

function focusCell(dayId: string, row: number, col: number) {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(cellSelector(dayId, row, col));
  if (el) {
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }
}

export default function SessionSheet({
  day,
  index,
  total,
  library,
  intake,
  agendaDays,
  sessionMinutesTarget,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  onOpenDetails,
  onSwap,
}: {
  day: SheetDay;
  index: number;
  total: number;
  library: LibraryExercise[];
  intake: ClientIntake | null;
  /** Jours où l'agenda du client a déjà un créneau sport (1 = lundi). */
  agendaDays: Set<number>;
  /** Durée de séance souhaitée par le client, en minutes (fiche). */
  sessionMinutesTarget: number | null;
  onChange: (day: SheetDay) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onOpenDetails: (rowId: string) => void;
  onSwap: (rowId: string) => void;
}) {
  const tr = useT();
  const libByName = useMemo(() => new Map(library.map((l) => [l.name.toLowerCase(), l])), [library]);
  const labels = supersetLabels(day.rows.map((r) => r.superset));
  const groupColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of day.rows) if (r.superset && !map.has(r.superset)) map.set(r.superset, SUPERSET_COLORS[map.size % SUPERSET_COLORS.length]);
    return map;
  }, [day.rows]);
  const [menuFor, setMenuFor] = useState<{ rowId: string; rect: DOMRect } | null>(null);
  const pendingFocus = useRef<{ row: number; col: number } | null>(null);

  // Focus différé après ajout de ligne (la cellule n'existe pas encore au moment du clavier).
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      const { row, col } = pendingFocus.current;
      pendingFocus.current = null;
      focusCell(day.id, row, col);
    }
  });

  const filled = day.rows.filter(isRowFilled);
  const minutes = estimateMinutes(day);
  const sets = countSets(day);
  const tooLong = sessionMinutesTarget != null && minutes > sessionMinutesTarget + 10;

  function setRows(rows: SheetRow[]) {
    onChange({ ...day, rows });
  }

  function updateRow(rowId: string, patch: Partial<SheetRow>) {
    setRows(day.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  }

  function insertRow(at: number, prefillFrom?: SheetRow) {
    const rows = [...day.rows];
    rows.splice(at, 0, emptyRow(prefillFrom ? { sets: prefillFrom.sets, reps: prefillFrom.reps, unit: prefillFrom.unit, rir: prefillFrom.rir, rest: prefillFrom.rest } : undefined));
    setRows(normalizeSupersets(rows));
  }

  function removeRow(rowId: string) {
    const rows = day.rows.filter((r) => r.id !== rowId);
    setRows(normalizeSupersets(rows.length ? rows : [emptyRow()]));
  }

  function moveRow(rowIdx: number, dir: -1 | 1) {
    const next = rowIdx + dir;
    if (next < 0 || next >= day.rows.length) return;
    const rows = [...day.rows];
    [rows[rowIdx], rows[next]] = [rows[next], rows[rowIdx]];
    setRows(normalizeSupersets(rows));
  }

  function duplicateRow(rowIdx: number) {
    const rows = [...day.rows];
    rows.splice(rowIdx + 1, 0, { ...rows[rowIdx], id: Math.random().toString(36).slice(2, 10) });
    setRows(normalizeSupersets(rows));
  }

  function pickLibrary(rowId: string, lib: LibraryExercise) {
    const row = day.rows.find((r) => r.id === rowId);
    const unit = defaultUnitForExercise(lib.name);
    // Ligne vide : reprend le schéma de la ligne remplie juste au-dessus
    // (séries/reps/RIR/repos), le cas le plus fréquent dans une séance.
    const idx = day.rows.findIndex((r) => r.id === rowId);
    const above = [...day.rows.slice(0, idx)].reverse().find(isRowFilled);
    const inherit = row && !row.sets && !row.reps && above && !unit ? { sets: above.sets, reps: above.reps, unit: above.unit, rir: above.rir, rest: above.rest } : {};
    updateRow(rowId, {
      name: lib.name,
      muscle_group: (MUSCLE_GROUPS as readonly string[]).includes(lib.muscle_group) ? (lib.muscle_group as MuscleGroup) : "",
      muscle_subgroup: lib.muscle_subgroup ?? "",
      ...inherit,
      ...(unit ? { unit, reps: row?.reps || (unit === "sec" ? "30-45" : "20") } : {}),
    });
  }

  function fillDown(rowIdx: number, col: Col) {
    if (rowIdx === 0) return;
    const src = day.rows[rowIdx - 1];
    const patch: Partial<SheetRow> =
      col === "sets" ? { sets: src.sets }
      : col === "reps" ? { reps: src.reps, unit: src.unit }
      : col === "rir" ? { rir: src.rir }
      : col === "rest" ? { rest: src.rest }
      : col === "tempo" ? { tempo: src.tempo }
      : col === "technique" ? { technique: src.technique }
      : col === "notes" ? { notes: src.notes }
      : {};
    updateRow(day.rows[rowIdx].id, patch);
  }

  function navKey(e: React.KeyboardEvent<HTMLElement>, rowIdx: number, colIdx: number) {
    const col = COLS[colIdx];
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      fillDown(rowIdx, col);
      return;
    }
    const isSelect = e.currentTarget instanceof HTMLSelectElement;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (rowIdx >= day.rows.length - 1) {
        pendingFocus.current = { row: rowIdx + 1, col: colIdx };
        insertRow(day.rows.length, day.rows[rowIdx]);
      } else focusCell(day.id, rowIdx + 1, colIdx);
      return;
    }
    if (isSelect) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(day.id, Math.min(rowIdx + 1, day.rows.length - 1), colIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(day.id, Math.max(rowIdx - 1, 0), colIdx);
    }
  }

  function pasteGrid(rowIdx: number, text: string): boolean {
    const pasted = rowsFromPaste(text);
    if (!pasted || pasted.length === 0) return false;
    // Remplace les lignes à partir de celle-ci (en écrasant les vides), ajoute le reste.
    const rows = [...day.rows];
    let at = rowIdx;
    for (const p of pasted) {
      const lib = libByName.get(p.name.toLowerCase());
      const enriched = lib ? { ...p, muscle_group: (MUSCLE_GROUPS as readonly string[]).includes(lib.muscle_group) ? lib.muscle_group : "", muscle_subgroup: lib.muscle_subgroup ?? "" } : p;
      if (at < rows.length && !isRowFilled(rows[at])) rows[at] = enriched;
      else rows.splice(at, 0, enriched);
      at++;
    }
    if (!rows.slice(at).some((r) => !isRowFilled(r))) rows.push(emptyRow());
    setRows(normalizeSupersets(rows));
    return true;
  }

  const menuRowIdx = menuFor ? day.rows.findIndex((r) => r.id === menuFor.rowId) : -1;
  const menuRow = menuRowIdx >= 0 ? day.rows[menuRowIdx] : null;

  const cellBase = "border-r border-(--ep-line)/15 last:border-r-0 p-0 align-middle";
  const inputBase =
    "w-full bg-transparent px-2 py-2 text-[13px] text-(--ep-strong) text-center placeholder:text-(--ep-ink)/18 focus:outline-none focus:bg-(--ep-accent)/[0.07]";

  return (
    <section
      id={`seance-${day.id}`}
      className="bg-(--ep-s5) border border-(--ep-line)/35 rounded-xl overflow-hidden scroll-mt-24"
      aria-label={day.label}
    >
      {/* En-tête de séance */}
      <div className="px-3 sm:px-4 pt-3 pb-2.5 border-b border-(--ep-line)/25 bg-(--ep-s3)">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-7 h-7 rounded-lg bg-(--ep-accent) text-(--ep-strong) text-[11px] font-black flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <input
            value={day.label}
            onChange={(e) => onChange({ ...day, label: e.target.value })}
            aria-label={tr("Nom de la séance")}
            placeholder={tr("Nom de la séance")}
            className="min-w-0 flex-1 sm:flex-none sm:w-52 bg-transparent text-[15px] font-black uppercase tracking-wide text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none border-b border-transparent focus:border-(--ep-accent)/50"
          />
          <div className="flex items-center gap-1" role="group" aria-label={tr("Jour de la semaine")}>
            {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
              const on = day.weekday === wd;
              return (
                <button
                  key={wd}
                  type="button"
                  onClick={() => onChange({ ...day, weekday: on ? null : wd })}
                  title={`${WEEKDAY_LONG[wd]}${agendaDays.has(wd) ? tr(" · créneau sport dans son agenda") : ""}`}
                  aria-pressed={on}
                  aria-label={WEEKDAY_LONG[wd]}
                  className={`relative w-7 h-7 rounded-md text-[11px] font-bold transition-colors ${
                    on ? "bg-(--ep-accent) text-(--ep-strong)" : "bg-(--ep-shade)/30 text-(--ep-ink)/45 hover:text-(--ep-strong) hover:bg-(--ep-line)/30"
                  }`}
                >
                  {WEEKDAY_SHORT[wd]}
                  {agendaDays.has(wd) && !on && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
                  )}
                </button>
              );
            })}
          </div>
          <span className={`text-[11px] ${tooLong ? "text-amber-300" : "text-(--ep-ink)/40"}`}>
            {filled.length} {tr("exos")} · {sets} {tr("séries")} · ~{minutes} min
            {tooLong && sessionMinutesTarget ? ` (${tr("il a")} ${sessionMinutesTarget} min)` : ""}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <IconBtn label={tr("Monter la séance")} disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={14} /></IconBtn>
            <IconBtn label={tr("Descendre la séance")} disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown size={14} /></IconBtn>
            <IconBtn label={tr("Dupliquer la séance")} onClick={onDuplicate}><Copy size={13} /></IconBtn>
            <IconBtn label={tr("Supprimer la séance")} danger onClick={onRemove}><Trash2 size={13} /></IconBtn>
          </div>
        </div>
        <input
          value={day.notes}
          onChange={(e) => onChange({ ...day, notes: e.target.value })}
          placeholder={tr("Consigne de séance : échauffement, cardio de fin, rappel... (le client la voit)")}
          aria-label={tr("Consigne de séance")}
          className="mt-2 w-full bg-transparent text-[12px] text-(--ep-ink)/70 placeholder:text-(--ep-ink)/22 focus:outline-none border-b border-transparent focus:border-(--ep-line)/40 pb-0.5"
        />
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[880px]">
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 240 }} />
            <col style={{ width: 62 }} />
            <col style={{ width: 104 }} />
            <col style={{ width: 54 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 118 }} />
            <col />
            <col style={{ width: 64 }} />
          </colgroup>
          <thead>
            <tr className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/35 bg-(--ep-shade)/25">
              <th className="py-1.5 sticky left-0 bg-(--ep-bg) z-[1]">#</th>
              <th className="py-1.5 text-left px-2 sticky left-10 bg-(--ep-bg) z-[1]">{tr("Exercice")}</th>
              <th className="py-1.5" title={tr("Nombre de séries")}>{tr("Séries")}</th>
              <th className="py-1.5" title={tr("Reps, ou secondes / mètres : tape « 30s » ou « 20m »")}>{tr("Reps / temps")}</th>
              <th className="py-1.5" title={tr("Reps en réserve")}>{tr("RIR")}</th>
              <th className="py-1.5" title={tr("« 90 », « 1:30 » ou « 2 » (minutes)")}>{tr("Repos")}</th>
              <th className="py-1.5" title={tr("Descente - pause - montée - pause, ex. 3110")}>{tr("Tempo")}</th>
              <th className="py-1.5">{tr("Technique")}</th>
              <th className="py-1.5 text-left px-2">{tr("Notes pour le client")}</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {day.rows.map((row, rowIdx) => {
              const lib = libByName.get(row.name.trim().toLowerCase()) ?? null;
              const conflicts = intake && row.name.trim() ? checkExerciseConflicts({ name: row.name, equipment: lib?.equipment ?? null }, intake, "") : [];
              const ss = labels[rowIdx];
              const color = row.superset ? groupColor.get(row.superset) : undefined;
              const linkedWithNext = !!row.superset && day.rows[rowIdx + 1]?.superset === row.superset;
              const restIsInternal = linkedWithNext;
              const filledRow = isRowFilled(row);
              return (
                <tr
                  key={row.id}
                  className={`group border-t border-(--ep-line)/15 ${filledRow ? "" : "opacity-80"} hover:bg-(--ep-hi)/[0.015]`}
                >
                  <td
                    className={`${cellBase} text-center sticky left-0 bg-(--ep-s5) z-[1]`}
                    style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                  >
                    <span className="text-[11px] font-bold" style={{ color: color ?? "rgba(var(--ep-ink-rgb),0.3)" }}>
                      {ss ?? rowIdx + 1}
                    </span>
                  </td>
                  <td className={`${cellBase} sticky left-10 bg-(--ep-s5) z-[1]`}>
                    <div className="flex items-center">
                      <ExerciseCell
                        value={row.name}
                        library={library}
                        intake={intake}
                        cellId={`${day.id}:${rowIdx}:0`}
                        onChange={(v) => updateRow(row.id, { name: v })}
                        onPick={(l) => pickLibrary(row.id, l)}
                        onNavKey={(e) => navKey(e, rowIdx, 0)}
                        onPickedMoveNext={() => setTimeout(() => focusCell(day.id, rowIdx, 1), 0)}
                        onPasteGrid={(text) => pasteGrid(rowIdx, text)}
                        placeholder={rowIdx === 0 && !filledRow ? tr("Tape un exercice…") : ""}
                      />
                      {conflicts.length > 0 && (
                        <span
                          className="pr-1.5 text-amber-400 flex-shrink-0"
                          title={conflicts.map((c) => `${conflictSourceLabel(c.source)} : ${c.keyword}`).join("\n")}
                          aria-label={tr("À vérifier avec la fiche client")}
                        >
                          <AlertTriangle size={13} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={cellBase}>
                    <input
                      data-cell={`${day.id}:${rowIdx}:1`}
                      value={row.sets}
                      inputMode="numeric"
                      onChange={(e) => updateRow(row.id, { sets: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
                      onKeyDown={(e) => navKey(e, rowIdx, 1)}
                      placeholder={filledRow ? "3" : ""}
                      aria-label={tr("Séries")}
                      className={inputBase}
                    />
                  </td>
                  <td className={cellBase}>
                    <div className="flex items-center">
                      <input
                        data-cell={`${day.id}:${rowIdx}:2`}
                        value={row.reps}
                        onChange={(e) => updateRow(row.id, { reps: e.target.value })}
                        onBlur={(e) => {
                          const n = normalizeRepsInput(e.target.value, row.unit);
                          if (n.reps !== row.reps || n.unit !== row.unit) updateRow(row.id, n);
                        }}
                        onKeyDown={(e) => navKey(e, rowIdx, 2)}
                        placeholder={filledRow ? (row.unit === "sec" ? "30-45" : row.unit === "m" ? "20" : "8-12") : ""}
                        aria-label={tr("Reps ou temps")}
                        className={`${inputBase} pr-0`}
                      />
                      <UnitToggle unit={row.unit} onChange={(u) => updateRow(row.id, { unit: u })} />
                    </div>
                  </td>
                  <td className={cellBase}>
                    <input
                      data-cell={`${day.id}:${rowIdx}:3`}
                      value={row.rir}
                      inputMode="numeric"
                      onChange={(e) => updateRow(row.id, { rir: e.target.value.replace(/[^\d]/g, "").slice(0, 1) })}
                      onKeyDown={(e) => navKey(e, rowIdx, 3)}
                      placeholder={filledRow && row.unit === "reps" ? "2" : ""}
                      aria-label={tr("RIR")}
                      className={inputBase}
                    />
                  </td>
                  <td className={cellBase}>
                    <input
                      data-cell={`${day.id}:${rowIdx}:4`}
                      value={row.rest}
                      onChange={(e) => updateRow(row.id, { rest: e.target.value })}
                      onBlur={(e) => {
                        const n = normalizeRestInput(e.target.value);
                        if (n !== row.rest) updateRow(row.id, { rest: n });
                      }}
                      onKeyDown={(e) => navKey(e, rowIdx, 4)}
                      placeholder={restIsInternal ? "→" : filledRow ? "1:30" : ""}
                      title={restIsInternal ? tr("Superset : enchaîne avec l'exercice suivant, le repos se met sur le dernier du bloc") : undefined}
                      aria-label={tr("Repos")}
                      className={`${inputBase} ${restIsInternal && !row.rest ? "text-(--ep-ink)/40" : ""}`}
                    />
                  </td>
                  <td className={cellBase}>
                    <input
                      data-cell={`${day.id}:${rowIdx}:5`}
                      value={row.tempo}
                      onChange={(e) => updateRow(row.id, { tempo: e.target.value.slice(0, 9) })}
                      onKeyDown={(e) => navKey(e, rowIdx, 5)}
                      placeholder=""
                      aria-label={tr("Tempo")}
                      className={inputBase}
                    />
                  </td>
                  <td className={cellBase}>
                    <select
                      data-cell={`${day.id}:${rowIdx}:6`}
                      value={row.technique}
                      onChange={(e) => updateRow(row.id, { technique: e.target.value })}
                      onKeyDown={(e) => navKey(e, rowIdx, 6)}
                      aria-label={tr("Technique")}
                      className={`w-full bg-transparent px-1.5 py-2 text-[12px] focus:outline-none focus:bg-(--ep-accent)/[0.07] ${row.technique ? "text-amber-300 font-semibold" : "text-(--ep-ink)/30"}`}
                    >
                      <option value="" className="bg-(--ep-s3) text-(--ep-strong)">—</option>
                      {TECHNIQUES.map((t) => (
                        <option key={t.key} value={t.key} className="bg-(--ep-s3) text-(--ep-strong)">{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className={cellBase}>
                    <input
                      data-cell={`${day.id}:${rowIdx}:7`}
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                      onKeyDown={(e) => navKey(e, rowIdx, 7)}
                      title={row.notes || undefined}
                      aria-label={tr("Notes pour le client")}
                      className={`${inputBase} text-left text-[12px] text-(--ep-ink)/75`}
                    />
                  </td>
                  <td className="p-0 align-middle">
                    <div className="flex items-center justify-end gap-0.5 pr-1">
                      {rowIdx < day.rows.length - 1 && (filledRow || linkedWithNext) && (
                        <button
                          type="button"
                          onClick={() => setRows(toggleLinkWithNext(day.rows, rowIdx))}
                          title={linkedWithNext ? tr("Délier (fin du superset)") : tr("Superset avec l'exercice suivant")}
                          aria-label={linkedWithNext ? tr("Délier du suivant") : tr("Superset avec le suivant")}
                          aria-pressed={linkedWithNext}
                          className={`p-1.5 rounded-md transition-colors ${
                            linkedWithNext ? "text-(--ep-strong)" : "text-(--ep-ink)/25 hover:text-(--ep-strong) sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          }`}
                          style={linkedWithNext ? { background: color } : undefined}
                        >
                          <Link2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => setMenuFor({ rowId: row.id, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                        title={tr("Plus d'options")}
                        aria-label={tr("Plus d'options")}
                        className="p-1.5 rounded-md text-(--ep-ink)/30 hover:text-(--ep-strong) hover:bg-(--ep-line)/30"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 px-3 py-2 border-t border-(--ep-line)/20 bg-(--ep-shade)/15">
        <button
          type="button"
          onClick={() => {
            pendingFocus.current = { row: day.rows.length, col: 0 };
            insertRow(day.rows.length);
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-strong)"
        >
          <Plus size={12} /> {tr("Ligne")}
        </button>
        <p className="hidden md:block ml-auto text-[10.5px] text-(--ep-ink)/25">
          {tr("Entrée : ligne suivante · Ctrl+D : recopier la case du dessus · colle directement depuis Google Sheets")}
        </p>
      </div>

      {menuFor && menuRow && (
        <RowMenu
          rect={menuFor.rect}
          onClose={() => setMenuFor(null)}
          items={[
            { icon: <SlidersHorizontal size={13} />, label: tr("Détails (muscle, tension, amplitude…)"), onClick: () => onOpenDetails(menuRow.id) },
            ...(lib(menuRow, libByName)?.category ? [{ icon: <RefreshCw size={13} />, label: tr("Remplacer par un équivalent"), onClick: () => onSwap(menuRow.id) }] : []),
            { icon: <CornerDownRight size={13} />, label: tr("Insérer une ligne en dessous"), onClick: () => insertRow(menuRowIdx + 1, menuRow) },
            { icon: <Copy size={13} />, label: tr("Dupliquer la ligne"), onClick: () => duplicateRow(menuRowIdx) },
            { icon: <ArrowUp size={13} />, label: tr("Monter"), onClick: () => moveRow(menuRowIdx, -1), disabled: menuRowIdx === 0 },
            { icon: <ArrowDown size={13} />, label: tr("Descendre"), onClick: () => moveRow(menuRowIdx, 1), disabled: menuRowIdx === day.rows.length - 1 },
            { icon: <Trash2 size={13} />, label: tr("Supprimer la ligne"), onClick: () => removeRow(menuRow.id), danger: true },
          ]}
        />
      )}
    </section>
  );
}

function lib(row: SheetRow, map: Map<string, LibraryExercise>) {
  return map.get(row.name.trim().toLowerCase()) ?? null;
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md text-(--ep-ink)/35 disabled:opacity-20 transition-colors ${danger ? "hover:text-red-400" : "hover:text-(--ep-strong)"} hover:bg-(--ep-line)/25`}
    >
      {children}
    </button>
  );
}

function UnitToggle({ unit, onChange }: { unit: RepsUnit; onChange: (u: RepsUnit) => void }) {
  const tr = useT();
  const idx = REPS_UNITS.findIndex((u) => u.key === unit);
  const current = REPS_UNITS[idx] ?? REPS_UNITS[0];
  const next = REPS_UNITS[(idx + 1) % REPS_UNITS.length];
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => onChange(next.key)}
      title={`${current.label} · ${tr("clic pour passer en")} ${next.label.toLowerCase()}`}
      aria-label={`${tr("Unité")} : ${current.label}`}
      className={`flex-shrink-0 mr-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide ${
        unit === "reps" ? "text-(--ep-ink)/30 hover:text-(--ep-strong)" : "bg-sky-500/15 text-sky-300"
      }`}
    >
      {current.short}
    </button>
  );
}

function RowMenu({
  rect,
  items,
  onClose,
}: {
  rect: DOMRect;
  items: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function down(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  const width = 250;
  const height = items.length * 36 + 8;
  const top = rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  return createPortal(
    <div ref={ref} role="menu" className="fixed z-[85] bg-(--ep-s3) border border-(--ep-line)/50 rounded-lg shadow-2xl py-1" style={{ top, left, width }}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          disabled={it.disabled}
          onClick={() => {
            it.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-left disabled:opacity-30 hover:bg-(--ep-line)/30 ${it.danger ? "text-red-400" : "text-(--ep-ink)/85"}`}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
