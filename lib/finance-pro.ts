// Revenus & dépenses, version complète (25/11) : import de relevés
// bancaires, classement automatique, objectif du mois et projection,
// abonnements, cotisations à mettre de côté. Fichier pur, testé dans
// lib/__tests__/finance-pro.test.ts. Aucun chiffre légal n'est codé en dur :
// le taux de cotisations est celui que le coach renseigne.

import type { FinanceLine } from "@/lib/coach-finance-insights";

export interface BankRow {
  entry_date: string; // AAAA-MM-JJ
  label: string;
  /** Positif = entrée d'argent, négatif = sortie. */
  signed: number;
}

// ── Lecture d'un CSV de banque ───────────────────────────────────────────

function detectSeparator(headerLine: string): string {
  const counts = [";", ",", "\t"].map((s) => [s, headerLine.split(s).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Découpe une ligne CSV en tenant compte des guillemets. */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/** « 1 234,56 », « -45.90 », « 12,00 € » → nombre ; NaN si illisible. */
export function parseAmount(raw: string): number {
  let v = raw.replace(/[€\s  ]/g, "").replace(/^\+/, "");
  if (!v) return Number.NaN;
  const lastComma = v.lastIndexOf(",");
  const lastDot = v.lastIndexOf(".");
  if (lastComma > lastDot) v = v.replace(/\./g, "").replace(",", ".");
  else v = v.replace(/,/g, "");
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** « 25/11/2026 », « 25-11-26 », « 2026-11-25 », « 2026-11-25T10:00 » → AAAA-MM-JJ ; null si illisible. */
export function parseBankDate(raw: string): string | null {
  const v = raw.trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const month = m[2].padStart(2, "0");
    const day = m[1].padStart(2, "0");
    if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function findCol(headers: string[], names: string[]): number {
  return headers.findIndex((h) => names.some((n) => norm(h) === n || norm(h).startsWith(n)));
}

export interface ParsedBankCsv {
  rows: BankRow[];
  skipped: number;
  /** Message lisible si le fichier n'a pas pu être compris du tout. */
  error: string | null;
}

/**
 * Lit l'export CSV d'une banque (Boursorama, Revolut, Qonto, Shine, Crédit
 * Agricole…). Colonnes reconnues par leur nom : date (opération, valeur),
 * libellé (label, description), montant, ou débit et crédit séparés.
 */
export function parseBankCsv(text: string): ParsedBankCsv {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0, error: "Fichier vide ou sans ligne d'opération." };
  const sep = detectSeparator(lines[0]);
  const headers = splitCsvLine(lines[0], sep);
  const dateCol = findCol(headers, ["dateop", "date operation", "date d'operation", "date de l'operation", "date", "completed date", "started date"]);
  const labelCol = findCol(headers, ["libelle", "label", "description", "intitule", "nom", "detail", "counterparty", "beneficiaire"]);
  const amountCol = findCol(headers, ["montant", "amount", "valeur", "somme"]);
  const debitCol = findCol(headers, ["debit", "debit euros", "sortie"]);
  const creditCol = findCol(headers, ["credit", "credit euros", "entree"]);
  if (dateCol < 0 || labelCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
    return { rows: [], skipped: 0, error: "Colonnes non reconnues : il faut au moins une date, un libellé et un montant (ou débit et crédit)." };
  }
  const rows: BankRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, sep);
    const date = parseBankDate(cells[dateCol] ?? "");
    const label = (cells[labelCol] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    let signed = Number.NaN;
    if (amountCol >= 0 && cells[amountCol]) signed = parseAmount(cells[amountCol]);
    else {
      const debit = debitCol >= 0 ? parseAmount(cells[debitCol] ?? "") : Number.NaN;
      const credit = creditCol >= 0 ? parseAmount(cells[creditCol] ?? "") : Number.NaN;
      if (Number.isFinite(credit) && credit !== 0) signed = Math.abs(credit);
      else if (Number.isFinite(debit) && debit !== 0) signed = -Math.abs(debit);
    }
    if (!date || !label || !Number.isFinite(signed) || signed === 0) {
      skipped++;
      continue;
    }
    rows.push({ entry_date: date, label, signed: Math.round(signed * 100) / 100 });
  }
  return { rows, skipped, error: rows.length ? null : "Aucune opération lisible dans ce fichier." };
}

// ── Classement automatique ───────────────────────────────────────────────

const EXPENSE_RULES: { category: string; words: string[] }[] = [
  { category: "Marketing & publicité", words: ["facebk", "facebook", "meta", "meta platforms", "instagram", "google ads", "googleads", "tiktok ads", "linkedin ads", "canva pro"] },
  { category: "Logiciels & outils", words: ["notion", "canva", "adobe", "capcut", "openai", "anthropic", "claude", "chatgpt", "google workspace", "gsuite", "vercel", "supabase", "calendly", "brevo", "zoom", "dropbox", "icloud", "apple.com", "microsoft", "github", "stripe fee", "frais stripe", "spotify"] },
  { category: "Formation continue", words: ["formation", "udemy", "coursera", "skool", "mentorat", "mastermind", "masterclass", "school"] },
  { category: "Matériel", words: ["decathlon", "amazon", "fnac", "boulanger", "darty", "ldlc", "intersport", "go sport"] },
  { category: "Déplacements", words: ["sncf", "ouigo", "uber", "bolt", "blablacar", "total", "esso", "shell", "bp", "peage", "parking", "ratp", "navigo", "air france", "easyjet", "ryanair"] },
];

const REVENUE_RULES: { category: string; words: string[] }[] = [
  { category: "Abonnements clients", words: ["stripe", "gocardless", "abonnement", "prelevement", "sepa"] },
  { category: "Vente de formation", words: ["formation", "gumroad", "podia", "systeme.io", "systeme io", "teachable"] },
  { category: "Coaching individuel", words: ["coaching", "seance", "virement de", "vir sepa", "vir inst", "lydia", "paypal"] },
];

/** Mot entier (« boulanger » ne doit pas attraper « boulangerie »). */
function hasWord(text: string, word: string): boolean {
  const w = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${w}($|[^a-z0-9])`).test(text);
}

/** Catégorie proposée d'après le libellé de la banque (le coach peut la changer avant l'import). */
export function autoCategory(label: string, kind: "revenu" | "depense"): string {
  const l = norm(label);
  const rules = kind === "revenu" ? REVENUE_RULES : EXPENSE_RULES;
  for (const r of rules) if (r.words.some((w) => hasWord(l, w))) return r.category;
  return kind === "revenu" ? "Autre revenu" : "Autre dépense";
}

/** Clé de doublon : même jour, même montant, même début de libellé. */
export function lineKey(l: { entry_date: string; amount: number; label: string; kind: string }): string {
  return `${l.entry_date}|${l.kind}|${l.amount.toFixed(2)}|${norm(l.label).replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
}

export interface ImportCandidate extends FinanceLine {
  duplicate: boolean;
}

/** Relevé lu → lignes prêtes à importer, avec catégorie proposée et doublons repérés. */
export function toImportCandidates(rows: BankRow[], existing: FinanceLine[]): ImportCandidate[] {
  const seen = new Set(existing.map(lineKey));
  return rows.map((r) => {
    const kind = r.signed > 0 ? "revenu" : "depense";
    const line: FinanceLine = { entry_date: r.entry_date, kind, category: autoCategory(r.label, kind), label: r.label, amount: Math.abs(r.signed) };
    const key = lineKey(line);
    const duplicate = seen.has(key);
    seen.add(key);
    return { ...line, duplicate };
  });
}

// ── Objectif du mois ─────────────────────────────────────────────────────

export interface MonthProjection {
  revenue: number;
  /** Projection de fin de mois au rythme actuel (null pour un mois passé ou futur). */
  projected: number | null;
  goal: number | null;
  /** Ce qui manque pour l'objectif (0 si atteint), null sans objectif. */
  missing: number | null;
  /** Part de l'objectif atteinte, de 0 à 1 (plafonnée), null sans objectif. */
  progress: number | null;
  /** Nombre de clients à l'offre principale pour combler ce qui manque. */
  clientsNeeded: number | null;
  daysLeft: number;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthProjection(
  lines: FinanceLine[],
  month: string,
  today: string,
  goal: number | null,
  offerPrice: number | null
): MonthProjection {
  const revenue = lines.filter((l) => l.kind === "revenu" && l.entry_date.startsWith(month)).reduce((s, l) => s + l.amount, 0);
  const total = daysInMonth(month);
  const isCurrent = today.startsWith(month);
  const day = isCurrent ? Number(today.slice(8, 10)) : month < today.slice(0, 7) ? total : 0;
  const projected = isCurrent && day > 0 ? Math.round((revenue / day) * total) : null;
  const missing = goal && goal > 0 ? Math.max(0, Math.round((goal - revenue) * 100) / 100) : null;
  return {
    revenue: Math.round(revenue * 100) / 100,
    projected,
    goal: goal && goal > 0 ? goal : null,
    missing,
    progress: goal && goal > 0 ? Math.min(1, revenue / goal) : null,
    clientsNeeded: missing !== null && missing > 0 && offerPrice && offerPrice > 0 ? Math.ceil(missing / offerPrice) : missing === 0 ? 0 : null,
    daysLeft: Math.max(0, total - day),
  };
}

// ── Abonnements (dépenses qui reviennent chaque mois) ────────────────────

export interface Subscription {
  label: string;
  category: string;
  /** Dernier montant payé. */
  amount: number;
  months: number;
}

/**
 * Dépenses dont le libellé revient sur au moins 2 des 3 derniers mois : ce
 * sont tes abonnements. Le total dit combien ils te coûtent chaque mois.
 */
export function detectSubscriptions(lines: FinanceLine[], month: string): { items: Subscription[]; monthly: number } {
  const [y, m] = month.split("-").map(Number);
  const window = [0, 1, 2].map((k) => {
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const byKey = new Map<string, { label: string; category: string; months: Set<string>; last: { date: string; amount: number } }>();
  for (const l of lines) {
    if (l.kind !== "depense") continue;
    const mo = l.entry_date.slice(0, 7);
    if (!window.includes(mo)) continue;
    const key = norm(l.label).replace(/[^a-z]/g, "").slice(0, 14);
    if (!key) continue;
    const cur = byKey.get(key) ?? { label: l.label, category: l.category, months: new Set<string>(), last: { date: "", amount: 0 } };
    cur.months.add(mo);
    if (l.entry_date >= cur.last.date) cur.last = { date: l.entry_date, amount: l.amount };
    byKey.set(key, cur);
  }
  const items = [...byKey.values()]
    .filter((v) => v.months.size >= 2)
    .map((v) => ({ label: v.label, category: v.category, amount: v.last.amount, months: v.months.size }))
    .sort((a, b) => b.amount - a.amount);
  return { items, monthly: Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100 };
}

// ── Cotisations à mettre de côté ─────────────────────────────────────────

/** Somme à mettre de côté sur les revenus, au taux renseigné par le coach (en %). */
export function contributionsToSetAside(revenue: number, ratePercent: number | null): number | null {
  if (ratePercent === null || !Number.isFinite(ratePercent) || ratePercent <= 0) return null;
  return Math.round(revenue * Math.min(100, ratePercent)) / 100;
}

// ── Année ────────────────────────────────────────────────────────────────

export function yearTotals(lines: FinanceLine[], year: string): { revenue: number; expense: number; net: number } {
  let revenue = 0;
  let expense = 0;
  for (const l of lines) {
    if (!l.entry_date.startsWith(year)) continue;
    if (l.kind === "revenu") revenue += l.amount;
    else expense += l.amount;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { revenue: r(revenue), expense: r(expense), net: r(revenue - expense) };
}
