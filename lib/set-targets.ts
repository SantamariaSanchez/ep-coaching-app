// Cibles série par série pour la séance guidée (components/client/SessionView).
//
// Module pur, sans aucun import serveur : il tourne côté client pendant
// l'entraînement. Le programme du fondateur est écrit série par série
// ("1x15-20, 3x10-12", "6-8, 8-10", "2x6-10, 1x10-12"...), alors que la
// séance n'affichait que le schéma brut en placeholder d'un petit champ
// numérique. Ici on le découpe en une fourchette par série, et on en tire un
// objectif de double progression à partir de la même série de la dernière
// fois. Tout ce qui ne se lit pas proprement (AMRAP, "30s", texte libre)
// renvoie null : l'appelant retombe alors exactement sur l'affichage d'avant.

export interface RepRange {
  min: number;
  max: number;
}

export interface PrevSetLike {
  weight: number | null;
  reps: string | null;
  rir: number | null;
}

export interface SetSuggestion {
  weightKg: number;
  reps: number;
  reason: string;
}

function toRange(a: number, b: number | null): RepRange | null {
  const lo = a;
  const hi = b ?? a;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= 0) return null;
  // "12-8" saisi à l'envers : même fourchette, on la remet dans l'ordre.
  return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
}

/**
 * Découpe un schéma de répétitions en une fourchette par série.
 * "1x12-15, 2x10-12" (3 séries) → [12-15, 10-12, 10-12]
 * "8-12" (3 séries)              → [8-12, 8-12, 8-12]
 * "6-8, 8-10"                    → [6-8, 8-10]
 * Renvoie null dès qu'un morceau n'est pas lisible.
 */
export function parseRepScheme(reps: string | null, sets: number | null): RepRange[] | null {
  if (!reps) return null;
  const normalized = reps
    .toLowerCase()
    .replace(/[×*]/g, "x")
    // Tiret long ou moyen tapé par erreur (copier-coller depuis un doc) :
    // même sens qu'un tiret simple dans une fourchette.
    // Échappés en unicode : ces caractères ne figurent jamais tels quels
    // dans le code de l'appli.
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .trim();
  if (!normalized) return null;

  const pieces = normalized.split(",").map((p) => p.trim()).filter(Boolean);
  if (pieces.length === 0) return null;

  const ranges: RepRange[] = [];
  let sawMultiplier = false;
  for (const piece of pieces) {
    const multi = piece.match(/^(\d+)\s*x\s*(\d+)(?:\s*-\s*(\d+))?$/);
    if (multi) {
      sawMultiplier = true;
      const count = parseInt(multi[1], 10);
      const range = toRange(parseInt(multi[2], 10), multi[3] != null ? parseInt(multi[3], 10) : null);
      // Garde-fou : un "0x" ou un "50x" n'est pas un schéma de séries réel.
      if (!range || count <= 0 || count > 20) return null;
      for (let i = 0; i < count; i++) ranges.push(range);
      continue;
    }
    const single = piece.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (single) {
      const range = toRange(parseInt(single[1], 10), single[2] != null ? parseInt(single[2], 10) : null);
      if (!range) return null;
      ranges.push(range);
      continue;
    }
    return null;
  }

  const target = sets != null && sets > 0 ? sets : null;
  // "8-12" pour 3 séries : la même fourchette vaut pour chacune.
  if (pieces.length === 1 && !sawMultiplier && target != null && target > 1) {
    return Array.from({ length: target }, () => ranges[0]);
  }
  // Schéma plus court que le nombre de séries prévu : on complète avec la
  // dernière fourchette plutôt que de laisser des séries sans cible.
  if (target != null) {
    while (ranges.length < target) ranges.push(ranges[ranges.length - 1]);
  }
  return ranges;
}

/** Fourchette de la série n° idx (0-based), la dernière si le schéma est plus court. */
export function rangeForSet(ranges: RepRange[] | null, idx: number): RepRange | null {
  if (!ranges || ranges.length === 0) return null;
  return ranges[idx] ?? ranges[ranges.length - 1];
}

export function formatRange(range: RepRange): string {
  return range.min === range.max ? String(range.min) : `${range.min}-${range.max}`;
}

/** "32,5" : décimale à la française, sans zéro inutile. */
export function formatKg(weight: number): string {
  return String(Math.round(weight * 10) / 10).replace(".", ",");
}

// Incrément de charge : un repère, jamais une valeur imposée (le matériel
// change d'une salle à l'autre). Petites charges (haltères légers,
// isolation) : 1 kg ; au-delà : 2,5 kg.
function loadIncrement(weight: number): number {
  return weight < 20 ? 1 : 2.5;
}

/**
 * Double progression : on monte d'abord les reps dans la fourchette, puis la
 * charge une fois le haut de la fourchette atteint (sans marge restante).
 * Sans série de référence exploitable, renvoie null.
 */
export function suggestSet({
  range,
  prev,
  targetRir,
}: {
  range: RepRange;
  prev: PrevSetLike | null;
  targetRir: number | null;
}): SetSuggestion | null {
  if (!prev || prev.weight == null || prev.weight <= 0 || prev.reps == null) return null;
  const prevReps = parseInt(prev.reps, 10);
  if (!Number.isFinite(prevReps) || prevReps <= 0) return null;

  if (prevReps >= range.max) {
    // Haut de fourchette atteint : on monte la charge, SAUF si ces reps ont
    // été arrachées nettement plus près de l'échec que la cible (RIR réel
    // plus bas que la cible de plus d'un cran). Une marge plus grande que
    // prévu (série trop facile) pousse au contraire à monter. RIR non
    // renseigné : on se fie aux reps seules, le signal principal de la
    // double progression. Avec une cible RIR 0, on monte toujours.
    const overshot = prev.rir != null && targetRir != null && prev.rir < targetRir - 1;
    if (!overshot) {
      const inc = loadIncrement(prev.weight);
      const next = Math.round((prev.weight + inc) * 2) / 2;
      return {
        weightKg: next,
        reps: range.min,
        reason: `${prevReps} reps atteintes la dernière fois : +${formatKg(inc)} kg`,
      };
    }
    return {
      weightKg: prev.weight,
      reps: range.max,
      reason: "Même charge : consolide le haut de la fourchette avec ta marge prévue",
    };
  }
  if (prevReps < range.min) {
    return {
      weightKg: prev.weight,
      reps: range.min,
      reason: `Même charge, vise le bas de la fourchette (${range.min} reps)`,
    };
  }
  // Dans la fourchette : même charge, une rep de plus (plafonnée au haut).
  return {
    weightKg: prev.weight,
    reps: Math.min(prevReps + 1, range.max),
    reason: "Même charge, une rep de plus",
  };
}

/** "45 s", "1 min", "1 min 30". */
export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m} min ${String(r).padStart(2, "0")}`;
}
