import { createAdminClient } from "@/lib/supabase-admin";
import { getRoleCard } from "@/lib/staff-roles";
import { currentMonthKey, stageDate, type StaffRecord } from "@/lib/staff-kpis";

// Paie de l'équipe (2026-09-30) : combien payer chaque membre ce mois-ci,
// à partir de sa rémunération (fixe + variable) et de ses vraies ventes ou
// livraisons enregistrées dans son espace. Réglages par membre dans
// staff_members.pay_config, sinon la règle par défaut de son poste.

export type PayBase = "aucun" | "ventes_perso" | "ventes_equipe" | "setter" | "piece";

export interface PayConfig {
  fixed_eur?: number | null;
  rate_pct?: number | null;
  base?: PayBase;
  piece_eur?: number | null;
}

export const PAY_BASE_LABELS: Record<PayBase, string> = {
  aucun: "Fixe uniquement",
  ventes_perso: "% de ses ventes encaissées",
  ventes_equipe: "% des ventes de toute l'équipe sales",
  setter: "4 % lead fourni, 7 % prospection",
  piece: "Forfait par livrable",
};

/** Règle par défaut de chaque poste (grille de rémunération). */
export function defaultPayConfig(roleKey: string): PayConfig {
  switch (roleKey) {
    case "setter":
      return { base: "setter" };
    case "closer":
      return { base: "ventes_perso", rate_pct: 9 };
    case "head-of-sales":
      return { base: "ventes_equipe", rate_pct: 3 };
    case "createur-contenu-videaste":
    case "copywriter":
      return { base: "piece", piece_eur: null };
    default:
      return { base: "aucun" };
  }
}

export interface PayLine {
  userId: string;
  name: string;
  roleTitle: string;
  config: PayConfig;
  fixed: number;
  variable: number;
  total: number;
  detail: string;
}

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const SALES_ROLES = ["closer", "head-of-sales"];

function inMonth(date: string | null | undefined, month: string): boolean {
  return !!date && date.slice(0, 7) === month;
}

function closedAmount(records: StaffRecord[], month: string, filter?: (r: StaffRecord) => boolean): number {
  return records
    .filter((r) => r.kind === "lead" && r.status === "close" && inMonth(r.occurred_on ?? stageDate(r, "close"), month) && (!filter || filter(r)))
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
}

export async function computePayroll(ownerId: string, month: string = currentMonthKey()): Promise<{ month: string; lines: PayLine[]; total: number }> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("staff_members")
    .select("user_id, full_name, role_key, status, pay_config")
    .eq("owner_id", ownerId)
    .eq("status", "actif")
    .order("created_at");
  const list = (members ?? []) as { user_id: string; full_name: string; role_key: string; status: string; pay_config: PayConfig | null }[];
  if (!list.length) return { month, lines: [], total: 0 };

  const { data: rows } = await admin
    .from("staff_records")
    .select("id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at")
    .in("staff_id", list.map((m) => m.user_id))
    .in("kind", ["lead", "deliverable"])
    .limit(20000);
  const byMember = new Map<string, StaffRecord[]>();
  for (const r of (rows ?? []) as StaffRecord[]) byMember.set(r.staff_id, [...(byMember.get(r.staff_id) ?? []), { ...r, data: r.data ?? {} }]);

  // Ventes de l'équipe sales : seulement les fiches des closers et du Head
  // of Sales, pour ne jamais compter deux fois une vente reliée au setter.
  const teamSales = list
    .filter((m) => SALES_ROLES.includes(m.role_key))
    .reduce((s, m) => s + closedAmount(byMember.get(m.user_id) ?? [], month), 0);

  const lines: PayLine[] = list.map((m) => {
    const cfg: PayConfig = { ...defaultPayConfig(m.role_key), ...(m.pay_config ?? {}) };
    const recs = byMember.get(m.user_id) ?? [];
    const fixed = Number(cfg.fixed_eur ?? 0);
    const rate = Number(cfg.rate_pct ?? 0) / 100;
    let variable = 0;
    let detail = "";
    switch (cfg.base) {
      case "ventes_perso": {
        const sales = closedAmount(recs, month);
        variable = sales * rate;
        detail = `${cfg.rate_pct ?? 0} % de ${eur(sales)} encaissés`;
        break;
      }
      case "ventes_equipe":
        variable = teamSales * rate;
        detail = `${cfg.rate_pct ?? 0} % de ${eur(teamSales)} encaissés par l'équipe sales`;
        break;
      case "setter": {
        const provided = closedAmount(recs, month, (r) => r.data?.origine !== "prospection");
        const prospected = closedAmount(recs, month, (r) => r.data?.origine === "prospection");
        variable = provided * 0.04 + prospected * 0.07;
        detail = `4 % de ${eur(provided)} + 7 % de ${eur(prospected)} en prospection`;
        break;
      }
      case "piece": {
        const delivered = recs.filter((r) => r.kind === "deliverable" && inMonth(stageDate(r, "livre") ?? stageDate(r, "publie"), month)).length;
        variable = delivered * Number(cfg.piece_eur ?? 0);
        detail = cfg.piece_eur ? `${delivered} livrable${delivered > 1 ? "s" : ""} × ${eur(Number(cfg.piece_eur))}` : `${delivered} livrable${delivered > 1 ? "s" : ""} (forfait à renseigner)`;
        break;
      }
      default:
        detail = fixed ? "Fixe" : "Rémunération à renseigner";
    }
    if (fixed && cfg.base !== "aucun") detail = `${eur(fixed)} fixe + ${detail}`;
    return {
      userId: m.user_id,
      name: m.full_name,
      roleTitle: getRoleCard(m.role_key)?.role.title ?? m.role_key,
      config: cfg,
      fixed,
      variable: Math.round(variable * 100) / 100,
      total: Math.round((fixed + variable) * 100) / 100,
      detail,
    };
  });
  return { month, lines, total: lines.reduce((s, l) => s + l.total, 0) };
}
