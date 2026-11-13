// Calculs du tableau Revenus & dépenses (audit 2026-11-13 : « un vrai
// mini-SaaS »). Fonctions pures, testées dans lib/__tests__.

export interface FinanceLine {
  entry_date: string; // AAAA-MM-JJ
  kind: "revenu" | "depense";
  category: string;
  label: string;
  amount: number;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthTotals(lines: FinanceLine[], month: string) {
  const inMonth = lines.filter((l) => l.entry_date.startsWith(month));
  const revenue = inMonth.filter((l) => l.kind === "revenu").reduce((s, l) => s + l.amount, 0);
  const expense = inMonth.filter((l) => l.kind === "depense").reduce((s, l) => s + l.amount, 0);
  return { month, revenue, expense, profit: revenue - expense };
}

/** Les `count` derniers mois jusqu'à `month` inclus, du plus ancien au plus récent. */
export function monthSeries(lines: FinanceLine[], month: string, count = 6) {
  return Array.from({ length: count }, (_, i) => monthTotals(lines, shiftMonth(month, i - count + 1)));
}

export function categoryBreakdown(lines: FinanceLine[], month: string, kind: "revenu" | "depense") {
  const m = new Map<string, number>();
  for (const l of lines) if (l.kind === kind && l.entry_date.startsWith(month)) m.set(l.category, (m.get(l.category) ?? 0) + l.amount);
  const total = [...m.values()].reduce((s, v) => s + v, 0);
  return [...m.entries()].map(([category, amount]) => ({ category, amount, share: total ? amount / total : 0 })).sort((a, b) => b.amount - a.amount);
}

/**
 * Dépenses du mois précédent absentes de ce mois (même libellé et même
 * catégorie) : les abonnements et frais fixes à reporter en un tap. La date
 * garde le même jour, ramené au dernier jour du mois si besoin.
 */
export function recurringToCarry(lines: FinanceLine[], month: string): FinanceLine[] {
  const prev = shiftMonth(month, -1);
  const key = (l: FinanceLine) => `${l.category}|${l.label.trim().toLowerCase()}`;
  const already = new Set(lines.filter((l) => l.kind === "depense" && l.entry_date.startsWith(month)).map(key));
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const seen = new Set<string>();
  const out: FinanceLine[] = [];
  for (const l of lines) {
    if (l.kind !== "depense" || !l.entry_date.startsWith(prev)) continue;
    const k = key(l);
    if (already.has(k) || seen.has(k)) continue;
    seen.add(k);
    const day = Math.min(Number(l.entry_date.slice(8, 10)), lastDay);
    out.push({ ...l, entry_date: `${month}-${String(day).padStart(2, "0")}` });
  }
  return out;
}
