// Indicateurs du tableau de bord de chaque métier (app/equipe). Calcul pur à
// partir des données déjà chargées : importable partout, aucun accès base.
//
// Deux sources possibles pour un même chiffre (ex : appels tenus) : ce que
// la personne suit dans ses modules (agenda, CRM) et ce qu'elle déclare dans
// son rapport du jour. On retient le plus grand des deux plutôt que la
// somme, pour ne jamais compter deux fois le même appel tout en marchant
// quelle que soit la façon de travailler de chacun.

import { KINDS, isClosedStage, type RecordKind } from "@/lib/staff-roles";

export interface StaffRecord {
  id: string;
  staff_id: string;
  kind: RecordKind;
  title: string;
  status: string;
  amount: number | null;
  occurred_on: string | null;
  due_at: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}

export interface KpiExtras {
  /** RH : candidatures reçues sur /carrieres ce mois-ci. */
  applicationsThisMonth?: number;
  /** RH : candidatures encore au statut "nouvelle". */
  applicationsWaiting?: number;
  /** Coach onboarding : clients payants ayant démarré ces 30 derniers jours. */
  newPayingClients?: number;
}

export function parisDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

const PARIS_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function parisParts(d: Date) {
  const parts = PARIS_PARTS.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** "2026-09-25T14:30" (heure de Paris, champ datetime-local) vers ISO UTC. */
export function parisLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const p = parisParts(new Date(asUtc));
  const offset = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - asUtc;
  const result = new Date(asUtc - offset);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** ISO UTC vers "2026-09-25T14:30" en heure de Paris, pour un champ datetime-local. */
export function isoToParisLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parisParts(d);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

export function currentMonthKey(now: Date = new Date()): string {
  return parisDate(now).slice(0, 7);
}

function inMonth(date: string | null | undefined, month: string): boolean {
  return !!date && date.slice(0, 7) === month;
}

/** Date (Paris) à laquelle un enregistrement est entré dans une étape. */
export function stageDate(r: StaffRecord, stage: string): string | null {
  const stages = r.data?._stages as Record<string, string> | undefined;
  return stages?.[stage] ?? null;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const eur = (v: number) =>
  `${Math.round(v).toLocaleString("fr-FR")} €`;
const pct = (v: number) => `${Math.round(v * 100)} %`;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

function ofKind(records: StaffRecord[], kind: RecordKind) {
  return records.filter((r) => r.kind === kind);
}

function reportSum(reports: StaffRecord[], month: string, key: string): number {
  return reports
    .filter((r) => inMonth(r.occurred_on, month))
    .reduce((s, r) => s + num((r.data?.metrics as Record<string, unknown> | undefined)?.[key]), 0);
}

function isOverdue(r: StaffRecord, today: string): boolean {
  if (r.kind === "report") return false;
  if (isClosedStage(r.kind, r.status)) return false;
  if (r.kind === "deliverable" && r.status === "livre") return false;
  const due = r.occurred_on && (r.kind === "task" || r.kind === "deliverable") ? r.occurred_on : null;
  return !!due && due < today;
}

// ── Blocs réutilisés ────────────────────────────────────────────────────

function salesCloser(records: StaffRecord[], reports: StaffRecord[], month: string) {
  const appts = ofKind(records, "appointment").filter((a) => a.due_at && inMonth(parisDate(a.due_at), month));
  const held = appts.filter((a) => a.status === "honore").length;
  const noShow = appts.filter((a) => a.status === "no_show").length;
  const leads = ofKind(records, "lead");
  const closedLeads = leads.filter((l) => l.status === "close" && inMonth(l.occurred_on ?? stageDate(l, "close"), month));
  const callsHeld = Math.max(held, reportSum(reports, month, "appels_tenus"));
  const sales = Math.max(closedLeads.length, reportSum(reports, month, "ventes"));
  const cash = Math.max(
    closedLeads.reduce((s, l) => s + num(l.amount), 0),
    reportSum(reports, month, "cash_collecte")
  );
  return { callsHeld, noShow, held, sales, cash };
}

function salesSetter(records: StaffRecord[], reports: StaffRecord[], month: string) {
  const leads = ofKind(records, "lead");
  const qualified = Math.max(
    leads.filter((l) => inMonth(stageDate(l, "qualifie"), month)).length,
    reportSum(reports, month, "leads_qualifies")
  );
  const booked = Math.max(
    leads.filter((l) => inMonth(stageDate(l, "rdv_booke"), month)).length,
    reportSum(reports, month, "rdv_bookes")
  );
  const showed = leads.filter((l) => inMonth(stageDate(l, "rdv_booke"), month) && (stageDate(l, "show") || stageDate(l, "close"))).length;
  const bookedTracked = leads.filter((l) => inMonth(stageDate(l, "rdv_booke"), month)).length;
  const closed = leads.filter((l) => l.status === "close" && inMonth(l.occurred_on ?? stageDate(l, "close"), month));
  const commission = closed.reduce(
    (s, l) => s + num(l.amount) * (l.data?.origine === "prospection" ? 0.07 : 0.04),
    0
  );
  return {
    conversations: reportSum(reports, month, "conversations"),
    qualified,
    booked,
    showRate: ratio(showed, bookedTracked),
    bookedTracked,
    commission,
  };
}

function deliverables(records: StaffRecord[], month: string, today: string) {
  const list = ofKind(records, "deliverable");
  const delivered = list.filter((d) => inMonth(stageDate(d, "livre") ?? stageDate(d, "publie"), month));
  const published = list.filter((d) => inMonth(stageDate(d, "publie"), month));
  const inProgress = list.filter((d) => d.status === "en_cours" || d.status === "relecture");
  const late = list.filter((d) => isOverdue(d, today));
  const cycleDays = delivered
    .map((d) => {
      const end = stageDate(d, "livre") ?? stageDate(d, "publie");
      if (!end) return null;
      return (new Date(end).getTime() - new Date(parisDate(d.created_at)).getTime()) / 86_400_000;
    })
    .filter((v): v is number => v !== null && v >= 0);
  const avgCycle = cycleDays.length ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length : null;
  return { delivered: delivered.length, published: published.length, inProgress: inProgress.length, late: late.length, avgCycle };
}

function campaigns(records: StaffRecord[]) {
  const list = ofKind(records, "campaign");
  const spend = list.reduce((s, c) => s + num(c.amount), 0);
  const leads = list.reduce((s, c) => s + num(c.data?.leads), 0);
  const revenue = list.reduce((s, c) => s + num(c.data?.revenue), 0);
  const active = list.filter((c) => c.status === "active").length;
  return { spend, leads, revenue, active, cpl: ratio(spend, leads), roas: ratio(revenue, spend) };
}

function tickets(records: StaffRecord[], month: string) {
  const list = ofKind(records, "ticket");
  const open = list.filter((t) => t.status !== "resolu");
  const resolvedThisMonth = list.filter((t) => inMonth(stageDate(t, "resolu"), month));
  const critical = open.filter((t) => t.data?.priority === "critique").length;
  const hours = list
    .map((t) => {
      const at = t.data?._resolved_at as string | undefined;
      return at ? (new Date(at).getTime() - new Date(t.created_at).getTime()) / 3_600_000 : null;
    })
    .filter((v): v is number => v !== null && v >= 0);
  const avgHours = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null;
  return { open: open.length, resolved: resolvedThisMonth.length, critical, avgHours, bugsOpen: open.filter((t) => t.data?.type === "bug").length };
}

function tasksBlock(records: StaffRecord[], today: string): Kpi[] {
  const list = ofKind(records, "task");
  const open = list.filter((t) => t.status !== "fait");
  const late = open.filter((t) => t.occurred_on && t.occurred_on < today).length;
  return [
    { label: "Tâches ouvertes", value: String(open.length) },
    { label: "Tâches en retard", value: String(late), tone: late > 0 ? "bad" : "good" },
  ];
}

function upcoming(records: StaffRecord[], now: Date, days: number): number {
  const end = now.getTime() + days * 86_400_000;
  return ofKind(records, "appointment").filter(
    (a) => a.status === "planifie" && a.due_at && new Date(a.due_at).getTime() >= now.getTime() && new Date(a.due_at).getTime() <= end
  ).length;
}

// ── Par métier ──────────────────────────────────────────────────────────

export interface TeamMemberData {
  userId: string;
  fullName: string;
  roleKey: string;
  records: StaffRecord[];
}

export function computeKpis(
  roleKey: string,
  records: StaffRecord[],
  extras: KpiExtras = {},
  team: TeamMemberData[] = [],
  now: Date = new Date()
): Kpi[] {
  const month = currentMonthKey(now);
  const today = parisDate(now);
  const reports = ofKind(records, "report");

  switch (roleKey) {
    case "closer": {
      const s = salesCloser(records, reports, month);
      const closeRate = ratio(s.sales, s.callsHeld);
      return [
        { label: "Taux de close", value: s.callsHeld ? pct(closeRate) : "Pas encore d'appel", tone: closeRate >= 0.25 ? "good" : s.callsHeld ? "warn" : "neutral" },
        { label: "Cash collecté ce mois", value: eur(s.cash), tone: "good" },
        { label: "Ventes ce mois", value: String(s.sales) },
        { label: "Appels tenus ce mois", value: String(s.callsHeld) },
        { label: "Panier moyen", value: s.sales ? eur(s.cash / s.sales) : "Aucune vente" },
        { label: "Taux de no-show", value: s.held + s.noShow ? pct(ratio(s.noShow, s.held + s.noShow)) : "Aucun RDV passé", tone: ratio(s.noShow, s.held + s.noShow) > 0.3 ? "bad" : "neutral" },
        { label: "Commission estimée", value: `${eur(s.cash * 0.08)} à ${eur(s.cash * 0.1)}`, hint: "8 à 10 % du cash collecté", tone: "good" },
        { label: "RDV dans les 7 jours", value: String(upcoming(records, now, 7)) },
      ];
    }
    case "setter": {
      const s = salesSetter(records, reports, month);
      return [
        { label: "RDV bookés ce mois", value: String(s.booked), tone: "good" },
        { label: "Leads qualifiés ce mois", value: String(s.qualified) },
        { label: "Taux de booking", value: s.qualified ? pct(ratio(s.booked, s.qualified)) : "Pas encore de lead qualifié" },
        { label: "Taux de présentation", value: s.bookedTracked ? pct(s.showRate) : "Pas encore de RDV suivi", hint: "RDV bookés qui ont vraiment eu lieu", tone: s.bookedTracked && s.showRate < 0.6 ? "warn" : "neutral" },
        { label: "Conversations ce mois", value: String(s.conversations) },
        { label: "Commission estimée", value: eur(s.commission), hint: "4 % lead fourni, 7 % prospection, sur les ventes closées", tone: "good" },
        ...tasksBlock(records, today),
      ];
    }
    case "head-of-sales": {
      let cash = 0, sales = 0, calls = 0, booked = 0;
      for (const member of team) {
        const mReports = ofKind(member.records, "report");
        if (member.roleKey === "closer") {
          const s = salesCloser(member.records, mReports, month);
          cash += s.cash; sales += s.sales; calls += s.callsHeld;
        } else if (member.roleKey === "setter") {
          booked += salesSetter(member.records, mReports, month).booked;
        }
      }
      const own = salesCloser(records, reports, month);
      cash += own.cash; sales += own.sales; calls += own.callsHeld;
      return [
        { label: "CA signé par l'équipe", value: eur(cash), tone: "good" },
        { label: "Ventes de l'équipe", value: String(sales) },
        { label: "Taux de close de l'équipe", value: calls ? pct(ratio(sales, calls)) : "Pas encore d'appel" },
        { label: "RDV bookés par les setters", value: String(booked) },
        { label: "Ta part estimée", value: eur(cash * 0.03), hint: "3 % du CA de l'équipe", tone: "good" },
        { label: "Personnes encadrées", value: String(team.length) },
      ];
    }
    case "createur-contenu-videaste":
    case "copywriter": {
      const d = deliverables(records, month, today);
      return [
        { label: "Livrés ce mois", value: String(d.delivered), tone: "good" },
        { label: "En cours", value: String(d.inProgress) },
        { label: "En retard", value: String(d.late), tone: d.late ? "bad" : "good" },
        { label: "Délai moyen de livraison", value: d.avgCycle === null ? "Pas encore de livraison" : `${d.avgCycle.toFixed(1)} j` },
        ...tasksBlock(records, today),
      ];
    }
    case "community-manager": {
      const d = deliverables(records, month, today);
      return [
        { label: "Publiés ce mois", value: String(Math.max(d.published, reportSum(reports, month, "posts_publies"))), tone: "good" },
        { label: "Commentaires traités", value: String(reportSum(reports, month, "commentaires")) },
        { label: "Messages privés traités", value: String(reportSum(reports, month, "dm")) },
        { label: "Questions chaudes remontées", value: String(reportSum(reports, month, "questions_chaudes")) },
        { label: "Contenus en retard", value: String(d.late), tone: d.late ? "bad" : "good" },
        ...tasksBlock(records, today),
      ];
    }
    case "personal-brand-manager": {
      const opps = ofKind(records, "opportunity");
      const confirmed = opps.filter((o) => inMonth(stageDate(o, "confirme"), month)).length;
      const published = opps.filter((o) => inMonth(stageDate(o, "publie"), month));
      const inTalks = opps.filter((o) => o.status === "discussion" || o.status === "contacte").length;
      const audience = published.reduce((s, o) => s + num(o.data?.audience), 0);
      return [
        { label: "Opportunités confirmées ce mois", value: String(confirmed), tone: "good" },
        { label: "Publiées ce mois", value: String(published.length) },
        { label: "En discussion", value: String(inTalks) },
        { label: "Audience touchée ce mois", value: audience.toLocaleString("fr-FR") },
        ...tasksBlock(records, today),
      ];
    }
    case "growth-traffic-manager": {
      const c = campaigns(records);
      return [
        { label: "ROAS", value: c.spend ? `${c.roas.toFixed(2)}` : "Aucune dépense", hint: "Chiffre d'affaires généré divisé par la dépense", tone: c.spend ? (c.roas >= 1 ? "good" : "bad") : "neutral" },
        { label: "Coût par lead", value: c.leads ? eur(c.cpl) : "Aucun lead" },
        { label: "Dépense totale", value: eur(c.spend) },
        { label: "Leads générés", value: String(c.leads) },
        { label: "CA généré", value: eur(c.revenue), tone: "good" },
        { label: "Campagnes actives", value: String(c.active) },
      ];
    }
    case "head-of-marketing": {
      let delivered = 0, late = 0, spend = 0, revenue = 0, leads = 0, active = 0;
      for (const member of [...team, { userId: "self", fullName: "", roleKey, records }]) {
        const d = deliverables(member.records, month, today);
        delivered += d.delivered; late += d.late;
        const c = campaigns(member.records);
        spend += c.spend; revenue += c.revenue; leads += c.leads; active += c.active;
      }
      return [
        { label: "Contenus livrés par l'équipe", value: String(delivered), tone: "good" },
        { label: "Contenus en retard", value: String(late), tone: late ? "bad" : "good" },
        { label: "Leads payants générés", value: String(leads) },
        { label: "ROAS global", value: spend ? revenue ? (revenue / spend).toFixed(2) : "0" : "Aucune dépense", tone: spend ? (revenue / spend >= 1 ? "good" : "bad") : "neutral" },
        { label: "Campagnes actives", value: String(active) },
        { label: "Personnes encadrées", value: String(team.length) },
      ];
    }
    case "developpeur-saas": {
      const t = tickets(records, month);
      const features = ofKind(records, "feature");
      return [
        { label: "Bugs ouverts", value: String(t.bugsOpen), tone: t.bugsOpen ? "warn" : "good" },
        { label: "Tickets résolus ce mois", value: String(t.resolved), tone: "good" },
        { label: "Fonctionnalités livrées ce mois", value: String(features.filter((f) => inMonth(stageDate(f, "livre"), month)).length) },
        { label: "En développement", value: String(features.filter((f) => f.status === "en_dev" || f.status === "en_test").length) },
        { label: "Heures déclarées ce mois", value: String(reportSum(reports, month, "heures")) },
        ...tasksBlock(records, today),
      ];
    }
    case "product-manager": {
      const features = ofKind(records, "feature");
      const t = tickets(records, month);
      const by = (s: string) => features.filter((f) => f.status === s).length;
      return [
        { label: "Livrées ce mois", value: String(features.filter((f) => inMonth(stageDate(f, "livre"), month)).length), tone: "good" },
        { label: "En développement", value: String(by("en_dev") + by("en_test")) },
        { label: "Spécifiées, prêtes", value: String(by("specifie")) },
        { label: "Idées à arbitrer", value: String(by("idee")) },
        { label: "Tickets ouverts", value: String(t.open), tone: t.critical ? "bad" : "neutral" },
        { label: "Retours collectés ce mois", value: String(reportSum(reports, month, "retours")) },
      ];
    }
    case "support-client-tech": {
      const t = tickets(records, month);
      return [
        { label: "Tickets ouverts", value: String(t.open), tone: t.open > 10 ? "warn" : "neutral" },
        { label: "Critiques ouverts", value: String(t.critical), tone: t.critical ? "bad" : "good" },
        { label: "Résolus ce mois", value: String(t.resolved), tone: "good" },
        { label: "Temps moyen de résolution", value: t.avgHours === null ? "Pas encore de ticket résolu" : `${t.avgHours.toFixed(1)} h`, tone: t.avgHours !== null && t.avgHours > 24 ? "warn" : "neutral" },
        ...tasksBlock(records, today),
      ];
    }
    case "office-ops-manager": {
      const procs = ofKind(records, "process");
      return [
        { label: "Process validés", value: String(procs.filter((p) => p.status === "valide").length), tone: "good" },
        { label: "À écrire ou en brouillon", value: String(procs.filter((p) => p.status === "a_ecrire" || p.status === "brouillon").length) },
        { label: "RDV dans les 7 jours", value: String(upcoming(records, now, 7)) },
        ...tasksBlock(records, today),
      ];
    }
    case "secretaire-assistant": {
      const todayAppts = ofKind(records, "appointment").filter((a) => a.due_at && parisDate(a.due_at) === today && a.status === "planifie").length;
      return [
        { label: "RDV aujourd'hui", value: String(todayAppts) },
        { label: "Emails traités ce mois", value: String(reportSum(reports, month, "emails")) },
        { label: "Documents classés ce mois", value: String(reportSum(reports, month, "documents")) },
        ...tasksBlock(records, today),
      ];
    }
    case "finance-comptabilite": {
      const tx = ofKind(records, "transaction");
      const monthTx = tx.filter((t) => inMonth(t.occurred_on, month) && t.status === "paye");
      const incoming = monthTx.filter((t) => t.data?.direction === "encaissement").reduce((s, t) => s + num(t.amount), 0);
      const outgoing = monthTx.filter((t) => t.data?.direction === "depense").reduce((s, t) => s + num(t.amount), 0);
      const late = tx.filter((t) => t.status === "en_retard");
      const pending = tx.filter((t) => t.status === "en_attente" && t.data?.direction === "encaissement");
      return [
        { label: "Encaissé ce mois", value: eur(incoming), tone: "good" },
        { label: "Dépensé ce mois", value: eur(outgoing) },
        { label: "Solde du mois", value: eur(incoming - outgoing), tone: incoming - outgoing >= 0 ? "good" : "bad" },
        { label: "Paiements en retard", value: `${late.length} (${eur(late.reduce((s, t) => s + num(t.amount), 0))})`, tone: late.length ? "bad" : "good" },
        { label: "Encaissements attendus", value: eur(pending.reduce((s, t) => s + num(t.amount), 0)) },
        ...tasksBlock(records, today),
      ];
    }
    case "rh-people-ops": {
      const cands = ofKind(records, "candidate");
      return [
        { label: "Candidatures reçues ce mois", value: String(extras.applicationsThisMonth ?? 0) },
        { label: "Candidatures sans réponse", value: String(extras.applicationsWaiting ?? 0), tone: (extras.applicationsWaiting ?? 0) > 0 ? "warn" : "good" },
        { label: "En entretien ou mise en situation", value: String(cands.filter((c) => c.status === "entretien" || c.status === "test").length) },
        { label: "Recrutés ce mois", value: String(cands.filter((c) => inMonth(stageDate(c, "embauche"), month)).length), tone: "good" },
        ...tasksBlock(records, today),
      ];
    }
    case "head-coach": {
      const audits = ofKind(records, "audit");
      const done = audits.filter((a) => a.status === "fait" && inMonth(a.occurred_on ?? stageDate(a, "fait"), month));
      const scores = done.map((a) => num(a.data?.score)).filter((s) => s > 0);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      let retained = 0, lost = 0;
      for (const member of team) {
        for (const f of ofKind(member.records, "followup")) {
          if (inMonth(stageDate(f, "actif_j30"), month)) retained++;
          if (inMonth(stageDate(f, "perdu"), month)) lost++;
        }
      }
      return [
        { label: "Audits faits ce mois", value: String(done.length), tone: "good" },
        { label: "Note qualité moyenne", value: avg === null ? "Pas encore d'audit noté" : `${avg.toFixed(1)} / 10`, tone: avg === null ? "neutral" : avg >= 7 ? "good" : "warn" },
        { label: "Audits planifiés", value: String(audits.filter((a) => a.status === "planifie").length) },
        { label: "Rétention J+30 de l'équipe", value: retained + lost ? pct(ratio(retained, retained + lost)) : "Pas encore de J+30" },
        ...tasksBlock(records, today),
      ];
    }
    case "coach-onboarding-success": {
      const follows = ofKind(records, "followup");
      const retained = follows.filter((f) => inMonth(stageDate(f, "actif_j30"), month)).length;
      const lost = follows.filter((f) => inMonth(stageDate(f, "perdu"), month)).length;
      const welcomePending = follows.filter((f) => f.status === "j0").length;
      return [
        { label: "Actifs à J+30 ce mois", value: String(retained), hint: "Chacun déclenche ta prime de rétention", tone: "good" },
        { label: "Taux de rétention J+30", value: retained + lost ? pct(ratio(retained, retained + lost)) : "Pas encore de J+30", tone: retained + lost && ratio(retained, retained + lost) < 0.7 ? "warn" : "neutral" },
        { label: "Bienvenues à faire", value: String(welcomePending), tone: welcomePending ? "warn" : "good" },
        { label: "Clients en suivi", value: String(follows.filter((f) => !isClosedStage("followup", f.status)).length) },
        { label: "Nouveaux clients (30 jours)", value: String(extras.newPayingClients ?? 0), hint: "Clients payants réels démarrés récemment" },
        ...tasksBlock(records, today),
      ];
    }
    default:
      return tasksBlock(records, today);
  }
}

/** Résumé court d'une personne pour la vue "Mon équipe". */
export function memberSummary(member: TeamMemberData, now: Date = new Date()): Kpi[] {
  return computeKpis(member.roleKey, member.records, {}, [], now).slice(0, 3);
}

/** Les éléments qui demandent une action aujourd'hui, tous modules confondus. */
export function todayAgenda(records: StaffRecord[], now: Date = new Date()): StaffRecord[] {
  const today = parisDate(now);
  return records
    .filter((r) => r.kind === "appointment" && r.status === "planifie" && r.due_at && parisDate(r.due_at) === today)
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
}

export function overdueItems(records: StaffRecord[], now: Date = new Date()): StaffRecord[] {
  const today = parisDate(now);
  const nowIso = now.toISOString();
  return records.filter((r) => {
    if (r.kind === "report" || r.kind === "appointment") return false;
    if (isOverdue(r, today)) return true;
    // Relances et prochains contacts dépassés (CRM, suivis, candidats).
    return !!r.due_at && r.due_at < nowIso && !isClosedStage(r.kind, r.status) && r.kind !== "opportunity";
  });
}

export function kindLabel(kind: RecordKind): string {
  return kind === "report" ? "Rapport" : KINDS[kind].singular;
}

// Valeurs réelles du mois pour les objectifs personnels (lib/staff-playbooks.ts,
// champ targets). Mêmes calculs que les indicateurs, en nombres bruts.
export function targetActuals(
  roleKey: string,
  records: StaffRecord[],
  team: TeamMemberData[] = [],
  now: Date = new Date()
): Record<string, number> {
  const month = currentMonthKey(now);
  const today = parisDate(now);
  const reports = ofKind(records, "report");
  const inM = (d: string | null | undefined) => inMonth(d, month);
  const count = (kind: RecordKind, stage: string) => ofKind(records, kind).filter((r) => inM(stageDate(r, stage))).length;

  switch (roleKey) {
    case "closer": {
      const s = salesCloser(records, reports, month);
      return { ventes: s.sales, cash: s.cash, appels: s.callsHeld };
    }
    case "setter": {
      const s = salesSetter(records, reports, month);
      return { rdv: s.booked, qualifies: s.qualified };
    }
    case "head-of-sales": {
      let cash = 0, sales = 0;
      for (const m of [...team, { userId: "", fullName: "", roleKey: "closer", records }]) {
        if (m.roleKey !== "closer") continue;
        const s = salesCloser(m.records, ofKind(m.records, "report"), month);
        cash += s.cash;
        sales += s.sales;
      }
      return { ca_equipe: cash, ventes_equipe: sales };
    }
    case "createur-contenu-videaste":
    case "copywriter":
      return { livres: deliverables(records, month, today).delivered };
    case "community-manager":
      return { publies: Math.max(deliverables(records, month, today).published, reportSum(reports, month, "posts_publies")) };
    case "personal-brand-manager":
      return { confirmees: count("opportunity", "confirme") };
    case "growth-traffic-manager": {
      const c = campaigns(records);
      return { leads: c.leads, ca_pub: c.revenue };
    }
    case "head-of-marketing":
      return { livres_equipe: [...team.map((t) => t.records), records].reduce((s, r) => s + deliverables(r, month, today).delivered, 0) };
    case "developpeur-saas":
      return { resolus: tickets(records, month).resolved, features: count("feature", "livre") };
    case "product-manager":
      return { features_livrees: count("feature", "livre") };
    case "support-client-tech":
      return { resolus: tickets(records, month).resolved };
    case "office-ops-manager":
      return { process_valides: ofKind(records, "process").filter((p) => p.status === "valide").length };
    case "secretaire-assistant":
      return { emails: reportSum(reports, month, "emails") };
    case "finance-comptabilite":
      return {
        encaisse: ofKind(records, "transaction")
          .filter((t) => inM(t.occurred_on) && t.status === "paye" && t.data?.direction === "encaissement")
          .reduce((s, t) => s + num(t.amount), 0),
      };
    case "rh-people-ops":
      return { recrutes: count("candidate", "embauche"), entretiens: Math.max(count("candidate", "entretien"), reportSum(reports, month, "entretiens")) };
    case "head-coach":
      return { audits: ofKind(records, "audit").filter((a) => a.status === "fait" && inM(a.occurred_on ?? stageDate(a, "fait"))).length };
    case "coach-onboarding-success":
      return { actifs_j30: count("followup", "actif_j30") };
    default:
      return {};
  }
}
