import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveTrackingProfile, describeTracking, isWeighDay, levelFromScore, scoreTracking, type TrackingInput } from "../tracking-profile";

// Cas concret 1 : femme de 34 ans, perte de poids, jamais fait de sport (Inès).
const ines: TrackingInput = {
  gender: "Femme", goal: "perte_poids", experience: "debutant", practices: ["perte_gras"], trainingFrequency: "0",
  tracksNutrition: "jamais", eatingRelation: "non", coached: true, weeksSinceStart: 2,
};
// Cas concret 2 : homme de 26 ans, body naturel, prises de muscle, déficits, peak weeks, compétitions.
const competiteur: TrackingInput = {
  gender: "Homme", goal: "prise_muscle", experience: "confirme", practices: ["musculation", "bodybuilding_compet"],
  history: ["prise_muscle", "deficit", "peak_week", "competition"], years: "plus_3", sessionsPerWeek: 5, tracksNutrition: "toujours",
  eatingRelation: "non", competitionPrep: true, weeksToCompetition: 10, coached: true, weeksSinceStart: 20, hasWearable: true,
};

test("Inès : Simple, peu de champs, rien de bloquant, repas cochés sans chiffres", () => {
  const p = deriveTrackingProfile(ines);
  assert.equal(p.level, "simple");
  assert.equal(p.weighIn.mode, "few");
  assert.deepEqual(p.weighIn.days, [1, 3, 5]);
  assert.equal(p.nutrition.detail, "habits");
  assert.equal(p.nutrition.showNumbers, false);
  assert.equal(p.training.effort, "none");
  assert.equal(p.photos.cadence, "monthly");
  assert.equal(p.checkin.depth, "short");
  assert.deepEqual(p.gate, { morning: false, meal: false, evening: false });
  assert.equal(p.reminders.maxPerDay, 1);
  assert.ok(p.bilan.fields.length <= 4);
  assert.equal(p.tone, "encourageant");
  assert.equal(p.minimumViable.length, 3);
});

test("Compétiteur naturel : Avancé, pesée quotidienne, macros, RIR/RPE, photos de pose, peak week", () => {
  const p = deriveTrackingProfile(competiteur);
  assert.equal(p.level, "avance");
  assert.equal(p.weighIn.mode, "daily");
  assert.equal(p.weighIn.weeklyAverage, true);
  assert.equal(p.nutrition.detail, "macros");
  assert.equal(p.training.effort, "rir_rpe");
  assert.equal(p.training.executionScore, true);
  assert.equal(p.photos.cadence, "weekly");
  assert.equal(p.photos.pose, true);
  assert.equal(p.competition.planning, true);
  assert.equal(p.checkin.perWeek, 2);
  assert.ok(p.bilan.fields.includes("cardio_repos"));
  // Montre connectée : pas de saisie manuelle des horaires de sommeil.
  assert.ok(!p.bilan.fields.includes("horaires_sommeil"));
  assert.equal(p.homeMetrics[0], "competition");
  assert.equal(p.tone, "technique");
});

test("Rappels de peak week seulement dans la dernière semaine", () => {
  assert.equal(deriveTrackingProfile(competiteur).competition.peakWeekReminders, false);
  assert.equal(deriveTrackingProfile({ ...competiteur, weeksToCompetition: 1 }).competition.peakWeekReminders, true);
});

test("Débutant en prise de muscle : Simple mais séances au centre", () => {
  const p = deriveTrackingProfile({ goal: "prise_muscle", experience: "debutant", practices: ["musculation"], trainingFrequency: "3-4" });
  assert.equal(p.level, "simple");
  assert.deepEqual(p.weighIn.days, [1, 4]);
  assert.equal(p.homeMetrics[0], "seance");
});

test("Intermédiaire qui a fait prise de muscle et déficit : Standard (profil composite)", () => {
  const p = deriveTrackingProfile({ experience: "intermediaire", history: ["prise_muscle", "deficit"], trainingFrequency: "3-4", tracksNutrition: "parfois" });
  assert.equal(p.level, "standard");
  assert.equal(p.nutrition.detail, "calories");
  assert.equal(p.training.effort, "rir");
  assert.equal(p.weighIn.mode, "daily");
  assert.equal(p.gate.morning, true);
  assert.equal(p.gate.meal, false);
});

test("Composite : débutant mais compétiteur dans l'âme reste lisible (le score s'additionne)", () => {
  const p = deriveTrackingProfile({ experience: "confirme", obstacle: "manque_de_temps", tracksNutrition: "toujours", trainingFrequency: "3-4" });
  // 2 (confirmé) + 1 (suit ses macros) - 1 (temps) = 2 : Standard
  assert.equal(p.score, 2);
  assert.equal(p.level, "standard");
  assert.ok(p.reasons.some((r) => r.includes("temps")));
});

test("Powerlifter confirmé : RPE par série", () => {
  const p = deriveTrackingProfile({ experience: "confirme", practices: ["force"], years: "plus_3", history: ["prise_muscle"], tracksNutrition: "toujours" });
  assert.equal(p.level, "avance");
  assert.equal(p.training.effort, "rir_rpe");
  assert.equal(p.photos.pose, false);
});

test("Relation à l'alimentation « actuellement » : aucun chiffre, pesée hebdomadaire, niveau Simple", () => {
  const p = deriveTrackingProfile({ ...competiteur, eatingRelation: "actuel" });
  assert.equal(p.level, "simple");
  assert.equal(p.nutrition.detail, "habits");
  assert.equal(p.nutrition.showNumbers, false);
  assert.equal(p.weighIn.mode, "weekly");
  assert.ok(!p.bilan.fields.includes("faim"));
  assert.equal(p.cycle, "off");
  assert.ok(p.safeguards.length > 0);
});

test("Le doute (« je ne sais pas ») protège comme « actuellement »", () => {
  const p = deriveTrackingProfile({ ...ines, eatingRelation: "incertain" });
  assert.equal(p.nutrition.showNumbers, false);
  assert.equal(p.weighIn.mode, "weekly");
});

test("Passé de TCA : plafonné à Standard, pas de pesée quotidienne ni de macros, sauf décision du coach", () => {
  const auto = deriveTrackingProfile({ ...competiteur, eatingRelation: "passe" });
  assert.equal(auto.level, "standard");
  assert.equal(auto.weighIn.mode, "weekly");
  assert.notEqual(auto.nutrition.detail, "macros");
  const coach = deriveTrackingProfile({ ...competiteur, eatingRelation: "passe", override: { level: "avance", by: "coach" } });
  assert.equal(coach.level, "avance");
  assert.equal(coach.source, "coach");
  assert.equal(coach.weighIn.mode, "daily");
});

test("Même en Avancé choisi par le coach, « actuellement » n'affiche jamais de chiffres", () => {
  const p = deriveTrackingProfile({ eatingRelation: "actuel", override: { level: "avance", by: "coach" } });
  assert.equal(p.level, "avance");
  assert.equal(p.nutrition.showNumbers, false);
});

test("Le client change de niveau en 1 tap : l'override l'emporte et la raison le dit", () => {
  const p = deriveTrackingProfile({ ...ines, override: { level: "standard", by: "client" } });
  assert.equal(p.level, "standard");
  assert.equal(p.autoLevel, "simple");
  assert.equal(p.source, "client");
  assert.equal(p.reasons[0], "Niveau choisi par toi");
});

test("Aucune règle liée à l'âge : une date de naissance ou un âge ne changent rien", () => {
  const base = deriveTrackingProfile(ines);
  const withAge = deriveTrackingProfile({ ...ines, ageYears: 15, dateOfBirth: "2011-01-01" } as TrackingInput);
  assert.deepEqual(withAge, base);
});

test("Cycle : proposé à une femme en Standard, actif si elle l'a choisi, jamais imposé en Simple, absent pour un homme", () => {
  const std: TrackingInput = { gender: "Femme", experience: "intermediaire" };
  assert.equal(deriveTrackingProfile(std).cycle, "offer");
  assert.equal(deriveTrackingProfile({ ...std, cycleOptIn: true }).cycle, "on");
  assert.equal(deriveTrackingProfile(ines).cycle, "off");
  assert.equal(deriveTrackingProfile({ gender: "Homme", experience: "intermediaire" }).cycle, "off");
});

test("Rappels à l'heure de la personne et bornés", () => {
  const early = deriveTrackingProfile({ experience: "confirme", years: "plus_3", history: ["peak_week"], wakeTime: "05:00", bedTime: "20:00" });
  assert.equal(early.reminders.morning, "06:30");
  assert.equal(early.reminders.evening, "19:30");
  const late = deriveTrackingProfile({ experience: "confirme", years: "plus_3", history: ["peak_week"], wakeTime: "10:30", bedTime: "23:59" });
  assert.equal(late.reminders.morning, "11:00");
  assert.equal(late.reminders.evening, "22:30");
});

test("Inconnu : Standard avec explication, jamais de Simple par défaut", () => {
  const p = deriveTrackingProfile({});
  assert.equal(p.level, "standard");
  assert.ok(p.reasons[0].includes("pas encore assez"));
});

test("Adhésion faible : on allège le score et on suggère Simple, sans rien appliquer seul", () => {
  const p = deriveTrackingProfile({ experience: "intermediaire", weeksSinceStart: 6, bilanDays14: 2, bilanDays28: 6 });
  assert.equal(p.level, "standard");
  assert.equal(p.score, 0);
  assert.equal(p.suggestion?.level, "simple");
  const s = deriveTrackingProfile({ experience: "confirme", years: "plus_3", history: ["peak_week"], tracksNutrition: "toujours", weeksSinceStart: 6, bilanDays14: 2 });
  assert.equal(s.level, "avance");
  assert.equal(s.suggestion?.level, "standard");
});

test("Régularité : un Simple très régulier se voit proposer Standard (suggestion seulement)", () => {
  const p = deriveTrackingProfile({ ...ines, experience: "intermediaire", trainingFrequency: "1-2", weeksSinceStart: 8, bilanDays14: 14, bilanDays28: 27, goal: "sante_bien_etre", tracksNutrition: "jamais" });
  assert.equal(p.autoLevel, "simple");
  assert.equal(p.suggestion?.level, "standard");
  assert.equal(p.level, "simple");
});

test("Jours de pesée et seuils de score", () => {
  const p = deriveTrackingProfile(ines);
  assert.equal(isWeighDay(p, 1), true);
  assert.equal(isWeighDay(p, 2), false);
  assert.equal(levelFromScore(5), "avance");
  assert.equal(levelFromScore(4), "standard");
  assert.equal(levelFromScore(-1), "simple");
  assert.equal(scoreTracking({}).score, 0);
});

test("Blessure déclarée : contrôle de douleur par séance, sans diagnostic", () => {
  assert.equal(deriveTrackingProfile({ experience: "intermediaire", hasInjury: true }).training.painCheck, true);
  assert.equal(deriveTrackingProfile({ experience: "intermediaire" }).training.painCheck, false);
});

test("Résumé lisible et sans tiret cadratin", () => {
  for (const input of [ines, competiteur, {}]) {
    const lines = describeTracking(deriveTrackingProfile(input));
    assert.ok(lines.length >= 6);
    for (const l of lines) assert.ok(!l.includes("—"), l);
  }
  const p = deriveTrackingProfile(ines);
  for (const r of [...p.reasons, ...p.safeguards]) assert.ok(!r.includes("—"), r);
});
