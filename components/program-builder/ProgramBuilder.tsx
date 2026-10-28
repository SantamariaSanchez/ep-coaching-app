"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Check,
  ClipboardList,
  LayoutTemplate,
  BookmarkPlus,
  Send,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  Eye,
  PencilLine,
  ArrowLeft,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";
import type { ClientIntake } from "@/utils/client-intake";
import type { ScheduleBlock } from "@/utils/agenda";
import type { ProgramTemplateWithDays, ProgramTemplateInput } from "@/utils/program-templates";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { TrainingGym } from "@/utils/training-gyms";
import { equipmentFilterFor } from "@/lib/gym-equipment";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, type MuscleGroup } from "@/lib/volume-data";
import { TENSION_FOCUS_LABELS, TENSION_FOCUS_OPTIONS } from "@/lib/exercise-library-content";
import { findSwapCandidate, generateProgramPlan, recoveryFromIntake } from "@/lib/plan-generator";
import type { TrainingLevel } from "@/lib/coaching-knowledge";
import SessionSheet from "./SessionSheet";
import ClientContextPanel, { plannedVolume, volumeColor, SPORT_BLOCK, type ContextPhotos } from "./ClientContextPanel";
import {
  type SheetDay,
  type SheetRow,
  SPLITS,
  DEFAULT_ROWS,
  daysFromProgram,
  daysFromTemplate,
  daysToInput,
  emptyDay,
  emptyRow,
  isGeneratedLabel,
  isRowFilled,
  splitLabels,
  uid,
} from "./sheet-model";

interface BuilderState {
  name: string;
  objective: string;
  coach_notes: string;
  type: string;
  days: SheetDay[];
}

function initState(program: ProgramWithDays | null): BuilderState {
  return {
    name: program?.name ?? "",
    objective: program?.objective ?? "",
    coach_notes: program?.coach_notes ?? "",
    type: program?.type ?? "Custom",
    days: daysFromProgram(program),
  };
}

function parseMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const h = raw.match(/(\d+)\s*h\s*(\d+)?/i);
  if (h) return parseInt(h[1]) * 60 + (h[2] ? parseInt(h[2]) : 0);
  const nums = raw.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  const n = Math.max(...nums);
  return n <= 4 ? n * 60 : n;
}

export type SaveProgramFn = (
  clientId: string,
  input: ProgramInput,
  opts?: { notify?: boolean; isUpdate?: boolean }
) => Promise<{ error?: string }>;

export default function ProgramBuilder({
  clientId,
  clientName,
  program,
  intake = null,
  experienceLevel = "intermediaire",
  templates = [],
  scheduleBlocks = [],
  photos = { gym: [], physique: [] },
  gyms = [],
  saveProgram,
  saveAsTemplate,
  mode = "client",
  backHref,
  programHref,
  clientHref,
}: {
  clientId: string;
  clientName: string;
  program: ProgramWithDays | null;
  intake?: ClientIntake | null;
  /** Niveau d'entraînement du client (quiz d'onboarding), pour le volume de départ et le choix des exercices. */
  experienceLevel?: TrainingLevel;
  templates?: ProgramTemplateWithDays[];
  scheduleBlocks?: ScheduleBlock[];
  photos?: ContextPhotos;
  /** Salles d'entraînement du client (matériel et photos). */
  gyms?: TrainingGym[];
  saveProgram: SaveProgramFn;
  saveAsTemplate?: (input: ProgramTemplateInput) => Promise<{ id?: string; error?: string }>;
  /** "self" : le coach programme pour lui-même (pas de fiche client ni de notif). */
  mode?: "client" | "self";
  backHref: string;
  programHref: string;
  clientHref?: string;
}) {
  const tr = useT();
  const router = useRouter();
  const confirm = useConfirm();
  const firstName = clientName.split(" ")[0] || clientName;
  const draftKey = `ep-prog-draft:${clientId}`;

  const [state, setState] = useState<BuilderState>(() => initState(program));
  const [dirty, setDirty] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftOffer, setDraftOffer] = useState<{ savedAt: string; state: BuilderState } | null>(null);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planNotes, setPlanNotes] = useState<string[]>([]);
  const [delivered, setDelivered] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [templateMenu, setTemplateMenu] = useState(false);
  const [templateForm, setTemplateForm] = useState<{ name: string; busy: boolean; done: boolean; error: string | null } | null>(null);
  const [detailsFor, setDetailsFor] = useState<{ dayId: string; rowId: string } | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.exercises ?? []))
      .catch(() => {});
  }, []);

  // ── Brouillon automatique (sur cet appareil) ─────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { savedAt: string; basedOn: string | null; state: BuilderState };
      // Brouillon périmé : le programme a été livré depuis (autre appareil).
      if (draft.basedOn !== (program?.id ?? null)) {
        localStorage.removeItem(draftKey);
        return;
      }
      setDraftOffer({ savedAt: draft.savedAt, state: draft.state });
    } catch {
      // stockage indisponible : pas de brouillon, rien de grave
    }
  }, [draftKey, program?.id]);

  useEffect(() => {
    if (!dirty || delivered) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: new Date().toISOString(), basedOn: program?.id ?? null, state }));
        setDraftSavedAt(new Date());
      } catch {
        // plein ou bloqué
      }
    }, 700);
    return () => clearTimeout(t);
  }, [state, dirty, delivered, draftKey, program?.id]);

  useEffect(() => {
    if (!dirty || delivered) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, delivered]);

  const update = useCallback((fn: (s: BuilderState) => BuilderState) => {
    setState(fn);
    setDirty(true);
    setDelivered(false);
  }, []);

  // ── Séances ──────────────────────────────────────────────────────────────
  const sessionCount = state.days.length;
  const suggestedCount = intake?.sessions_desired && intake.sessions_desired >= 1 && intake.sessions_desired <= 7 ? intake.sessions_desired : null;

  async function setSessionCount(n: number) {
    if (n === sessionCount) return;
    if (n > sessionCount) {
      const labels = splitLabels(state.type, n);
      update((s) => ({
        ...s,
        days: [
          ...s.days,
          ...Array.from({ length: n - s.days.length }, (_, i) => emptyDay(labels[s.days.length + i])),
        ],
      }));
      return;
    }
    const removed = state.days.slice(n);
    if (removed.some((d) => d.rows.some(isRowFilled))) {
      const ok = await confirm(
        tr("Passer à {n} séances supprime les dernières séances et leurs exercices. Continuer ?", { n })
      );
      if (!ok) return;
    }
    update((s) => ({ ...s, days: s.days.slice(0, n) }));
  }

  function setSplit(key: string) {
    update((s) => {
      // Aucune séance encore : choisir le split les crée directement (le
      // nombre voulu par le client s'il l'a donné, sinon le classique du
      // split), sans repasser par « Combien de séances ? ».
      if (s.days.length === 0 && key !== "Custom") {
        const n = suggestedCount ?? (key === "Upper/Lower" ? 4 : key === "PPL" ? 3 : 3);
        return { ...s, type: key, days: splitLabels(key, n).map((l) => emptyDay(l)) };
      }
      const labels = splitLabels(key, Math.max(s.days.length, 1));
      return {
        ...s,
        type: key,
        days: s.days.map((d, i) =>
          !d.label.trim() || isGeneratedLabel(d.label) || !d.rows.some(isRowFilled) ? { ...d, label: labels[i] } : d
        ),
      };
    });
  }

  function updateDay(day: SheetDay) {
    update((s) => ({ ...s, days: s.days.map((d) => (d.id === day.id ? day : d)) }));
  }

  function moveDay(idx: number, dir: -1 | 1) {
    update((s) => {
      const next = idx + dir;
      if (next < 0 || next >= s.days.length) return s;
      const days = [...s.days];
      [days[idx], days[next]] = [days[next], days[idx]];
      return { ...s, days };
    });
  }

  function duplicateDay(idx: number) {
    update((s) => {
      const src = s.days[idx];
      const copy: SheetDay = {
        ...src,
        id: uid(),
        label: `${src.label} (2)`,
        weekday: null,
        rows: src.rows.map((r) => ({ ...r, id: uid(), superset: r.superset ? `${r.superset}-c` : null })),
      };
      const days = [...s.days];
      days.splice(idx + 1, 0, copy);
      return { ...s, days };
    });
  }

  async function removeDay(idx: number) {
    const day = state.days[idx];
    if (day.rows.some(isRowFilled) && !(await confirm(tr("Supprimer la séance « {label} » et ses exercices ?", { label: day.label })))) return;
    update((s) => ({ ...s, days: s.days.filter((_, i) => i !== idx) }));
  }

  function addDay() {
    update((s) => ({ ...s, days: [...s.days, emptyDay(splitLabels(s.type, s.days.length + 1)[s.days.length])] }));
    setTimeout(() => document.getElementById("builder-end")?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  async function loadTemplate(t: ProgramTemplateWithDays) {
    setTemplateMenu(false);
    if (state.days.some((d) => d.rows.some(isRowFilled)) && !(await confirm(tr("Charger « {name} » remplace les séances en cours. Continuer ?", { name: t.name })))) return;
    update((s) => ({
      ...s,
      name: s.name || t.name,
      type: t.type ?? s.type,
      objective: s.objective || t.objective || "",
      days: daysFromTemplate(t),
    }));
  }

  // Base automatique : toute la semaine pré-remplie d'après la fiche
  // (blessures, exercices qui font mal, matériel détesté, salle ou maison),
  // avec séries/reps/RIR/repos par défaut. Le coach n'a plus qu'à ajuster.
  const baseCount = sessionCount || suggestedCount || 4;
  // Salle par défaut pour la base automatique : celle de la première séance qui en a une, sinon la première salle.
  const defaultGym = gyms.find((g) => g.id === state.days.find((d) => d.gym_id)?.gym_id) ?? gyms[0] ?? null;
  async function generateBase(n: number) {
    setTemplateMenu(false);
    if (library.length === 0) {
      setError(tr("La bibliothèque d'exercices charge encore, réessaie dans une seconde."));
      return;
    }
    if (state.days.some((d) => d.rows.some(isRowFilled)) && !(await confirm(tr("La base automatique remplace les séances en cours. Continuer ?")))) return;
    const plan = generateProgramPlan(
      n,
      library,
      intake?.disliked_equipment ?? null,
      intake?.exercises_problematic ?? null,
      intake?.training_access ?? null,
      intake?.injuries ?? null,
      { level: experienceLevel, recovery: recoveryFromIntake(intake), sessionMinutes: parseMinutes(intake?.session_duration), gymEquipment: equipmentFilterFor(defaultGym) }
    );
    const draft = plan.days;
    setPlanNotes(plan.notes);
    update((s) => ({
      ...s,
      type: "Custom",
      days: draft.map((d) => {
        const rows = d.exercises.map((e) => ({
          ...emptyRow({ sets: e.sets, reps: e.reps, rir: e.rir, rest: `${Math.floor(Number(e.rest_seconds) / 60)}:${String(Number(e.rest_seconds) % 60).padStart(2, "0")}` }),
          name: e.name,
          muscle_group: e.muscle_group,
          muscle_subgroup: e.muscle_subgroup ?? "",
          is_direct: e.is_direct,
        }));
        while (rows.length < DEFAULT_ROWS) rows.push(emptyRow());
        return { ...emptyDay(d.dayLabel, 0), rows, gym_id: defaultGym?.id ?? null };
      }),
    }));
  }

  async function loadCurrentProgram() {
    setTemplateMenu(false);
    if (!program) return;
    if (state.days.some((d) => d.rows.some(isRowFilled)) && !(await confirm(tr("Repartir du programme actuel remplace les séances en cours. Continuer ?")))) return;
    update(() => initState(program));
  }

  // ── Détails et remplacement d'un exercice ───────────────────────────────
  function patchRow(dayId: string, rowId: string, patch: Partial<SheetRow>) {
    update((s) => ({
      ...s,
      days: s.days.map((d) => (d.id !== dayId ? d : { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) })),
    }));
  }

  function swapRow(dayId: string, rowId: string) {
    const day = state.days.find((d) => d.id === dayId);
    const row = day?.rows.find((r) => r.id === rowId);
    if (!day || !row) return;
    const current = library.find((l) => l.name.toLowerCase() === row.name.trim().toLowerCase());
    if (!current?.category) return;
    const next = findSwapCandidate(
      { muscle_group: current.muscle_group, category: current.category },
      library,
      intake?.disliked_equipment ?? null,
      intake?.exercises_problematic ?? null,
      intake?.injuries ?? null,
      intake?.training_access ?? null,
      day.rows.map((r) => r.name),
      experienceLevel,
      equipmentFilterFor(gyms.find((g) => g.id === day.gym_id))
    );
    if (next) patchRow(dayId, rowId, { name: next.name, muscle_group: next.muscle_group, muscle_subgroup: next.muscle_subgroup ?? "" });
  }

  // ── Volume en direct ─────────────────────────────────────────────────────
  const liveVolume = useMemo(() => {
    const v: Record<string, number> = {};
    for (const d of state.days)
      for (const r of d.rows) {
        if (!isRowFilled(r) || !r.is_direct || !r.muscle_group) continue;
        const sets = parseInt(r.sets, 10);
        if (sets > 0) v[r.muscle_group] = (v[r.muscle_group] ?? 0) + sets;
      }
    return v;
  }, [state.days]);
  const previousVolume = useMemo(() => plannedVolume(program), [program]);
  const volumeGroups = Object.keys({ ...previousVolume, ...liveVolume }).sort((a, b) => (liveVolume[b] ?? 0) - (liveVolume[a] ?? 0));
  const [showVolume, setShowVolume] = useState(false);

  const agendaDays = useMemo(() => {
    const set = new Set<number>();
    for (const b of scheduleBlocks) if (!b.specific_date && SPORT_BLOCK.test(b.label)) set.add(b.day_of_week);
    return set;
  }, [scheduleBlocks]);
  const sessionMinutesTarget = parseMinutes(intake?.session_duration);

  const totalExercises = state.days.reduce((a, d) => a + d.rows.filter(isRowFilled).length, 0);
  const incomplete = state.days.reduce((a, d) => a + d.rows.filter((r) => isRowFilled(r) && (!r.sets || !r.reps)).length, 0);

  // ── Livraison ────────────────────────────────────────────────────────────
  async function deliver() {
    setError(null);
    if (totalExercises === 0) {
      setError(tr("Ajoute au moins un exercice avant de livrer."));
      return;
    }
    if (incomplete > 0) {
      const ok = await confirm(
        tr("{n} exercice(s) sans séries ou reps. Le client verra « à définir ». Livrer quand même ?", { n: incomplete })
      );
      if (!ok) return;
    }
    const input: ProgramInput = {
      name: state.name.trim() || (state.type !== "Custom" ? `${SPLITS.find((s) => s.key === state.type)?.label ?? "Programme"}` : tr("Programme")),
      type: state.type || null,
      frequency: state.days.length || null,
      objective: state.objective.trim() || null,
      coach_notes: state.coach_notes.trim() || null,
      volume_targets: program?.volume_targets ?? null,
      days: daysToInput(state.days).filter((d) => d.exercises.length > 0 || state.days.length === 1),
    };
    setSaving(true);
    const res = await saveProgram(clientId, input, { notify: mode === "client" && notify, isUpdate: !!program });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDirty(false);
    setDelivered(true);
    setDraftOffer(null);
    router.refresh();
  }

  async function saveTemplate() {
    if (!saveAsTemplate || !templateForm) return;
    const name = templateForm.name.trim();
    if (!name) {
      setTemplateForm({ ...templateForm, error: tr("Donne un nom au modèle.") });
      return;
    }
    setTemplateForm({ ...templateForm, busy: true, error: null });
    const res = await saveAsTemplate({
      name,
      type: state.type || null,
      frequency: state.days.length || null,
      objective: state.objective.trim() || null,
      notes: state.coach_notes.trim() || null,
      days: daysToInput(state.days).map((d) => ({ ...d, weekday: null })),
    });
    setTemplateForm(res.error ? { ...templateForm, busy: false, error: res.error } : { ...templateForm, busy: false, done: true });
    if (!res.error) setTimeout(() => setTemplateForm(null), 2000);
  }

  // Ctrl+S : livrer sans chercher le bouton.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) deliver();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const detailsDay = detailsFor ? state.days.find((d) => d.id === detailsFor.dayId) : null;
  const detailsRow = detailsDay?.rows.find((r) => r.id === detailsFor?.rowId) ?? null;

  const panel =
    mode === "client" ? (
      <ClientContextPanel
        clientName={clientName}
        intake={intake}
        scheduleBlocks={scheduleBlocks}
        currentProgram={program}
        photos={photos}
        coachNotes={state.coach_notes}
        onCoachNotesChange={(v) => update((s) => ({ ...s, coach_notes: v }))}
        clientHref={clientHref}
      />
    ) : null;

  return (
    <div className={mode === "client" ? "lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:gap-5" : ""}>
      {panel && (
        <aside className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 pb-6 ep-scroll-thin">{panel}</div>
        </aside>
      )}

      <div className="min-w-0">
        {/* Brouillon retrouvé */}
        {draftOffer && !dirty && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[12px] text-sky-100">
            <span className="flex-1 min-w-0">
              {tr("Brouillon non livré du")}{" "}
              {new Date(draftOffer.savedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              type="button"
              onClick={() => {
                setState(draftOffer.state);
                setDirty(true);
                setDraftOffer(null);
              }}
              className="font-bold uppercase tracking-widest text-[10.5px] text-(--ep-strong) bg-sky-600/60 hover:bg-sky-600 rounded-md px-2.5 py-1"
            >
              {tr("Reprendre")}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey);
                } catch {}
                setDraftOffer(null);
              }}
              className="text-[10.5px] font-bold uppercase tracking-widest text-sky-200/70 hover:text-(--ep-strong)"
            >
              {tr("Ignorer")}
            </button>
          </div>
        )}

        {/* Barre de structure : nom, séances/semaine, split, modèle */}
        <div className="rounded-xl border border-(--ep-line)/35 bg-(--ep-s3) p-3 sm:p-4 mb-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {panel && (
              <button
                type="button"
                onClick={() => setMobilePanel(true)}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-(--ep-accent)/40 bg-(--ep-accent)/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-accent-hi2)"
              >
                <ClipboardList size={13} /> {tr("Fiche")} {firstName}
              </button>
            )}
            <input
              value={state.name}
              onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
              placeholder={tr("Nom du programme (ex. Prise de muscle, bloc 1)")}
              aria-label={tr("Nom du programme")}
              className="flex-1 min-w-[200px] bg-transparent text-lg font-black text-(--ep-strong) placeholder:text-(--ep-ink)/25 placeholder:font-semibold focus:outline-none border-b border-transparent focus:border-(--ep-accent)/50"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setTemplateMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--ep-line)/40 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/60 hover:text-(--ep-strong)"
              >
                <LayoutTemplate size={13} /> {tr("Partir de…")} <ChevronDown size={12} />
              </button>
              {templateMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 w-72 max-h-80 overflow-y-auto rounded-lg border border-(--ep-line)/50 bg-(--ep-s3) shadow-2xl py-1">
                  <button type="button" onClick={() => generateBase(baseCount)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-(--ep-line)/30 border-b border-(--ep-line)/25">
                    <span className="font-semibold text-(--ep-accent)">{tr("Base automatique ({n} séances)", { n: baseCount })}</span>
                    <span className="block text-[10.5px] text-(--ep-ink)/40">{tr("Pré-remplie selon sa fiche : blessures, matériel, salle ou maison")}</span>
                  </button>
                  {program && program.days.length > 0 && (
                    <button type="button" onClick={loadCurrentProgram} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-(--ep-line)/30">
                      <span className="font-semibold text-(--ep-strong)">{tr("Son programme actuel")}</span>
                      <span className="block text-[10.5px] text-(--ep-ink)/40">{program.name}</span>
                    </button>
                  )}
                  {templates.length === 0 && (
                    <p className="px-3 py-2 text-[11.5px] text-(--ep-ink)/40">{tr("Aucun modèle. Enregistre ce programme comme modèle en bas pour le réutiliser.")}</p>
                  )}
                  {templates.map((t) => (
                    <button key={t.id} type="button" onClick={() => loadTemplate(t)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-(--ep-line)/30">
                      <span className="font-semibold text-(--ep-strong)">{t.name}</span>
                      <span className="block text-[10.5px] text-(--ep-ink)/40">
                        {t.days.length} {tr("séances")} · {t.days.reduce((a, d) => a + d.exercises.length, 0)} {tr("exercices")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{tr("Séances / sem.")}</span>
              <div className="flex rounded-lg overflow-hidden border border-(--ep-line)/40" role="group" aria-label={tr("Nombre de séances par semaine")}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSessionCount(n)}
                    aria-pressed={sessionCount === n}
                    title={suggestedCount === n ? tr("Ce que le client souhaite") : undefined}
                    className={`relative w-8 h-8 text-[13px] font-bold transition-colors ${
                      sessionCount === n ? "bg-(--ep-accent) text-(--ep-strong)" : "bg-(--ep-shade)/25 text-(--ep-ink)/50 hover:text-(--ep-strong) hover:bg-(--ep-line)/30"
                    }`}
                  >
                    {n}
                    {suggestedCount === n && sessionCount !== n && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={tr("Split")}>
              {SPLITS.map((sp) => (
                <button
                  key={sp.key}
                  type="button"
                  onClick={() => setSplit(sp.key)}
                  aria-pressed={state.type === sp.key}
                  className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${
                    state.type === sp.key ? "border-(--ep-accent) bg-(--ep-accent)/15 text-(--ep-strong)" : "border-(--ep-line)/35 text-(--ep-ink)/55 hover:text-(--ep-strong)"
                  }`}
                >
                  {tr(sp.label)}
                </button>
              ))}
            </div>
          </div>

          <input
            value={state.objective}
            onChange={(e) => update((s) => ({ ...s, objective: e.target.value }))}
            placeholder={tr("Objectif de ce bloc, en une phrase (le client le voit en haut de son programme)")}
            aria-label={tr("Objectif du bloc")}
            className="w-full bg-(--ep-shade)/20 border border-(--ep-line)/25 focus:border-(--ep-accent)/50 rounded-lg px-3 py-2 text-[12.5px] text-(--ep-strong) placeholder:text-(--ep-ink)/25 outline-none"
          />
        </div>

        {/* Repères de séances + volume */}
        {state.days.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {state.days.map((d, i) => (
              <a
                key={d.id}
                href={`#seance-${d.id}`}
                className="px-2 py-1 rounded-md bg-(--ep-shade)/25 border border-(--ep-line)/25 text-[11px] text-(--ep-ink)/60 hover:text-(--ep-strong)"
              >
                <b className="text-(--ep-accent)">{i + 1}</b> {d.label || tr("Séance")}
              </a>
            ))}
            <button
              type="button"
              onClick={() => setShowVolume((v) => !v)}
              aria-expanded={showVolume}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-(--ep-ink)/55 hover:text-(--ep-strong)"
            >
              {tr("Volume / semaine")} <ChevronDown size={12} style={{ transform: showVolume ? "rotate(180deg)" : undefined }} />
            </button>
          </div>
        )}
        {showVolume && state.days.length > 0 && (
          <div className="mb-3 rounded-lg border border-(--ep-line)/25 bg-(--ep-s5) p-3">
            {volumeGroups.length === 0 ? (
              <p className="text-[11.5px] text-(--ep-ink)/40">{tr("Choisis des exercices de la bibliothèque (ou renseigne le muscle dans les détails) pour voir le volume.")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {volumeGroups.map((g) => {
                  const now = liveVolume[g] ?? 0;
                  const before = previousVolume[g];
                  return (
                    <span key={g} className="px-2 py-1 rounded-md bg-(--ep-shade)/30 text-[11.5px]" title={tr("Repères : rouge = trop peu ou trop, vert = zone efficace, orange = élevé")}>
                      <span className="text-(--ep-ink)/60">{g}</span> <b style={{ color: volumeColor(g, now) }}>{now}</b>
                      {before != null && before !== now && program && (
                        <span className="text-[10px] text-(--ep-ink)/35"> ({tr("avant")} {before})</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Séances */}
        {state.days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--ep-line)/40 bg-(--ep-s5) px-4 py-10 text-center">
            <p className="text-sm font-bold text-(--ep-strong) mb-1">{tr("Combien de séances par semaine ?")}</p>
            <p className="text-[12px] text-(--ep-ink)/45 mb-4">
              {suggestedCount
                ? tr("{name} a demandé {n} séances. Touche un chiffre : les séances se créent avec 8 lignes chacune.", { name: firstName, n: suggestedCount })
                : tr("Touche un chiffre : les séances se créent avec 8 lignes chacune.")}
            </p>
            <div className="inline-flex rounded-lg overflow-hidden border border-(--ep-line)/40">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionCount(n)}
                  className={`w-11 h-11 text-base font-black ${suggestedCount === n ? "bg-(--ep-accent) text-(--ep-strong)" : "bg-(--ep-shade)/30 text-(--ep-ink)/60 hover:bg-(--ep-line)/30 hover:text-(--ep-strong)"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-(--ep-ink)/50">
              {tr("ou")}{" "}
              <button type="button" onClick={() => generateBase(baseCount)} className="font-bold text-(--ep-accent) underline underline-offset-2">
                {tr("génère une base complète de {n} séances", { n: baseCount })}
              </button>{" "}
              {tr("adaptée à sa fiche, puis ajuste")}
            </p>
            {templates.length > 0 && (
              <p className="mt-4 text-[11.5px] text-(--ep-ink)/40">
                {tr("ou")}{" "}
                <button type="button" onClick={() => setTemplateMenu(true)} className="underline hover:text-(--ep-strong)">
                  {tr("pars d'un de tes modèles")}
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {state.days.map((d, i) => (
              <SessionSheet
                key={d.id}
                day={d}
                index={i}
                total={state.days.length}
                library={library}
                gyms={gyms}
                gymsHref={mode === "client" ? `/dashboard/coach/clients/${clientId}/salles` : programHref.includes("/coach/") ? "/dashboard/coach/exercises?tab=mine" : "/dashboard/client/exercises?tab=mine"}
                intake={intake}
                agendaDays={agendaDays}
                sessionMinutesTarget={sessionMinutesTarget}
                onChange={updateDay}
                onMove={(dir) => moveDay(i, dir)}
                onDuplicate={() => duplicateDay(i)}
                onRemove={() => removeDay(i)}
                onOpenDetails={(rowId) => setDetailsFor({ dayId: d.id, rowId })}
                onSwap={(rowId) => swapRow(d.id, rowId)}
              />
            ))}
            {state.days.length < 7 && (
              <button
                type="button"
                onClick={addDay}
                className="w-full rounded-xl border border-dashed border-(--ep-line)/35 py-3 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-strong) hover:border-(--ep-accent)/50 inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> {tr("Ajouter une séance")}
              </button>
            )}
          </div>
        )}
        <div id="builder-end" />

        {/* Enregistrer comme modèle */}
        {saveAsTemplate && totalExercises > 0 && (
          <div className="mt-4">
            {templateForm ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-(--ep-line)/30 bg-(--ep-s5) p-2.5">
                {templateForm.done ? (
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-green-400">
                    <Check size={13} /> {tr("Modèle enregistré")}
                  </p>
                ) : (
                  <>
                    <input
                      autoFocus
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
                      placeholder={tr("Nom du modèle")}
                      aria-label={tr("Nom du modèle")}
                      className="flex-1 min-w-[180px] bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-md px-2.5 py-1.5 text-[12.5px] text-(--ep-strong) outline-none focus:border-(--ep-accent)/50"
                    />
                    <button type="button" onClick={saveTemplate} disabled={templateForm.busy} className="rounded-md bg-(--ep-accent)/20 border border-(--ep-accent)/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-strong) disabled:opacity-50">
                      {templateForm.busy ? "…" : tr("Enregistrer")}
                    </button>
                    <button type="button" onClick={() => setTemplateForm(null)} aria-label={tr("Annuler")} className="p-1.5 text-(--ep-ink)/40 hover:text-(--ep-strong)">
                      <X size={14} />
                    </button>
                    {templateForm.error && <p className="w-full text-[11.5px] text-red-400">{templateForm.error}</p>}
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTemplateForm({ name: state.name, busy: false, done: false, error: null })}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-strong)"
              >
                <BookmarkPlus size={13} /> {tr("Enregistrer comme modèle réutilisable")}
              </button>
            )}
          </div>
        )}

        {/* Barre d'actions collante */}
        <div className="sticky z-30 mt-5 bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-3">
          {delivered ? (
            <div className="rounded-xl border border-green-500/40 bg-(--ep-okbg)/95 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3 shadow-2xl">
              <span className="inline-flex items-center gap-2 text-[13px] font-bold text-green-300 flex-1 min-w-[200px]">
                <Check size={16} />
                {mode === "client"
                  ? notify
                    ? tr("Programme livré. {name} a reçu une notification.", { name: firstName })
                    : tr("Programme enregistré, sans notification.")
                  : tr("Programme enregistré.")}
              </span>
              <button type="button" onClick={() => setDelivered(false)} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/60 hover:text-(--ep-strong)">
                <PencilLine size={13} /> {tr("Modifier encore")}
              </button>
              <Link href={programHref} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600/70 hover:bg-green-600 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-(--ep-strong)">
                <Eye size={13} /> {tr("Voir le programme")}
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-(--ep-line)/45 bg-(--ep-s5)/95 backdrop-blur px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 shadow-2xl">
              <Link href={backHref} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-strong)">
                <ArrowLeft size={13} /> {tr("Retour")}
              </Link>
              <span className="text-[11px] text-(--ep-ink)/35 flex-1 min-w-[120px]">
                {totalExercises} {tr("exercices")}
                {draftSavedAt && dirty && (
                  <> · {tr("brouillon gardé")} {draftSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
              {mode === "client" && (
                <label className="inline-flex items-center gap-1.5 text-[11.5px] text-(--ep-ink)/65 cursor-pointer select-none">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-(--ep-accent) w-4 h-4" />
                  {tr("Prévenir")} {firstName}
                </label>
              )}
              <button
                type="button"
                onClick={deliver}
                disabled={saving}
                title="Ctrl+S"
                className="inline-flex items-center gap-2 rounded-lg bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-60 px-4 py-2.5 text-[12px] font-black uppercase tracking-widest text-(--ep-strong)"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {mode === "self" ? tr("Enregistrer") : program ? tr("Mettre à jour") : tr("Livrer à {name}", { name: firstName })}
              </button>
              {error && (
                <p className="w-full inline-flex items-center gap-1.5 text-[12px] text-red-400">
                  <AlertCircle size={13} /> {error}
                </p>
              )}
              {planNotes.length > 0 && (
                <ul className="w-full space-y-1 text-[11.5px] text-(--ep-ink)/60">
                  {planNotes.map((n) => (
                    <li key={n}>{tr(n)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fiche client en plein écran sur téléphone */}
      {panel && mobilePanel && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="absolute inset-0 bg-(--ep-shade)/70" onClick={() => setMobilePanel(false)} />
          <div className="relative ml-auto h-full w-[min(92vw,380px)] bg-(--ep-s5) border-l border-(--ep-line)/40 overflow-y-auto p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <button type="button" onClick={() => setMobilePanel(false)} aria-label={tr("Fermer")} className="absolute top-[calc(env(safe-area-inset-top)+8px)] right-3 p-1.5 text-(--ep-ink)/50 hover:text-(--ep-strong)">
              <X size={18} />
            </button>
            {panel}
          </div>
        </div>
      )}

      {detailsRow && detailsFor && (
        <RowDetailsDialog
          row={detailsRow}
          onChange={(patch) => patchRow(detailsFor.dayId, detailsFor.rowId, patch)}
          onClose={() => setDetailsFor(null)}
        />
      )}
    </div>
  );
}

// Détails facultatifs d'une ligne : muscle (pour le volume), direct ou non,
// zone de tension et décisions fines. Jamais imposé à l'ajout.
function RowDetailsDialog({ row, onChange, onClose }: { row: SheetRow; onChange: (p: Partial<SheetRow>) => void; onClose: () => void }) {
  const tr = useT();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const subgroups = row.muscle_group ? MUSCLE_SUBGROUPS[row.muscle_group as MuscleGroup] ?? [] : [];
  const field = "w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 focus:border-(--ep-accent)/50 rounded-md px-2.5 py-1.5 text-[12.5px] text-(--ep-strong) outline-none";
  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center">
      <div className="ep-modal-overlay absolute inset-0 bg-(--ep-shade)/70" onClick={onClose} />
      <div className="ep-modal-panel relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto bg-(--ep-s2) border border-(--ep-line)/40 rounded-t-2xl sm:rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-[14px] font-black text-(--ep-strong)">{row.name || tr("Exercice")}</p>
          <button type="button" onClick={onClose} aria-label={tr("Fermer")} className="text-(--ep-ink)/40 hover:text-(--ep-strong)">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {tr("Muscle")}
            <select value={row.muscle_group} onChange={(e) => onChange({ muscle_group: e.target.value, muscle_subgroup: "" })} className={`${field} mt-1`}>
              <option value="">—</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {tr("Partie")}
            <select value={row.muscle_subgroup} onChange={(e) => onChange({ muscle_subgroup: e.target.value })} disabled={subgroups.length === 0} className={`${field} mt-1 disabled:opacity-40`}>
              <option value="">—</option>
              {subgroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange({ is_direct: v })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11.5px] font-semibold ${row.is_direct === v ? "border-(--ep-accent) bg-(--ep-accent)/15 text-(--ep-strong)" : "border-(--ep-line)/30 text-(--ep-ink)/50"}`}
            >
              {v ? tr("Compte dans le volume") : tr("Travail indirect")}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">{tr("Zone de tension visée")}</p>
        <div className="flex flex-wrap gap-1.5">
          {TENSION_FOCUS_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ tension_focus: row.tension_focus === t ? "" : t })}
              className={`rounded-md border px-2 py-1 text-[11.5px] ${row.tension_focus === t ? "border-(--ep-accent) bg-(--ep-accent)/15 text-(--ep-strong)" : "border-(--ep-line)/30 text-(--ep-ink)/55"}`}
            >
              {TENSION_FOCUS_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2.5">
          {(
            [
              ["rom_notes", tr("Amplitude")],
              ["resistance_notes", tr("Résistance, accessoires")],
              ["availability_notes", tr("Matériel / disponibilité")],
              ["discomfort_notes", tr("Si gêne ou douleur")],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
              {label}
              <input value={row[k]} onChange={(e) => onChange({ [k]: e.target.value } as Partial<SheetRow>)} className={`${field} mt-1 normal-case tracking-normal font-normal`} />
            </label>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-lg bg-(--ep-accent) hover:bg-(--ep-accent-2) py-2.5 text-[12px] font-black uppercase tracking-widest text-(--ep-strong)">
          {tr("OK")}
        </button>
      </div>
    </div>
  );
}
