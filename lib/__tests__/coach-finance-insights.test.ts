import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftMonth, monthTotals, monthSeries, categoryBreakdown, recurringToCarry, type FinanceLine } from "../coach-finance-insights";

const L = (entry_date: string, kind: "revenu" | "depense", category: string, label: string, amount: number): FinanceLine => ({ entry_date, kind, category, label, amount });
const lines = [
  L("2026-10-05", "depense", "Logiciels & outils", "Canva", 12),
  L("2026-10-31", "depense", "Logiciels & outils", "Notion", 10),
  L("2026-10-10", "revenu", "Coaching individuel", "Client A", 200),
  L("2026-11-05", "depense", "Logiciels & outils", "canva ", 12),
  L("2026-11-08", "revenu", "Coaching individuel", "Client B", 300),
  L("2026-11-09", "depense", "Marketing & publicité", "Meta", 50),
];

test("décale les mois, y compris sur l'année", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("totaux et bénéfice du mois", () => {
  assert.deepEqual(monthTotals(lines, "2026-11"), { month: "2026-11", revenue: 300, expense: 62, profit: 238 });
});

test("série de mois du plus ancien au plus récent", () => {
  const s = monthSeries(lines, "2026-11", 3);
  assert.deepEqual(s.map((x) => x.month), ["2026-09", "2026-10", "2026-11"]);
  assert.equal(s[1].expense, 22);
});

test("répartition par catégorie triée", () => {
  const b = categoryBreakdown(lines, "2026-11", "depense");
  assert.equal(b[0].category, "Marketing & publicité");
  assert.ok(Math.abs(b[0].share - 50 / 62) < 1e-9);
});

test("reporte seulement les dépenses fixes absentes, au même jour borné", () => {
  const r = recurringToCarry(lines, "2026-11");
  assert.equal(r.length, 1);
  assert.equal(r[0].label, "Notion");
  assert.equal(r[0].entry_date, "2026-11-30");
});
