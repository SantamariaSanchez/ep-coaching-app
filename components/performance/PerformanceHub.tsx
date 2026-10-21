"use client";

import { useT } from "@/components/i18n/I18nProvider";
// Performances par discipline (2026-10-07). L'écran entier se construit à
// partir des déclarations de lib/disciplines.ts : onglets, chiffres clés,
// records, historique et formulaire de saisie. Utilisé par le membre (et le
// coach pour lui-même) en écriture, et dans la fiche client en lecture seule.
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Trophy, X } from "lucide-react";
import { addPerformanceEntryAction, deletePerformanceEntryAction } from "@/app/actions/performance";
import { updatePracticeAction } from "@/app/actions/app-setup";
import type { LogbookRecords } from "@/lib/training-styles";
import { bestRecords, DISCIPLINE_BY_KEY, DISCIPLINES, type DisciplineKey, type EntryKind, type FieldDef, type PerformanceEntry } from "@/lib/disciplines";
import { safeAction } from "@/lib/safe-action";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

function frDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: iso.slice(0, 4) === todayIso().slice(0, 4) ? undefined : "numeric" });
}

export default function PerformanceHub({
  disciplines,
  entries,
  bodyweightKg,
  isWoman,
  readOnly = false,
  currentPractices = [],
  logbook,
}: {
  disciplines: DisciplineKey[];
  entries: PerformanceEntry[];
  bodyweightKg: number | null;
  isWoman: boolean;
  readOnly?: boolean;
  currentPractices?: string[];
  logbook?: LogbookRecords;
}) {
  const t = useT();
  const router = useRouter();
  // Lien direct : ?d=prepa ouvre la discipline demandée si elle est suivie.
  const wanted = useSearchParams().get("d");
  const [active, setActive] = useState<DisciplineKey | null>(disciplines.find((d) => d === wanted) ?? disciplines[0] ?? null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (disciplines.length === 0) {
    if (readOnly) return <p className="text-sm text-(--ep-ink)/50">{t("Aucune discipline suivie pour l'instant.")}</p>;
    return (
      <PracticePicker
        current={currentPractices}
        onSave={(list) =>
          startTransition(async () => {
            const res = await safeAction(() => updatePracticeAction(list));
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        pending={pending}
        error={error}
      />
    );
  }

  const discipline = DISCIPLINE_BY_KEY[active ?? disciplines[0]];
  const list = entries.filter((e) => e.discipline === discipline.key).sort((a, b) => (a.performed_on < b.performed_on ? 1 : -1));
  const stats = discipline.stats(list, { bodyweightKg, isWoman });
  const records = bestRecords(discipline, list);

  return (
    <div className="space-y-4">
      {disciplines.length > 1 && (
        <div role="tablist" aria-label={t("Disciplines")} className="flex gap-1.5 overflow-x-auto pb-1">
          {disciplines.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={k === discipline.key}
              onClick={() => setActive(k)}
              className={`shrink-0 min-h-[40px] px-4 rounded-full text-xs font-bold border ${k === discipline.key ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)" : "border-(--ep-line)/40 text-(--ep-ink)/65"}`}
            >
              {t(DISCIPLINE_BY_KEY[k].menuLabel)}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-(--ep-ink)/55 leading-relaxed">{t(discipline.description)}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-(--ep-s1) border border-(--ep-line)/25 px-3 py-3">
            <p className="text-lg font-black text-(--ep-strong) leading-tight">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-(--ep-ink)/40 mt-1">{t(s.label)}</p>
          </div>
        ))}
      </div>

      {!readOnly && (
        <button onClick={() => setAdding(true)} className="w-full min-h-[46px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold flex items-center justify-center gap-2">
          <Plus size={16} />{" "}{t("Nouvelle saisie")}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-red-400">{t(error)}</p>}

      {records.length > 0 && (
        <section className="rounded-xl bg-(--ep-s1) border border-(--ep-line)/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-2 flex items-center gap-1.5"><Trophy size={12} className="text-amber-400" />{" "}{t("Records")}</p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {records.map((r) => (
              <li key={r.key} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-(--ep-ink)/70 truncate">{t(r.label)}</span>
                <span className="font-bold text-(--ep-strong) whitespace-nowrap">{r.display} <span className="text-[10px] font-normal text-(--ep-ink)/35">{frDate(r.date)}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {logbook && discipline.key === "force" && (logbook.lifts.length > 0 || logbook.total != null) && (
        <section className="rounded-xl bg-(--ep-s1) border border-(--ep-line)/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-2">{t("Depuis ton logbook")}</p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {logbook.lifts.map((l) => (
              <li key={l.lift} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-(--ep-ink)/70 truncate">{t("1RM estimé")} · {t(l.lift)}</span>
                <span className="font-bold text-(--ep-strong) whitespace-nowrap">{Math.round(l.e1rm * 10) / 10} kg</span>
              </li>
            ))}
            {logbook.total != null && (
              <li className="flex items-baseline justify-between gap-2 text-sm sm:col-span-2 border-t border-(--ep-line)/15 pt-1.5">
                <span className="text-(--ep-ink)/70">{t("Total estimé (SBD)")}</span>
                <span className="font-black text-(--ep-strong)">{logbook.total} kg</span>
              </li>
            )}
          </ul>
        </section>
      )}

      {logbook && discipline.key === "calisthenics" && (logbook.skills.length > 0 || logbook.maxReps.length > 0) && (
        <section className="rounded-xl bg-(--ep-s1) border border-(--ep-line)/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-2">{t("Depuis ton logbook")}</p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {logbook.skills.map((s) => (
              <li key={s.key} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-(--ep-ink)/70 truncate">{t(s.label)}</span>
                <span className="font-bold text-(--ep-strong) whitespace-nowrap">{t(s.step)}{s.perf ? ` · ${s.perf} ${s.unit === "sec" ? "s" : "reps"}` : ""}</span>
              </li>
            ))}
            {logbook.maxReps.map((m) => (
              <li key={m.name} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-(--ep-ink)/70 truncate">{t(m.name)}</span>
                <span className="font-bold text-(--ep-strong) whitespace-nowrap">{m.reps} reps</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-2">{t("Historique")}</p>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--ep-line)/30 py-8 text-center text-xs text-(--ep-ink)/40">{readOnly ? t("Rien de noté pour l'instant.") : t("Ta première saisie apparaîtra ici.")}</div>
        ) : (
          <ul className="rounded-xl bg-(--ep-s1) border border-(--ep-line)/20 divide-y divide-(--ep-line)/15">
            {list.slice(0, 60).map((e) => {
              const kind = discipline.kinds.find((k) => k.key === e.kind);
              return (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-12 shrink-0 text-[11px] font-bold text-(--ep-ink)/45">{frDate(e.performed_on)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-(--ep-accent)/80">{kind?.label ?? e.kind}</p>
                    <p className="text-sm text-(--ep-strong)">{kind?.summary(e.data) ?? ""}</p>
                    {e.data.notes ? <p className="text-[11px] text-(--ep-ink)/45 mt-0.5">{String(e.data.notes)}</p> : null}
                  </div>
                  {!readOnly && (
                    <button
                      aria-label={t("Supprimer cette saisie")}
                      onClick={() => startTransition(async () => { const r = await safeAction(() => deletePerformanceEntryAction(e.id)); if (r.error) setError(r.error); else router.refresh(); })}
                      className="w-10 h-10 flex items-center justify-center text-(--ep-ink)/30 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {discipline.tip && <p className="text-[11px] text-(--ep-ink)/45 leading-relaxed border-l-2 border-(--ep-accent)/60 pl-3">{t(discipline.tip)}</p>}

      {adding && (
        <EntrySheet
          kinds={discipline.kinds}
          title={`${t("Nouvelle saisie")} : ${t(discipline.menuLabel)}`}
          pending={pending}
          onClose={() => setAdding(false)}
          onSubmit={(kind, date, data) =>
            startTransition(async () => {
              const res = await safeAction(() => addPerformanceEntryAction({ discipline: discipline.key, kind, performedOn: date, data }));
              if (res.error) setError(res.error);
              else {
                setError(null);
                setAdding(false);
                router.refresh();
              }
            })
          }
          error={error}
        />
      )}
    </div>
  );
}

// Pratique du questionnaire Mon appli qui active chaque discipline (le plus
// souvent la même clé ; la prépa vient de « Bodybuilding de compétition »).
const PRACTICE_OF: Partial<Record<DisciplineKey, string>> = { prepa: "bodybuilding_compet" };
const practiceOf = (k: DisciplineKey) => PRACTICE_OF[k] ?? k;

function PracticePicker({ current, onSave, pending, error }: { current: string[]; onSave: (l: string[]) => void; pending: boolean; error: string | null }) {
  const t = useT();
  const practices = new Set(DISCIPLINES.map((d) => practiceOf(d.key)));
  const [sel, setSel] = useState<string[]>(current.filter((c) => practices.has(c)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-(--ep-ink)/70 leading-relaxed">{t("Choisis ta ou tes disciplines : l'appli ajoute les bons outils (allure, stations Hyrox, WOD, 1RM, douleur, tension...) et rien d'autre.")}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {DISCIPLINES.map((d) => {
          const value = practiceOf(d.key);
          const on = sel.includes(value);
          return (
            <button
              key={d.key}
              aria-pressed={on}
              onClick={() => setSel((s) => (on ? s.filter((x) => x !== value) : [...s, value]))}
              className={`text-left rounded-xl border p-3 min-h-[64px] ${on ? "border-(--ep-accent) bg-(--ep-accent)/15" : "border-(--ep-line)/35 bg-(--ep-s1)"}`}
            >
              <p className="text-sm font-bold text-(--ep-strong)">{t(d.label)}</p>
              <p className="text-[11px] text-(--ep-ink)/50 leading-snug mt-0.5">{t(d.description)}</p>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{t(error)}</p>}
      <button
        disabled={pending || sel.length === 0}
        onClick={() => onSave([...new Set([...current.filter((c) => !practices.has(c)), ...sel])])}
        className="w-full min-h-[46px] rounded-xl bg-(--ep-accent) disabled:opacity-40 text-(--ep-strong) text-sm font-bold"
      >
        {t("Activer")}
      </button>
    </div>
  );
}

function EntrySheet({ kinds, title, onClose, onSubmit, pending, error }: { kinds: EntryKind[]; title: string; onClose: () => void; onSubmit: (kind: string, date: string, data: Record<string, unknown>) => void; pending: boolean; error: string | null }) {
  const t = useT();
  const [kindKey, setKindKey] = useState(kinds[0].key);
  const [date, setDate] = useState(todayIso());
  const [values, setValues] = useState<Record<string, string>>({});
  const kind = useMemo(() => kinds.find((k) => k.key === kindKey) ?? kinds[0], [kinds, kindKey]);
  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-(--ep-shade)/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-(--ep-s3) border border-(--ep-line)/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-(--ep-strong)">{title}</p>
          <button aria-label={t("Fermer")} onClick={onClose} className="w-10 h-10 flex items-center justify-center text-(--ep-ink)/60"><X size={18} /></button>
        </div>
        {kinds.length > 1 && (
          <div className="flex gap-1.5 mb-3 flex-wrap" role="radiogroup" aria-label={t("Type de saisie")}>
            {kinds.map((k) => (
              <button key={k.key} role="radio" aria-checked={k.key === kindKey} onClick={() => { setKindKey(k.key); setValues({}); }} className={`min-h-[38px] px-3 rounded-full text-xs font-bold border ${k.key === kindKey ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)" : "border-(--ep-line)/40 text-(--ep-ink)/65"}`}>
                {t(k.label)}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-(--ep-ink)/70">{t("Date")}</span>
            <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-11 rounded-xl bg-(--ep-s2) border border-(--ep-line)/40 px-3 text-sm text-(--ep-strong)" />
          </label>
          {kind.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
          ))}
          {error && <p role="alert" className="text-xs text-red-400">{t(error)}</p>}
          <button disabled={pending} onClick={() => onSubmit(kind.key, date, values)} className="w-full min-h-[46px] rounded-xl bg-(--ep-accent) disabled:opacity-50 text-(--ep-strong) text-sm font-bold">
            {pending ? t("Enregistrement...") : t("Enregistrer")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const t = useT();
  const label = (
    <span className="text-xs font-bold text-(--ep-ink)/70">
      {t(field.label)}
      {field.unit ? ` (${field.unit})` : ""}
      {field.required ? "" : <span className="font-normal text-(--ep-ink)/35">{" "}{t("· facultatif")}</span>}
    </span>
  );
  if (field.type === "select") {
    return (
      <div>
        {label}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {field.options?.map((o) => (
            <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? "" : o)} className={`min-h-[36px] px-3 rounded-full text-xs border ${value === o ? "bg-(--ep-accent)/25 border-(--ep-accent) text-(--ep-strong) font-bold" : "border-(--ep-line)/40 text-(--ep-ink)/65"}`}>
              {t(o)}
            </button>
          ))}
        </div>
        {field.hint && <span className="block mt-1 text-[10px] text-(--ep-ink)/40">{t(field.hint)}</span>}
      </div>
    );
  }
  if (field.type === "scale") {
    const min = field.min ?? 0;
    const max = field.max ?? 10;
    return (
      <div>
        {label}
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from({ length: max - min + 1 }, (_, i) => String(min + i)).map((n) => (
            <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? "" : n)} className={`w-9 h-9 rounded-lg text-xs font-bold border ${value === n ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)" : "border-(--ep-line)/40 text-(--ep-ink)/65"}`}>
              {n}
            </button>
          ))}
        </div>
        {field.hint && <span className="block mt-1 text-[10px] text-(--ep-ink)/40">{t(field.hint)}</span>}
      </div>
    );
  }
  return (
    <label className="block">
      {label}
      <input
        type={field.type === "number" ? "number" : "text"}
        inputMode={field.type === "number" ? "decimal" : field.type === "duration" ? "numeric" : undefined}
        step={field.step}
        min={field.min}
        placeholder={field.placeholder ?? (field.type === "duration" ? t("mm:ss ou h:mm:ss") : undefined)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-11 rounded-xl bg-(--ep-s2) border border-(--ep-line)/40 px-3 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25"
      />
      {field.hint && <span className="block mt-1 text-[10px] text-(--ep-ink)/40">{t(field.hint)}</span>}
    </label>
  );
}
