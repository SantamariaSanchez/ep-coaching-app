"use client";

import { useState, useEffect } from "react";
import { X, Video, ExternalLink, ClipboardCheck, Backpack } from "lucide-react";
import type { LibraryExercise } from "@/utils/exercise-library";
import {
  POSITION_OPTIONS,
  QUALITATIVE_SCALE,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  TENSION_FOCUS_OPTIONS,
  TENSION_FOCUS_LABELS,
} from "@/lib/exercise-library-content";
import type { CreateExerciseInput } from "@/app/dashboard/client/exercises/actions";
import type { TensionFocus } from "@/utils/programs";
import { ACCESSORY_CATALOG } from "@/lib/session-accessories";

// Les 7 attributs de classification existent en base depuis longtemps mais
// n'étaient affichés/éditables que dans la bibliothèque (page à part),
// jamais au moment où ça compte vraiment : en train de choisir un exercice
// pour un programme. Ici ils sont visibles ET modifiables sur place, avec
// une explication de ce que chacun veut dire et pourquoi il compte —
// personne ne devrait avoir à deviner ce que "Stabilité +++" implique.
// Aucune valeur n'est pré-remplie automatiquement (les 642 exercices de la
// bibliothèque n'en ont aucune) : le repère se construit au fil de
// l'usage réel, par le coach qui connaît vraiment le mouvement, plutôt que
// d'être inventé en masse.
//
// Depuis la migration 20260807, ce panneau porte aussi la partie DÉCISION
// (section "assignment" ci-dessous) : ce que le coach choisit pour CET
// exercice DANS CETTE séance précise d'un client précis (tension recherchée,
// accessoires, amplitude réellement visée, disponibilité vérifiée, seuil
// d'inconfort). La classification est une donnée de référence partagée
// entre coachs ; la décision est propre à ce client, à cette place dans le
// programme, et ne se devine pas automatiquement — ça reste à écrire à la
// main à chaque exercice ajouté, pas une fois pour toutes.

type QualKey = "freedom_of_movement" | "easy_to_replicate" | "learning_difficulty" | "stability_demand" | "accessibility";

const QUAL_INFO: Record<QualKey, { label: string; help: string }> = {
  freedom_of_movement: {
    label: "Liberté de mouvement",
    help: "À quel point le geste est guidé (machine, rail) ou libre (barre/haltère au sol). Plus c'est libre, plus ça sollicite la coordination, à surveiller en fin de séance fatiguée.",
  },
  easy_to_replicate: {
    label: "Facile à répliquer",
    help: "À quel point deux séances de cet exercice se ressemblent d'une semaine à l'autre (même profondeur, même trajectoire). Faible reproductibilité = les charges notées d'une semaine à l'autre ne veulent pas dire grand-chose pour juger la progression.",
  },
  learning_difficulty: {
    label: "Difficulté d'apprentissage",
    help: "Temps nécessaire pour maîtriser la technique. Un mouvement difficile à apprendre chez un débutant consomme du temps de coaching et augmente le risque d'erreur sans supervision rapprochée.",
  },
  stability_demand: {
    label: "Exigence de stabilité",
    help: "Charge de travail proprioceptive en plus du travail musculaire ciblé, donc une part du risque de blessure sur ce mouvement précis. Utile pour le transfert vers le sport ou la vie quotidienne, coûteux en fatigue si le volume est élevé.",
  },
  accessibility: {
    label: "Accessibilité du matériel",
    help: "À quel point le matériel nécessaire est courant en salle standard ou possible à la maison. À croiser avec le lieu d'entraînement du client (voir sa fiche) et l'affluence probable à son horaire habituel.",
  },
};

const POSITION_HELP =
  "Où l'effort est le plus grand dans l'amplitude du mouvement, le repère par défaut de cet exercice, pas ce qui est visé pour un client précis (ça se décide plus bas). D'après plusieurs études récentes, travailler en position étirée produit une hypertrophie égale ou supérieure au ROM complet pour la plupart des mouvements.";
const POSITION_SOURCES = [
  { label: "McMahon et al., J Strength Cond Res 2026", href: "https://doi.org/10.1519/JSC.0000000000005561" },
  { label: "Wolf et al., Sports Med Health Sci 2025 (revue)", href: "https://doi.org/10.1016/j.smhs.2025.03.001" },
  { label: "Wolf et al., PeerJ 2025", href: "https://doi.org/10.7717/peerj.18904" },
];

function Pills<T extends string>({
  options,
  value,
  onChange,
  disabled,
  labels,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  labels?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors disabled:opacity-50 disabled:cursor-default ${
            value === opt
              ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
              : "border-[#890404]/25 text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          }`}
        >
          {labels ? labels[opt] : opt}
        </button>
      ))}
    </div>
  );
}

// Sélection multiple (le bagage d'accessoires n'est jamais un choix
// exclusif — un exercice peut avoir besoin de plusieurs accessoires à la
// fois, ex. Lock Belt ET Micro Plates sur un développé machine).
function MultiPills({
  options,
  value,
  onToggle,
  disabled,
}: {
  options: readonly string[];
  value: string[];
  onToggle: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors disabled:opacity-50 disabled:cursor-default ${
              active
                ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                : "border-[#890404]/25 text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export interface AssignmentDecisions {
  tension_focus: TensionFocus | "";
  resistance_notes: string;
  rom_notes: string;
  availability_notes: string;
  discomfort_notes: string;
}

export const EMPTY_ASSIGNMENT: AssignmentDecisions = {
  tension_focus: "",
  resistance_notes: "",
  rom_notes: "",
  availability_notes: "",
  discomfort_notes: "",
};

// Une décision compte comme prise quand au moins la tension recherchée et
// l'amplitude visée sont renseignées — les deux champs qui conditionnent le
// plus directement l'exécution réelle. Les autres (résistance, dispo,
// inconfort) ne s'appliquent pas à 100% des exercices (ex. un exercice au
// poids du corps sans accessoire), donc ne sont pas exigés pour le badge.
export function isAssignmentConfigured(a: AssignmentDecisions): boolean {
  return !!a.tension_focus && a.rom_notes.trim().length > 0;
}

export default function ExerciseDetailPanel({
  exercise,
  onUpdate,
  onClose,
  assignment,
  onAssignmentChange,
  defaultTensionFromClassification,
}: {
  exercise: LibraryExercise;
  /** Fourni = éditable sur place. Absent = lecture seule. */
  onUpdate?: (id: string, fields: Partial<CreateExerciseInput>) => Promise<{ error?: string }>;
  onClose: () => void;
  /** Fourni = affiche la section "Décisions pour cette séance" (contexte : ajout d'un exercice à un programme). */
  assignment?: AssignmentDecisions;
  onAssignmentChange?: (field: keyof AssignmentDecisions, value: string) => void;
  /** Position par défaut de l'exercice (classification), affichée en repère dans la section décision. */
  defaultTensionFromClassification?: string | null;
}) {
  const [ex, setEx] = useState(exercise);
  const [notes, setNotes] = useState(exercise.setup_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  // MASTERCLASS.md Axe C (suite) : le fond se fermait déjà au clic, rien
  // au clavier avant ça.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function setField(field: keyof CreateExerciseInput, value: unknown) {
    if (!onUpdate) return;
    setPending(field);
    const res = await onUpdate(exercise.id, { [field]: value } as Partial<CreateExerciseInput>);
    setPending(null);
    if (!res.error) setEx((e) => ({ ...e, [field]: value }));
  }

  async function saveNotes() {
    if (!onUpdate) return;
    setSavingNotes(true);
    const res = await onUpdate(exercise.id, { setup_notes: notes });
    setSavingNotes(false);
    if (!res.error) setEx((e) => ({ ...e, setup_notes: notes }));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="ep-modal-panel relative w-full sm:max-w-lg bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 bg-[#150000] border-b border-[#890404]/20 z-10">
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{ex.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1f0101] border border-[#890404]/25 text-[#F5EDED]/45">
                {ex.muscle_group}{ex.muscle_subgroup ? ` · ${ex.muscle_subgroup}` : ""}
              </span>
              {ex.category && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1f0101] border border-[#890404]/25 text-[#F5EDED]/45">
                  {CATEGORY_LABELS[ex.category]}
                </span>
              )}
              {ex.difficulty && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1f0101] border border-[#890404]/25 text-[#F5EDED]/45">
                  {DIFFICULTY_LABELS[ex.difficulty]}
                </span>
              )}
              {ex.equipment && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1f0101] border border-[#890404]/25 text-[#F5EDED]/45">
                  {ex.equipment}{ex.brand ? ` (${ex.brand})` : ""}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {ex.video_url && (
            <a
              href={ex.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] font-bold text-[#E01E1E] hover:text-[#ff4444]"
            >
              <Video size={13} /> Voir la vidéo <ExternalLink size={11} />
            </a>
          )}

          {ex.instructions && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Exécution</p>
              <p className="text-xs text-[#F5EDED]/70 leading-relaxed whitespace-pre-wrap">{ex.instructions}</p>
            </div>
          )}

          {/* ── Décisions pour cette séance (propres à ce client) ──────────── */}
          {assignment && onAssignmentChange && (
            <div className="bg-[#1f0101] border border-[#E01E1E]/25 rounded-xl p-4 -mx-1">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#E01E1E] mb-1">
                <ClipboardCheck size={12} />
                Décisions pour cette séance
              </p>
              <p className="text-[10.5px] text-[#F5EDED]/35 leading-relaxed mb-4">
                Rien ici n&apos;est déduit automatiquement, c&apos;est ce que toi tu choisis pour ce client précis,
                à cette place précise du programme. La classification ci-dessous est une référence générale sur
                l&apos;exercice ; ça, c&apos;est la mise en œuvre réelle.
              </p>

              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Tension recherchée pour ce client
                    {defaultTensionFromClassification && (
                      <span className="text-[#F5EDED]/25 normal-case font-normal">
                        {" "}· par défaut sur cet exercice : {defaultTensionFromClassification}
                      </span>
                    )}
                  </p>
                  <Pills
                    options={TENSION_FOCUS_OPTIONS}
                    labels={TENSION_FOCUS_LABELS}
                    value={(assignment.tension_focus || null) as (typeof TENSION_FOCUS_OPTIONS)[number] | null}
                    onChange={(v) => onAssignmentChange("tension_focus", v)}
                  />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Amplitude visée
                  </p>
                  <textarea
                    value={assignment.rom_notes}
                    onChange={(e) => onAssignmentChange("rom_notes", e.target.value)}
                    rows={2}
                    placeholder="Ex. Presse à cuisses de sa salle limitée en amplitude basse, ajouter une planche pour compenser." aria-label="Notes sur l'amplitude de mouvement"
                    className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Résistance &amp; accessoires
                  </p>
                  <textarea
                    value={assignment.resistance_notes}
                    onChange={(e) => onAssignmentChange("resistance_notes", e.target.value)}
                    rows={2}
                    placeholder="Ex. Élastique léger en haut du mouvement pour garder la tension en position raccourcie." aria-label="Notes sur la résistance"
                    className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Disponibilité vérifiée
                  </p>
                  <textarea
                    value={assignment.availability_notes}
                    onChange={(e) => onAssignmentChange("availability_notes", e.target.value)}
                    rows={2}
                    placeholder="Ex. S'entraîne à 18h, salle bondée sur ce poste, prévoir un remplaçant si occupé." aria-label="Notes sur la disponibilité du matériel"
                    className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Seuil d&apos;inconfort
                  </p>
                  <p className="text-[10.5px] text-[#F5EDED]/30 leading-relaxed mb-1.5">
                    À partir de combien de séries, à quelle intensité, ce mouvement devient inconfortable pour ce
                    client (essoufflement, articulation) au point d&apos;ajuster ?
                  </p>
                  <textarea
                    value={assignment.discomfort_notes}
                    onChange={(e) => onAssignmentChange("discomfort_notes", e.target.value)}
                    rows={2}
                    placeholder="Ex. Passe en amplitude partielle dès la 3e série à RIR 1." aria-label="Notes sur la gêne ou l'inconfort"
                    className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bagage d'accessoires — retour direct 2026-09-10 : "c'est moi qui
              définis et choisis quel accessoire il y a, comme ça je sais
              qu'il y a quel accessoire dans la séance, et en plus c'est
              modifiable". Choix explicite par exercice (classification
              générale, partagée entre coachs) plutôt qu'une devinette par
              mots-clés sur le nom — voir lib/session-accessories.ts. */}
          <div className="border-t border-[#890404]/15 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5 flex items-center gap-1.5">
              <Backpack size={11} /> Bagage d&apos;accessoires{" "}
              {(ex.accessories ?? []).length === 0 && (
                <span className="text-amber-400/80 normal-case font-semibold">· non renseigné (devinette par mots-clés en filet)</span>
              )}
            </p>
            <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed mb-2">
              Ce que tu choisis ici s&apos;affiche pour tous les clients qui font cet exercice, dans &laquo;&nbsp;à prévoir&nbsp;&raquo;
              (programme, logbook, séance en cours). Plusieurs accessoires possibles à la fois.
            </p>
            <MultiPills
              options={ACCESSORY_CATALOG.map((a) => a.accessory)}
              value={ex.accessories ?? []}
              onToggle={(accessory) => {
                const current = ex.accessories ?? [];
                const next = current.includes(accessory)
                  ? current.filter((a) => a !== accessory)
                  : [...current, accessory];
                setField("accessories", next);
              }}
              disabled={!onUpdate || pending === "accessories"}
            />
          </div>

          {/* Position / courbe de résistance — seul repère avec citations directes */}
          <div className="border-t border-[#890404]/15 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
              Position dans l&apos;amplitude (classification générale) {!ex.position && <span className="text-amber-400/80 normal-case font-semibold">· non renseigné</span>}
            </p>
            <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed mb-2">{POSITION_HELP}</p>
            <Pills options={POSITION_OPTIONS} value={ex.position as typeof POSITION_OPTIONS[number] | null} onChange={(v) => setField("position", v)} disabled={!onUpdate || pending === "position"} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {POSITION_SOURCES.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#F5EDED]/25 hover:text-[#F5EDED]/50 underline">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Autres attributs qualitatifs */}
          {(Object.keys(QUAL_INFO) as QualKey[]).map((key) => (
            <div key={key} className="border-t border-[#890404]/15 pt-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                {QUAL_INFO[key].label} {!ex[key] && <span className="text-amber-400/80 normal-case font-semibold">· non renseigné</span>}
              </p>
              <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed mb-2">{QUAL_INFO[key].help}</p>
              <Pills options={QUALITATIVE_SCALE} value={ex[key] as typeof QUALITATIVE_SCALE[number] | null} onChange={(v) => setField(key, v)} disabled={!onUpdate || pending === key} />
            </div>
          ))}

          {/* Unilatéral / Microchargeable */}
          <div className="border-t border-[#890404]/15 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Uni / Bilatéral</p>
              <Pills
                options={["Unilatéral", "Bilatéral"] as const}
                value={ex.is_unilateral == null ? null : ex.is_unilateral ? "Unilatéral" : "Bilatéral"}
                onChange={(v) => setField("is_unilateral", v === "Unilatéral")}
                disabled={!onUpdate || pending === "is_unilateral"}
              />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Microchargeable</p>
              <Pills
                options={["Oui", "Non"] as const}
                value={ex.microloadable == null ? null : ex.microloadable ? "Oui" : "Non"}
                onChange={(v) => setField("microloadable", v === "Oui")}
                disabled={!onUpdate || pending === "microloadable"}
              />
              <p className="text-[9.5px] text-[#F5EDED]/30 leading-relaxed mt-1.5">
                Décisif sur les mouvements où le client plafonne vite (souvent isolation, petits groupes) : sans
                incrément fin, la seule option est de sauter un palier de charge trop gros.
              </p>
            </div>
          </div>

          {/* Adaptations / accessoires (fiche générale de l'exercice) */}
          <div className="border-t border-[#890404]/15 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
              Adaptations &amp; accessoires (fiche générale de l&apos;exercice)
            </p>
            <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed mb-2">
              Astuces d&apos;installation valables pour tous les clients sur cet exercice, pas propre à celui-ci
              (ça, c&apos;est la section décisions plus haut) : élastique pour garder la tension en position
              raccourcie, sangles si la prise devient limitante, ajustement si une machine manque d&apos;amplitude...
            </p>
            {onUpdate ? (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex. Ajouter un élastique en haut du mouvement pour garder la tension en position raccourcie." aria-label="Notes"
                  className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                />
                {notes !== (ex.setup_notes ?? "") && (
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] disabled:opacity-50"
                  >
                    {savingNotes ? "Enregistrement…" : "Enregistrer la note"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-[#F5EDED]/60 italic">{ex.setup_notes || "Aucune note pour l'instant."}</p>
            )}
          </div>

          {assignment && onAssignmentChange && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors"
            >
              Terminé pour cet exercice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
