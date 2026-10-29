import test from "node:test";
import assert from "node:assert/strict";
import { MEDICAL_CONSTRAINTS, getMedicalConstraintBySlug } from "../medical-constraints";
import { COACHING_KNOWLEDGE_PROMPT } from "../coaching-knowledge";

test("fiches : slugs uniques, chaque fiche a des principes, des signaux d'alerte et des sources", () => {
  const slugs = MEDICAL_CONSTRAINTS.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const c of MEDICAL_CONSTRAINTS) {
    assert.ok(c.adaptationPrinciples.length >= 2, c.slug);
    assert.ok(c.redFlags.length >= 2, c.slug);
    assert.ok(c.sources.length >= 1, c.slug);
  }
});

test("niveau 6 du Mastermind : RED-S, SOPK, contraception, cycle et compétition sont présents", () => {
  for (const slug of ["red-s", "sopk", "contraception-hormonale", "cycle-menstruel", "preparation-competition"]) {
    assert.ok(getMedicalConstraintBySlug(slug), slug);
  }
});

test("fiches santé des femmes : aucun diagnostic, orientation vers un professionnel de santé, jamais de changement de traitement", () => {
  for (const slug of ["red-s", "sopk", "contraception-hormonale", "cycle-menstruel"]) {
    const c = getMedicalConstraintBySlug(slug)!;
    const text = [c.overview, ...c.adaptationPrinciples, ...c.redFlags].join(" ").toLowerCase();
    assert.match(text, /médecin|professionnel de santé|gynécologue/, slug);
    assert.doesNotMatch(text, /tu as (un|le) (sopk|red-s)/, slug);
  }
  const sopk = getMedicalConstraintBySlug("sopk")!;
  assert.match(sopk.overview, /jamais celui du coach/);
  const pill = getMedicalConstraintBySlug("contraception-hormonale")!;
  assert.match(pill.adaptationPrinciples.join(" "), /ne conseille jamais de commencer, d'arrêter ou de changer/);
});

test("RED-S : l'appli ne chiffre aucune prise en charge (ni hausse de calories, ni calcium)", () => {
  const c = getMedicalConstraintBySlug("red-s")!;
  const principles = c.adaptationPrinciples.join(" ");
  assert.doesNotMatch(principles, /\b(300|600|1500)\b/);
  assert.match(principles, /professionnel de santé/);
});

test("compétition : aucun conseil sur les produits dopants ni la peak week", () => {
  const c = getMedicalConstraintBySlug("preparation-competition")!;
  const text = c.adaptationPrinciples.join(" ");
  assert.match(text, /n'en conseille aucun/);
  assert.match(c.redFlags.join(" "), /refuser d'en conseiller/);
  assert.match(c.overview, /aucune préparation n'est conseillée par l'appli ni par un assistant IA/);
});

test("prompt IA : santé des femmes et compétition, jamais de diagnostic ni de plan de préparation", () => {
  assert.match(COACHING_KNOWLEDGE_PROMPT, /Santé des femmes/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /tu ne diagnostiques rien/);
  assert.match(COACHING_KNOWLEDGE_PROMPT, /jamais de plan de préparation/);
  assert.doesNotMatch(COACHING_KNOWLEDGE_PROMPT, /—/);
});
