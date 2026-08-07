"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";
import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, VOLUME_LANDMARKS, type MuscleGroup } from "@/lib/volume-data";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { ClientIntake } from "@/utils/client-intake";
import {
  LIBRARY_MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  DIFFICULTY_LABELS,
  CATEGORY_LABELS,
  getEquipmentType,
  type EquipmentType,
} from "@/lib/exercise-library-content";
import {
  checkExerciseConflicts,
  conflictSourceLabel,
  generateProgramDraft,
  findSwapCandidate,
  type ExerciseConflict,
} from "@/lib/plan-generator";
import type { ProgramTemplateWithDays, ProgramTemplateInput } from "@/utils/program-templates";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Copy,
  Search,
  SlidersHorizontal,
  Wand2,
  LayoutTemplate,
  BookmarkPlus,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { updateExercise } from "@/app/dashboard/client/exercises/actions";
import ExerciseDetailPanel from "./ExerciseDetailPanel";

export interface ExerciseRow {
  localId: string;
  name: string;
  sets: string;
  reps: string;
  rir: string;
  rest_seconds: string;
  notes: string;
  muscle_group: string;
  muscle_subgroup: string;
  is_direct: string; // "true" | "false"
}

export interface DayRow {
  localId: string;
  day_label: string;
  exercises: ExerciseRow[];
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Reprend les séries/reps/RIR/repos du dernier exercice du jour par défaut
// (le plus souvent identiques d'un exercice à l'autre dans une séance) —
// avant, chaque nouvel exercice repartait de zéro, avec 4 champs à
// re-remplir même quand le schéma ne changeait pas.
export function emptyExercise(prefillFrom?: ExerciseRow): ExerciseRow {
  return {
    localId: uid(),
    name: "",
    sets: prefillFrom?.sets ?? "",
    reps: prefillFrom?.reps ?? "",
    rir: prefillFrom?.rir ?? "",
    rest_seconds: prefillFrom?.rest_seconds ?? "",
    notes: "",
    muscle_group: "",
    muscle_subgroup: "",
    is_direct: "true",
  };
}

export const SPLIT_TYPES = ["PPL", "Upper/Lower", "Full Body", "Custom"] as const;

// Génère les séances vides d'un split donné — la phase de structure se
// décide avant de remplir le moindre exercice. Partagé avec l'éditeur de
// modèles (ProgramTemplateEditor) : même raisonnement de conception, qu'on
// travaille sur un modèle réutilisable ou directement sur un client.
export function scaffoldDays(type: string, frequencyRaw: string): DayRow[] {
  const frequency = Math.max(1, Math.min(7, parseInt(frequencyRaw) || 3));
  let labels: string[];
  if (type === "PPL") {
    const cycle = ["Push", "Pull", "Legs"];
    labels = Array.from({ length: frequency }, (_, i) => cycle[i % 3]);
  } else if (type === "Upper/Lower") {
    const cycle = ["Upper", "Lower"];
    labels = Array.from({ length: frequency }, (_, i) => cycle[i % 2]);
  } else if (type === "Full Body") {
    labels = Array.from({ length: frequency }, (_, i) => `Full Body ${String.fromCharCode(65 + i)}`);
  } else {
    labels = Array.from({ length: frequency }, (_, i) => `Séance ${String.fromCharCode(65 + i)}`);
  }
  // Une même étiquette répétée dans la semaine (Push x2 en PPL 6x) devient
  // "Push 1" / "Push 2" pour rester lisible dans la liste des séances.
  const seen: Record<string, number> = {};
  const totalByLabel: Record<string, number> = {};
  for (const l of labels) totalByLabel[l] = (totalByLabel[l] ?? 0) + 1;
  const finalLabels = labels.map((l) => {
    seen[l] = (seen[l] ?? 0) + 1;
    return totalByLabel[l] > 1 ? `${l} ${seen[l]}` : l;
  });
  return finalLabels.map((label) => ({ localId: uid(), day_label: label, exercises: [] }));
}

// ── Vérification volume hebdomadaire ────────────────────────────────────────
// MEV/MAV/MRV (lib/volume-data.ts) existaient déjà en base de code mais
// n'étaient utilisés nulle part — un vrai repère scientifique (Renaissance
// Periodization) pour juger un programme construit, pas juste "on a mis des
// exercices puis on a sauvegardé". Ne compte que le travail direct
// (is_direct) : le travail indirect (ex. les épaules sollicitées par le
// développé couché) n'est volontairement pas crédité au groupe, cohérent
// avec la méthodologie MEV/MAV/MRV qui compte les séries directes.
function computeWeeklyVolume(days: DayRow[]): Record<string, number> {
  const volume: Record<string, number> = {};
  for (const day of days) {
    for (const ex of day.exercises) {
      if (ex.is_direct !== "true" || !ex.muscle_group) continue;
      const sets = parseInt(ex.sets, 10);
      if (!sets || sets <= 0) continue;
      volume[ex.muscle_group] = (volume[ex.muscle_group] ?? 0) + sets;
    }
  }
  return volume;
}

function volumeStatus(sets: number, mev: number, mav: number, mrv: number): { label: string; color: string } {
  if (sets < mev) return { label: "Insuffisant", color: "#f87171" };
  if (sets <= mav) return { label: "Optimal", color: "#4ade80" };
  if (sets <= mrv) return { label: "Élevé, gérable", color: "#fbbf24" };
  return { label: "Excessif", color: "#f87171" };
}

function VolumeReviewPanel({ days }: { days: DayRow[] }) {
  const volume = computeWeeklyVolume(days);
  const trainedGroups = MUSCLE_GROUPS.filter((g) => (volume[g] ?? 0) > 0);
  if (trainedGroups.length === 0) return null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1">
        Vérification du volume hebdomadaire
      </p>
      <p className="text-[10.5px] text-[#F5EDED]/30 mb-3 leading-relaxed">
        Séries directes uniquement (le travail indirect n&apos;est pas compté ici) par groupe musculaire sur la
        semaine, comparées aux repères MEV/MAV/MRV (Renaissance Periodization). Le volume a un effet réel sur
        l&apos;hypertrophie mais avec des rendements décroissants au-delà d&apos;un certain seuil — la
        distinction séries directes/indirectes compte pour prédire l&apos;effet réel d&apos;un programme
        (
        <a href="https://doi.org/10.1007/s40279-025-02344-w" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#F5EDED]/50">
          Pelland et al., Sports Med 2025
        </a>
        ). Un repère, pas une vérité absolue : le niveau, la récupération et l&apos;historique du client
        comptent aussi.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {trainedGroups.map((group) => {
          const sets = volume[group] ?? 0;
          const landmark = VOLUME_LANDMARKS[group];
          if (!landmark) return null;
          const status = volumeStatus(sets, landmark.mev, landmark.mav, landmark.mrv);
          return (
            <div key={group} className="flex items-center justify-between gap-2 bg-[#150000] rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{group}</p>
                <p className="text-[9.5px] text-[#F5EDED]/30">
                  MEV {landmark.mev} · MAV {landmark.mav} · MRV {landmark.mrv}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black" style={{ color: status.color }}>{sets}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: status.color }}>
                  {status.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Checklist de conception ─────────────────────────────────────────────────
// Pas un score, pas un blocage — des questions à se poser réellement pendant
// la conception, que rien d'automatique ne peut trancher à la place du
// coach (affluence de la salle à l'heure du client, tolérance réelle à
// l'inconfort, pertinence d'un mouvement complexe pour CE client précis...).
// "L'exercice le plus optimal sur le papier n'est pas forcément le plus
// optimal pour ce client" — le principe qui sous-tend toute cette page.
const CHECKLIST_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Le client, pas la théorie",
    items: [
      "Peut-il réaliser ce mouvement sans douleur ni compensation visible, aujourd'hui, pas dans un monde idéal ?",
      "L'exercice le plus optimal sur le papier n'est pas forcément le plus optimal pour lui : un choix plus simple mais bien exécuté vaut souvent mieux.",
      "À partir de combien de séries ce mouvement devient inconfortable vu son intensité actuelle (fatigue articulaire, essoufflement) ?",
      "A-t-il le niveau technique pour le charger sérieusement, ou faut-il d'abord du rodage à charge légère ?",
    ],
  },
  {
    title: "Le contexte réel d'entraînement",
    items: [
      "Le matériel est-il vraiment disponible chez lui (voir « Lieu d'entraînement » dans la fiche client) ?",
      "À l'heure où il s'entraîne, cet équipement est-il généralement libre, ou faut-il prévoir un remplaçant si la salle est bondée ?",
      "Le temps d'installation de l'exercice est-il compatible avec le nombre d'exercices prévus dans la séance ?",
      "Des accessoires (sangles, cuffs, élastique d'appoint) sont-ils nécessaires, disponibles, et notés quelque part ?",
    ],
  },
  {
    title: "L'exercice lui-même",
    items: [
      "Position de l'effort dans l'amplitude (étirée/raccourcie/complète) : cohérente avec l'objectif ? Voir la fiche détaillée de l'exercice pour les repères récents.",
      "Le geste est-il standardisable d'une séance à l'autre pour ce client, ou la charge notée ne voudra rien dire ?",
      "Une machine ou un poste précis a-t-il une limite connue (amplitude coupée, tension nulle en haut/bas) nécessitant une adaptation ?",
      "Beaucoup de volume sur ce mouvement précis apporte-t-il vraiment plus, ou la fatigue dépasse le bénéfice pour ce groupe musculaire ?",
    ],
  },
];

function DesignChecklist() {
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));
  function toggle(i: number) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Checklist de conception
      </p>
      <p className="text-[10.5px] text-[#F5EDED]/30 mb-3 leading-relaxed">
        Rien d&apos;automatique ne peut répondre à ça à ta place — des questions à se reposer à chaque
        exercice ou presque, pas une case à cocher une fois pour toutes.
      </p>
      <div className="space-y-2">
        {CHECKLIST_GROUPS.map((group, i) => (
          <div key={group.title} className="border border-[#890404]/20 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#150000] text-left"
            >
              <span className="text-xs font-bold text-white">{group.title}</span>
              {openGroups.has(i) ? <ChevronLeft size={13} className="text-[#F5EDED]/30 rotate-90" /> : <ChevronRight size={13} className="text-[#F5EDED]/30" />}
            </button>
            {openGroups.has(i) && (
              <ul className="p-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="text-[11px] text-[#F5EDED]/55 leading-relaxed flex gap-2">
                    <span className="text-[#E01E1E] flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function initFromProgram(program: ProgramWithDays | null) {
  if (!program) {
    return {
      name: "Programme",
      type: "Custom",
      frequency: "",
      objective: "",
      coach_notes: "",
      days: [] as DayRow[],
    };
  }
  return {
    name: program.name,
    type: program.type ?? "Custom",
    frequency: program.frequency != null ? String(program.frequency) : "",
    objective: program.objective ?? "",
    coach_notes: program.coach_notes ?? "",
    days: program.days.map((d) => ({
      localId: uid(),
      day_label: d.day_label,
      exercises: d.exercises.map((e) => ({
        localId: uid(),
        name: e.name,
        sets: e.sets != null ? String(e.sets) : "",
        reps: e.reps ?? "",
        rir: e.rir != null ? String(e.rir) : "",
        rest_seconds: e.rest_seconds != null ? String(e.rest_seconds) : "",
        notes: e.notes ?? "",
        muscle_group: e.muscle_group ?? "",
        muscle_subgroup: e.muscle_subgroup ?? "",
        is_direct: e.is_direct !== false ? "true" : "false",
      })),
    })),
  };
}

export const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Champ nom d'exercice avec recherche dans la bibliothèque — un choix
// remplit aussi groupe/sous-groupe musculaire d'un coup. Reste un champ
// texte libre : taper sans rien sélectionner marche toujours (exercice
// hors catalogue). Exporté pour être réutilisé par ProgramTemplateEditor
// (espace de conception coach, structure identique sans client précis).
export function ExerciseNameField({
  value,
  library,
  intake,
  customConstraints,
  onChange,
  onPick,
  onEnter,
}: {
  value: string;
  library: LibraryExercise[];
  intake: ClientIntake | null;
  customConstraints: string;
  onChange: (v: string) => void;
  onPick: (lib: LibraryExercise) => void;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterEquipment, setFilterEquipment] = useState<EquipmentType | "">("");
  const [pendingPick, setPendingPick] = useState<{ lib: LibraryExercise; conflicts: ExerciseConflict[] } | null>(null);
  const [detailFor, setDetailFor] = useState<LibraryExercise | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowFilters(false);
        setPendingPick(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function attemptPick(lib: LibraryExercise) {
    const conflicts = checkExerciseConflicts(lib, intake, customConstraints);
    if (conflicts.length === 0) {
      onPick(lib);
      setOpen(false);
      setShowFilters(false);
    } else {
      setPendingPick({ lib, conflicts });
    }
  }

  const hasActiveFilters = !!filterGroup || !!filterEquipment;
  const q = value.trim().toLowerCase();

  // Sans filtre actif, il faut taper au moins 2 caractères (comme avant) —
  // avec un filtre (muscle/matériel), la liste se parcourt même sans texte.
  const matches =
    q.length >= 2 || hasActiveFilters
      ? library
          .filter((l) => !q || l.name.toLowerCase().includes(q))
          .filter((l) => !filterGroup || l.muscle_group === filterGroup)
          .filter((l) => !filterEquipment || getEquipmentType(l.equipment) === filterEquipment)
          .slice(0, 20)
      : [];

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setOpen(false); onEnter?.(); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Exercice (recherche...)"
          className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-[#F5EDED]/25 focus:outline-none border-b border-transparent focus:border-[#F5EDED]/20 pb-0.5 min-w-0"
        />
        <button
          type="button"
          onClick={() => { setOpen(true); setShowFilters((v) => !v); }}
          title="Filtrer par muscle / matériel"
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            hasActiveFilters ? "text-[#E01E1E]" : "text-[#F5EDED]/20 hover:text-[#F5EDED]/50"
          }`}
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {open && pendingPick && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#1a0000] border border-amber-500/40 rounded-lg shadow-xl p-3">
          <p className="text-xs font-bold text-white mb-1.5">{pendingPick.lib.name}</p>
          <div className="space-y-1 mb-3">
            {pendingPick.conflicts.map((c, i) => (
              <p key={i} className="text-[10px] text-amber-300/90 flex items-start gap-1.5">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                <span><strong>{conflictSourceLabel(c.source)}</strong> : correspond à « {c.keyword} »</span>
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onPick(pendingPick.lib); setPendingPick(null); setOpen(false); setShowFilters(false); }}
              className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 rounded-lg transition-colors"
            >
              Ajouter quand même
            </button>
            <button
              type="button"
              onClick={() => setPendingPick(null)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {open && !pendingPick && (showFilters || hasActiveFilters) && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl p-2 flex gap-1.5">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="flex-1 min-w-0 bg-[#150000] border border-[#890404]/30 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none"
          >
            <option value="">Tout muscle</option>
            {LIBRARY_MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value as EquipmentType | "")}
            className="flex-1 min-w-0 bg-[#150000] border border-[#890404]/30 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none"
          >
            <option value="">Tout matériel</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>{EQUIPMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {open && !pendingPick && matches.length > 0 && (
        <div
          className={`absolute z-20 left-0 right-0 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl max-h-64 overflow-y-auto ${
            showFilters || hasActiveFilters ? "top-[calc(100%+38px)]" : "top-full mt-1"
          }`}
        >
          {matches.map((lib) => {
            const conflicts = checkExerciseConflicts(lib, intake, customConstraints);
            return (
              <div
                key={lib.id}
                className="flex items-stretch gap-1 border-b border-[#890404]/10 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => attemptPick(lib)}
                  className="flex-1 min-w-0 text-left px-3 py-2 text-xs text-[#F5EDED]/80 hover:bg-[#890404]/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{lib.name}</span>
                    <span className="text-[9px] text-[#F5EDED]/30 flex-shrink-0">{lib.muscle_group}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {conflicts.length > 0 && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center gap-0.5">
                        <AlertCircle size={9} /> à vérifier
                      </span>
                    )}
                    {lib.category && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/40">
                        {CATEGORY_LABELS[lib.category]}
                      </span>
                    )}
                    {lib.difficulty && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                        lib.difficulty === "avance"
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          : "bg-[#150000] border-[#890404]/20 text-[#F5EDED]/40"
                      }`}>
                        {DIFFICULTY_LABELS[lib.difficulty]}
                      </span>
                    )}
                    {lib.equipment && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/20 text-[#F5EDED]/40">
                        {lib.equipment}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFor(lib)}
                  title="Fiche exercice détaillée"
                  className="flex-shrink-0 px-2 flex items-center justify-center text-[#F5EDED]/25 hover:text-[#E01E1E] hover:bg-[#890404]/20 transition-colors"
                >
                  <Info size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {open && !pendingPick && q.length >= 2 && !hasActiveFilters && matches.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a0000] border border-[#890404]/40 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
          <Search size={11} className="text-[#F5EDED]/20 flex-shrink-0" />
          <span className="text-[10px] text-[#F5EDED]/30">Aucun résultat, nom libre conservé</span>
        </div>
      )}
      {detailFor && (
        <ExerciseDetailPanel exercise={detailFor} onUpdate={updateExercise} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
}

export default function ProgramEditor({
  clientId,
  program,
  saveProgram,
  successRedirect,
  intake = null,
  templates = [],
  saveAsTemplate,
  templatesHref,
  subjectLabel = "ce client",
}: {
  clientId: string;
  program: ProgramWithDays | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
  successRedirect?: string;
  /** Fiche client — sert à vérifier chaque exercice ajouté (blessures, exercices/matériel problématiques). */
  intake?: ClientIntake | null;
  /**
   * Bibliothèque de modèles du coach. Fournie, elle sert de point de départ :
   * on charge la structure d'un modèle dans l'éditeur et on la personnalise
   * immédiatement pour ce client, sans aller-retour par la page Programmation
   * et sans jamais toucher au modèle d'origine.
   */
  templates?: ProgramTemplateWithDays[];
  /** Fournie, ajoute le chemin inverse : capitaliser ce travail sur mesure en modèle réutilisable. */
  saveAsTemplate?: (input: ProgramTemplateInput) => Promise<{ id?: string; error?: string }>;
  /** Lien vers la bibliothèque complète (gestion des modèles). */
  templatesHref?: string;
  /** Pour qui on conçoit — utilisé dans les textes ("ce client", "moi"). */
  subjectLabel?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initFromProgram(program));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Point de départ : replié d'entrée quand le client a déjà un programme
  // (on vient surtout retoucher), déplié quand la page est vide.
  const [showStartingPoint, setShowStartingPoint] = useState(() => (program?.days.length ?? 0) === 0);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);

  // Enregistrement du travail en cours comme modèle réutilisable.
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Contraintes ajoutées à la volée par le coach quand la fiche client est
  // incomplète — croisées avec chaque exercice au même titre que les
  // blessures/exercices problématiques déclarés dans la fiche. Propre à
  // cette session d'édition, pas persisté.
  const [customConstraints, setCustomConstraints] = useState("");

  // Fiche détaillée (repères de sélection + notes d'adaptation) ouverte
  // depuis un exercice déjà posé dans un jour, pas seulement depuis le picker.
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);

  // Bibliothèque d'exercices — sert le picker avec recherche (nom exact +
  // groupe/sous-groupe musculaire auto-remplis en un choix, au lieu de
  // taper le nom puis sélectionner les 2 menus déroulants séparément).
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  useEffect(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.exercises ?? []))
      .catch(() => {});
  }, []);

  // ── Program meta ────────────────────────────────────────────────────────────

  function updateMeta(
    field: "name" | "type" | "frequency" | "objective" | "coach_notes",
    value: string
  ) {
    setState((s) => ({ ...s, [field]: value }));
  }

  // Génère les séances vides du split choisi — la structure d'abord, les
  // exercices ensuite.
  function applyScaffold() {
    // Le confirm reste hors du updater de setState : un updater peut être
    // rejoué par React, et la question serait alors posée deux fois.
    if (
      state.days.length > 0 &&
      !confirm("Regénérer les séances va remplacer la structure actuelle et ses exercices. Continuer ?")
    ) {
      return;
    }
    setState((s) => ({ ...s, days: scaffoldDays(s.type, s.frequency) }));
    setLoadedTemplateName(null);
  }

  // Génère un brouillon complet (jours + exercices + séries/reps/repos par
  // défaut) directement dans l'éditeur — pas une liste de pistes à part à
  // retranscrire à la main, un vrai point de départ déjà éditable ici. Rien
  // n'est enregistré tant que le coach ne clique pas sur Enregistrer.
  function generateDraft() {
    if (
      state.days.length > 0 &&
      !confirm("Générer un brouillon va remplacer la structure et les exercices actuels de l'éditeur. Continuer ?")
    ) {
      return;
    }
    const sessionsPerWeek = Math.max(2, Math.min(6, parseInt(state.frequency, 10) || 4));
    const draft = generateProgramDraft(
      sessionsPerWeek,
      library,
      intake?.disliked_equipment ?? null,
      intake?.exercises_problematic ?? null,
      intake?.training_access ?? null
    );
    setState((s) => ({
      ...s,
      frequency: String(sessionsPerWeek),
      days: draft.map((d) => ({
        localId: uid(),
        day_label: d.dayLabel,
        exercises: d.exercises.map((ex) => ({
          localId: uid(),
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rir: ex.rir,
          rest_seconds: ex.rest_seconds,
          notes: "",
          muscle_group: ex.muscle_group,
          muscle_subgroup: ex.muscle_subgroup ?? "",
          is_direct: ex.is_direct ? "true" : "false",
        })),
      })),
    }));
    setLoadedTemplateName(null);
  }

  // Remplace un exercice par le candidat suivant du même groupe/catégorie —
  // pour itérer exercice par exercice sans tout régénérer. Cherche la
  // catégorie dans la bibliothèque à partir du nom actuel (pas stockée sur
  // la ligne elle-même) ; si l'exercice est hors bibliothèque (nom tapé à
  // la main) ou qu'aucune alternative n'existe, ne fait rien.
  function swapExercise(dayLocalId: string, exerciseLocalId: string) {
    const day = state.days.find((d) => d.localId === dayLocalId);
    const row = day?.exercises.find((e) => e.localId === exerciseLocalId);
    if (!day || !row) return;
    const current = library.find((l) => l.name === row.name);
    if (!current || !current.category) return;

    const namesInDay = day.exercises.map((e) => e.name);
    const next = findSwapCandidate(
      { muscle_group: current.muscle_group, category: current.category },
      library,
      intake?.disliked_equipment ?? null,
      intake?.exercises_problematic ?? null,
      intake?.training_access ?? null,
      namesInDay
    );
    if (!next) return;

    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId !== dayLocalId
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId !== exerciseLocalId
                  ? e
                  : { ...e, name: next.name, muscle_group: next.muscle_group, muscle_subgroup: next.muscle_subgroup ?? "" }
              ),
            }
      ),
    }));
  }

  function canSwap(exerciseName: string): boolean {
    const lib = library.find((l) => l.name === exerciseName);
    return !!lib?.category;
  }

  // Charge un modèle de la bibliothèque dans l'éditeur. Copie en mémoire :
  // tout est modifiable dans la foulée pour ce client précis, et le modèle
  // d'origine n'est jamais touché.
  function loadTemplate(template: ProgramTemplateWithDays) {
    if (
      state.days.length > 0 &&
      !confirm(
        `Charger « ${template.name} » va remplacer la structure en cours d'édition. Le programme déjà enregistré n'est modifié qu'au moment où tu sauvegardes. Continuer ?`
      )
    ) {
      return;
    }
    setState((s) => ({
      // Le nom du programme du client reste celui déjà choisi s'il en a un,
      // sinon on part de celui du modèle.
      name: s.name && s.name !== "Programme" ? s.name : template.name,
      type: template.type ?? "Custom",
      frequency: template.frequency != null ? String(template.frequency) : s.frequency,
      objective: template.objective ?? s.objective,
      coach_notes: template.notes ?? s.coach_notes,
      days: template.days.map((d) => ({
        localId: uid(),
        day_label: d.day_label,
        exercises: d.exercises.map((e) => ({
          localId: uid(),
          name: e.name,
          sets: e.sets != null ? String(e.sets) : "",
          reps: e.reps ?? "",
          rir: e.rir != null ? String(e.rir) : "",
          rest_seconds: e.rest_seconds != null ? String(e.rest_seconds) : "",
          notes: e.notes ?? "",
          muscle_group: e.muscle_group ?? "",
          muscle_subgroup: e.muscle_subgroup ?? "",
          is_direct: e.is_direct !== false ? "true" : "false",
        })),
      })),
    }));
    setLoadedTemplateName(template.name);
    setShowStartingPoint(false);
  }

  // ── Day operations ───────────────────────────────────────────────────────────

  function addDay() {
    const letter = String.fromCharCode(65 + state.days.length); // A, B, C…
    setState((s) => ({
      ...s,
      days: [
        ...s.days,
        { localId: uid(), day_label: `Séance ${letter}`, exercises: [] },
      ],
    }));
  }

  function removeDay(dayId: string) {
    setState((s) => ({ ...s, days: s.days.filter((d) => d.localId !== dayId) }));
  }

  function updateDayLabel(dayId: string, label: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId ? { ...d, day_label: label } : d
      ),
    }));
  }

  function moveDay(dayId: string, dir: -1 | 1) {
    setState((s) => {
      const idx = s.days.findIndex((d) => d.localId === dayId);
      if (idx < 0) return s;
      const next = idx + dir;
      if (next < 0 || next >= s.days.length) return s;
      const days = [...s.days];
      [days[idx], days[next]] = [days[next], days[idx]];
      return { ...s, days };
    });
  }

  // ── Exercise operations ──────────────────────────────────────────────────────

  function addExercise(dayId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: [...d.exercises, emptyExercise(d.exercises[d.exercises.length - 1])] }
          : d
      ),
    }));
  }

  // Duplique un jour entier (avec tous ses exercices) — pour les
  // programmes qui répètent le même schéma plusieurs fois par semaine
  // (Push/Pull/Legs x2, etc.), au lieu de tout retaper à l'identique.
  function duplicateDay(dayId: string) {
    setState((s) => {
      const source = s.days.find((d) => d.localId === dayId);
      if (!source) return s;
      const idx = s.days.findIndex((d) => d.localId === dayId);
      const copy: DayRow = {
        localId: uid(),
        day_label: `${source.day_label} (copie)`,
        exercises: source.exercises.map((e) => ({ ...e, localId: uid() })),
      };
      const days = [...s.days];
      days.splice(idx + 1, 0, copy);
      return { ...s, days };
    });
  }

  function removeExercise(dayId: string, exId: string) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.localId !== exId) }
          : d
      ),
    }));
  }

  function updateExercise(
    dayId: string,
    exId: string,
    field: keyof ExerciseRow,
    value: string
  ) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId ? { ...e, [field]: value } : e
              ),
            }
          : d
      ),
    }));
  }

  // Sélection depuis la bibliothèque : nom + groupe + sous-groupe en un
  // seul geste plutôt que 3 champs séparés à remplir un par un.
  function pickLibraryExercise(dayId: string, exId: string, lib: LibraryExercise) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId
                  ? {
                      ...e,
                      name: lib.name,
                      muscle_group: MUSCLE_GROUPS.includes(lib.muscle_group as MuscleGroup) ? lib.muscle_group : "",
                      muscle_subgroup: lib.muscle_subgroup ?? "",
                    }
                  : e
              ),
            }
          : d
      ),
    }));
  }

  function updateExerciseMuscleGroup(
    dayId: string,
    exId: string,
    value: string
  ) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) =>
        d.localId === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.localId === exId
                  ? { ...e, muscle_group: value, muscle_subgroup: "" }
                  : e
              ),
            }
          : d
      ),
    }));
  }

  function moveExercise(dayId: string, exId: string, dir: -1 | 1) {
    setState((s) => ({
      ...s,
      days: s.days.map((d) => {
        if (d.localId !== dayId) return d;
        const idx = d.exercises.findIndex((e) => e.localId === exId);
        if (idx < 0) return d;
        const next = idx + dir;
        if (next < 0 || next >= d.exercises.length) return d;
        const exercises = [...d.exercises];
        [exercises[idx], exercises[next]] = [exercises[next], exercises[idx]];
        return { ...d, exercises };
      }),
    }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function buildDays() {
    return state.days.map((d) => ({
      day_label: d.day_label || "Séance",
      exercises: d.exercises
        .filter((e) => e.name.trim() !== "")
        .map((e) => ({
          name: e.name.trim(),
          sets: e.sets ? parseInt(e.sets) : null,
          reps: e.reps.trim() || null,
          rir: e.rir !== "" ? parseInt(e.rir) : null,
          rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
          notes: e.notes.trim() || null,
          muscle_group: e.muscle_group || null,
          muscle_subgroup: e.muscle_subgroup || null,
          is_direct: e.is_direct !== "false",
        })),
    }));
  }

  // Capitalise le travail sur mesure : la structure conçue pour ce client
  // devient un modèle réutilisable, sans quitter sa fiche.
  async function handleSaveAsTemplate() {
    if (!saveAsTemplate) return;
    const name = templateName.trim() || state.name.trim();
    if (!name) {
      setTemplateError("Donne un nom au modèle.");
      return;
    }
    if (state.days.length === 0) {
      setTemplateError("Il n'y a aucune séance à enregistrer.");
      return;
    }
    setTemplateError(null);
    setTemplateBusy(true);
    const result = await saveAsTemplate({
      name,
      type: state.type || null,
      frequency: state.frequency ? parseInt(state.frequency) : null,
      objective: state.objective.trim() || null,
      notes: state.coach_notes.trim() || null,
      days: buildDays(),
    });
    setTemplateBusy(false);
    if (result.error) {
      setTemplateError(result.error);
      return;
    }
    setTemplateSaved(true);
    setTemplateFormOpen(false);
    setTimeout(() => setTemplateSaved(false), 4000);
  }

  async function handleSave() {
    if (!state.name.trim()) {
      setError("Le nom du programme est requis.");
      return;
    }

    const input: ProgramInput = {
      name: state.name.trim(),
      type: state.type || null,
      frequency: state.frequency ? parseInt(state.frequency) : null,
      objective: state.objective.trim() || null,
      coach_notes: state.coach_notes.trim() || null,
      days: buildDays(),
    };

    setError(null);
    setSaving(true);

    const result = await saveProgram(clientId, input);

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => {
        router.push(successRedirect ?? `/dashboard/coach/clients/${clientId}/program`);
        router.refresh();
      }, 700);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── 0. Point de départ ────────────────────────────────────────────── */}
      {(templates.length > 0 || templatesHref) && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              Point de départ <span className="text-[#F5EDED]/20 font-normal normal-case tracking-normal">(optionnel)</span>
            </p>
            {templates.length > 0 && (
              <button
                onClick={() => setShowStartingPoint((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors flex-shrink-0"
              >
                {showStartingPoint ? "Masquer" : `Voir mes ${templates.length} modèle${templates.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#F5EDED]/30 leading-relaxed">
            Pars d&apos;un de tes modèles et personnalise le à la volée pour {subjectLabel}, ou conçois tout sur
            mesure ci dessous. Charger un modèle ne le modifie jamais, c&apos;est une copie de travail.
          </p>

          {loadedTemplateName && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] bg-[#E01E1E]/10 border border-[#E01E1E]/30 rounded-lg px-3 py-1.5">
              <Check size={11} />
              Chargé depuis « {loadedTemplateName} », personnalise librement
            </p>
          )}

          {showStartingPoint && templates.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templates.map((t) => {
                const exerciseCount = t.days.reduce((acc, d) => acc + d.exercises.length, 0);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className="text-left bg-[#150000] border border-[#890404]/25 hover:border-[#E01E1E]/45 rounded-xl px-4 py-3 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                      {t.type && (
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1f0101] border border-[#890404]/25 text-[#F5EDED]/40">
                          {t.type}
                        </span>
                      )}
                    </div>
                    {t.objective && <p className="text-[11px] text-[#F5EDED]/40 mt-1">{t.objective}</p>}
                    <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
                      {t.days.length} séance{t.days.length !== 1 ? "s" : ""} · {exerciseCount} exercice
                      {exerciseCount !== 1 ? "s" : ""}
                      {t.frequency ? ` · ${t.frequency}×/semaine` : ""}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 group-hover:text-[#E01E1E] transition-colors">
                      <LayoutTemplate size={11} />
                      Charger et personnaliser
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {templatesHref && (
            <Link
              href={templatesHref}
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
            >
              <ExternalLink size={11} />
              Gérer la bibliothèque de modèles
            </Link>
          )}
        </div>
      )}

      {/* ── 1. Structure ──────────────────────────────────────────────────── */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          1. Structure du programme
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Nom du programme
            </label>
            <input
              value={state.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="Ex. PPL : Hypertrophie"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Split
            </label>
            <select
              value={state.type}
              onChange={(e) => updateMeta("type", e.target.value)}
              className={inputCls}
            >
              {SPLIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Fréquence (séances/semaine)
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={state.frequency}
              onChange={(e) => updateMeta("frequency", e.target.value)}
              placeholder="Ex. 4"
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Objectif de phase
          </label>
          <input
            value={state.objective}
            onChange={(e) => updateMeta("objective", e.target.value)}
            placeholder="Ex. Hypertrophie haut du corps, 8 semaines avant la prépa"
            className={inputCls}
          />
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Notes de conception{" "}
            <span className="text-[#F5EDED]/25 font-normal">(pour toi, jamais affichées côté client)</span>
          </label>
          <textarea
            value={state.coach_notes}
            onChange={(e) => updateMeta("coach_notes", e.target.value)}
            rows={2}
            placeholder="Ex. épaule droite sensible, on garde le développé haltères et on surveille le volume vertical…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={applyScaffold}
            className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Wand2 size={13} />
            {state.days.length === 0 ? "Séances vides de cette structure" : "Regénérer les séances vides"}
          </button>
          <button
            onClick={generateDraft}
            disabled={library.length === 0}
            title={library.length === 0 ? "Bibliothèque d'exercices en cours de chargement…" : undefined}
            className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-green-400 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Sparkles size={13} />
            Générer le programme complet
          </button>
        </div>
        <p className="mt-2 text-[10px] text-[#F5EDED]/25 leading-relaxed">
          « Générer le programme complet » choisit un split selon la fréquence (ignore le champ Split
          ci-dessus), un exercice par créneau selon le matériel de {subjectLabel}, et des séries/reps/repos
          par défaut. Un brouillon éditable, rien n&apos;est enregistré tant que tu ne cliques pas sur
          Enregistrer.
        </p>
      </div>

      {/* Vérification exercices — fiche client + contraintes ajoutées à la volée */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Vérification automatique des exercices
        </p>
        {intake && (intake.injuries || intake.exercises_problematic || intake.disliked_equipment) ? (
          <div className="space-y-1.5 mb-3">
            {intake.injuries && (
              <p className="text-[11px] text-[#F5EDED]/50"><strong className="text-[#F5EDED]/75">Blessures/douleurs :</strong> {intake.injuries}</p>
            )}
            {intake.exercises_problematic && (
              <p className="text-[11px] text-[#F5EDED]/50"><strong className="text-[#F5EDED]/75">Exercices problématiques :</strong> {intake.exercises_problematic}</p>
            )}
            {intake.disliked_equipment && (
              <p className="text-[11px] text-[#F5EDED]/50"><strong className="text-[#F5EDED]/75">Matériel détesté :</strong> {intake.disliked_equipment}</p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#F5EDED]/30 italic mb-3">
            Rien de déclaré dans la fiche client sur ce point. Remplis-la ou ajoute une contrainte ci-dessous.
          </p>
        )}
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
          Autres contraintes à vérifier (pas dans la fiche client)
        </label>
        <textarea
          value={customConstraints}
          onChange={(e) => setCustomConstraints(e.target.value)}
          rows={2}
          placeholder="Ex. tendinite épaule droite non notée dans la fiche, évite le rameur…"
          className={`${inputCls} resize-none`}
        />
        <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
          Chaque exercice sélectionné depuis la bibliothèque est comparé à tout ça. En cas de correspondance, une
          confirmation est demandée avant de l&apos;ajouter, jamais un blocage silencieux.
        </p>
      </div>

      <DesignChecklist />

      {/* Days */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 px-1">
        2. Séances &amp; exercices
      </p>
      {state.days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-4">
          <p className="text-xs text-[#F5EDED]/35 font-semibold uppercase tracking-widest">
            Aucune séance
          </p>
          <p className="text-[11px] text-[#F5EDED]/25 max-w-sm text-center">
            Choisis un split et une fréquence ci dessus puis génère les séances, charge un de tes modèles, ou
            ajoute une séance vide directement.
          </p>
          <button
            onClick={addDay}
            className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Ajouter une séance
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <div
              className="flex gap-4"
              style={{
                minWidth: `${Math.max(state.days.length * 296, 296)}px`,
              }}
            >
              {state.days.map((day, dayIdx) => (
                <div
                  key={day.localId}
                  className="w-72 flex-shrink-0 bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-[#890404]/20">
                    <input
                      value={day.day_label}
                      onChange={(e) =>
                        updateDayLabel(day.localId, e.target.value)
                      }
                      className="flex-1 bg-transparent text-xs font-bold uppercase tracking-widest text-[#E01E1E] focus:outline-none border-b border-transparent focus:border-[#E01E1E]/40 pb-0.5 min-w-0"
                    />
                    <button
                      onClick={() => moveDay(day.localId, -1)}
                      disabled={dayIdx === 0}
                      title="Déplacer à gauche"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => moveDay(day.localId, 1)}
                      disabled={dayIdx === state.days.length - 1}
                      title="Déplacer à droite"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 disabled:opacity-20 transition-colors flex-shrink-0"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => duplicateDay(day.localId)}
                      title="Dupliquer cette séance"
                      className="text-[#F5EDED]/30 hover:text-[#F5EDED]/70 transition-colors flex-shrink-0"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => removeDay(day.localId)}
                      title="Supprimer la séance"
                      className="text-[#F5EDED]/25 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Exercises */}
                  <div className="space-y-2 mb-3">
                    {day.exercises.map((ex, exIdx) => (
                      <div
                        key={ex.localId}
                        className="bg-[#150000] border border-[#890404]/20 rounded-lg p-2.5 space-y-2"
                      >
                        {/* Name + controls */}
                        <div className="flex items-center gap-1.5">
                          <ExerciseNameField
                            value={ex.name}
                            library={library}
                            intake={intake}
                            customConstraints={customConstraints}
                            onChange={(v) => updateExercise(day.localId, ex.localId, "name", v)}
                            onPick={(lib) => pickLibraryExercise(day.localId, ex.localId, lib)}
                            onEnter={() => addExercise(day.localId)}
                          />
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() =>
                                moveExercise(day.localId, ex.localId, -1)
                              }
                              disabled={exIdx === 0}
                              title="Monter"
                              className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
                            >
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                                fill="currentColor"
                              >
                                <path d="M5 2 L9 8 L1 8 Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                moveExercise(day.localId, ex.localId, 1)
                              }
                              disabled={exIdx === day.exercises.length - 1}
                              title="Descendre"
                              className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 disabled:opacity-10 transition-colors p-0.5"
                            >
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                                fill="currentColor"
                              >
                                <path d="M5 8 L1 2 L9 2 Z" />
                              </svg>
                            </button>
                            {canSwap(ex.name) && (
                              <button
                                onClick={() => swapExercise(day.localId, ex.localId)}
                                title="Remplacer par un autre exercice du même groupe/catégorie"
                                className="text-[#F5EDED]/25 hover:text-green-400 transition-colors p-0.5 ml-0.5"
                              >
                                <RefreshCw size={11} />
                              </button>
                            )}
                            {(() => {
                              const lib = library.find((l) => l.name === ex.name);
                              if (!lib) return null;
                              return (
                                <button
                                  onClick={() => setDetailExercise(lib)}
                                  title="Fiche exercice détaillée"
                                  className="text-[#F5EDED]/25 hover:text-[#E01E1E] transition-colors p-0.5 ml-0.5"
                                >
                                  <Info size={11} />
                                </button>
                              );
                            })()}
                            <button
                              onClick={() =>
                                removeExercise(day.localId, ex.localId)
                              }
                              title="Supprimer"
                              className="text-[#F5EDED]/25 hover:text-red-500 transition-colors p-0.5 ml-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Sets / Reps / RIR / Rest */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              { field: "sets" as const, label: "Séries", type: "number", placeholder: "4" },
                              { field: "reps" as const, label: "Reps", type: "text", placeholder: "8-12" },
                              { field: "rir" as const, label: "RIR", type: "number", placeholder: "2" },
                              { field: "rest_seconds" as const, label: "Repos s", type: "number", placeholder: "90" },
                            ] as const
                          ).map(({ field, label, type, placeholder }) => (
                            <div key={field}>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-0.5">
                                {label}
                              </label>
                              <input
                                type={type}
                                min={type === "number" ? "0" : undefined}
                                value={ex[field]}
                                onChange={(e) =>
                                  updateExercise(
                                    day.localId,
                                    ex.localId,
                                    field,
                                    e.target.value
                                  )
                                }
                                placeholder={placeholder}
                                className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-xs text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#890404]/50 transition-colors"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Notes */}
                        <input
                          value={ex.notes}
                          onChange={(e) =>
                            updateExercise(
                              day.localId,
                              ex.localId,
                              "notes",
                              e.target.value
                            )
                          }
                          placeholder="Notes (optionnel)"
                          className="w-full bg-transparent text-[10px] text-[#F5EDED]/40 placeholder:text-[#F5EDED]/20 focus:outline-none border-b border-transparent focus:border-[#F5EDED]/10 pb-0.5 transition-colors"
                        />

                        {/* Muscle group + Direct/Indirect */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#890404]/10">
                          <div>
                            <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                              Groupe musculaire
                            </label>
                            <select
                              value={ex.muscle_group}
                              onChange={(e) =>
                                updateExerciseMuscleGroup(day.localId, ex.localId, e.target.value)
                              }
                              className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#890404]/50 transition-colors"
                            >
                              <option value="">Non défini</option>
                              {MUSCLE_GROUPS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                              Type
                            </label>
                            <div className="flex gap-1.5 pt-1">
                              {(["true", "false"] as const).map((val) => (
                                <label key={val} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`is_direct_${ex.localId}`}
                                    value={val}
                                    checked={ex.is_direct === val}
                                    onChange={() =>
                                      updateExercise(day.localId, ex.localId, "is_direct", val)
                                    }
                                    className="sr-only peer"
                                  />
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-[#890404]/20 text-[#F5EDED]/30 peer-checked:border-[#E01E1E]/50 peer-checked:text-[#E01E1E] transition-colors cursor-pointer">
                                    {val === "true" ? "Direct" : "Indirect"}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sous-groupe (chef musculaire) */}
                        {ex.muscle_group &&
                          MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup]?.length > 0 && (
                            <div>
                              <label className="text-[7px] font-bold uppercase tracking-widest text-[#F5EDED]/25 block mb-0.5">
                                Sous-groupe
                              </label>
                              <select
                                value={ex.muscle_subgroup}
                                onChange={(e) =>
                                  updateExercise(
                                    day.localId,
                                    ex.localId,
                                    "muscle_subgroup",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-[#1f0101]/80 border border-[#890404]/20 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#890404]/50 transition-colors"
                              >
                                <option value="">Non défini</option>
                                {MUSCLE_SUBGROUPS[ex.muscle_group as MuscleGroup].map((sg) => (
                                  <option key={sg} value={sg}>{sg}</option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>

                  {/* Add exercise */}
                  <button
                    onClick={() => addExercise(day.localId)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 border border-dashed border-[#890404]/20 hover:border-[#890404]/40 rounded-lg transition-colors"
                  >
                    <Plus size={11} />
                    Exercice
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add day */}
          <button
            onClick={addDay}
            className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Ajouter une séance
          </button>
        </>
      )}

      <VolumeReviewPanel days={state.days} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Enregistrer le travail en cours comme modèle réutilisable */}
      {saveAsTemplate && state.days.length > 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
          {templateSaved ? (
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-green-400">
              <Check size={13} />
              Modèle enregistré dans ta bibliothèque
            </p>
          ) : templateFormOpen ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Nom du modèle
                </label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={state.name || "Ex. PPL Hypertrophie 5x/semaine"}
                  className={inputCls}
                />
              </div>
              {templateError && <p className="text-xs text-red-400">{templateError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setTemplateFormOpen(false); setTemplateError(null); }}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/50 hover:text-[#F5EDED]/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={templateBusy}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 disabled:opacity-50 transition-colors"
                >
                  {templateBusy ? "Enregistrement…" : "Enregistrer le modèle"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-[#F5EDED]/35 leading-relaxed max-w-md">
                Cette structure te resservira ? Enregistre la comme modèle réutilisable, sans quitter cette page.
              </p>
              <button
                onClick={() => { setTemplateName(state.name); setTemplateFormOpen(true); }}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors flex-shrink-0"
              >
                <BookmarkPlus size={12} />
                Enregistrer comme modèle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#890404]/15">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 px-4 py-2.5 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              Sauvegardé
            </>
          ) : saving ? (
            "Sauvegarde…"
          ) : (
            "Sauvegarder"
          )}
        </button>
      </div>

      {detailExercise && (
        <ExerciseDetailPanel exercise={detailExercise} onUpdate={updateExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  );
}
