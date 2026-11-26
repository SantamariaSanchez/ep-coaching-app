import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBusinessLoop, businessLoopText, STOCK_CAP, type LoopMetrics } from "../business-loop";

const today: LoopMetrics = {
  videoStock: 195,
  videoPublished7d: 2,
  videoShotWaiting: 0,
  writtenStock: 30,
  writtenPublished7d: 0,
  daysSinceStatsCapture: 23,
  guideClicks7d: 0,
  leads7d: 0,
  auditClicks7d: 0,
  calls30d: 0,
  activeClients: 0,
  clientsLoggingFood7d: 0,
  clientsTraining7d: 0,
  selfFoodDays7d: 0,
  selfSessions7d: 1,
};

test("situation du 26/11 : le goulot est le tournage, et on arrête d'écrire du neuf", () => {
  const r = computeBusinessLoop(today);
  assert.equal(r.bottleneck?.key, "tournage");
  assert.equal(r.writingMode, "retravailler_le_stock");
  assert.ok(!r.steps.some((s) => s.key === "suivi"), "pas de ligne suivi sans cliente");
});

test("le goulot avance dans l'ordre du circuit", () => {
  const r = computeBusinessLoop({ ...today, videoPublished7d: 8, writtenPublished7d: 6, daysSinceStatsCapture: 0 });
  assert.equal(r.bottleneck?.key, "dm");
  const r2 = computeBusinessLoop({ ...today, videoPublished7d: 8, writtenPublished7d: 6, daysSinceStatsCapture: 0, guideClicks7d: 9 });
  assert.equal(r2.bottleneck?.key, "leads");
  assert.equal(r2.steps.find((s) => s.key === "leads")?.owner, "claude");
});

test("sous le plafond de stock, on écrit", () => {
  assert.equal(computeBusinessLoop({ ...today, videoStock: STOCK_CAP }).writingMode, "ecrire");
});

test("suivi des clientes au ratio, et le propre suivi du coach ne bloque pas le circuit", () => {
  const r = computeBusinessLoop({ ...today, videoPublished7d: 8, writtenPublished7d: 6, daysSinceStatsCapture: 0, guideClicks7d: 9, leads7d: 4, calls30d: 5, activeClients: 10, clientsLoggingFood7d: 3, clientsTraining7d: 9 });
  assert.equal(r.steps.find((s) => s.key === "suivi")?.tone, "bad");
  assert.equal(r.bottleneck?.key, "suivi");
  const all = computeBusinessLoop({ ...today, videoPublished7d: 8, writtenPublished7d: 6, daysSinceStatsCapture: 0, guideClicks7d: 9, leads7d: 4, calls30d: 5, activeClients: 10, clientsLoggingFood7d: 8, clientsTraining7d: 9 });
  assert.equal(all.bottleneck, null);
});

test("le texte des routines donne le goulot et la consigne", () => {
  const t = businessLoopText(computeBusinessLoop(today));
  assert.match(t, /Goulot : Vidéos tournées et publiées/);
  assert.match(t, /retravailler le stock/);
});

test("situation réelle du 26/11 matin : vidéos et LinkedIn publiés, le goulot passe aux stats puis aux DM", () => {
  const r = computeBusinessLoop({ ...today, videoStock: 195, videoPublished7d: 18, writtenStock: 30, writtenPublished7d: 47, daysSinceStatsCapture: 23, guideClicks7d: 1 });
  assert.equal(r.steps[0].tone, "ok");
  assert.equal(r.steps[1].tone, "ok");
  assert.equal(r.bottleneck?.key, "mesure");
  assert.equal(r.writingMode, "retravailler_le_stock");
  assert.equal(r.writtenMode, "ecrire");
});

test("1 guide ouvert et 0 lead : on ne juge pas la page du guide, le goulot reste les DM", () => {
  const r = computeBusinessLoop({ ...today, videoPublished7d: 19, writtenPublished7d: 47, daysSinceStatsCapture: 0, guideClicks7d: 1 });
  assert.equal(r.bottleneck?.key, "dm");
  const leads = r.steps.find((s) => s.key === "leads");
  assert.equal(leads?.owner, "emmanuel");
  assert.match(leads?.action ?? "", /Trop peu de guides ouverts/);
  const enough = computeBusinessLoop({ ...today, videoPublished7d: 19, writtenPublished7d: 47, daysSinceStatsCapture: 0, guideClicks7d: 6 });
  assert.equal(enough.bottleneck?.key, "leads");
  assert.equal(enough.steps.find((s) => s.key === "leads")?.owner, "claude");
});
