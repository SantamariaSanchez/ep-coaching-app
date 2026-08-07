"use client";

import { useState } from "react";
import { X, Video, ExternalLink } from "lucide-react";
import type { LibraryExercise } from "@/utils/exercise-library";
import { POSITION_OPTIONS, QUALITATIVE_SCALE, CATEGORY_LABELS, DIFFICULTY_LABELS } from "@/lib/exercise-library-content";
import type { CreateExerciseInput } from "@/app/dashboard/client/exercises/actions";

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

type QualKey = "freedom_of_movement" | "easy_to_replicate" | "learning_difficulty" | "stability_demand" | "accessibility";

const QUAL_INFO: Record<QualKey, { label: string; help: string }> = {
  freedom_of_movement: {
    label: "Liberté de mouvement",
    help: "À quel point le geste est guidé (machine, rail) ou libre (barre/haltère au sol). Plus c'est libre, plus ça sollicite la coordination — à surveiller en fin de séance fatiguée.",
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
    help: "Charge de travail proprioceptive en plus du travail musculaire ciblé. Utile pour le transfert vers le sport ou la vie quotidienne, coûteux en fatigue si le volume est élevé.",
  },
  accessibility: {
    label: "Accessibilité du matériel",
    help: "À quel point le matériel nécessaire est courant en salle standard ou possible à la maison. À croiser avec le lieu d'entraînement du client (voir sa fiche) et l'affluence probable à son horaire habituel.",
  },
};

const POSITION_HELP =
  "Où l'effort est le plus grand dans l'amplitude du mouvement. D'après plusieurs études récentes, travailler en position étirée produit une hypertrophie égale ou supérieure au ROM complet pour la plupart des mouvements — un vrai critère de choix, pas un détail cosmétique.";
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
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
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
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function ExerciseDetailPanel({
  exercise,
  onUpdate,
  onClose,
}: {
  exercise: LibraryExercise;
  /** Fourni = éditable sur place. Absent = lecture seule. */
  onUpdate?: (id: string, fields: Partial<CreateExerciseInput>) => Promise<{ error?: string }>;
  onClose: () => void;
}) {
  const [ex, setEx] = useState(exercise);
  const [notes, setNotes] = useState(exercise.setup_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 bg-[#150000] border-b border-[#890404]/20">
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
          <button onClick={onClose} className="text-[#F5EDED]/40 hover:text-white flex-shrink-0">
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

          {/* Position / courbe de résistance — seul repère avec citations directes */}
          <div className="border-t border-[#890404]/15 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
              Position dans l&apos;amplitude {!ex.position && <span className="text-amber-400/80 normal-case font-semibold">· non renseigné</span>}
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

          {/* Adaptations / accessoires */}
          <div className="border-t border-[#890404]/15 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
              Adaptations &amp; accessoires
            </p>
            <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed mb-2">
              Astuces d&apos;installation propres à cet exercice : élastique pour garder la tension en position
              raccourcie, sangles si la prise devient limitante, ajustement si une machine manque d&apos;amplitude...
            </p>
            {onUpdate ? (
              <>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex. Ajouter un élastique en haut du mouvement pour garder la tension en position raccourcie."
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
        </div>
      </div>
    </div>
  );
}
