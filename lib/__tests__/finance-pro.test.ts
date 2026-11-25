import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  parseBankDate,
  parseBankCsv,
  autoCategory,
  toImportCandidates,
  monthProjection,
  detectSubscriptions,
  contributionsToSetAside,
  yearTotals,
  splitCsvLine,
} from "../finance-pro";
import type { FinanceLine } from "../coach-finance-insights";

test("parseAmount lit les formats français et anglais", () => {
  assert.equal(parseAmount("1 234,56"), 1234.56);
  assert.equal(parseAmount("-45.90"), -45.9);
  assert.equal(parseAmount("12,00 €"), 12);
  assert.equal(parseAmount("1.234,50"), 1234.5);
  assert.equal(parseAmount("1,234.50"), 1234.5);
  assert.equal(parseAmount("+30"), 30);
  assert.ok(Number.isNaN(parseAmount("")));
  assert.ok(Number.isNaN(parseAmount("abc")));
});

test("parseBankDate lit jj/mm/aaaa, jj-mm-aa et ISO", () => {
  assert.equal(parseBankDate("25/11/2026"), "2026-11-25");
  assert.equal(parseBankDate("5/3/26"), "2026-03-05");
  assert.equal(parseBankDate("2026-11-25T10:00:00"), "2026-11-25");
  assert.equal(parseBankDate("32/13/2026"), null);
  assert.equal(parseBankDate("hier"), null);
});

test("splitCsvLine garde les séparateurs entre guillemets", () => {
  assert.deepEqual(splitCsvLine('25/11/2026;"CB NOTION; LABS";-10,00', ";"), ["25/11/2026", "CB NOTION; LABS", "-10,00"]);
});

test("parseBankCsv : export type Boursorama (point-virgule, montant signé)", () => {
  const csv = [
    "dateOp;dateVal;label;category;amount",
    "02/11/2026;02/11/2026;PRLV SEPA STRIPE PAYMENTS;Virements;180,00",
    "03/11/2026;03/11/2026;CB NOTION LABS;Abonnements;-10,00",
    "04/11/2026;04/11/2026;ligne cassée;;",
  ].join("\n");
  const r = parseBankCsv(csv);
  assert.equal(r.error, null);
  assert.equal(r.rows.length, 2);
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.rows[0], { entry_date: "2026-11-02", label: "PRLV SEPA STRIPE PAYMENTS", signed: 180 });
  assert.equal(r.rows[1].signed, -10);
});

test("parseBankCsv : colonnes débit et crédit séparées", () => {
  const csv = "Date;Libellé;Débit euros;Crédit euros\n10/11/2026;FACEBK ADS;25,50;\n11/11/2026;VIR SEPA MARIE;;120,00";
  const r = parseBankCsv(csv);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].signed, -25.5);
  assert.equal(r.rows[1].signed, 120);
});

test("parseBankCsv refuse un fichier sans colonnes reconnues", () => {
  const r = parseBankCsv("a;b;c\n1;2;3");
  assert.ok(r.error);
  assert.equal(r.rows.length, 0);
});

test("autoCategory classe d'après le libellé", () => {
  assert.equal(autoCategory("PRLV STRIPE PAYMENTS", "revenu"), "Abonnements clients");
  assert.equal(autoCategory("FACEBK *ADS", "depense"), "Marketing & publicité");
  assert.equal(autoCategory("CB NOTION LABS", "depense"), "Logiciels & outils");
  assert.equal(autoCategory("SNCF INTERNET", "depense"), "Déplacements");
  assert.equal(autoCategory("Boulangerie Paul", "depense"), "Autre dépense");
  assert.equal(autoCategory("Remboursement", "revenu"), "Autre revenu");
});

test("toImportCandidates repère les doublons avec l'existant et dans le fichier", () => {
  const existing: FinanceLine[] = [{ entry_date: "2026-11-03", kind: "depense", category: "Logiciels & outils", label: "CB NOTION LABS", amount: 10 }];
  const c = toImportCandidates(
    [
      { entry_date: "2026-11-03", label: "CB NOTION LABS", signed: -10 },
      { entry_date: "2026-11-05", label: "VIR SEPA MARIE", signed: 120 },
      { entry_date: "2026-11-05", label: "VIR SEPA MARIE", signed: 120 },
    ],
    existing
  );
  assert.equal(c[0].duplicate, true);
  assert.equal(c[1].duplicate, false);
  assert.equal(c[2].duplicate, true);
  assert.equal(c[1].kind, "revenu");
  assert.equal(c[1].amount, 120);
});

const lines: FinanceLine[] = [
  { entry_date: "2026-11-02", kind: "revenu", category: "Abonnements clients", label: "Stripe", amount: 600 },
  { entry_date: "2026-11-09", kind: "revenu", category: "Coaching individuel", label: "Marie", amount: 400 },
  { entry_date: "2026-11-03", kind: "depense", category: "Logiciels & outils", label: "Notion", amount: 10 },
  { entry_date: "2026-10-03", kind: "depense", category: "Logiciels & outils", label: "Notion", amount: 10 },
  { entry_date: "2026-09-03", kind: "depense", category: "Logiciels & outils", label: "Notion", amount: 8 },
  { entry_date: "2026-10-12", kind: "depense", category: "Matériel", label: "Decathlon", amount: 60 },
  { entry_date: "2025-12-01", kind: "revenu", category: "Autre revenu", label: "Ancien", amount: 999 },
];

test("monthProjection : objectif, reste à faire, clients manquants, projection", () => {
  const p = monthProjection(lines, "2026-11", "2026-11-10", 3000, 150);
  assert.equal(p.revenue, 1000);
  assert.equal(p.missing, 2000);
  assert.equal(p.clientsNeeded, 14);
  assert.equal(p.projected, 3000); // 1000 € en 10 jours sur 30
  assert.equal(p.daysLeft, 20);
  assert.ok(Math.abs((p.progress ?? 0) - 1 / 3) < 1e-9);
});

test("monthProjection sans objectif, et objectif atteint", () => {
  const none = monthProjection(lines, "2026-11", "2026-11-10", null, null);
  assert.equal(none.missing, null);
  assert.equal(none.clientsNeeded, null);
  const done = monthProjection(lines, "2026-11", "2026-11-10", 800, 150);
  assert.equal(done.missing, 0);
  assert.equal(done.clientsNeeded, 0);
  assert.equal(done.progress, 1);
  const past = monthProjection(lines, "2026-10", "2026-11-10", 800, 150);
  assert.equal(past.projected, null);
  assert.equal(past.daysLeft, 0);
});

test("detectSubscriptions garde ce qui revient au moins 2 mois sur 3", () => {
  const s = detectSubscriptions(lines, "2026-11");
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].label, "Notion");
  assert.equal(s.items[0].amount, 10);
  assert.equal(s.items[0].months, 3);
  assert.equal(s.monthly, 10);
});

test("contributionsToSetAside applique le taux du coach, rien sans taux", () => {
  assert.equal(contributionsToSetAside(1000, 22), 220);
  assert.equal(contributionsToSetAside(1000, null), null);
  assert.equal(contributionsToSetAside(1000, 0), null);
});

test("yearTotals additionne l'année", () => {
  assert.deepEqual(yearTotals(lines, "2026"), { revenue: 1000, expense: 88, net: 912 });
});
