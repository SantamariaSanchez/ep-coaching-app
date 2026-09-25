// "Ce que tu dois faire maintenant" pour une personne de l'équipe, calculé à
// partir de ses propres données (fichier pur, réutilisé par le tableau de
// bord et par le briefing du matin envoyé par email).

import { isClosedStage } from "@/lib/staff-roles";
import { parisDate, type StaffRecord } from "@/lib/staff-kpis";

export interface NextAction {
  id: string;
  /** 1 = maintenant, 2 = aujourd'hui, 3 = quand tu peux. */
  priority: 1 | 2 | 3;
  title: string;
  detail?: string;
  href: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
}

function firstLine(v: unknown, max = 160): string | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const text = v.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function computeNextActions(roleKey: string, records: StaffRecord[], now: Date = new Date()): NextAction[] {
  const actions: NextAction[] = [];
  const t = now.getTime();
  const today = parisDate(now);
  const hour = Number(now.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).slice(0, 2));
  const open = (r: StaffRecord) => r.kind !== "report" && !isClosedStage(r.kind, r.status);

  for (const r of records) {
    if (!open(r)) continue;
    const due = r.due_at ? new Date(r.due_at).getTime() : null;

    switch (r.kind) {
      case "appointment": {
        if (due === null) break;
        if (r.status === "planifie" && due < t - 30 * 60_000) {
          actions.push({ id: `log-${r.id}`, priority: 1, title: `Logge l'issue : ${r.title}`, detail: "Honoré ou No-show, puis l'étape du prospect dans le CRM.", href: "/equipe/agenda" });
        } else if (r.status === "planifie" && due >= t && due <= t + 3 * HOUR) {
          actions.push({ id: `prep-${r.id}`, priority: 1, title: `Prépare : ${r.title} à ${time(r.due_at!)}`, detail: firstLine(r.data?.notes) ?? "Relis la fiche du prospect avant l'appel.", href: "/equipe/agenda" });
        }
        break;
      }
      case "lead": {
        if (r.status === "nouveau" && ["setter", "head-of-sales", "closer"].includes(roleKey)) {
          const age = t - new Date(r.created_at).getTime();
          actions.push({
            id: `first-${r.id}`,
            priority: age > 2 * HOUR ? 1 : 2,
            title: `Premier contact : ${r.title}`,
            detail: age > 2 * HOUR ? "Délai de 2h dépassé." : firstLine(r.data?.notes),
            href: "/equipe/crm",
          });
        } else if (r.status === "show" && t - new Date(r.updated_at).getTime() > 2 * DAY) {
          actions.push({ id: `decide-${r.id}`, priority: 2, title: `Décision à obtenir : ${r.title}`, detail: "Appel tenu il y a plus de 2 jours, sans décision.", href: "/equipe/crm" });
        } else if (due !== null && due <= t && r.status !== "rdv_booke") {
          actions.push({ id: `follow-${r.id}`, priority: due < t - DAY ? 1 : 2, title: `Relance : ${r.title}`, detail: firstLine(r.data?.notes, 100), href: "/equipe/crm" });
        }
        break;
      }
      case "task": {
        if (r.occurred_on && r.occurred_on < today) actions.push({ id: `task-${r.id}`, priority: 1, title: `En retard : ${r.title}`, href: "/equipe/taches" });
        else if (r.occurred_on === today) actions.push({ id: `task-${r.id}`, priority: 2, title: r.title, detail: "À faire aujourd'hui.", href: "/equipe/taches" });
        else if (!r.occurred_on && r.data?.priority === "haute") actions.push({ id: `task-${r.id}`, priority: 3, title: r.title, detail: "Priorité haute.", href: "/equipe/taches" });
        break;
      }
      case "deliverable": {
        if (r.status === "livre" || !r.occurred_on) break;
        if (r.occurred_on < today) actions.push({ id: `deliv-${r.id}`, priority: 1, title: `Deadline dépassée : ${r.title}`, href: "/equipe/livrables" });
        else if (new Date(`${r.occurred_on}T12:00:00`).getTime() - t < 2 * DAY) actions.push({ id: `deliv-${r.id}`, priority: 2, title: `À livrer bientôt : ${r.title}`, detail: `Deadline le ${new Date(`${r.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}.`, href: "/equipe/livrables" });
        break;
      }
      case "ticket": {
        const age = t - new Date(r.created_at).getTime();
        if (r.data?.priority === "critique") actions.push({ id: `ticket-${r.id}`, priority: 1, title: `Critique : ${r.title}`, href: "/equipe/tickets" });
        else if (r.status === "nouveau" && age > DAY) actions.push({ id: `ticket-${r.id}`, priority: 1, title: `Sans réponse depuis 24h : ${r.title}`, href: "/equipe/tickets" });
        else if (r.status === "nouveau") actions.push({ id: `ticket-${r.id}`, priority: 2, title: `Nouveau ticket : ${r.title}`, href: "/equipe/tickets" });
        break;
      }
      case "followup": {
        const start = r.occurred_on ? new Date(`${r.occurred_on}T12:00:00`).getTime() : new Date(r.created_at).getTime();
        const days = Math.floor((t - start) / DAY);
        if (r.status === "j0") actions.push({ id: `fu-${r.id}`, priority: days >= 1 ? 1 : 2, title: `Bienvenue à faire : ${r.title}`, detail: "Appel ou message de bienvenue, prise en main de l'appli.", href: "/equipe/clients" });
        else if (r.status === "j7" && days >= 7) actions.push({ id: `fu-${r.id}`, priority: 2, title: `Suivi J+7 : ${r.title}`, detail: "Premier bilan et première semaine bien faits ?", href: "/equipe/clients" });
        else if (r.status === "j30" && days >= 30) actions.push({ id: `fu-${r.id}`, priority: 1, title: `Bilan J+30 : ${r.title}`, detail: "Toujours actif ou parti ? C'est ce qui déclenche ta prime.", href: "/equipe/clients" });
        break;
      }
      case "candidate": {
        if (due !== null && due <= t) actions.push({ id: `cand-${r.id}`, priority: r.status === "candidature" ? 1 : 2, title: r.status === "candidature" ? `Répondre à ${r.title}` : `Prochain échange : ${r.title}`, href: "/equipe/recrutement" });
        break;
      }
      case "audit": {
        if (r.occurred_on && r.occurred_on <= today) actions.push({ id: `audit-${r.id}`, priority: 2, title: `Audit à réaliser : ${r.title}`, href: "/equipe/audits" });
        break;
      }
      case "transaction": {
        if (r.status === "en_retard") actions.push({ id: `tx-${r.id}`, priority: 1, title: `Paiement en retard : ${r.title}`, detail: "Relance et note la date.", href: "/equipe/finance" });
        else if (r.status === "en_attente" && r.occurred_on && r.occurred_on < today) actions.push({ id: `tx-${r.id}`, priority: 2, title: `Échéance passée : ${r.title}`, detail: "Reçu ? Sinon passe-le en retard.", href: "/equipe/finance" });
        break;
      }
      case "campaign": {
        if (r.status === "active" && t - new Date(r.updated_at).getTime() > 2 * DAY) actions.push({ id: `camp-${r.id}`, priority: 2, title: `Chiffres à mettre à jour : ${r.title}`, detail: "Dépense, leads, ventes et CA.", href: "/equipe/campagnes" });
        break;
      }
      case "opportunity": {
        if (due !== null && due >= t && due <= t + DAY) actions.push({ id: `opp-${r.id}`, priority: 1, title: `Demain ou aujourd'hui : ${r.title}`, detail: "Préparation à valider avec le fondateur.", href: "/equipe/opportunites" });
        break;
      }
      case "feature": {
        if (r.status === "en_test") actions.push({ id: `feat-${r.id}`, priority: 3, title: `À tester : ${r.title}`, href: "/equipe/backlog" });
        break;
      }
      default:
        break;
    }
  }

  // Leads closés sans montant : la commission ne se calcule pas sans lui.
  for (const r of records) {
    if (r.kind === "lead" && r.status === "close" && !r.amount) {
      actions.push({ id: `amount-${r.id}`, priority: 2, title: `Montant encaissé à renseigner : ${r.title}`, href: "/equipe/crm" });
    }
  }

  const reported = records.some((r) => r.kind === "report" && r.occurred_on === today);
  if (!reported && hour >= 17) {
    actions.push({ id: "report", priority: hour >= 18 ? 1 : 2, title: "Envoie ton rapport du jour", detail: "Deux minutes : tes chiffres, une victoire, un blocage.", href: "/equipe/rapports" });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 12);
}
