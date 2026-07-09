import { VOLUME_LANDMARKS } from "@/lib/volume-data";
import type { ProgramWithDays } from "@/utils/programs";
import type { WorkoutLog } from "@/utils/workout-logs";

function currentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return weekStart.toISOString().split("T")[0];
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
      ? "SOUS-MEV"
      : total <= landmark.mav
      ? "OPTIMAL"
      : total <= landmark.mrv
      ? "PROCHE MRV"
      : "DÉPASSEMENT MRV";

  const fillColor =
    total < landmark.mev
      ? "bg-red-600/70"
      : total <= landmark.mav
      ? "bg-green-500"
      : total <= landmark.mrv
      ? "bg-orange-500"
      : "bg-red-900";

  const badgeCls =
    total < landmark.mev
      ? "text-red-400 border-red-500/30 bg-red-500/10"
      : total <= landmark.mav
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : total <= landmark.mrv
      ? "text-orange-400 border-orange-500/30 bg-orange-500/10"
      : "text-red-300 border-red-700/40 bg-red-900/20";

  const mevPct = (landmark.mev / scale) * 100;
  const mavPct = (landmark.mav / scale) * 100;
  const mrvPct = (landmark.mrv / scale) * 100;
  const fillPct = Math.min((total / scale) * 100, 100);

  return (
    <div className="space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-white flex-shrink-0">{group}</span>
          <span className="text-[10px] text-[#F5EDED]/35 truncate">
            {direct} directs
            {indirect > 0 && ` + ${indirect} indirects`}
            {" "}= <strong className="text-[#F5EDED]/60">{total} sets</strong>
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeCls}`}
        >
          {zone}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 bg-[#150000] rounded-full overflow-visible border border-[#890404]/20">
        {/* Fill */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${fillColor}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* MEV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-[#F5EDED]/25"
          style={{ left: `${mevPct}%` }}
        />
        {/* MAV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-[#F5EDED]/25"
          style={{ left: `${mavPct}%` }}
        />
        {/* MRV marker */}
        <div
          className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-red-500/50"
          style={{ left: `${mrvPct}%` }}
        />
      </div>

      {/* Scale labels */}
      <div className="relative h-3">
        <span
          className="absolute text-[8px] text-[#F5EDED]/25 font-bold -translate-x-1/2"
          style={{ left: `${mevPct}%` }}
        >
          MEV {landmark.mev}
        </span>
        <span
          className="absolute text-[8px] text-[#F5EDED]/25 font-bold -translate-x-1/2"
          style={{ left: `${mavPct}%` }}
        >
          MAV {landmark.mav}
        </span>
        <span
          className="absolute text-[8px] text-red-400/50 font-bold -translate-x-1/2"
          style={{ left: `${mrvPct}%` }}
        >
          MRV {landmark.mrv}
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
                className="text-[8px] font-semibold text-[#F5EDED]/40 bg-[#150000] border border-[#890404]/15 rounded-full px-2 py-0.5"
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
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5EDED]/5 border border-[#F5EDED]/10 text-[#F5EDED]/30">
        Première session
      </span>
    );
  } else if (currentWeight === null) {
    badge = (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5EDED]/5 border border-[#F5EDED]/10 text-[#F5EDED]/30">
        = Stable
      </span>
    );
  } else {
    badge = (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">
        ▲ Données disponibles
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[#890404]/10 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{name}</p>
        <p className="text-[9px] text-[#F5EDED]/30">{dayLabel}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {rir !== null && (
          <span className="text-[9px] font-bold text-[#F5EDED]/40 border border-[#890404]/20 px-1.5 py-0.5 rounded">
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
  const weightMap: Record<string, number | null> = {};
  for (const log of workoutLogs) {
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
      {/* ── Adherence this week ── */}
      {sessionsThisWeek != null && frequency != null && (
        <div className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-3.5">
          <p className="text-xs font-bold text-white">
            {sessionsThisWeek}/{frequency} séances cette semaine
          </p>
          <div className="flex gap-1">
            {Array.from({ length: frequency }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full ${
                  i < sessionsThisWeek ? "bg-[#E01E1E]" : "bg-[#890404]/20"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Volume réalisé cette semaine (logué en temps réel) ── */}
      {hasRealized && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-5">
            Volume : réalisé cette semaine
          </p>
          <div className="space-y-5">
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
        </div>
      )}

      {/* ── Volume section ── */}
      {hasVolume && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-5">
            Volume : semaine planifiée
          </p>
          <div className="space-y-5">
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
        </div>
      )}

      {/* ── Intensity section ── */}
      {hasExercises && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
            Intensité : RIR & Progression
          </p>
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
        </div>
      )}
    </div>
  );
}
