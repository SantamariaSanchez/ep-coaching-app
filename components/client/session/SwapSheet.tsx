"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, MapPin, Repeat, Search, ChevronRight } from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";
import { FIXED_SWAP_PLACES, SWAP_PLACE_STORAGE_KEY, parseSwapPlace, type SwapPlace } from "@/lib/swap-place";

// Le lieu choisi ne vaut que pour la journée : demain, on repart de la salle habituelle.
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readSavedPlace(): SwapPlace {
  try {
    const raw = window.localStorage.getItem(SWAP_PLACE_STORAGE_KEY);
    if (!raw) return "habituelle";
    const saved = JSON.parse(raw) as { day?: string; place?: string };
    return saved.day === todayKey() ? parseSwapPlace(saved.place) : "habituelle";
  } catch {
    return "habituelle";
  }
}

function savePlace(place: SwapPlace) {
  try {
    window.localStorage.setItem(SWAP_PLACE_STORAGE_KEY, JSON.stringify({ day: todayKey(), place }));
  } catch {
    // Stockage bloqué : le choix vaut seulement pour cette fenêtre.
  }
}

// « Machine prise » / « Changer d'exercice » (retour direct du fondateur
// 2026-10-14 : « si j'ai une machine où il y a quelqu'un, le logbook
// s'adapte », « si je veux switch les exos je peux et ça reste »). Deux
// sorties : passer à la suite et revenir plus tard, ou un remplaçant du même
// groupe musculaire tiré de la bibliothèque d'exercices.

interface Alternative {
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  equipment: string | null;
}

export default function SwapSheet({
  mode,
  exerciseName,
  muscleGroup,
  muscleSubgroup,
  doneSets,
  canDefer,
  excludeNames,
  onDefer,
  onPick,
  onClose,
}: {
  mode: "busy" | "replace";
  exerciseName: string;
  muscleGroup: string | null;
  muscleSubgroup: string | null;
  /** Séries déjà faites : le remplaçant ne prend que les séries restantes. */
  doneSets: number;
  canDefer: boolean;
  excludeNames: string[];
  onDefer: () => void;
  onPick: (alt: { name: string; muscleGroup: string | null; muscleSubgroup: string | null }) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [query, setQuery] = useState("");
  // La fenêtre ne s'ouvre qu'après un geste en séance (jamais au rendu serveur) :
  // le lieu du jour peut être lu tout de suite.
  const [place, setPlace] = useState<SwapPlace>(() => (typeof window === "undefined" ? "habituelle" : readSavedPlace()));
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([]);

  function choosePlace(next: SwapPlace) {
    if (next === place) return;
    setLoading(true);
    setFailed(false);
    setPlace(next);
    savePlace(next);
  }

  useEffect(() => {
    const params = new URLSearchParams({ name: exerciseName });
    if (place !== "habituelle") params.set("place", place);
    if (muscleGroup) params.set("muscle", muscleGroup);
    if (muscleSubgroup) params.set("subgroup", muscleSubgroup);
    for (const n of excludeNames) params.append("exclude", n);
    let cancelled = false;
    fetch(`/api/exercise-library/alternatives?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: { alternatives?: Alternative[]; gyms?: { id: string; name: string }[] }) => {
        if (cancelled) return;
        setAlternatives(data.alternatives ?? []);
        setGyms(data.gyms ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // excludeNames est recalculé à chaque rendu du parent : seul l'exercice compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName, muscleGroup, muscleSubgroup, place]);

  const places: { key: SwapPlace; label: string }[] = [
    FIXED_SWAP_PLACES[0],
    ...gyms.map((g) => ({ key: `gym:${g.id}` as SwapPlace, label: g.name })),
    ...FIXED_SWAP_PLACES.slice(1),
  ];
  const placeHint = FIXED_SWAP_PLACES.find((p) => p.key === place)?.hint;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return alternatives;
    return alternatives.filter((a) => fuzzyMatchAny([a.name, a.equipment, a.muscle_subgroup], q));
  }, [alternatives, query]);

  const typed = query.trim();
  const typedIsNew = typed.length >= 3 && !alternatives.some((a) => a.name.toLowerCase() === typed.toLowerCase());

  return (
    <Sheet
      title={mode === "busy" ? t("Machine prise") : t("Changer d'exercice")}
      subtitle={exerciseName}
      onClose={onClose}
    >
      <div className="space-y-4">
        {mode === "busy" && canDefer && (
          <button
            type="button"
            onClick={onDefer}
            className="w-full min-h-14 flex items-center gap-3 rounded-xl border border-(--ep-yellow)/40 bg-(--ep-yellow)/10 px-3.5 py-2.5 text-left"
          >
            <Clock3 size={18} className="text-(--ep-yellow) shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-(--ep-strong)">{t("Passer, j'y reviens plus tard")}</span>
              <span className="block text-[11px] text-(--ep-ink)/55 leading-snug">
                {t("L'exercice passe après le suivant, rien n'est perdu.")}
              </span>
            </span>
            <ChevronRight size={16} className="text-(--ep-ink)/35 shrink-0" />
          </button>
        )}

        <div>
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-1.5">
            <MapPin size={11} className="shrink-0" />
            {t("Où tu t'entraînes aujourd'hui")}
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Où tu t'entraînes aujourd'hui")}>
            {places.map((p) => {
              const active = p.key === place;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePlace(p.key)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-bold ${
                    active
                      ? "border-(--ep-accent) bg-(--ep-accent)/15 text-(--ep-strong)"
                      : "border-(--ep-line)/30 bg-(--ep-s2) text-(--ep-ink)/70"
                  }`}
                >
                  {t(p.label)}
                </button>
              );
            })}
          </div>
          {place !== "habituelle" && (
            <p className="text-[11px] text-(--ep-ink)/50 mt-1.5 leading-snug">
              {placeHint ? `${t(placeHint)}. ` : ""}
              {t("Seuls les exercices faisables ici sont proposés. Ton programme ne change pas.")}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-1">
            {mode === "busy" ? t("Ou remplace-le par") : t("Remplace-le par")}
            {muscleGroup ? ` · ${muscleGroup}` : ""}
          </p>
          {doneSets > 0 && (
            <p className="text-[11px] text-(--ep-ink)/50 mb-2 leading-snug">
              {t("Tes séries déjà faites restent, le remplaçant prend les séries restantes.")}
            </p>
          )}
          <label className="flex items-center gap-2 rounded-xl border border-(--ep-line)/30 bg-(--ep-s2) px-3 min-h-11 mb-2">
            <Search size={14} className="text-(--ep-ink)/35 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Chercher ou taper un exercice")}
              aria-label={t("Chercher ou taper un exercice")}
              className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/30 focus:outline-none"
            />
          </label>

          {typedIsNew && (
            <button
              type="button"
              onClick={() => onPick({ name: typed, muscleGroup, muscleSubgroup })}
              className="w-full min-h-12 flex items-center gap-2 rounded-xl border border-dashed border-(--ep-accent)/40 px-3 py-2 mb-2 text-left"
            >
              <Repeat size={15} className="text-(--ep-accent) shrink-0" />
              <span className="text-sm font-bold text-(--ep-strong) truncate">
                {t("Utiliser")} « {typed} »
              </span>
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-(--ep-ink)/40">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : failed ? (
            <p className="text-xs text-(--ep-ink)/50 py-4 text-center">
              {t("Liste indisponible, tape le nom de l'exercice ci-dessus.")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-(--ep-ink)/50 py-4 text-center">{t("Aucun exercice trouvé.")}</p>
          ) : (
            <ul className="divide-y divide-(--ep-line)/15 rounded-xl border border-(--ep-line)/20 overflow-hidden">
              {filtered.map((a) => (
                <li key={a.name}>
                  <button
                    type="button"
                    onClick={() => onPick({ name: a.name, muscleGroup: a.muscle_group, muscleSubgroup: a.muscle_subgroup })}
                    className="w-full min-h-13 flex items-center gap-3 px-3 py-2 text-left bg-(--ep-s1) active:bg-(--ep-s2)"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-(--ep-strong) truncate">{a.name}</span>
                      <span className="block text-[11px] text-(--ep-ink)/45 truncate">
                        {[a.equipment, a.muscle_subgroup].filter(Boolean).join(" · ") || a.muscle_group}
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-(--ep-ink)/30 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
