"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { ClientIntake } from "@/utils/client-intake";
import { checkExerciseConflicts, conflictSourceLabel, type ExerciseConflict } from "@/lib/plan-generator";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";

// Cellule « Exercice » du tableur : on tape, la bibliothèque propose, Entrée
// ou clic choisit. La liste flotte au-dessus de la page (portail) pour ne
// jamais être coupée par le défilement horizontal du tableau. Un exercice
// hors bibliothèque reste possible : le texte tapé est gardé tel quel.
//
// Un exercice qui croise la fiche client (blessure, exercice à éviter,
// matériel détesté) n'est pas bloqué : il s'ajoute, et la ligne garde un
// triangle d'alerte. Moins de clics, et l'info reste sous les yeux.

export default function ExerciseCell({
  value,
  library,
  intake,
  onChange,
  onPick,
  onNavKey,
  onPickedMoveNext,
  onPasteGrid,
  cellId,
  placeholder,
  autoFocus,
}: {
  value: string;
  library: LibraryExercise[];
  intake: ClientIntake | null;
  onChange: (v: string) => void;
  onPick: (lib: LibraryExercise) => void;
  /** Navigation de tableur (Entrée, flèches) quand la liste est fermée. */
  onNavKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Après un choix au clavier (Entrée) : passer à la cellule suivante. */
  onPickedMoveNext?: () => void;
  /** Collage de plusieurs lignes (Google Sheets, Excel) : true si géré. */
  onPasteGrid: (text: string) => boolean;
  cellId: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; above: number; left: number; width: number; up: boolean } | null>(null);

  const q = value.trim();
  const matches = useMemo(() => {
    if (q.length < 2) return [] as LibraryExercise[];
    const exact = library.filter((l) => l.name.toLowerCase().startsWith(q.toLowerCase()));
    const fuzzy = library.filter((l) => !exact.includes(l) && fuzzyMatchAny([l.name, l.muscle_group ?? ""], q));
    return [...exact, ...fuzzy].slice(0, 8);
  }, [library, q]);

  const exactMatch = library.some((l) => l.name.toLowerCase() === q.toLowerCase());
  const showList = open && matches.length > 0 && !(exactMatch && matches.length === 1);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useLayoutEffect(() => {
    if (!showList) return;
    function place() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPos({ top: r.bottom + 4, above: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 300), up: below < 280 && r.top > 280 });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showList]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function pick(lib: LibraryExercise) {
    onPick(lib);
    setOpen(false);
  }

  const conflictsFor = (lib: LibraryExercise): ExerciseConflict[] =>
    checkExerciseConflicts({ name: lib.name, equipment: lib.equipment }, intake, "");

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        data-cell={cellId}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text/plain");
          if ((text.includes("\n") || text.includes("\t")) && onPasteGrid(text)) e.preventDefault();
        }}
        onKeyDown={(e) => {
          if (showList) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
              return;
            }
            if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey && q.length >= 2)) {
              const lib = matches[active];
              if (lib) {
                pick(lib);
                if (e.key === "Enter") {
                  e.preventDefault();
                  onPickedMoveNext?.();
                }
                return;
              }
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
          }
          // Nom exact de la bibliothèque tapé en entier : on le prend (muscle,
          // matériel) au lieu de le garder en texte libre.
          if (e.key === "Enter" && q) {
            const lib = library.find((l) => l.name.toLowerCase() === q.toLowerCase());
            if (lib && lib.name !== value) {
              pick(lib);
            } else if (lib) {
              onPick(lib);
            }
          }
          onNavKey(e);
        }}
        placeholder={placeholder ?? tr("Exercice")}
        aria-label={tr("Exercice")}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-full bg-transparent px-2 py-2 text-[13px] font-semibold text-(--ep-strong) placeholder:text-(--ep-ink)/20 placeholder:font-normal focus:outline-none"
      />
      {showList &&
        pos &&
        createPortal(
          <div
            role="listbox"
            className="fixed z-[80] bg-(--ep-s3) border border-(--ep-line)/50 rounded-lg shadow-2xl overflow-hidden"
            style={{
              left: Math.min(pos.left, window.innerWidth - pos.width - 8),
              width: pos.width,
              ...(pos.up ? { bottom: pos.above } : { top: pos.top }),
            }}
            // Garde le focus dans la cellule pendant le clic.
            onMouseDown={(e) => e.preventDefault()}
          >
            {matches.map((lib, i) => {
              const conflicts = intake ? conflictsFor(lib) : [];
              return (
                <button
                  key={lib.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(lib)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-b border-(--ep-line)/10 last:border-0 ${
                    i === active ? "bg-(--ep-line)/30" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-(--ep-strong) truncate">{lib.name}</span>
                    {conflicts.length > 0 && (
                      <span className="flex items-center gap-1 text-[10.5px] text-amber-300/90 truncate">
                        <AlertTriangle size={10} className="flex-shrink-0" />
                        {conflictSourceLabel(conflicts[0].source)} : {conflicts[0].keyword}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-(--ep-ink)/35 flex-shrink-0">
                    {lib.muscle_group}
                    {lib.equipment ? ` · ${lib.equipment}` : ""}
                  </span>
                </button>
              );
            })}
            <p className="px-3 py-1.5 text-[10px] text-(--ep-ink)/30 bg-(--ep-shade)/20">
              {tr("Entrée pour choisir · ou continue à taper un nom libre")}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
