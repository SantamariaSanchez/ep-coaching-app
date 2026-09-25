import { csvEscape as esc, csvNumber } from "@/lib/csv";
import { KINDS, stageDef, type RecordKind } from "@/lib/staff-roles";
import { isoToParisLocal, parisDate, type StaffRecord } from "@/lib/staff-kpis";

type EditableKind = Exclude<RecordKind, "report">;

// Mois de rattachement d'une fiche : sa date métier si elle en a une (date
// d'une écriture, d'un RDV), sinon sa date de création.
export function recordMonth(r: StaffRecord): string {
  if (r.occurred_on) return r.occurred_on.slice(0, 7);
  if (r.due_at) return isoToParisLocal(r.due_at).slice(0, 7);
  return parisDate(r.created_at).slice(0, 7);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// Un tableau métier en CSV : une colonne par champ du formulaire, dans le
// même ordre que la fiche, avec les libellés affichés (pas les valeurs
// techniques). Les clés système (_linked, _stages…) ne sortent jamais.
export function recordsToCsv(kind: EditableKind, records: StaffRecord[]): string {
  const def = KINDS[kind];
  const fields = def.fields;
  const header = ["Étape", ...fields.map((f) => f.label), "Créée le"].map((h) => esc(h)).join(",");

  const lines = records.map((r) => {
    const cells = fields.map((f) => {
      const raw = f.column ? r[f.column] : r.data[f.key];
      if (raw === null || raw === undefined || raw === "") return "";
      if (f.type === "money" || f.type === "number") return csvNumber(typeof raw === "number" ? String(raw) : String(raw).replace(",", "."));
      if (f.type === "datetime") return esc(isoToParisLocal(String(raw)).replace("T", " "));
      if (f.type === "select") return esc(f.options?.find((o) => o.value === raw)?.label ?? String(raw));
      return esc(String(raw));
    });
    return [esc(stageDef(kind, r.status)?.label ?? r.status), ...cells, esc(parisDate(r.created_at))].join(",");
  });

  const out = [header, ...lines];

  // Trésorerie : les totaux payés du fichier, dans la colonne Montant, pour
  // le rapprochement avec le tableau de bord Stripe.
  if (kind === "transaction") {
    const amountCol = 1 + fields.findIndex((f) => f.column === "amount");
    const sum = (direction: string) =>
      records
        .filter((r) => r.data.direction === direction && r.status === "paye")
        .reduce((acc, r) => acc + (r.amount ?? 0), 0);
    const row = (label: string, value: number) => {
      const cells: string[] = new Array(fields.length + 2).fill("");
      cells[0] = esc(label);
      cells[amountCol] = value.toFixed(2);
      return cells.join(",");
    };
    const inflow = sum("encaissement");
    const outflow = sum("depense");
    out.push("");
    out.push(row("Total encaissé (payé)", inflow));
    out.push(row("Total dépensé (payé)", outflow));
    out.push(row("Solde", inflow - outflow));
  }

  return "﻿" + out.join("\n");
}

export function csvFilename(kind: EditableKind, who: string, month: string | null): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  return `${slug(KINDS[kind].plural)}_${slug(who) || "equipe"}_${month ?? "tout"}.csv`;
}
