import test from "node:test";
import assert from "node:assert/strict";
import { PRESET_PROGRAMS, recommendPreset } from "../preset-programs";
import { TRAINING_RULES, WEEKLY_SETS_FLOOR } from "../coaching-knowledge";
import { EXERCISE_LIBRARY_SEED } from "../exercise-library-seed";
import { isTrainingExercise } from "../exercise-selection";

const BIG = ["Pectoraux", "Dos", "Épaules", "Quadriceps", "Ischio-jambiers"];
const hypertrophy = PRESET_PROGRAMS.filter((p) => !p.style && p.id !== "maison");

function weekly(p: (typeof PRESET_PROGRAMS)[number]): Record<string, number> {
  const by: Record<string, number> = {};
  for (const d of p.input.days) for (const e of d.exercises) by[e.muscle_group ?? ""] = (by[e.muscle_group ?? ""] ?? 0) + (e.sets as number);
  return by;
}

test("modèles : identifiants uniques, fréquence = nombre de séances, tous les nombres de séances de 2 à 6 couverts", () => {
  const ids = PRESET_PROGRAMS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PRESET_PROGRAMS) {
    assert.equal(p.input.days.length, p.frequency, p.id);
    assert.equal(p.input.frequency, p.frequency, p.id);
  }
  for (const n of [2, 3, 4, 5, 6]) assert.ok(PRESET_PROGRAMS.some((p) => p.frequency === n), `aucun modèle à ${n} séances`);
  for (const lvl of ["debutant", "intermediaire", "avance"]) assert.ok(PRESET_PROGRAMS.some((p) => p.level === lvl), lvl);
  assert.ok(PRESET_PROGRAMS.some((p) => p.style === "force"));
  assert.ok(PRESET_PROGRAMS.some((p) => p.style === "calisthenics"));
});

test("modèles : volume par grand muscle entre le plancher et 25 séries par semaine", () => {
  for (const p of hypertrophy) {
    const by = weekly(p);
    for (const g of BIG) {
      if (by[g] == null) continue;
      assert.ok(by[g] >= WEEKLY_SETS_FLOOR, `${p.id} ${g} ${by[g]}`);
      assert.ok(by[g] <= TRAINING_RULES.weeklyHardSetsRange.max, `${p.id} ${g} ${by[g]}`);
    }
  }
  for (const p of PRESET_PROGRAMS) {
    for (const [g, n] of Object.entries(weekly(p))) assert.ok(n <= TRAINING_RULES.weeklyHardSetsRange.max, `${p.id} ${g} ${n}`);
  }
});

test("modèles : dès 3 séances, pectoraux, dos et quadriceps reviennent au moins deux fois", () => {
  for (const p of hypertrophy.filter((x) => x.frequency >= 3)) {
    for (const g of ["Pectoraux", "Dos", "Quadriceps"]) {
      const days = p.input.days.filter((d) => d.exercises.some((e) => e.muscle_group === g)).length;
      assert.ok(days >= 2, `${p.id} ${g} ${days}`);
    }
  }
});

test("modèles : repos dans les fourchettes du Mastermind pour la musculation, proximité de l'échec 0 à 3", () => {
  const compound = /squat|presse|développé|tractions|tirage|rowing|soulevé|dips|fentes|hip thrust/i;
  for (const p of hypertrophy) {
    for (const d of p.input.days) {
      for (const e of d.exercises) {
        const rest = e.rest_seconds as number;
        if (compound.test(e.name)) assert.ok(rest >= TRAINING_RULES.restSeconds.compound.min, `${p.id} ${e.name} ${rest}`);
        else assert.ok(rest >= TRAINING_RULES.restSeconds.isolation.min && rest <= TRAINING_RULES.restSeconds.isolation.max, `${p.id} ${e.name} ${rest}`);
        if (e.rir != null) assert.ok(e.rir >= TRAINING_RULES.rirRange.min && e.rir <= TRAINING_RULES.rirRange.max, `${p.id} ${e.name}`);
      }
    }
  }
});

test("modèles débutants : 2 à 3 répétitions en réserve sur les mouvements de force", () => {
  for (const p of PRESET_PROGRAMS.filter((x) => x.level === "debutant" && !x.style && x.id !== "maison")) {
    for (const d of p.input.days) {
      for (const e of d.exercises) {
        if (e.rir != null && /presse|squat|développé|tirage|rowing/i.test(e.name)) assert.ok(e.rir >= TRAINING_RULES.rirBeginner.min, `${p.id} ${e.name}`);
      }
    }
  }
});

test("modèles générés : aucun drill de mobilité ni de rééducation, tous les exercices existent dans la bibliothèque", () => {
  const names = new Set(EXERCISE_LIBRARY_SEED.map((e) => e.name));
  for (const id of ["debutant3", "haut_bas_corps", "ppl_ul5", "ppl", "maison_equipe"]) {
    const p = PRESET_PROGRAMS.find((x) => x.id === id)!;
    for (const d of p.input.days) {
      for (const e of d.exercises) {
        assert.ok(names.has(e.name), `${id} ${e.name}`);
        assert.ok(isTrainingExercise({ name: e.name, muscle_group: e.muscle_group ?? "" }), `${id} ${e.name}`);
        assert.ok(e.is_direct, `${id} ${e.name}`);
      }
    }
  }
});

test("modèles : pas de tiret cadratin dans les textes visibles", () => {
  for (const p of PRESET_PROGRAMS) {
    const text = JSON.stringify([p.name, p.description, p.split, p.input.days.map((d) => [d.day_label, d.notes, d.exercises.map((e) => e.notes)])]);
    assert.doesNotMatch(text, /—/, p.id);
  }
});

test("recommandation : suit la fréquence et le niveau, jamais un programme lourd pour un débutant", () => {
  assert.equal(recommendPreset({ experience_level: "debutant", training_frequency: "3-4" }).preset.id, "debutant3");
  assert.equal(recommendPreset({ experience_level: "debutant", training_frequency: "1-2" }).preset.id, "debutant2");
  assert.equal(recommendPreset({ experience_level: "intermediaire", training_frequency: "5+" }).preset.id, "ppl_ul5");
  assert.equal(recommendPreset({ experience_level: "confirme", training_frequency: "3-4" }).preset.id, "upperlower");
  assert.equal(recommendPreset({ experience_level: "intermediaire", training_frequency: "3-4", primary_goal: "prise_muscle" }).preset.id, "haut_bas_corps");
  assert.equal(recommendPreset({ training_frequency: "0" }).preset.id, "maison");
  assert.equal(recommendPreset(null).preset.id, "debutant2");
  for (const level of ["debutant", "intermediaire", "confirme"] as const) {
    for (const freq of ["0", "1-2", "3-4", "5+"] as const) {
      const r = recommendPreset({ experience_level: level, training_frequency: freq });
      assert.ok(r.reason.length > 10);
      assert.doesNotMatch(r.reason, /—/);
    }
  }
});
