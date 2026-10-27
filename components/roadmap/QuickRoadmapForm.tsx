"use client";

import { useMemo } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Target, Sparkles } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { PHASE_COLORS } from "@/lib/roadmap-colors";
import type { RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { addDaysIso, diffDaysIso, isValidIsoDate } from "@/lib/roadmap-weeks";
import { formatIsoFr } from "@/lib/roadmap-weeks";

// Road map en 1 minute (2026-10-13, « la conception c'est trop compliqué,
// des questions à remplir à chaque fois ») : plus de date de début / date de
// fin à choisir pour chaque phase. On choisit le départ, des phases en
// semaines qui s'enchaînent toutes seules (ou une trajectoire toute faite),
// et des objectifs sur une ligne. L'échéance (court / moyen / long terme)
// se déduit de la date.

export interface PhaseRow extends Omit<RoadmapPhase, "id" | "roadmap_id"> {
  localId: string;
}
export interface ObjectiveRow extends Omit<RoadmapObjective, "id" | "roadmap_id"> {
  localId: string;
}

const uid = () => Math.random().toString(36).slice(2);
const PHASE_KEYS = Object.keys(PHASE_COLORS) as (keyof typeof PHASE_COLORS)[];

type Preset = { key: string; label: string; phases: [keyof typeof PHASE_COLORS, number, string?][] };
const PRESETS: Preset[] = [
  { key: "masse", label: "Prise de muscle · 6 mois", phases: [["masse", 10], ["deload", 1], ["masse", 10], ["maintenance", 3]] },
  { key: "seche", label: "Perte de gras · 4 mois", phases: [["deficit", 8], ["diet_break", 2], ["deficit", 6], ["maintenance", 2]] },
  { key: "recompo", label: "Recomposition · 3 mois", phases: [["maintenance", 12, "Recomposition"]] },
  { key: "prepa", label: "Prépa compétition · 6 mois", phases: [["deficit", 16], ["peak_week", 1], ["competition", 1], ["maintenance", 4, "Reverse diet"]] },
  { key: "saison", label: "Saison complète · 1 an", phases: [["masse", 16], ["deload", 1], ["masse", 16], ["maintenance", 4], ["deficit", 10], ["maintenance", 5]] },
];

const OBJ_KINDS = [
  { type: "weight", label: "Poids", unit: "kg", placeholder: "Atteindre 72 kg" },
  { type: "performance", label: "Performance", unit: "kg", placeholder: "100 kg au développé couché" },
  { type: "measurement", label: "Mensuration", unit: "cm", placeholder: "Tour de taille 80 cm" },
  { type: "competition", label: "Compétition", unit: "", placeholder: "Heroes Cup WNBF" },
  { type: "custom", label: "Autre", unit: "", placeholder: "10 000 pas par jour" },
] as const;

export function weeksOf(p: { start_date: string; end_date: string }): number {
  if (!isValidIsoDate(p.start_date) || !isValidIsoDate(p.end_date)) return 4;
  return Math.max(1, Math.round((diffDaysIso(p.start_date, p.end_date) + 1) / 7));
}

/** Recalcule les dates : chaque phase commence le lendemain de la précédente. */
export function chainPhases(start: string, rows: (PhaseRow & { weeks: number })[]): PhaseRow[] {
  let cursor = start;
  return rows.map((r, i) => {
    const s = cursor;
    const e = addDaysIso(s, r.weeks * 7 - 1);
    cursor = addDaysIso(e, 1);
    const { weeks: _w, ...rest } = r;
    return { ...rest, start_date: s, end_date: e, position: i };
  });
}

function termFor(start: string, target: string): "short" | "medium" | "long" {
  if (!isValidIsoDate(start) || !isValidIsoDate(target)) return "medium";
  const d = diffDaysIso(start, target);
  return d <= 42 ? "short" : d <= 183 ? "medium" : "long";
}

export default function QuickRoadmapForm({
  startDate,
  phases,
  objectives,
  today,
  onChange,
}: {
  startDate: string;
  phases: PhaseRow[];
  objectives: ObjectiveRow[];
  today: string;
  onChange: (next: { startDate: string; endDate: string; phases: PhaseRow[]; objectives: ObjectiveRow[] }) => void;
}) {
  const t = useT();
  const start = isValidIsoDate(startDate) ? startDate : today;
  const rows = useMemo(() => phases.map((p) => ({ ...p, weeks: weeksOf(p) })), [phases]);
  const endDate = phases.length ? phases[phases.length - 1].end_date : addDaysIso(start, 7 * 12 - 1);
  const totalWeeks = rows.reduce((a, r) => a + r.weeks, 0);

  function commit(nextRows: (PhaseRow & { weeks: number })[], nextStart = start, nextObjectives = objectives) {
    const chained = chainPhases(nextStart, nextRows);
    const end = chained.length ? chained[chained.length - 1].end_date : addDaysIso(nextStart, 7 * 12 - 1);
    onChange({
      startDate: nextStart,
      endDate: end,
      phases: chained,
      objectives: nextObjectives.map((o) => ({ ...o, term: termFor(nextStart, o.target_date) })),
    });
  }

  function applyPreset(p: Preset) {
    commit(
      p.phases.map(([type, weeks, label]) => ({
        localId: uid(),
        type,
        label: label ?? PHASE_COLORS[type].label,
        start_date: start,
        end_date: start,
        notes: null,
        position: 0,
        weeks,
      }))
    );
  }

  function setRow(i: number, patch: Partial<PhaseRow & { weeks: number }>) {
    commit(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  }

  function addPhase() {
    commit([...rows, { localId: uid(), type: "maintenance", label: PHASE_COLORS.maintenance.label, start_date: start, end_date: start, notes: null, position: rows.length, weeks: 4 }]);
  }

  function setObjectives(next: ObjectiveRow[]) {
    onChange({ startDate: start, endDate, phases, objectives: next.map((o) => ({ ...o, term: termFor(start, o.target_date) })) });
  }

  function addObjective(kind: (typeof OBJ_KINDS)[number]) {
    setObjectives([
      ...objectives,
      {
        localId: uid(),
        type: kind.type,
        term: "medium",
        label: "",
        target_date: endDate,
        target_value: null,
        target_unit: kind.unit,
        description: null,
        is_achieved: false,
        achieved_at: null,
      },
    ]);
  }

  const field = "bg-(--ep-shade)/15 border border-(--ep-line)/30 focus:border-(--ep-accent)/55 rounded-lg px-2.5 py-2 text-[13px] text-(--ep-strong) outline-none";

  return (
    <div className="space-y-5">
      {/* Départ */}
      <section className="ep-card" style={{ padding: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] font-bold text-(--ep-ink)/70">
            {t("Départ le")}
            <input type="date" value={start} onChange={(e) => e.target.value && commit(rows, e.target.value)} className={field} aria-label={t("Date de départ")} />
          </label>
          <span className="text-[12px] text-(--ep-ink)/55">
            {phases.length
              ? `${totalWeeks} ${t("semaines")} · ${t("jusqu'au")} ${formatIsoFr(endDate, { day: "numeric", month: "long", year: "numeric" })}`
              : t("Choisis une trajectoire ou ajoute une phase")}
          </span>
        </div>
        <p className="mt-3 mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/45">
          <Sparkles size={12} /> {t("Trajectoires toutes faites")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-full border border-(--ep-line)/35 text-[12px] font-semibold text-(--ep-ink)/75 hover:border-(--ep-accent) hover:text-(--ep-strong)"
            >
              {t(p.label)}
            </button>
          ))}
        </div>
      </section>

      {/* Phases */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/50">
            {t("Phases")} <span className="text-(--ep-ink)/30">· {t("elles s'enchaînent automatiquement")}</span>
          </p>
          <button type="button" onClick={addPhase} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-(--ep-accent)">
            <Plus size={13} /> {t("Phase")}
          </button>
        </div>
        {rows.length > 0 && (
          <div className="flex h-3 rounded-full overflow-hidden mb-2">
            {rows.map((r) => {
              const c = PHASE_COLORS[r.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
              return <div key={r.localId} title={r.label} style={{ flex: r.weeks, background: c.solid }} />;
            })}
          </div>
        )}
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const c = PHASE_COLORS[r.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
            return (
              <div key={r.localId} className="ep-card flex flex-wrap items-center gap-2" style={{ padding: "8px 10px", borderLeft: `3px solid ${c.solid}` }}>
                <select
                  value={r.type}
                  onChange={(e) => {
                    const type = e.target.value as keyof typeof PHASE_COLORS;
                    const wasDefault = r.label === c.label || !r.label;
                    setRow(i, { type, label: wasDefault ? PHASE_COLORS[type].label : r.label });
                  }}
                  aria-label={t("Type de phase")}
                  className={`${field} w-[150px]`}
                >
                  {PHASE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {PHASE_COLORS[k].icon} {PHASE_COLORS[k].label}
                    </option>
                  ))}
                </select>
                <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} aria-label={t("Nom de la phase")} className={`${field} flex-1 min-w-[120px]`} />
                <div className="flex items-center gap-1" role="group" aria-label={t("Durée en semaines")}>
                  <button type="button" onClick={() => setRow(i, { weeks: Math.max(1, r.weeks - 1) })} aria-label={t("Une semaine de moins")} className="w-8 h-8 rounded-lg border border-(--ep-line)/30 text-(--ep-ink)/70 font-bold">
                    −
                  </button>
                  <span className="w-12 text-center text-[13px] font-black text-(--ep-strong)">
                    {r.weeks} {t("sem.")}
                  </span>
                  <button type="button" onClick={() => setRow(i, { weeks: Math.min(52, r.weeks + 1) })} aria-label={t("Une semaine de plus")} className="w-8 h-8 rounded-lg border border-(--ep-line)/30 text-(--ep-ink)/70 font-bold">
                    +
                  </button>
                </div>
                <span className="text-[11px] text-(--ep-ink)/50 w-[120px]">
                  {formatIsoFr(r.start_date, { day: "numeric", month: "short" })} → {formatIsoFr(r.end_date, { day: "numeric", month: "short" })}
                </span>
                <div className="flex items-center ml-auto">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("Monter")} className="p-1.5 text-(--ep-ink)/40 disabled:opacity-20">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t("Descendre")} className="p-1.5 text-(--ep-ink)/40 disabled:opacity-20">
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" onClick={() => commit(rows.filter((_, k) => k !== i))} aria-label={t("Supprimer la phase")} className="p-1.5 text-(--ep-ink)/40 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={r.notes ?? ""}
                  onChange={(e) => setRow(i, { notes: e.target.value || null })}
                  placeholder={t("Note pour cette phase (facultatif)")}
                  aria-label={t("Note de phase")}
                  className="w-full bg-transparent border-b border-transparent focus:border-(--ep-line)/40 text-[12px] text-(--ep-ink)/70 placeholder:text-(--ep-ink)/25 outline-none px-1"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Objectifs */}
      <section>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/50">
          <Target size={12} /> {t("Objectifs")}
        </p>
        <div className="space-y-1.5">
          {objectives.map((o) => {
            const kind = OBJ_KINDS.find((k) => k.type === o.type) ?? OBJ_KINDS[4];
            return (
              <div key={o.localId} className="ep-card flex flex-wrap items-center gap-2" style={{ padding: "8px 10px" }}>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-(--ep-accent)/12 text-(--ep-accent)">{t(kind.label)}</span>
                <input
                  value={o.label}
                  onChange={(e) => setObjectives(objectives.map((x) => (x.localId === o.localId ? { ...x, label: e.target.value } : x)))}
                  placeholder={t(kind.placeholder)}
                  aria-label={t("Objectif")}
                  className={`${field} flex-1 min-w-[160px]`}
                />
                {kind.unit && (
                  <span className="flex items-center gap-1">
                    <input
                      inputMode="decimal"
                      value={o.target_value ?? ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(",", "."));
                        setObjectives(objectives.map((x) => (x.localId === o.localId ? { ...x, target_value: Number.isFinite(v) ? v : null } : x)));
                      }}
                      placeholder="0"
                      aria-label={t("Valeur cible")}
                      className={`${field} w-20 text-center`}
                    />
                    <span className="text-[12px] text-(--ep-ink)/55">{o.target_unit || kind.unit}</span>
                  </span>
                )}
                <label className="flex items-center gap-1 text-[11.5px] text-(--ep-ink)/60">
                  {t("pour le")}
                  <input
                    type="date"
                    value={o.target_date}
                    onChange={(e) => e.target.value && setObjectives(objectives.map((x) => (x.localId === o.localId ? { ...x, target_date: e.target.value } : x)))}
                    className={field}
                    aria-label={t("Date cible")}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11.5px] text-(--ep-ink)/65 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={o.is_achieved}
                    onChange={(e) => setObjectives(objectives.map((x) => (x.localId === o.localId ? { ...x, is_achieved: e.target.checked, achieved_at: e.target.checked ? today : null } : x)))}
                    className="w-4 h-4 accent-(--ep-ok)"
                  />
                  {t("Atteint")}
                </label>
                <button type="button" onClick={() => setObjectives(objectives.filter((x) => x.localId !== o.localId))} aria-label={t("Supprimer l'objectif")} className="p-1.5 text-(--ep-ink)/40 hover:text-red-400 ml-auto">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {OBJ_KINDS.map((k) => (
            <button key={k.type} type="button" onClick={() => addObjective(k)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-(--ep-line)/40 text-[11.5px] font-semibold text-(--ep-ink)/65 hover:text-(--ep-strong) hover:border-(--ep-accent)">
              <Plus size={12} /> {t(k.label)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
