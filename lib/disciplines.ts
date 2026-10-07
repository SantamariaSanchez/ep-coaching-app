// Disciplines (2026-10-07) : retour direct du fondateur, « il nous faut des
// coachs de toutes les niches : running, Hyrox, CrossFit, rééducation,
// femmes, bodybuilding poussé, personnes dopées, seulement perte de gras...
// sans fouillis : un powerlifter ne doit pas voir des onglets qui n'ont aucun
// lien avec lui ».
//
// Un seul moteur « Performances » plutôt qu'un écran par sport : chaque
// discipline déclare ici ses types de saisie, leurs champs, le résumé
// affiché, les records et les chiffres clés. L'écran (PerformanceHub) se
// construit tout seul à partir de ces déclarations. Ajouter une niche =
// ajouter une entrée dans ce fichier, rien d'autre.
//
// Fichier partagé serveur/client, sans import serveur.

export type DisciplineKey = "course" | "hyrox" | "crossfit" | "force" | "reeducation" | "sante";

export type FieldType = "number" | "duration" | "text" | "select" | "scale";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

export type EntryData = Record<string, string | number | null | undefined>;

export interface PerformanceEntry {
  id: string;
  discipline: DisciplineKey;
  kind: string;
  performed_on: string;
  data: EntryData;
  created_at?: string;
}

export interface RecordLine {
  key: string;
  label: string;
  value: number;
  display: string;
  better: "lower" | "higher";
}

export interface EntryKind {
  key: string;
  label: string;
  fields: FieldDef[];
  summary: (d: EntryData) => string;
  records?: (d: EntryData) => RecordLine[];
}

export interface Discipline {
  key: DisciplineKey;
  label: string;
  /** Libellé court du menu (« Course », « Force »...). */
  menuLabel: string;
  description: string;
  kinds: EntryKind[];
  stats: (entries: PerformanceEntry[], ctx: { bodyweightKg: number | null; isWoman: boolean }) => { label: string; value: string }[];
  /** Repère utile affiché sous les chiffres (jamais un avis médical). */
  tip?: string;
}

// ── Utilitaires ─────────────────────────────────────────────────────────

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** « 52:30 », « 1:02:30 » ou « 90 » (minutes) vers secondes. */
export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d+([.,]\d+)?$/.test(s)) return Math.round(Number(s.replace(",", ".")) * 60);
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

function pace(distanceKm: number | null, sec: number | null): string {
  if (!distanceKm || !sec || distanceKm <= 0) return "";
  return `${formatDuration(sec / distanceKm)}/km`;
}

/** 1RM estimé (Epley), fiable jusqu'à une dizaine de répétitions. */
export function estimate1RM(kg: number | null, reps: number | null): number | null {
  if (!kg || !reps || reps <= 0) return null;
  if (reps === 1) return kg;
  if (reps > 12) return null;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

/** Score DOTS (total en kg, poids de corps en kg). */
export function dots(totalKg: number, bodyweightKg: number, woman: boolean): number | null {
  if (!totalKg || !bodyweightKg) return null;
  const [a, b, c, d, e] = woman
    ? [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
    : [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093];
  const bw = bodyweightKg;
  const denom = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4;
  return denom > 0 ? Math.round(((totalKg * 500) / denom) * 10) / 10 : null;
}

/** Nombre à la française (21,2). */
export function frNum(n: number, digits = 1): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

function daysAgo(dateIso: string): number {
  return (Date.now() - new Date(dateIso + "T12:00:00Z").getTime()) / 86400000;
}

/** Meilleur record par clé sur toutes les saisies. */
export function bestRecords(discipline: Discipline, entries: PerformanceEntry[]): (RecordLine & { date: string })[] {
  const best = new Map<string, RecordLine & { date: string }>();
  for (const e of entries) {
    const kind = discipline.kinds.find((k) => k.key === e.kind);
    for (const r of kind?.records?.(e.data) ?? []) {
      const cur = best.get(r.key);
      if (!cur || (r.better === "lower" ? r.value < cur.value : r.value > cur.value)) best.set(r.key, { ...r, date: e.performed_on });
    }
  }
  return [...best.values()];
}

// ── Course à pied ───────────────────────────────────────────────────────

const RUN_DISTANCES: [string, string, number][] = [["5k", "5 km", 5], ["10k", "10 km", 10], ["semi", "Semi-marathon", 21.0975], ["marathon", "Marathon", 42.195]];

const course: Discipline = {
  key: "course",
  label: "Course à pied",
  menuLabel: "Course",
  description: "Tes sorties, ton volume de la semaine, ton allure et tes records sur 5 km, 10 km, semi et marathon.",
  kinds: [
    {
      key: "sortie",
      label: "Sortie",
      fields: [
        { key: "type", label: "Type", type: "select", options: ["Footing", "Fractionné", "Seuil", "Sortie longue", "Côtes", "Course officielle"] },
        { key: "distance_km", label: "Distance", type: "number", unit: "km", step: 0.01, required: true },
        { key: "duree", label: "Durée", type: "duration", placeholder: "52:30", required: true },
        { key: "denivele", label: "Dénivelé positif", type: "number", unit: "m" },
        { key: "fc_moy", label: "FC moyenne", type: "number", unit: "bpm" },
        { key: "rpe", label: "Difficulté ressentie", type: "scale", min: 1, max: 10 },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => {
        const km = num(d.distance_km);
        const sec = num(d.duree);
        return [d.type, km ? `${frNum(km, 2)} km` : "", sec ? formatDuration(sec) : "", pace(km, sec)].filter(Boolean).join(" · ");
      },
      records: (d) => {
        const km = num(d.distance_km);
        const sec = num(d.duree);
        const out: RecordLine[] = [];
        if (km) out.push({ key: "longue", label: "Plus longue sortie", value: km, display: `${frNum(km, 2)} km`, better: "higher" });
        if (km && sec) {
          for (const [key, label, dist] of RUN_DISTANCES) {
            if (Math.abs(km - dist) / dist <= 0.02) out.push({ key, label, value: sec, display: formatDuration(sec), better: "lower" });
          }
        }
        return out;
      },
    },
  ],
  stats: (entries) => {
    const week = entries.filter((e) => daysAgo(e.performed_on) < 7);
    const month = entries.filter((e) => daysAgo(e.performed_on) < 28);
    const km = (list: PerformanceEntry[]) => list.reduce((s, e) => s + (num(e.data.distance_km) ?? 0), 0);
    return [
      { label: "Km cette semaine", value: frNum(km(week)) },
      { label: "Moyenne / semaine (4 sem.)", value: `${frNum(km(month) / 4)} km` },
      { label: "Sorties cette semaine", value: String(week.length) },
    ];
  },
  tip: "Augmente ton volume par petites marches, et garde la majorité de tes sorties en aisance respiratoire.",
};

// ── Hyrox ───────────────────────────────────────────────────────────────

export const HYROX_STATIONS = ["SkiErg 1000 m", "Sled Push", "Sled Pull", "Burpee Broad Jumps", "Rameur 1000 m", "Farmers Carry", "Sandbag Lunges", "Wall Balls"];

const hyrox: Discipline = {
  key: "hyrox",
  label: "Hyrox",
  menuLabel: "Hyrox",
  description: "Tes courses et simulations, ton temps sur chaque station, tes runs et ta roxzone.",
  kinds: [
    {
      key: "course_hyrox",
      label: "Course ou simulation",
      fields: [
        { key: "format", label: "Format", type: "select", options: ["Course officielle", "Simulation complète", "Demi-simulation"] },
        { key: "division", label: "Division", type: "select", options: ["Open", "Pro", "Doubles", "Relais"] },
        { key: "temps_total", label: "Temps total", type: "duration", placeholder: "1:24:30", required: true },
        { key: "runs", label: "Temps des 8 runs", type: "duration", placeholder: "42:00" },
        { key: "roxzone", label: "Roxzone", type: "duration", placeholder: "6:30" },
        ...HYROX_STATIONS.map((s, i) => ({ key: `station_${i + 1}`, label: s, type: "duration" as const, placeholder: "4:30" })),
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => [d.format, d.division, num(d.temps_total) ? formatDuration(num(d.temps_total)) : ""].filter(Boolean).join(" · "),
      records: (d) => {
        const out: RecordLine[] = [];
        const total = num(d.temps_total);
        if (total && d.format === "Course officielle") out.push({ key: "officielle", label: "Meilleure course officielle", value: total, display: formatDuration(total), better: "lower" });
        if (total && d.format === "Simulation complète") out.push({ key: "simulation", label: "Meilleure simulation", value: total, display: formatDuration(total), better: "lower" });
        HYROX_STATIONS.forEach((s, i) => {
          const t = num(d[`station_${i + 1}`]);
          if (t) out.push({ key: `station_${i + 1}`, label: s, value: t, display: formatDuration(t), better: "lower" });
        });
        return out;
      },
    },
    {
      key: "station",
      label: "Entraînement d'une station",
      fields: [
        { key: "station", label: "Station", type: "select", options: HYROX_STATIONS, required: true },
        { key: "temps", label: "Temps", type: "duration", placeholder: "4:30", required: true },
        { key: "charge", label: "Charge", type: "number", unit: "kg" },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => [d.station, num(d.temps) ? formatDuration(num(d.temps)) : "", num(d.charge) ? `${num(d.charge)} kg` : ""].filter(Boolean).join(" · "),
      records: (d) => {
        const i = HYROX_STATIONS.indexOf(String(d.station));
        const t = num(d.temps);
        return i >= 0 && t ? [{ key: `station_${i + 1}`, label: HYROX_STATIONS[i], value: t, display: formatDuration(t), better: "lower" }] : [];
      },
    },
  ],
  stats: (entries) => {
    const races = entries.filter((e) => e.kind === "course_hyrox");
    const last = races[0];
    return [
      { label: "Courses et simulations", value: String(races.length) },
      { label: "Dernier temps", value: last && num(last.data.temps_total) ? formatDuration(num(last.data.temps_total)) : "aucun" },
    ];
  },
  tip: "Compare tes stations entre elles : la plus lente par rapport à ton niveau, c'est là que tu gagnes le plus de temps.",
};

// ── CrossFit ────────────────────────────────────────────────────────────

const BENCHMARKS = ["Fran", "Grace", "Helen", "Cindy", "Diane", "Elizabeth", "Isabel", "Karen", "Annie", "Jackie", "Murph", "DT", "Fight Gone Bad"];
const OLY_LIFTS = ["Snatch", "Clean & Jerk", "Clean", "Jerk", "Back Squat", "Front Squat", "Overhead Squat", "Deadlift", "Strict Press", "Push Press", "Bench Press"];

const crossfit: Discipline = {
  key: "crossfit",
  label: "CrossFit",
  menuLabel: "CrossFit",
  description: "Tes WOD, tes benchmarks (Fran, Murph...) et tes charges maximales en haltérophilie.",
  kinds: [
    {
      key: "wod",
      label: "WOD",
      fields: [
        { key: "nom", label: "Nom du WOD", type: "text", placeholder: "Fran, ou WOD du jour", required: true, hint: `Benchmarks reconnus : ${BENCHMARKS.slice(0, 6).join(", ")}...` },
        { key: "format", label: "Format", type: "select", options: ["For time", "AMRAP", "EMOM", "Chipper", "Force", "Autre"] },
        { key: "temps", label: "Temps (For time)", type: "duration", placeholder: "4:35" },
        { key: "rounds", label: "Rounds (AMRAP)", type: "number" },
        { key: "reps_bonus", label: "Répétitions en plus", type: "number" },
        { key: "niveau", label: "Niveau", type: "select", options: ["Rx", "Scaled", "Foundations"] },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => {
        const t = num(d.temps);
        const r = num(d.rounds);
        return [d.nom, d.format, t ? formatDuration(t) : r != null ? `${r} rounds${num(d.reps_bonus) ? ` + ${num(d.reps_bonus)}` : ""}` : "", d.niveau].filter(Boolean).join(" · ");
      },
      records: (d) => {
        const name = String(d.nom ?? "").trim();
        const bench = BENCHMARKS.find((b) => b.toLowerCase() === name.toLowerCase());
        if (!bench || d.niveau === "Foundations") return [];
        const t = num(d.temps);
        const r = num(d.rounds);
        if (t) return [{ key: `wod_${bench}`, label: `${bench}${d.niveau === "Scaled" ? " (scaled)" : ""}`, value: t, display: formatDuration(t), better: "lower" }];
        if (r != null) {
          const score = r * 1000 + (num(d.reps_bonus) ?? 0);
          return [{ key: `wod_${bench}`, label: bench, value: score, display: `${r} rounds${num(d.reps_bonus) ? ` + ${num(d.reps_bonus)}` : ""}`, better: "higher" }];
        }
        return [];
      },
    },
    {
      key: "lift",
      label: "Haltérophilie / force",
      fields: [
        { key: "mouvement", label: "Mouvement", type: "select", options: OLY_LIFTS, required: true },
        { key: "charge", label: "Charge", type: "number", unit: "kg", step: 0.5, required: true },
        { key: "reps", label: "Répétitions", type: "number", min: 1, required: true },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => `${d.mouvement} · ${num(d.charge)} kg × ${num(d.reps)}`,
      records: (d) => {
        const e = estimate1RM(num(d.charge), num(d.reps));
        return e ? [{ key: `lift_${d.mouvement}`, label: `${d.mouvement} (1RM estimé)`, value: e, display: `${e} kg`, better: "higher" }] : [];
      },
    },
  ],
  stats: (entries) => [
    { label: "WOD ce mois", value: String(entries.filter((e) => e.kind === "wod" && daysAgo(e.performed_on) < 30).length) },
    { label: "Benchmarks suivis", value: String(new Set(entries.filter((e) => e.kind === "wod" && BENCHMARKS.some((b) => b.toLowerCase() === String(e.data.nom ?? "").toLowerCase())).map((e) => String(e.data.nom).toLowerCase())).size) },
  ],
};

// ── Force / powerlifting ────────────────────────────────────────────────

const FORCE_LIFTS = ["Squat", "Développé couché", "Soulevé de terre", "Développé militaire", "Autre"];

const force: Discipline = {
  key: "force",
  label: "Force et powerlifting",
  menuLabel: "Force",
  description: "Tes séries lourdes, ton 1RM estimé sur chaque mouvement, ton total et ton score DOTS.",
  kinds: [
    {
      key: "serie",
      label: "Série lourde ou test",
      fields: [
        { key: "mouvement", label: "Mouvement", type: "select", options: FORCE_LIFTS, required: true },
        { key: "charge", label: "Charge", type: "number", unit: "kg", step: 0.5, required: true },
        { key: "reps", label: "Répétitions", type: "number", min: 1, required: true },
        { key: "rpe", label: "RPE", type: "scale", min: 6, max: 10, hint: "10 = aucune répétition de plus possible" },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => {
        const e = estimate1RM(num(d.charge), num(d.reps));
        return `${d.mouvement} · ${num(d.charge)} kg × ${num(d.reps)}${num(d.rpe) ? ` @${num(d.rpe)}` : ""}${e ? ` · 1RM ≈ ${e} kg` : ""}`;
      },
      records: (d) => {
        const e = estimate1RM(num(d.charge), num(d.reps));
        return e && d.mouvement !== "Autre" ? [{ key: `e1rm_${d.mouvement}`, label: `${d.mouvement}`, value: e, display: `${e} kg`, better: "higher" }] : [];
      },
    },
  ],
  stats: (entries, ctx) => {
    const best = bestRecords(force, entries);
    const get = (l: string) => best.find((r) => r.key === `e1rm_${l}`)?.value ?? 0;
    const total = get("Squat") + get("Développé couché") + get("Soulevé de terre");
    const score = total && ctx.bodyweightKg ? dots(total, ctx.bodyweightKg, ctx.isWoman) : null;
    return [
      { label: "Total estimé (SBD)", value: total ? `${Math.round(total)} kg` : "à compléter" },
      { label: "Score DOTS", value: score ? frNum(score) : ctx.bodyweightKg ? "à compléter" : "pèse-toi d'abord" },
      { label: "Séries notées (30 j)", value: String(entries.filter((e) => daysAgo(e.performed_on) < 30).length) },
    ];
  },
  tip: "Le 1RM estimé n'est fiable que sur des séries de 1 à 10 répétitions faites proprement.",
};

// ── Rééducation et reprise ─────────────────────────────────────────────

const ZONES = ["Genou", "Épaule", "Lombaires", "Dos haut", "Cervicales", "Hanche", "Cheville", "Pied", "Coude", "Poignet", "Ischios", "Mollet", "Autre"];

const reeducation: Discipline = {
  key: "reeducation",
  label: "Rééducation et reprise",
  menuLabel: "Rééducation",
  description: "Ta douleur zone par zone, tes séances de rééducation et ton amplitude, pour reprendre sans rechute.",
  kinds: [
    {
      key: "douleur",
      label: "Douleur du jour",
      fields: [
        { key: "zone", label: "Zone", type: "select", options: ZONES, required: true },
        { key: "cote", label: "Côté", type: "select", options: ["Gauche", "Droit", "Les deux", "Central"] },
        { key: "intensite", label: "Douleur", type: "scale", min: 0, max: 10, required: true, hint: "0 = aucune, 10 = maximale" },
        { key: "moment", label: "Quand", type: "select", options: ["Au repos", "Pendant l'effort", "Le lendemain", "Au réveil"] },
        { key: "notes", label: "Notes", type: "text" },
      ],
      summary: (d) => `${d.zone}${d.cote ? ` (${String(d.cote).toLowerCase()})` : ""} · ${num(d.intensite)}/10${d.moment ? ` · ${String(d.moment).toLowerCase()}` : ""}`,
    },
    {
      key: "seance",
      label: "Séance de rééducation",
      fields: [
        { key: "exercices", label: "Exercices faits", type: "text", placeholder: "Pont fessier, élastique rotation externe...", required: true },
        { key: "duree", label: "Durée", type: "duration", placeholder: "25" },
        { key: "douleur_apres", label: "Douleur après", type: "scale", min: 0, max: 10 },
        { key: "amplitude", label: "Amplitude ou mobilité", type: "text", placeholder: "Flexion genou 120°, bras au-dessus de la tête..." },
      ],
      summary: (d) => [d.exercices, num(d.duree) ? formatDuration(num(d.duree)) : "", num(d.douleur_apres) != null ? `douleur après ${num(d.douleur_apres)}/10` : ""].filter(Boolean).join(" · "),
    },
  ],
  stats: (entries) => {
    const pain = (from: number, to: number) => {
      const list = entries.filter((e) => e.kind === "douleur" && daysAgo(e.performed_on) >= from && daysAgo(e.performed_on) < to).map((e) => num(e.data.intensite) ?? 0);
      return list.length ? frNum(list.reduce((a, b) => a + b, 0) / list.length) : null;
    };
    const now = pain(0, 7);
    const before = pain(7, 14);
    return [
      { label: "Douleur moyenne (7 j)", value: now == null ? "aucune saisie" : `${now}/10` },
      { label: "Semaine d'avant", value: before == null ? "aucune saisie" : `${before}/10` },
      { label: "Séances (7 j)", value: String(entries.filter((e) => e.kind === "seance" && daysAgo(e.performed_on) < 7).length) },
    ];
  },
  tip: "Repère courant : si la douleur reste à 3/10 ou moins pendant l'effort et le lendemain, tu peux en général continuer à progresser. Au-delà, on lève le pied. Ton kiné ou ton médecin reste la référence.",
};

// ── Suivi santé renforcé ───────────────────────────────────────────────

const BLOOD_FIELDS: FieldDef[] = [
  { key: "hematocrite", label: "Hématocrite", type: "number", unit: "%", step: 0.1 },
  { key: "hemoglobine", label: "Hémoglobine", type: "number", unit: "g/dL", step: 0.1 },
  { key: "ldl", label: "LDL cholestérol", type: "number", unit: "g/L", step: 0.01 },
  { key: "hdl", label: "HDL cholestérol", type: "number", unit: "g/L", step: 0.01 },
  { key: "triglycerides", label: "Triglycérides", type: "number", unit: "g/L", step: 0.01 },
  { key: "glycemie", label: "Glycémie à jeun", type: "number", unit: "g/L", step: 0.01 },
  { key: "alat", label: "ALAT", type: "number", unit: "UI/L" },
  { key: "asat", label: "ASAT", type: "number", unit: "UI/L" },
  { key: "ggt", label: "Gamma GT", type: "number", unit: "UI/L" },
  { key: "creatinine", label: "Créatinine", type: "number", unit: "mg/L", step: 0.1 },
  { key: "testosterone", label: "Testostérone totale", type: "number", unit: "ng/mL", step: 0.01 },
  { key: "oestradiol", label: "Œstradiol", type: "number", unit: "pg/mL" },
  { key: "psa", label: "PSA", type: "number", unit: "ng/mL", step: 0.01 },
  { key: "notes", label: "Notes", type: "text" },
];

const sante: Discipline = {
  key: "sante",
  label: "Suivi santé renforcé",
  menuLabel: "Santé",
  description: "Ta tension et tes prises de sang au même endroit, avec l'évolution d'une analyse à l'autre. Pour les athlètes qui veulent un suivi santé sérieux, quelle que soit leur préparation.",
  kinds: [
    {
      key: "tension",
      label: "Tension artérielle",
      fields: [
        { key: "systolique", label: "Systolique", type: "number", unit: "mmHg", required: true },
        { key: "diastolique", label: "Diastolique", type: "number", unit: "mmHg", required: true },
        { key: "fc", label: "Pouls", type: "number", unit: "bpm" },
        { key: "moment", label: "Moment", type: "select", options: ["Matin", "Soir", "Après l'effort"] },
      ],
      summary: (d) => `${num(d.systolique)}/${num(d.diastolique)} mmHg${num(d.fc) ? ` · ${num(d.fc)} bpm` : ""}`,
    },
    {
      key: "prise_de_sang",
      label: "Prise de sang",
      fields: BLOOD_FIELDS,
      summary: (d) => {
        const filled = BLOOD_FIELDS.filter((f) => f.type === "number" && num(d[f.key]) != null);
        return filled.length ? `${filled.length} valeur${filled.length > 1 ? "s" : ""} : ${filled.slice(0, 3).map((f) => `${f.label} ${num(d[f.key])}`).join(", ")}${filled.length > 3 ? "..." : ""}` : "Analyse sans valeur saisie";
      },
    },
  ],
  stats: (entries) => {
    const tensions = entries.filter((e) => e.kind === "tension" && daysAgo(e.performed_on) < 14);
    const avg = (k: string) => (tensions.length ? Math.round(tensions.reduce((s, e) => s + (num(e.data[k]) ?? 0), 0) / tensions.length) : null);
    const lastBlood = entries.find((e) => e.kind === "prise_de_sang");
    const sinceBlood = lastBlood ? Math.round(daysAgo(lastBlood.performed_on)) : null;
    return [
      { label: "Tension moyenne (14 j)", value: tensions.length ? `${avg("systolique")}/${avg("diastolique")}` : "aucune mesure" },
      { label: "Dernière prise de sang", value: sinceBlood == null ? "aucune" : sinceBlood === 0 ? "aujourd'hui" : `il y a ${sinceBlood} j` },
    ];
  },
  tip: "Une tension régulièrement à 140/90 ou plus, ou une valeur d'analyse qui change beaucoup, mérite d'en parler à ton médecin. L'appli garde l'historique, elle ne pose pas de diagnostic.",
};

export const DISCIPLINES: Discipline[] = [course, hyrox, crossfit, force, reeducation, sante];
export const DISCIPLINE_BY_KEY = Object.fromEntries(DISCIPLINES.map((d) => [d.key, d])) as Record<DisciplineKey, Discipline>;

export function isDisciplineKey(v: unknown): v is DisciplineKey {
  return typeof v === "string" && v in DISCIPLINE_BY_KEY;
}

/** Validation et nettoyage d'une saisie avant enregistrement. */
export function cleanEntryData(discipline: DisciplineKey, kindKey: string, raw: Record<string, unknown>): { data: EntryData } | { error: string } {
  const kind = DISCIPLINE_BY_KEY[discipline]?.kinds.find((k) => k.key === kindKey);
  if (!kind) return { error: "Type de saisie inconnu." };
  const data: EntryData = {};
  for (const f of kind.fields) {
    const v = raw[f.key];
    if (v == null || v === "") {
      if (f.required) return { error: `${f.label} : à renseigner.` };
      continue;
    }
    if (f.type === "number" || f.type === "scale") {
      const n = num(v);
      if (n == null) return { error: `${f.label} : nombre attendu.` };
      if ((f.min != null && n < f.min) || (f.max != null && n > f.max) || n < 0 || n > 100000) return { error: `${f.label} : valeur hors limites.` };
      data[f.key] = n;
    } else if (f.type === "duration") {
      const sec = typeof v === "number" ? v : parseDuration(String(v));
      if (sec == null || sec <= 0 || sec > 7 * 24 * 3600) return { error: `${f.label} : durée attendue (ex. 52:30).` };
      data[f.key] = sec;
    } else if (f.type === "select") {
      if (!f.options?.includes(String(v))) return { error: `${f.label} : choix invalide.` };
      data[f.key] = String(v);
    } else {
      data[f.key] = String(v).slice(0, 500);
    }
  }
  return { data };
}
