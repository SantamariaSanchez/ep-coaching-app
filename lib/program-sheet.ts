// Vocabulaire partagé de la conception de programme façon tableur
// (components/program-builder) et de son affichage côté client (séance,
// programme) : unité de la cible (reps, secondes, mètres), techniques
// d'intensification, supersets.

export type RepsUnit = "reps" | "sec" | "m";

export const REPS_UNITS: { key: RepsUnit; short: string; label: string }[] = [
  { key: "reps", short: "reps", label: "Répétitions" },
  { key: "sec", short: "s", label: "Secondes (gainage, planche, chaise...)" },
  { key: "m", short: "m", label: "Mètres (sled, farmer walk...)" },
];

export function unitShort(unit: string | null | undefined): string {
  if (unit === "sec") return "s";
  if (unit === "m") return "m";
  return "reps";
}

export function isTimeUnit(unit: string | null | undefined): boolean {
  return unit === "sec";
}

export type Technique =
  | "drop_set"
  | "myo_reps"
  | "rest_pause"
  | "partials"
  | "amrap"
  | "cluster"
  | "tempo"
  | "isometric";

// `hint` est ce que le client lit en séance : une phrase concrète, pas un
// cours de méthodologie.
export const TECHNIQUES: { key: Technique; label: string; hint: string }[] = [
  { key: "drop_set", label: "Drop set", hint: "Dernière série : à l'échec, baisse la charge de 20-30 % et repars sans repos, 2 fois." },
  { key: "myo_reps", label: "Myo-reps", hint: "1 série d'activation proche de l'échec, puis mini-séries de 3-5 reps avec 3 à 5 respirations de pause." },
  { key: "rest_pause", label: "Rest-pause", hint: "À l'échec, pose 10-15 s, puis encore quelques reps. Répète 2 fois." },
  { key: "partials", label: "Partielles", hint: "Après l'échec en amplitude complète, continue en amplitude partielle (zone étirée)." },
  { key: "amrap", label: "AMRAP", hint: "Dernière série : le maximum de reps propres possible." },
  { key: "cluster", label: "Cluster", hint: "Série coupée en blocs de quelques reps avec 15-20 s de pause entre chaque." },
  { key: "tempo", label: "Tempo", hint: "Respecte le tempo indiqué (descente - pause - montée - pause)." },
  { key: "isometric", label: "Isométrie", hint: "Tiens la position sans bouger pendant le temps indiqué." },
];

export function techniqueLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return TECHNIQUES.find((t) => t.key === key)?.label ?? null;
}

export function techniqueHint(key: string | null | undefined): string | null {
  if (!key) return null;
  return TECHNIQUES.find((t) => t.key === key)?.hint ?? null;
}

// Saisie libre dans la case Reps : « 30s », « 45 sec », « 1min », « 1'30 »,
// « 20m » basculent l'unité toute seule. Retourne null si rien à corriger.
export function parseRepsInput(raw: string): { reps: string; unit: RepsUnit } | null {
  const v = raw.trim().toLowerCase().replace(",", ".");
  if (!v) return null;
  const mmss = v.match(/^(\d+)\s*(?:'|min|mn|m)\s*(\d{1,2})\s*(?:"|s|sec)?$/);
  if (mmss && /'|min|mn/.test(v)) return { reps: String(parseInt(mmss[1]) * 60 + parseInt(mmss[2])), unit: "sec" };
  const minutes = v.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|minutes?)$/);
  if (minutes) return { reps: String(Math.round(parseFloat(minutes[1]) * 60)), unit: "sec" };
  const secs = v.match(/^(\d+(?:\s*-\s*\d+)?)\s*(?:s|sec|secs|secondes?|")$/);
  if (secs) return { reps: secs[1].replace(/\s+/g, ""), unit: "sec" };
  const meters = v.match(/^(\d+(?:\s*-\s*\d+)?)\s*(?:m|mètres?|metres?)$/);
  if (meters) return { reps: meters[1].replace(/\s+/g, ""), unit: "m" };
  const reps = v.match(/^(.+?)\s*(?:reps?|répétitions?)$/);
  if (reps) return { reps: reps[1].trim(), unit: "reps" };
  return null;
}

// Exercices de bibliothèque qui se font naturellement au temps : l'unité
// passe en secondes dès qu'on en choisit un (le coach peut toujours changer).
const TIME_BASED = /(gainage|planche|plank|chaise|wall sit|hollow|isom|dead hang|suspension|farmer|portage|l-sit|superman hold|pont fessier tenu|side plank|gainage latéral|copenhague)/i;
const DISTANCE_BASED = /(sled|traîneau|prowler|farmer walk|marche du fermier|sandbag carry)/i;

export function defaultUnitForExercise(name: string): RepsUnit | null {
  if (DISTANCE_BASED.test(name)) return "m";
  if (TIME_BASED.test(name)) return "sec";
  return null;
}

// Libellés A1/A2/B1... pour une liste ordonnée d'exercices : deux voisins
// (ou plus) qui partagent superset_group forment un bloc. Un groupe isolé
// (un seul exercice) n'est pas affiché comme superset.
export function supersetLabels(groups: (string | null | undefined)[]): (string | null)[] {
  const out: (string | null)[] = groups.map(() => null);
  let letter = 0;
  let i = 0;
  while (i < groups.length) {
    const g = groups[i];
    if (!g) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < groups.length && groups[j + 1] === g) j++;
    if (j > i) {
      const L = String.fromCharCode(65 + (letter % 26));
      for (let k = i; k <= j; k++) out[k] = `${L}${k - i + 1}`;
      letter++;
    }
    i = j + 1;
  }
  return out;
}

/** Nombre d'exercices dans le bloc superset (2 = superset, 3+ = circuit). */
export function supersetSize(groups: (string | null | undefined)[], index: number): number {
  const g = groups[index];
  if (!g) return 1;
  let start = index;
  while (start > 0 && groups[start - 1] === g) start--;
  let end = index;
  while (end + 1 < groups.length && groups[end + 1] === g) end++;
  return end - start + 1;
}

/** Vrai si l'exercice est le dernier de son bloc superset (c'est là qu'on se repose). */
export function isLastOfSuperset(groups: (string | null | undefined)[], index: number): boolean {
  const g = groups[index];
  if (!g) return true;
  return groups[index + 1] !== g;
}

// Résumé lisible d'une prescription, côté client comme côté coach :
// « 3 × 8-12 reps · RIR 2 · repos 2 min » / « 3 × 30-45 s ».
export function formatRest(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${String(s).padStart(2, "0")}` : `${m} min`;
}

export function formatPrescription(ex: {
  sets: number | null;
  reps: string | null;
  reps_unit?: string | null;
  rir?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
}): string {
  const parts: string[] = [];
  const target = ex.reps ? `${ex.reps} ${unitShort(ex.reps_unit)}` : null;
  if (ex.sets && target) parts.push(`${ex.sets} × ${target}`);
  else if (ex.sets) parts.push(`${ex.sets} séries`);
  else if (target) parts.push(target);
  if (ex.rir != null) parts.push(`RIR ${ex.rir}`);
  if (ex.tempo) parts.push(`tempo ${ex.tempo}`);
  const rest = formatRest(ex.rest_seconds);
  if (rest) parts.push(`repos ${rest}`);
  return parts.join(" · ");
}

// Repli quand la migration 20261013_program_sheet n'est pas encore passée :
// superset/unité/technique/tempo partent dans la note pour ne rien perdre.
export function foldSheetFieldsIntoNotes(ex: {
  notes: string | null;
  superset_group?: string | null;
  reps_unit?: string | null;
  technique?: string | null;
  tempo?: string | null;
}): string | null {
  const extra: string[] = [];
  if (ex.superset_group) extra.push(`Superset ${ex.superset_group}`);
  if (ex.reps_unit === "sec") extra.push("en secondes");
  if (ex.reps_unit === "m") extra.push("en mètres");
  const tech = techniqueLabel(ex.technique);
  if (tech) extra.push(tech);
  if (ex.tempo) extra.push(`tempo ${ex.tempo}`);
  if (extra.length === 0) return ex.notes;
  return [extra.join(" · "), ex.notes].filter(Boolean).join(" · ");
}
