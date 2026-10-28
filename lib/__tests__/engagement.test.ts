import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonthsIso,
  engagementEndDate,
  engagementProgress,
  planEngagementBlocks,
  renewalMessage,
  reviewDate,
  reviewState,
  DEFAULT_ENGAGEMENT_MONTHS,
} from "../engagement";

test("la durée d'engagement par défaut est de 6 mois", () => {
  assert.equal(DEFAULT_ENGAGEMENT_MONTHS, 6);
});

test("addMonthsIso reste sur le dernier jour du mois", () => {
  assert.equal(addMonthsIso("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsIso("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsIso("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonthsIso("2026-11-15", 3), "2027-02-15");
});

test("fin d'engagement = début + 6 mois - 1 jour", () => {
  assert.equal(engagementEndDate("2026-01-15", 6), "2026-07-14");
  assert.equal(engagementEndDate("2026-01-01", 6), "2026-06-30");
});

test("l'appel bilan tombe un mois avant la fin", () => {
  assert.equal(reviewDate("2026-07-14"), "2026-06-15");
  assert.equal(reviewDate("2026-06-30"), "2026-06-01");
});

test("état du bilan : none, upcoming, due, late, et décision prise", () => {
  const end = "2026-07-14";
  assert.equal(reviewState(end, "2026-05-01", null), "none");
  assert.equal(reviewState(end, "2026-06-10", null), "upcoming");
  assert.equal(reviewState(end, "2026-06-15", null), "due");
  assert.equal(reviewState(end, "2026-07-14", null), "due");
  assert.equal(reviewState(end, "2026-07-15", null), "late");
  assert.equal(reviewState(end, "2026-06-20", "renouvele"), "none");
  assert.equal(reviewState(end, "2026-07-20", "arrete"), "none");
  assert.equal(reviewState(end, "2026-06-20", "en_reflexion"), "due");
});

test("progression mois X sur 6", () => {
  const start = "2026-01-15";
  const end = engagementEndDate(start, 6);
  const first = engagementProgress(start, end, "2026-01-15");
  assert.equal(first.status, "active");
  assert.equal(first.months, 6);
  assert.equal(first.monthIndex, 1);
  assert.equal(engagementProgress(start, end, "2026-02-14").monthIndex, 1);
  assert.equal(engagementProgress(start, end, "2026-02-15").monthIndex, 2);
  assert.equal(engagementProgress(start, end, "2026-06-15").monthIndex, 6);
  assert.equal(engagementProgress(start, end, "2026-07-14").monthIndex, 6);
  const done = engagementProgress(start, end, "2026-07-20");
  assert.equal(done.status, "ended");
  assert.equal(done.pct, 100);
  assert.equal(engagementProgress(start, end, "2026-01-01").status, "before");
});

test("la durée modifiable (3 mois, 12 mois) est relue sur les dates", () => {
  assert.equal(engagementProgress("2026-01-01", engagementEndDate("2026-01-01", 3), "2026-02-01").months, 3);
  assert.equal(engagementProgress("2026-01-01", engagementEndDate("2026-01-01", 12), "2026-02-01").months, 12);
});

test("plan 6 mois : calibrage 3 semaines, blocs d'optimisation d'environ 5 semaines, bilan 4 semaines", () => {
  const plan = planEngagementBlocks(6);
  assert.equal(plan[0].kind, "calibrage");
  assert.equal(plan[0].weeks, 3);
  assert.equal(plan[plan.length - 1].kind, "bilan");
  assert.equal(plan[plan.length - 1].weeks, 4);
  const opt = plan.filter((b) => b.kind === "optimisation");
  assert.equal(opt.length, 4);
  for (const b of opt) assert.ok(b.weeks >= 4 && b.weeks <= 6);
  assert.equal(plan.reduce((s, b) => s + b.weeks, 0), 26);
  // blocs contigus
  let cursor = 1;
  for (const b of plan) {
    assert.equal(b.startWeek, cursor);
    cursor += b.weeks;
  }
});

test("un engagement très court n'a pas de bloc de bilan séparé", () => {
  const plan = planEngagementBlocks(1);
  assert.ok(!plan.some((b) => b.kind === "bilan"));
  assert.equal(plan.reduce((s, b) => s + b.weeks, 0), 4);
});

test("message de renouvellement : tutoiement, date de fin, sans tiret cadratin ni nom de famille", () => {
  for (const kind of ["un_mois", "fin"] as const) {
    const m = renewalMessage({ firstName: "Léa", kind, endDate: "2026-07-14", bookingUrl: "https://exemple.test/reserver" });
    assert.ok(m.startsWith("Salut Léa,"));
    assert.ok(m.includes("14 juillet 2026"));
    assert.ok(m.includes("https://exemple.test/reserver"));
    assert.ok(!m.includes("—") && !m.includes("–"));
    assert.ok(!/Peccoux/i.test(m));
  }
  assert.ok(renewalMessage({ firstName: null, kind: "fin", endDate: "2026-07-14" }).startsWith("Salut,"));
});

test("le message de fin propose aussi une recommandation, sans obligation", () => {
  const m = renewalMessage({ firstName: "Léa", kind: "fin", endDate: "2026-07-14" });
  assert.ok(m.includes("recommandation"));
  assert.ok(!renewalMessage({ firstName: "Léa", kind: "un_mois", endDate: "2026-07-14" }).includes("recommandation"));
});
