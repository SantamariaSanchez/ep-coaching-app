// Écosystème connecté de l'équipe (demande directe 2026-09-25 : "connecter
// tout à tout, quand j'ai un RDV booké ça le met sur l'agenda du closer, un
// nouveau lead sur un lead magnet le setter l'a dans son CRM").
//
//   lead magnet / préqualification  ->  CRM du setter le moins chargé
//   RDV Calendly                      ->  agenda + CRM du closer, lead du setter en "RDV booké"
//   appel honoré / no-show            ->  prospect avancé, setter prévenu du no-show
//   paiement Stripe                   ->  vente closée (closer + setter), trésorerie, suivi J+30
//   candidature /carrieres            ->  pipeline RH
//
// Tout passe par le client service role : ces écritures traversent les
// espaces de plusieurs personnes. Chaque fonction est "best effort" : un
// échec ici ne doit jamais faire échouer l'action d'origine (inscription,
// paiement, candidature), qui reste prioritaire.

import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { applyStageHistory, funnelRank, parisToday } from "@/lib/staff-stages";
import { getRoleCard, type RecordKind } from "@/lib/staff-roles";
import { PRODUCT_LABELS, isCoachingProduct, type ProductKey } from "@/lib/stripe-products";

type Admin = ReturnType<typeof createAdminClient>;
type EditableKind = Exclude<RecordKind, "report">;

interface Member {
  user_id: string;
  owner_id: string;
  role_key: string;
  full_name: string;
}

interface Row {
  id: string;
  staff_id: string;
  kind: EditableKind;
  title: string;
  status: string;
  amount: number | null;
  occurred_on: string | null;
  due_at: string | null;
  data: Record<string, unknown>;
}

const ROW_FIELDS = "id, staff_id, kind, title, status, amount, occurred_on, due_at, data";
const CLOSED_LEAD = ["close", "perdu"];
// Fenêtre de reprise des leads pas encore confiés à quelqu'un.
const CATCH_UP_DAYS = 30;

// ── Répartition ─────────────────────────────────────────────────────────

// Membres actifs ET sous contrat signé : une recrue qui n'a pas encore signé
// ne voit pas son espace, lui confier un lead le laisserait sans réponse.
async function activeMembers(admin: Admin, roleKeys: string[]): Promise<Member[]> {
  const { data } = await admin
    .from("staff_members")
    .select("user_id, owner_id, role_key, full_name")
    .eq("status", "actif")
    .not("contract_signed_at", "is", null)
    .in("role_key", roleKeys);
  return (data as Member[]) ?? [];
}

// Le moins chargé en éléments ouverts du type donné, par ordre de priorité
// des métiers (ex : setter, sinon Head of Sales, sinon closer).
async function pickAssignee(admin: Admin, tiers: string[][], kind: EditableKind, openStatuses: string[] | null): Promise<Member | null> {
  for (const tier of tiers) {
    const members = await activeMembers(admin, tier);
    if (members.length === 0) continue;
    let query = admin.from("staff_records").select("staff_id, status").eq("kind", kind).in("staff_id", members.map((m) => m.user_id));
    if (openStatuses) query = query.in("status", openStatuses);
    const { data } = await query;
    const load: Record<string, number> = {};
    for (const r of (data as { staff_id: string }[]) ?? []) load[r.staff_id] = (load[r.staff_id] ?? 0) + 1;
    return [...members].sort((a, b) => (load[a.user_id] ?? 0) - (load[b.user_id] ?? 0) || Math.random() - 0.5)[0];
  }
  return null;
}

async function memberById(admin: Admin, userId: string): Promise<Member | null> {
  const { data } = await admin.from("staff_members").select("user_id, owner_id, role_key, full_name").eq("user_id", userId).maybeSingle();
  return (data as Member) ?? null;
}

async function insertRow(
  admin: Admin,
  staffId: string,
  kind: EditableKind,
  status: string,
  fields: { title: string; amount?: number | null; occurred_on?: string | null; due_at?: string | null; data?: Record<string, unknown> }
): Promise<Row | null> {
  const staged = applyStageHistory(kind, status, fields.data ?? {}, fields.occurred_on ?? null);
  const { data } = await admin
    .from("staff_records")
    .insert({
      staff_id: staffId,
      kind,
      status,
      title: fields.title.slice(0, 300),
      amount: fields.amount ?? null,
      occurred_on: staged.occurred_on,
      due_at: fields.due_at ?? null,
      data: staged.data,
    })
    .select(ROW_FIELDS)
    .maybeSingle();
  return (data as Row) ?? null;
}

async function updateRow(
  admin: Admin,
  row: Row,
  patch: { status?: string; amount?: number | null; due_at?: string | null; occurred_on?: string | null; data?: Record<string, unknown> }
): Promise<void> {
  const status = patch.status ?? row.status;
  const staged = applyStageHistory(row.kind, status, { ...row.data, ...(patch.data ?? {}) }, patch.occurred_on ?? row.occurred_on);
  await admin
    .from("staff_records")
    .update({
      status,
      amount: patch.amount !== undefined ? patch.amount : row.amount,
      due_at: patch.due_at !== undefined ? patch.due_at : row.due_at,
      occurred_on: staged.occurred_on,
      data: staged.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

async function findByExternalId(admin: Admin, externalId: string): Promise<Row | null> {
  const { data } = await admin.from("staff_records").select(ROW_FIELDS).eq("data->>_external_id", externalId).limit(1).maybeSingle();
  return (data as Row) ?? null;
}

// Un prospect déjà suivi (encore ouvert), trouvé par email ou téléphone.
// Priorité à la fiche du closer quand setter et closer en ont chacun une.
async function findOpenLead(admin: Admin, email: string | null, phone: string | null): Promise<{ row: Row; owner: Member | null } | null> {
  const found: Row[] = [];
  if (email) {
    const { data } = await admin.from("staff_records").select(ROW_FIELDS).eq("kind", "lead").eq("data->>email", email.toLowerCase()).not("status", "in", `(${CLOSED_LEAD.join(",")})`);
    found.push(...((data as Row[]) ?? []));
  }
  if (found.length === 0 && phone) {
    const { data } = await admin.from("staff_records").select(ROW_FIELDS).eq("kind", "lead").eq("data->>phone", phone).not("status", "in", `(${CLOSED_LEAD.join(",")})`);
    found.push(...((data as Row[]) ?? []));
  }
  if (found.length === 0) return null;
  const withOwners = await Promise.all(found.map(async (row) => ({ row, owner: await memberById(admin, row.staff_id) })));
  withOwners.sort((a, b) => {
    const score = (m: Member | null) => (m?.role_key === "closer" ? 0 : m?.role_key === "head-of-sales" ? 1 : 2);
    return score(a.owner) - score(b.owner);
  });
  return withOwners[0];
}

function appendNote(existing: unknown, line: string): string {
  const stamp = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
  const prev = typeof existing === "string" && existing ? `${existing}\n` : "";
  return `${prev}[${stamp}] ${line}`.slice(-2000);
}

function notify(userId: string, title: string, body: string, url: string) {
  notifyUser(userId, { type: "staff", title, body, url }).catch(() => {});
}

// ── 1. Leads entrants ───────────────────────────────────────────────────

export interface InboundLead {
  source: "lead_magnet" | "prequalification" | "app_signup";
  externalId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  offre?: "coaching_physique" | "coaching_business" | null;
  stage: "nouveau" | "qualifie";
  summary: string;
}

export type RouteResult = "assigned" | "merged" | "duplicate" | "no_staff" | "error";

export async function routeInboundLead(input: InboundLead): Promise<RouteResult> {
  try {
    const admin = createAdminClient();
    if (await findByExternalId(admin, input.externalId)) return "duplicate";
    const email = input.email?.trim().toLowerCase() || null;

    const existing = await findOpenLead(admin, email, input.phone);
    if (existing) {
      const { row } = existing;
      const advance = funnelRank("lead", input.stage) > funnelRank("lead", row.status);
      await updateRow(admin, row, {
        status: advance ? input.stage : row.status,
        data: {
          notes: appendNote(row.data.notes, input.summary),
          ...(input.offre && !row.data.offre ? { offre: input.offre } : {}),
          ...(input.phone && !row.data.phone ? { phone: input.phone } : {}),
        },
      });
      notify(row.staff_id, `${row.title} est revenu`, input.summary.slice(0, 140), "/equipe/crm");
      return "merged";
    }

    const assignee = await pickAssignee(admin, [["setter"], ["head-of-sales"], ["closer"]], "lead", ["nouveau", "contacte", "qualifie", "rdv_booke", "show"]);
    if (!assignee) return "no_staff";

    const title = input.name?.trim() || email || input.phone || "Prospect";
    const row = await insertRow(admin, assignee.user_id, "lead", input.stage, {
      title,
      // Standard du poste de setter : premier contact en moins de 2h.
      due_at: new Date(Date.now() + 2 * 3600_000).toISOString(),
      data: {
        email,
        phone: input.phone,
        source: input.source === "prequalification" ? "formulaire" : input.source === "app_signup" ? "appli" : "lead_magnet",
        origine: "fourni",
        ...(input.offre ? { offre: input.offre } : {}),
        notes: appendNote(null, input.summary),
        _external_id: input.externalId,
        _source: input.source,
      },
    });
    if (row) {
      notify(
        assignee.user_id,
        input.stage === "qualifie" ? "Nouveau lead qualifié" : "Nouveau lead",
        `${title} : premier contact à faire dans les 2h.`,
        "/equipe/crm"
      );
    }
    return row ? "assigned" : "error";
  } catch (e) {
    console.error("routeInboundLead error:", e);
    return "error";
  }
}

// ── 2. RDV Calendly ─────────────────────────────────────────────────────

export interface Booking {
  eventUri: string;
  startsAt: string;
  status: "active" | "canceled";
  joinUrl: string | null;
  inviteeName: string | null;
  inviteeEmail: string | null;
  inviteePhone: string | null;
  campaign: string | null;
  answers: string[];
}

export async function syncBooking(b: Booking): Promise<"created" | "canceled" | "unchanged" | "skipped"> {
  try {
    const admin = createAdminClient();
    const existingAppt = await findByExternalId(admin, `calendly:${b.eventUri}`);

    if (b.status === "canceled") {
      if (!existingAppt || existingAppt.status !== "planifie") return "unchanged";
      await updateRow(admin, existingAppt, { status: "annule", data: { notes: appendNote(existingAppt.data.notes, "Annulé par le prospect sur Calendly.") } });
      notify(existingAppt.staff_id, "RDV annulé", `${existingAppt.title} a annulé son appel.`, "/equipe/agenda");
      return "canceled";
    }
    if (existingAppt) {
      if (existingAppt.due_at !== b.startsAt && existingAppt.status === "planifie") {
        await updateRow(admin, existingAppt, { due_at: b.startsAt, data: { notes: appendNote(existingAppt.data.notes, "Replanifié sur Calendly.") } });
      }
      return "unchanged";
    }

    const email = b.inviteeEmail?.toLowerCase() ?? null;
    const lead = await findOpenLead(admin, email, b.inviteePhone);
    const offre = b.campaign === "business" ? "coaching_business" : b.campaign === "physique" ? "coaching_physique" : null;

    // Le closer : celui qui a déjà la fiche, sinon le moins chargé en RDV à venir.
    let closer: Member | null = lead?.owner && ["closer", "head-of-sales"].includes(lead.owner.role_key) ? lead.owner : null;
    if (!closer) closer = await pickAssignee(admin, [["closer"], ["head-of-sales"]], "appointment", ["planifie", "reporte"]);
    if (!closer && lead?.owner) closer = lead.owner;
    if (!closer) return "skipped";

    const name = b.inviteeName || lead?.row.title || email || "Prospect";
    const context = [
      b.campaign ? `Parcours : ${b.campaign === "business" ? "business" : "physique"}` : null,
      ...b.answers,
      lead?.row.data.notes ? `Historique : ${String(lead.row.data.notes)}` : null,
    ].filter(Boolean).join("\n");

    // Fiche prospect côté closer (reliée à celle du setter s'il y en a une).
    let closerLead: Row | null = null;
    if (lead && lead.row.staff_id === closer.user_id) {
      closerLead = lead.row;
      await updateRow(admin, lead.row, { status: funnelRank("lead", lead.row.status) < funnelRank("lead", "rdv_booke") ? "rdv_booke" : lead.row.status, due_at: b.startsAt });
    } else {
      closerLead = await insertRow(admin, closer.user_id, "lead", "rdv_booke", {
        title: name,
        due_at: b.startsAt,
        data: {
          email,
          phone: b.inviteePhone ?? (lead?.row.data.phone as string | undefined) ?? null,
          source: lead ? ((lead.row.data.source as string | undefined) ?? "formulaire") : "calendly",
          origine: (lead?.row.data.origine as string | undefined) ?? "fourni",
          ...(offre ?? lead?.row.data.offre ? { offre: offre ?? lead?.row.data.offre } : {}),
          notes: appendNote(null, `RDV réservé sur Calendly.${context ? `\n${context}` : ""}`),
          ...(lead ? { _linked: lead.row.id, _setter_id: lead.row.staff_id } : {}),
        },
      });
      if (lead && closerLead) {
        await updateRow(admin, lead.row, {
          status: funnelRank("lead", lead.row.status) < funnelRank("lead", "rdv_booke") ? "rdv_booke" : lead.row.status,
          data: { _linked: closerLead.id, notes: appendNote(lead.row.data.notes, `RDV booké avec ${closer.full_name}.`) },
        });
        notify(lead.row.staff_id, "RDV booké", `${name} a réservé son appel avec ${closer.full_name}.`, "/equipe/crm");
      }
    }

    await insertRow(admin, closer.user_id, "appointment", "planifie", {
      title: `Appel avec ${name}`,
      due_at: b.startsAt,
      data: {
        type: "decouverte",
        ...(b.inviteePhone ? { phone: b.inviteePhone } : {}),
        ...(b.joinUrl ? { link: b.joinUrl } : {}),
        notes: context || "Réservé via Calendly.",
        _external_id: `calendly:${b.eventUri}`,
        ...(closerLead ? { _lead_id: closerLead.id } : {}),
      },
    });
    const when = new Date(b.startsAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    notify(closer.user_id, "Nouveau RDV dans ton agenda", `${name}, ${when}.`, "/equipe/agenda");
    return "created";
  } catch (e) {
    console.error("syncBooking error:", e);
    return "skipped";
  }
}

// ── 3. Résultat d'un appel et d'une vente, propagé aux fiches reliées ───

// Appelé après chaque changement d'étape fait à la main dans l'espace
// équipe (app/equipe/actions.ts). Ne touche qu'aux fiches reliées par le
// système (_linked, _lead_id), jamais à une fiche choisie par l'utilisateur.
export async function onStaffRecordStatusChange(recordId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("staff_records").select(ROW_FIELDS).eq("id", recordId).maybeSingle();
    const row = data as Row | null;
    if (!row) return;

    // Tâche assignée par le fondateur et terminée : il est prévenu.
    if (row.kind === "task" && row.status === "fait" && typeof row.data._assigned_by === "string") {
      const who = await memberById(admin, row.staff_id);
      notify(row.data._assigned_by, "Tâche terminée", `${who?.full_name ?? "Un membre"} a terminé : ${row.title}`, `/dashboard/coach/admin/equipe/${row.staff_id}`);
      return;
    }

    if (row.kind === "appointment" && typeof row.data._lead_id === "string") {
      const { data: leadData } = await admin.from("staff_records").select(ROW_FIELDS).eq("id", row.data._lead_id).maybeSingle();
      const lead = leadData as Row | null;
      if (!lead) return;
      if (row.status === "honore" && funnelRank("lead", lead.status) >= 0 && funnelRank("lead", lead.status) < funnelRank("lead", "show")) {
        await updateRow(admin, lead, { status: "show" });
        await onStaffRecordStatusChange(lead.id);
      }
      if (row.status === "no_show" && typeof lead.data._setter_id === "string") {
        notify(lead.data._setter_id, "No-show à relancer", `${lead.title} ne s'est pas présenté à son appel. Relance-le pour replanifier.`, "/equipe/crm");
        if (typeof lead.data._linked === "string") {
          const { data: setterLead } = await admin.from("staff_records").select(ROW_FIELDS).eq("id", lead.data._linked).maybeSingle();
          if (setterLead) await updateRow(admin, setterLead as Row, { due_at: new Date().toISOString(), data: { notes: appendNote((setterLead as Row).data.notes, "No-show à l'appel, à relancer.") } });
        }
      }
      return;
    }

    if (row.kind === "lead" && typeof row.data._linked === "string" && ["show", "close", "perdu"].includes(row.status)) {
      const { data: linkedData } = await admin.from("staff_records").select(ROW_FIELDS).eq("id", row.data._linked).maybeSingle();
      const linked = linkedData as Row | null;
      if (!linked || linked.status === row.status) return;
      await updateRow(admin, linked, {
        status: row.status,
        ...(row.status === "close" ? { amount: row.amount, occurred_on: row.occurred_on } : {}),
      });
      if (row.status === "close") notify(linked.staff_id, "Vente closée", `${row.title} a signé. Ta commission est comptée.`, "/equipe");
    }
  } catch (e) {
    console.error("onStaffRecordStatusChange error:", e);
  }
}

// ── 4. Paiements Stripe ─────────────────────────────────────────────────

export interface PaymentEvent {
  externalId: string;
  email: string | null;
  name: string | null;
  amountCents: number;
  product: ProductKey | null;
  firstPayment: boolean;
}

export async function recordPayment(p: PaymentEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!p.amountCents || p.amountCents <= 0) return;
    const amount = Math.round(p.amountCents) / 100;
    const label = p.product ? PRODUCT_LABELS[p.product] : "Paiement";
    const who = p.name || p.email || "Client";
    const email = p.email?.toLowerCase() ?? null;

    // Trésorerie : une écriture chez la personne en charge de la finance.
    if (!(await findByExternalId(admin, `stripe:${p.externalId}`))) {
      const finance = await pickAssignee(admin, [["finance-comptabilite"]], "transaction", null);
      if (finance) {
        await insertRow(admin, finance.user_id, "transaction", "paye", {
          title: `${label}, ${who}`,
          amount,
          occurred_on: parisToday(),
          data: {
            direction: "encaissement",
            category: p.product === "formation" ? "formation" : p.product?.startsWith("saas") ? "saas" : "coaching",
            party: who,
            notes: p.firstPayment ? "Premier paiement (Stripe)." : "Renouvellement (Stripe).",
            _external_id: `stripe:${p.externalId}`,
          },
        });
      }
    }

    if (!p.firstPayment) return;

    // Vente : la fiche prospect ouverte à cet email est closée
    // automatiquement, commission comprise, chez le closer et le setter.
    const lead = await findOpenLead(admin, email, null);
    if (lead) {
      await updateRow(admin, lead.row, {
        status: "close",
        amount: (lead.row.amount ?? 0) + amount,
        occurred_on: parisToday(),
        data: {
          ...(p.product && ["coaching_physique", "coaching_business", "saas_standard", "saas_premium", "formation"].includes(p.product) ? { offre: p.product } : {}),
          notes: appendNote(lead.row.data.notes, `Paiement Stripe reçu : ${amount} € (${label}).`),
        },
      });
      await onStaffRecordStatusChange(lead.row.id);
      notify(lead.row.staff_id, "Paiement reçu, vente closée", `${lead.row.title} vient de payer ${amount} € (${label}).`, "/equipe/crm");
    }

    // Accompagnement humain : suivi des 30 premiers jours.
    if (isCoachingProduct(p.product)) {
      const onboarding = await pickAssignee(admin, [["coach-onboarding-success"], ["head-coach"]], "followup", ["j0", "j7", "j30"]);
      if (onboarding && onboarding.role_key === "coach-onboarding-success") {
        await insertRow(admin, onboarding.user_id, "followup", "j0", {
          title: who,
          occurred_on: parisToday(),
          due_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
          data: {
            notes: appendNote(null, `${label}, premier paiement de ${amount} €.${email ? ` Email : ${email}.` : ""}`),
            _external_id: `onboarding:${p.externalId}`,
          },
        });
        notify(onboarding.user_id, "Nouveau client à accueillir", `${who} vient de démarrer (${label}). Bienvenue à faire sous 24h.`, "/equipe/clients");
      }
    }
  } catch (e) {
    console.error("recordPayment error:", e);
  }
}

// ── 5. Candidatures ─────────────────────────────────────────────────────

export async function routeApplicationToHr(a: { applicationId: string; roleKey: string; name: string; email: string; phone: string | null }): Promise<void> {
  try {
    const admin = createAdminClient();
    if (await findByExternalId(admin, `application:${a.applicationId}`)) return;
    const hr = await pickAssignee(admin, [["rh-people-ops"]], "candidate", null);
    if (!hr) return;
    await insertRow(admin, hr.user_id, "candidate", "candidature", {
      title: a.name,
      // Standard du poste RH : ne jamais faire attendre une réponse.
      due_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
      data: {
        role: a.roleKey,
        email: a.email.toLowerCase(),
        ...(a.phone ? { phone: a.phone } : {}),
        source: "carrieres",
        notes: "Candidature reçue sur la page Carrières (réponses et CV dans la section du dessus).",
        _external_id: `application:${a.applicationId}`,
      },
    });
    notify(hr.user_id, "Nouvelle candidature", `${a.name} postule comme ${getRoleCard(a.roleKey)?.role.title ?? a.roleKey}.`, "/equipe/recrutement");
  } catch (e) {
    console.error("routeApplicationToHr error:", e);
  }
}

// ── 6. Synchro Calendly (appelée par le cron staff-sync) ────────────────

interface CalendlyEvent {
  uri: string;
  status: "active" | "canceled";
  start_time: string;
  location?: { join_url?: string } | null;
}
interface CalendlyInvitee {
  email?: string;
  name?: string;
  status?: string;
  text_reminder_number?: string | null;
  questions_and_answers?: { question: string; answer: string }[];
  tracking?: { utm_campaign?: string | null } | null;
}

async function calendly<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

// Sans CALENDLY_API_TOKEN (jeton personnel Calendly, disponible sur le plan
// gratuit), la synchro ne fait rien et le signale : les webhooks Calendly
// exigent un plan payant, d'où ce passage en lecture régulière.
export async function syncCalendly(): Promise<{ ok: boolean; reason?: string; created: number; canceled: number }> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return { ok: false, reason: "CALENDLY_API_TOKEN absent", created: 0, canceled: 0 };
  const me = await calendly<{ resource: { uri: string } }>("https://api.calendly.com/users/me", token);
  if (!me) return { ok: false, reason: "Jeton Calendly refusé", created: 0, canceled: 0 };

  const min = new Date(Date.now() - 24 * 3600_000).toISOString();
  const max = new Date(Date.now() + 60 * 86_400_000).toISOString();
  let url: string | null =
    `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(me.resource.uri)}&min_start_time=${encodeURIComponent(min)}&max_start_time=${encodeURIComponent(max)}&count=100&sort=start_time:asc`;
  let created = 0;
  let canceled = 0;
  let pages = 0;

  while (url && pages < 5) {
    pages++;
    const page: { collection: CalendlyEvent[]; pagination?: { next_page?: string | null } } | null = await calendly(url, token);
    if (!page) break;
    for (const ev of page.collection) {
      const invitees = await calendly<{ collection: CalendlyInvitee[] }>(`${ev.uri}/invitees?count=10`, token);
      const inv = invitees?.collection?.find((i) => i.status === "active") ?? invitees?.collection?.[0];
      const answers = (inv?.questions_and_answers ?? []).filter((qa) => qa.answer).map((qa) => `${qa.question} : ${qa.answer}`);
      const phoneAnswer = inv?.text_reminder_number || null;
      const result = await syncBooking({
        eventUri: ev.uri,
        startsAt: ev.start_time,
        status: ev.status,
        joinUrl: ev.location?.join_url ?? null,
        inviteeName: inv?.name ?? null,
        inviteeEmail: inv?.email ?? null,
        inviteePhone: phoneAnswer,
        campaign: inv?.tracking?.utm_campaign ?? null,
        answers,
      });
      if (result === "created") created++;
      if (result === "canceled") canceled++;
    }
    url = page.pagination?.next_page ?? null;
  }
  return { ok: true, created, canceled };
}

// ── 7. Préqualifications (écrites par ep-coaching-formulaires) ──────────

const PREQUAL_LABELS: Record<string, string> = {
  objectif: "Objectif",
  pourquoi: "Pourquoi",
  niveau: "Ancienneté d'entraînement",
  motivation: "Engagement",
  pourquoi_ep_coaching: "Pourquoi EP Coaching",
  lead_qualification_signal: "Déclencheur",
  timeline: "Démarrage",
  budget: "Budget mensuel",
  source_decouverte: "Découverte",
  anciennete: "Ancienneté comme coach",
  nb_clients: "Clients actuels",
  gestion_actuelle: "Gestion actuelle",
  blocage_principal: "Blocage principal",
  objectif_business: "Objectif business",
  disponibilite: "Disponibilité",
};

export async function syncPrequalifications(): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - CATCH_UP_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("prequalification_responses")
    .select("id, form_type, first_name, last_name, phone, email, answers, created_at")
    .is("staff_routed_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error || !data) return 0;
  let routed = 0;
  for (const r of data as { id: string; form_type: string; first_name: string; last_name: string; phone: string; email: string | null; answers: Record<string, string> }[]) {
    const lines = Object.entries(r.answers ?? {})
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => `${PREQUAL_LABELS[k] ?? k} : ${v}`);
    const result = await routeInboundLead({
      source: "prequalification",
      externalId: `prequal:${r.id}`,
      name: `${r.first_name} ${r.last_name}`.trim(),
      email: r.email,
      phone: r.phone || null,
      offre: r.form_type === "business" ? "coaching_business" : "coaching_physique",
      stage: "qualifie",
      summary: `Formulaire de préqualification ${r.form_type === "business" ? "business" : "physique"} rempli.\n${lines.join("\n")}`,
    });
    // Marquée traitée seulement si quelqu'un l'a vraiment reçue : sans
    // équipe, elle attend la première recrue (rattrapage, voir plus bas).
    if (result === "no_staff" || result === "error") continue;
    await admin.from("prequalification_responses").update({ staff_routed_at: new Date().toISOString() }).eq("id", r.id);
    routed++;
  }
  return routed;
}

// Rattrapage des leads arrivés quand personne n'était là pour les traiter
// (ou avant qu'une recrue signe son contrat) : guides gratuits et
// inscriptions de membres EP des 30 derniers jours. Sans doublon grâce à
// l'identifiant externe, donc sans risque à chaque passage.
export async function syncCatchUp(): Promise<number> {
  const admin = createAdminClient();
  if ((await activeMembers(admin, ["setter", "head-of-sales", "closer"])).length === 0) return 0;
  const since = new Date(Date.now() - CATCH_UP_DAYS * 86_400_000).toISOString();
  let routed = 0;

  const { data: magnets } = await admin
    .from("leads")
    .select("id, email, phone, lead_magnet_slug, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(100);
  for (const l of (magnets as { id: string; email: string | null; phone: string | null; lead_magnet_slug: string | null }[]) ?? []) {
    const result = await routeInboundLead({
      source: "lead_magnet",
      externalId: `leadmagnet:${l.id}`,
      name: null,
      email: l.email,
      phone: l.phone,
      stage: "nouveau",
      summary: `A téléchargé un guide gratuit (${l.lead_magnet_slug ?? "ressource"}).`,
    });
    if (result === "assigned" || result === "merged") routed++;
  }

  const { data: owners } = await admin.from("profiles").select("id").or("is_platform_owner.eq.true,is_ai_coach.eq.true");
  const epCoachIds = ((owners as { id: string }[]) ?? []).map((o) => o.id);
  if (epCoachIds.length) {
    const { data: members } = await admin
      .from("profiles")
      .select("id, full_name, email, phone, start_date")
      .eq("role", "client")
      .neq("subscription_status", "active")
      .in("coach_id", epCoachIds)
      .gte("start_date", since.slice(0, 10))
      .order("start_date", { ascending: true })
      .limit(100);
    for (const m of (members as { id: string; full_name: string | null; email: string | null; phone: string | null }[]) ?? []) {
      const result = await routeInboundLead({
        source: "app_signup",
        externalId: `signup:${m.id}`,
        name: m.full_name,
        email: m.email,
        phone: m.phone,
        stage: "nouveau",
        summary: "S'est inscrit gratuitement dans l'appli (membre de la communauté).",
      });
      if (result === "assigned" || result === "merged") routed++;
    }
  }
  return routed;
}
