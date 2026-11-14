import { test } from "node:test";
import assert from "node:assert/strict";
import { addDaysIso, buildExerciseHistory, estimateMinutes, isoWeekday, musclesForDay, pickSessionBlock, plannedSetsByMuscle, shortHour, weekStartOf, type LoggedSet } from "../program-week";

/* eslint-disable @typescript-eslint/no-explicit-any */
const block = (id: string, label: string, dow: number, start: string, extra: Record<string, unknown> = {}) =>
  ({ id, label, day_of_week: dow, start_time: `${start}:00`, end_time: null, specific_date: null, skipped_dates: [], ...extra }) as any;
const ex = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: 3, rest_seconds: 90, muscle_group: null, superset_group: null, ...extra }) as any;

test("dates de la semaine", () => {
  assert.equal(weekStartOf("2026-11-11"), "2026-11-09"); // mercredi
  assert.equal(weekStartOf("2026-11-15"), "2026-11-09"); // dimanche
  assert.equal(weekStartOf("2026-11-09"), "2026-11-09"); // lundi
  assert.equal(addDaysIso("2026-12-30", 3), "2027-01-02");
  assert.equal(isoWeekday("2026-11-15"), 7);
  assert.equal(isoWeekday("2026-11-09"), 1);
  assert.equal(shortHour("18:00"), "18h");
  assert.equal(shortHour("07:30"), "7h30");
});

test("pickSessionBlock : nom d'abord, ponctuel avant récurrent, sinon bloc sport", () => {
  const blocks = [
    block("r", "Séance Push", 3, "18:00"),
    block("p", "Push (décalé)", 0, "07:00", { specific_date: "2026-11-11" }),
    block("x", "Repas", 3, "12:00"),
  ];
  assert.equal(pickSessionBlock(blocks, "Push", "2026-11-11", 3, true)?.id, "p");
  // Jour sauté : le bloc récurrent ne compte plus ce jour-là.
  const skipped = [block("r", "Séance Push", 3, "18:00", { skipped_dates: ["2026-11-11"] })];
  assert.equal(pickSessionBlock(skipped, "Push", "2026-11-11", 3, false), null);
  // Pas de nom commun : repli sur un bloc d'entraînement, sauf en mode strict.
  const sport = [block("s", "Salle", 3, "18:00"), block("x", "Repas", 3, "12:00")];
  assert.equal(pickSessionBlock(sport, "Jambes", "2026-11-11", 3, false)?.id, "s");
  assert.equal(pickSessionBlock(sport, "Jambes", "2026-11-11", 3, true), null);
  // Un bloc d'une seule lettre ne s'accroche pas à n'importe quelle séance.
  assert.equal(pickSessionBlock([block("a", "A", 3, "09:00")], "Jambes A", "2026-11-11", 3, true), null);
});

test("estimateMinutes", () => {
  assert.equal(estimateMinutes([]), null);
  // 1 exercice, 3 séries, 90 s : 120 + 150 + 2 × 90 = 450 s → 10 min (arrondi à 5).
  assert.equal(estimateMinutes([ex("Squat")]), 10);
  // Superset : repos court entre les deux exercices enchaînés.
  const chained = estimateMinutes([ex("A", { superset_group: "s1", sets: 6 }), ex("B", { superset_group: "s1", sets: 6 })])!;
  const plain = estimateMinutes([ex("A", { sets: 6 }), ex("B", { sets: 6 })])!;
  assert.ok(chained < plain);
});

const set = (o: Partial<LoggedSet>): LoggedSet => ({ exercise_name: "Squat", session_id: "s1", session_date: "2026-11-01", set_number: 1, weight_kg: 100, reps_actual: 8, rir_actual: 2, created_at: "2026-11-01T10:00:00Z", ...o });

test("buildExerciseHistory : dernière séance, doublons, tendance", () => {
  const h = buildExerciseHistory(
    [
      set({}),
      set({ created_at: "2026-11-01T10:05:00Z", reps_actual: 9 }), // doublon plus récent
      set({ set_number: 2, weight_kg: null, reps_actual: null }), // série vide ignorée
      set({ session_id: "s2", session_date: "2026-11-10", weight_kg: 105, reps_actual: 6, created_at: "2026-11-10T10:00:00Z" }),
      set({ exercise_name: "  SQUAT ", session_id: "s0", session_date: "2026-01-01", weight_kg: 60, created_at: "2026-01-01T10:00:00Z" }), // hors fenêtre
    ],
    "2026-11-11",
  );
  const sq = h["squat"];
  assert.equal(sq.lastDate, "2026-11-10");
  assert.deepEqual(sq.lastSets, [{ w: 105, r: 6, rir: 2 }]);
  assert.deepEqual(sq.trend, { kind: "kg", delta: 5, weeks: 1 });
  // Une seule séance : pas de tendance.
  assert.equal(buildExerciseHistory([set({})], "2026-11-11")["squat"].trend, null);
  // Même charge, plus de reps.
  const reps = buildExerciseHistory([set({}), set({ session_id: "s2", session_date: "2026-11-09", reps_actual: 10, created_at: "2026-11-09T10:00:00Z" })], "2026-11-11");
  assert.deepEqual(reps["squat"].trend, { kind: "reps", delta: 2, weeks: 1 });
});

test("séries par muscle", () => {
  const days = [{ exercises: [ex("A", { muscle_group: "Pecs", sets: 4 }), ex("B", { muscle_group: "Pecs", sets: 3, is_direct: false }), ex("C", { muscle_group: "Dos", sets: 5 })] }] as any;
  assert.deepEqual(plannedSetsByMuscle(days), { Pecs: 4, Dos: 5 });
  assert.deepEqual(musclesForDay(days[0].exercises), [{ group: "Pecs", sets: 7 }, { group: "Dos", sets: 5 }]);
});
