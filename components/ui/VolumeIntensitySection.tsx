import { VOLUME_LANDMARKS } from "@/lib/volume-data";
import type { ProgramWithDays } from "@/utils/programs";
import type { WorkoutLog } from "@/utils/workout-logs";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { todayInParis } from "@/lib/dates";

// MASTERCLASS.md Axe L : new Date().toISOString() (et new Date().getDay())
// reflètent le calendrier UTC du serveur (Vercel tourne en UTC), pas celui
// de Paris. Concret pile au passage dimanche -> lundi heure de Paris (entre
// minuit et 1h/2h du matin selon été/hiver) : ce composant calculait encore
// le lundi de LA SEMAINE PRÉCÉDENTE, donc "Volume réalisé cette semaine"
// filtrait sur le mauvais week_start et affichait une semaine vide/périmée
// pile au moment où la nouvelle semaine vient de commencer. Même astuce
// (ancre midi UTC) déjà utilisée par parisNow() dans lib/meal-slots.ts.
function currentWeekStart(): string {
  const todayStr = todayInParis();
  const dow = new Date(`${todayStr}T12:00:00Z`).getUTCDay(); // 0=dim...6=sam
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const [y, m, d] = todayStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysSinceMonday)).toISOString().split("T")[0];
}

// ── Volume gauge ──────────────────────────────────────────────────────────────

function VolumeGaugeRow({
  group,
  direct,
  indirect,
  landmark,
  subgroups,
}: {
  group: string;
  direct: number;
  indirect: number;
  landmark: { mev: number; mav: number; mrv: number };
  subgroups: Record<string, number>;
}) {
  const total = direct + indirect;
  const scale = Math.max(landmark.mrv + 4, total + 2);

  const zone =
    total < landmark.mev
      ? "SOUS LE DÉPART"
      : total <= landmark.mav
      ? "PLAGE DE DÉPART"
      : total <= landmark.mrv
      ? "SI RÉCUPÉRATION"
      : "AU-DELÀ DU REPÈRE";

  const fillColor =
    total < landmark.mev
      ? "bg-(--ep-bad)/70"
      : total <= landmark.mav
      ? "bg-(--ep-ok)"
      : total <= landmark.mrv
      ? "bg-(--ep-orange)"
      : "bg-(--ep-bad)";

  const badgeCls =
    total < landmark.mev
      ? "text-(--ep-bad) border-(--ep-bad)/30 bg-(--ep-bad)/10"
      : total <= landmark.mav
      ? "text-(--ep-ok) border-(--ep-ok)/30 bg-(--ep-ok)/10"
      : total <= landmark.mrv
      ? "text-(--ep-orange) border-(--ep-orange)/30 bg-(--ep-orange)/10"
      : "text-(--ep-bad) border-(--ep-bad)/40 bg-(--ep-bad)/20";

  const mevPct = (landmark.mev / scale) * 100;
  const mavPct = (landmark.mav / scale) * 100;
  const mrvPct = (landmark.mrv / scale) * 100;
  const fillPct = Math.min((total / scale) * 100, 100);

  return (
    <div className="space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-(--ep-strong) flex-shrink-0">{group}</span>
          <span className="text-[10px] text-(--ep-ink)/35 truncate">
            {direct} directs
            {indirect > 0 && ` + ${indirect} indirects`}
            {" "}= <strong className="text-(--ep-ink)/60">{total} sets</strong>
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeCls}`}
        >
          {zone}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 bg-(--ep-s2) rounded-full overflow-visible border border-(--ep-line)/20">
        {/* Fill */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${fillColor}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* MEV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-(--ep-ink)/25"
          style={{ left: `${mevPct}%` }}
        />
        {/* MAV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-(--ep-ink)/25"
          style={{ left: `${mavPct}%` }}
        />
        {/* MRV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-(--ep-bad)/50"
          style={{ left: `${mrvPct}%` }}
        />
      </div>

      {/* Scale labels */}
      <div className="relative h-3">
        <span
          className="absolute text-[8px] text-(--ep-ink)/25 font-bold -translate-x-1/2"
          style={{ left: `${mevPct}%` }}
        >
          Départ {landmark.mev}
        </span>
        <span
          className="absolute text-[8px] text-(--ep-ink)/25 font-bold -translate-x-1/2"
          style={{ left: `${mavPct}%` }}
        >
          Jusqu&apos;à {landmark.mav}
        </span>
        <span
          className="absolute text-[8px] text-(--ep-bad)/50 font-bold -translate-x-1/2"
          style={{ left: `${mrvPct}%` }}
        >
          Utile {landmark.mrv}
        </span>
      </div>

      {/* Subgroup breakdown */}
      {Object.keys(subgroups).length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {Object.entries(subgroups)
            .sort(([a], [b]) => a.localeCompare(b, "fr"))
            .map(([sub, sets]) => (
              <span
                key={sub}
                className="text-[8px] font-semibold text-(--ep-ink)/40 bg-(--ep-s2) border border-(--ep-line)/15 rounded-full px-2 py-0.5"
              >
                {sub} · {sets}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Intensity row ─────────────────────────────────────────────────────────────

function IntensityRow({
  name,
  dayLabel,
  rir,
  currentWeight,
}: {
  name: string;
  dayLabel: string;
  rir: number | null;
  currentWeight: number | null | undefined;
}) {
  let badge: React.ReactNode;

  if (currentWeight === undefined) {
    // No log found for this exercise
    badge = (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-(--ep-ink)/5 border border-(--ep-ink)/10 text-(--ep-ink)/30">
        Première session
      </span>
    );
  } else if (currentWeight === null) {
    badge = (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-(--ep-ink)/5 border border-(--ep-ink)/10 text-(--ep-ink)/30">
        = Stable
      </span>
    );
  } else {
    badge = (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-(--ep-ok)/15 border border-(--ep-ok)/25 text-(--ep-ok)">
        ▲ Données disponibles
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-(--ep-line)/10 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-(--ep-strong) truncate">{name}</p>
        <p className="text-[9px] text-(--ep-ink)/30">{dayLabel}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {rir !== null && (
          <span className="text-[9px] font-bold text-(--ep-ink)/40 border border-(--ep-line)/20 px-1.5 py-0.5 rounded">
            RIR {rir}
          </span>
        )}
        {badge}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function VolumeIntensitySection({
  program,
  workoutLogs,
  sessionsThisWeek,
}: {
  program: ProgramWithDays;
  workoutLogs: WorkoutLog[];
  sessionsThisWeek?: number;
}) {
  // ── Compute volume per muscle group (+ subgroup breakdown) ──
  const volumeByGroup: Record<
    string,
    { direct: number; indirect: number; subgroups: Record<string, number> }
  > = {};

  for (const day of program.days) {
    for (const ex of day.exercises) {
      if (!ex.muscle_group) continue;
      const group = ex.muscle_group;
      if (!volumeByGroup[group])
        volumeByGroup[group] = { direct: 0, indirect: 0, subgroups: {} };
      const sets = ex.sets ?? 0;
      if (ex.is_direct !== false) {
        volumeByGroup[group].direct += sets;
      } else {
        volumeByGroup[group].indirect += sets;
      }
      if (ex.muscle_subgroup) {
        volumeByGroup[group].subgroups[ex.muscle_subgroup] =
          (volumeByGroup[group].subgroups[ex.muscle_subgroup] ?? 0) + sets;
      }
    }
  }

  const volumeEntries = Object.entries(volumeByGroup).sort(([a], [b]) =>
    a.localeCompare(b, "fr")
  );

  // ── Actual logged volume this week (real progress, not the static plan) ──
  const weekStart = currentWeekStart();
  const loggedThisWeek = workoutLogs.filter((w) => w.week_start === weekStart);

  const realizedByGroup: Record<
    string,
    { direct: number; indirect: number; subgroups: Record<string, number> }
  > = {};
  for (const log of loggedThisWeek) {
    const group = log.muscle_group;
    if (!group) continue;
    if (!realizedByGroup[group])
      realizedByGroup[group] = { direct: 0, indirect: 0, subgroups: {} };
    const sets = log.sets_completed ?? 0;
    if (log.is_direct !== false) {
      realizedByGroup[group].direct += sets;
    } else {
      realizedByGroup[group].indirect += sets;
    }
  }
  const realizedEntries = Object.entries(realizedByGroup).sort(([a], [b]) =>
    a.localeCompare(b, "fr")
  );
  const hasRealized = realizedEntries.length > 0;

  // ── Build weight map from workout logs ──
  // workoutLogs est trié logged_at décroissant (le plus récent gagne, voir
  // getRecentWorkoutLogs) — mais /complete insère UNE ligne par exercice DU
  // PROGRAMME à chaque fin de séance, même pour ceux jamais faits ce jour-là
  // (sets_completed=0, weight_kg=null). Sans ce filtre, un exercice sauté à
  // la dernière séance écrasait le "poids actuel" par du vide, même avec un
  // vrai historique de poids sur une séance plus ancienne (confirmé sur son
  // compte : plusieurs exercices sautés le 09/09 masquaient un poids déjà
  // loggué le 07/09).
  const weightMap: Record<string, number | null> = {};
  for (const log of workoutLogs) {
    if (!log.sets_completed || log.sets_completed <= 0) continue;
    const key = log.exercise_name.toLowerCase();
    if (!(key in weightMap)) {
      weightMap[key] = log.weight_kg ?? null;
    }
  }

  // ── All exercises flat ──
  const allExercises = program.days.flatMap((d) =>
    d.exercises.map((e) => ({ ...e, dayLabel: d.day_label }))
  );

  const hasVolume = volumeEntries.length > 0;
  const hasExercises = allExercises.length > 0;

  if (!hasVolume && !hasExercises) return null;

  const frequency = program.frequency;

  return (
    <div className="space-y-5 mb-8">
      {(hasRealized || hasVolume) && (
        <p className="text-[10px] text-(--ep-ink)/25 leading-relaxed">
          Départ à 8 à 12 séries difficiles par groupe et par semaine, jusqu&apos;à 10 à 25 seulement si le client récupère en avance. Un repère, pas une règle.
        </p>
      )}
      {/* ── Adherence this week ── */}
      {sessionsThisWeek != null && frequency != null && (
        <div className="flex items-center justify-between bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-5 py-3.5">
          <p className="text-xs font-bold text-(--ep-strong)">
            {sessionsThisWeek}/{frequency} séances cette semaine
          </p>
          <div className="flex gap-1">
            {Array.from({ length: frequency }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full ${
                  i < sessionsThisWeek ? "bg-(--ep-accent)" : "bg-(--ep-line)/20"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Volume réalisé cette semaine (logué en temps réel) ── */}
      {/* Repliable (retour direct 2026-09-01 : "ça doit être optimisé et en
          liste dépliable et pas long comme actuellement") — ouvert par
          défaut, c'est la donnée la plus immédiatement utile ("où j'en suis
          là"). */}
      {hasRealized && (
        <CollapsibleSection title="Volume : réalisé cette semaine" defaultOpen>
          <div className="space-y-5 pt-1">
            {realizedEntries.map(([group, { direct, indirect, subgroups }]) => {
              const landmark = VOLUME_LANDMARKS[group];
              if (!landmark) return null;
              return (
                <VolumeGaugeRow
                  key={group}
                  group={group}
                  direct={direct}
                  indirect={indirect}
                  landmark={landmark}
                  subgroups={subgroups}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Volume section ── */}
      {hasVolume && (
        <CollapsibleSection title="Volume : semaine planifiée">
          <div className="space-y-5 pt-1">
            {volumeEntries.map(([group, { direct, indirect, subgroups }]) => {
              const landmark = VOLUME_LANDMARKS[group];
              if (!landmark) return null;
              return (
                <VolumeGaugeRow
                  key={group}
                  group={group}
                  direct={direct}
                  indirect={indirect}
                  landmark={landmark}
                  subgroups={subgroups}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Intensity section ── */}
      {hasExercises && (
        <CollapsibleSection title="Intensité : RIR & Progression" subtitle={`${allExercises.length} exercices`}>
          <div>
            {allExercises.map((ex) => {
              const key = ex.name.toLowerCase();
              const hasLog = key in weightMap;
              return (
                <IntensityRow
                  key={ex.id}
                  name={ex.name}
                  dayLabel={ex.dayLabel}
                  rir={ex.rir}
                  currentWeight={hasLog ? weightMap[key] : undefined}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
