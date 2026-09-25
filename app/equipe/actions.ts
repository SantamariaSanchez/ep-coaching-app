"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanText, cleanNumber, safeExternalUrl, escapeHtml, LIMITS } from "@/lib/sanitize";
import { notifyAdmin } from "@/lib/admin-notify";
import { checkRateLimit } from "@/lib/rate-limit";
import { todayInParis } from "@/lib/dates";
import { requireStaff, sendContractEmail, sendStaffVerificationEmail, getStaffMember } from "@/lib/staff";
import { allowedKinds, getRoleCard, getStaffRoleConfig, KINDS, type KindDef, type RecordKind } from "@/lib/staff-roles";
import { parisLocalToIso } from "@/lib/staff-kpis";
import { STAFF_CONTRACT_VERSION, STAFF_TERMS_VERSION } from "@/lib/staff-contract";
import { isContractSigned } from "@/lib/staff-page";

type Result = { ok: true } | { error: string };
type EditableKind = Exclude<RecordKind, "report">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refresh() {
  revalidatePath("/equipe", "layout");
}

interface CleanRecord {
  title: string;
  amount: number | null;
  occurred_on: string | null;
  due_at: string | null;
  data: Record<string, unknown>;
}

// Validation côté serveur de chaque champ, d'après la même configuration que
// le formulaire (lib/staff-roles.ts) : le navigateur peut être contourné.
function sanitizeValues(def: KindDef, values: Record<string, unknown>): CleanRecord | { error: string } {
  const out: CleanRecord = { title: "", amount: null, occurred_on: null, due_at: null, data: {} };

  for (const field of def.fields) {
    const raw = values?.[field.key];
    let value: string | number | null = null;

    switch (field.type) {
      case "text":
      case "phone":
        value = cleanText(raw, field.type === "phone" ? LIMITS.phone : LIMITS.shortText);
        break;
      case "email": {
        const v = cleanText(raw, LIMITS.shortText);
        if (v && !EMAIL_RE.test(v)) return { error: `${field.label} : adresse email invalide.` };
        value = v ? v.toLowerCase() : null;
        break;
      }
      case "textarea":
        value = cleanText(raw, LIMITS.bio);
        break;
      case "number":
        value = cleanNumber(raw, { min: 0, max: 1_000_000_000 });
        if (raw !== "" && raw !== undefined && raw !== null && value === null) return { error: `${field.label} : nombre invalide.` };
        break;
      case "money":
        value = cleanNumber(raw, { min: -10_000_000, max: 10_000_000 });
        if (value !== null) value = Math.round(value * 100) / 100;
        if (raw !== "" && raw !== undefined && raw !== null && value === null) return { error: `${field.label} : montant invalide.` };
        break;
      case "date":
        value = typeof raw === "string" && DATE_RE.test(raw) ? raw : null;
        break;
      case "datetime":
        value = typeof raw === "string" && raw ? parisLocalToIso(raw) : null;
        break;
      case "select":
        value = typeof raw === "string" && field.options?.some((o) => o.value === raw) ? raw : null;
        break;
      case "url":
        value = safeExternalUrl(raw);
        break;
    }

    if (field.required && (value === null || value === "")) return { error: `${field.label} est requis.` };

    switch (field.column) {
      case "title":
        out.title = String(value ?? "");
        break;
      case "amount":
        out.amount = typeof value === "number" ? value : null;
        break;
      case "occurred_on":
        out.occurred_on = typeof value === "string" ? value : null;
        break;
      case "due_at":
        out.due_at = typeof value === "string" ? value : null;
        break;
      default:
        if (value !== null && value !== "") out.data[field.key] = value;
    }
  }

  if (!out.title) return { error: `${def.titleLabel} est requis.` };
  return out;
}

// Parcours linéaires : entrer dans une étape implique d'être passé par les
// précédentes (un lead créé directement en "RDV booké" a forcément été
// qualifié). Les étapes de sortie (perdu, refusé...) n'en font pas partie.
const FUNNELS: Partial<Record<EditableKind, string[]>> = {
  lead: ["nouveau", "contacte", "qualifie", "rdv_booke", "show", "close"],
  deliverable: ["idee", "en_cours", "relecture", "livre", "publie"],
  candidate: ["candidature", "entretien", "test", "offre", "embauche"],
  feature: ["idee", "specifie", "en_dev", "en_test", "livre"],
  followup: ["j0", "j7", "j30", "actif_j30"],
  opportunity: ["idee", "contacte", "discussion", "confirme", "publie"],
};

// Trace la date d'entrée dans chaque étape : c'est ce qui permet de compter
// "RDV bookés ce mois", "livrés ce mois", "résolus ce mois" sans historique
// séparé.
function withStageHistory(
  kind: EditableKind,
  status: string,
  internal: Record<string, unknown>,
  clean: CleanRecord
): CleanRecord {
  const today = todayInParis();
  const stages = { ...((internal._stages as Record<string, string> | undefined) ?? {}) };
  if (!stages[status]) stages[status] = today;
  const funnel = FUNNELS[kind];
  const position = funnel?.indexOf(status) ?? -1;
  if (funnel && position > 0) {
    for (const earlier of funnel.slice(0, position)) if (!stages[earlier]) stages[earlier] = stages[status];
  }
  const extra: Record<string, unknown> = { _stages: stages };
  if (kind === "ticket" && status === "resolu") extra._resolved_at = (internal._resolved_at as string) ?? new Date().toISOString();
  if (kind === "ticket" && status !== "resolu") delete extra._resolved_at;

  let occurredOn = clean.occurred_on;
  if (!occurredOn && ((kind === "lead" && status === "close") || (kind === "audit" && status === "fait"))) occurredOn = today;

  return { ...clean, occurred_on: occurredOn, data: { ...clean.data, ...extra } };
}

function internalKeys(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data ?? {})) if (k.startsWith("_")) out[k] = v;
  return out;
}

function checkKind(roleKey: string, kind: string): kind is EditableKind {
  return kind !== "report" && (allowedKinds(roleKey) as string[]).includes(kind) && kind in KINDS;
}

export async function createStaffRecord(kind: string, status: string, values: Record<string, unknown>): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  if (!isContractSigned(guard.member)) return { error: "Signe ton contrat avant de commencer." };
  if (!checkKind(guard.member.role_key, kind)) return { error: "Action non autorisée pour ton poste." };

  const def = KINDS[kind];
  const stage = def.stages.some((s) => s.value === status) ? status : def.stages[0].value;
  const clean = sanitizeValues(def, values);
  if ("error" in clean) return clean;
  const row = withStageHistory(kind, stage, {}, clean);

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("staff_records").insert({
    staff_id: guard.userId,
    kind,
    status: stage,
    title: row.title,
    amount: row.amount,
    occurred_on: row.occurred_on,
    due_at: row.due_at,
    data: row.data,
  });
  if (error) return { error: "Enregistrement impossible, réessaie." };
  refresh();
  return { ok: true };
}

async function loadOwnRecord(id: string, userId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("staff_records")
    .select("id, kind, status, data")
    .eq("id", id)
    .eq("staff_id", userId)
    .maybeSingle();
  return { supabase, record: data as { id: string; kind: string; status: string; data: Record<string, unknown> } | null };
}

export async function updateStaffRecord(id: string, status: string, values: Record<string, unknown>): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  const { supabase, record } = await loadOwnRecord(id, guard.userId);
  if (!record || !checkKind(guard.member.role_key, record.kind)) return { error: "Élément introuvable." };

  const kind = record.kind as EditableKind;
  const def = KINDS[kind];
  const stage = def.stages.some((s) => s.value === status) ? status : record.status;
  const clean = sanitizeValues(def, values);
  if ("error" in clean) return clean;
  const row = withStageHistory(kind, stage, internalKeys(record.data), clean);

  const { error } = await supabase
    .from("staff_records")
    .update({
      status: stage,
      title: row.title,
      amount: row.amount,
      occurred_on: row.occurred_on,
      due_at: row.due_at,
      data: row.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("staff_id", guard.userId);
  if (error) return { error: "Modification impossible, réessaie." };
  refresh();
  return { ok: true };
}

// Changement d'étape rapide depuis la liste, sans rouvrir le formulaire.
export async function setStaffRecordStatus(id: string, status: string): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  const { supabase, record } = await loadOwnRecord(id, guard.userId);
  if (!record || !checkKind(guard.member.role_key, record.kind)) return { error: "Élément introuvable." };
  const kind = record.kind as EditableKind;
  if (!KINDS[kind].stages.some((s) => s.value === status)) return { error: "Étape inconnue." };

  const { data: full } = await supabase
    .from("staff_records")
    .select("title, amount, occurred_on, due_at, data")
    .eq("id", id)
    .maybeSingle();
  if (!full) return { error: "Élément introuvable." };
  const current = full as { title: string; amount: number | null; occurred_on: string | null; due_at: string | null; data: Record<string, unknown> };
  const nonInternal = Object.fromEntries(Object.entries(current.data ?? {}).filter(([k]) => !k.startsWith("_")));
  const row = withStageHistory(kind, status, internalKeys(current.data), {
    title: current.title,
    amount: current.amount,
    occurred_on: current.occurred_on,
    due_at: current.due_at,
    data: nonInternal,
  });

  const { error } = await supabase
    .from("staff_records")
    .update({ status, occurred_on: row.occurred_on, data: row.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("staff_id", guard.userId);
  if (error) return { error: "Modification impossible, réessaie." };
  refresh();
  return { ok: true };
}

export async function deleteStaffRecord(id: string): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("staff_records").delete().eq("id", id).eq("staff_id", guard.userId).neq("kind", "report");
  if (error) return { error: "Suppression impossible, réessaie." };
  refresh();
  return { ok: true };
}

// Rapport de fin de journée : un seul par jour, modifiable jusqu'à 7 jours
// en arrière (oubli d'un soir), jamais dans le futur.
export async function saveDailyReport(
  date: string,
  metrics: Record<string, unknown>,
  win: string,
  blocker: string
): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  if (!isContractSigned(guard.member)) return { error: "Signe ton contrat avant de commencer." };
  const cfg = getStaffRoleConfig(guard.member.role_key);
  if (!cfg) return { error: "Poste inconnu." };

  const today = todayInParis();
  const oldest = new Date(Date.now() - 7 * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  if (!DATE_RE.test(date) || date > today || date < oldest) return { error: "Date invalide (7 derniers jours seulement)." };

  const cleanMetrics: Record<string, number> = {};
  for (const metric of cfg.reportMetrics) {
    const v = cleanNumber(metrics?.[metric.key], { min: 0, max: metric.type === "money" ? 10_000_000 : 100_000 });
    if (v !== null) cleanMetrics[metric.key] = metric.type === "money" ? Math.round(v * 100) / 100 : Math.round(v);
  }
  const data = {
    metrics: cleanMetrics,
    win: cleanText(win, LIMITS.bio),
    blocker: cleanText(blocker, LIMITS.bio),
  };

  const supabase = await createServerSupabase();
  const { data: existing } = await supabase
    .from("staff_records")
    .select("id")
    .eq("staff_id", guard.userId)
    .eq("kind", "report")
    .eq("occurred_on", date)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("staff_records")
        .update({ data, updated_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id)
        .eq("staff_id", guard.userId)
    : await supabase.from("staff_records").insert({
        staff_id: guard.userId,
        kind: "report",
        status: "envoye",
        title: `Rapport du ${date}`,
        occurred_on: date,
        data,
      });
  if (error) return { error: "Enregistrement du rapport impossible, réessaie." };
  refresh();
  return { ok: true };
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnue";
  } catch {
    return "inconnue";
  }
}

// Signature électronique du contrat à la première connexion. Écriture par
// la service_role : staff_members n'a volontairement aucune policy update.
export async function signStaffContract(signature: string, acceptedContract: boolean, acceptedTerms: boolean): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  const member = guard.member;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email_verified_at").eq("id", guard.userId).maybeSingle();
  if (!profile?.email_verified_at) return { error: "Confirme d'abord ton email." };
  if (!acceptedContract || !acceptedTerms) return { error: "Coche les deux cases pour signer." };

  const typed = cleanText(signature, 200);
  if (!typed || normalizeName(typed) !== normalizeName(member.full_name)) {
    return { error: `Tape ton nom complet exactement comme indiqué : ${member.full_name}` };
  }

  const signedAt = new Date().toISOString();
  const ip = await callerIp();
  const { error } = await admin
    .from("staff_members")
    .update({
      contract_version: STAFF_CONTRACT_VERSION,
      contract_signed_at: signedAt,
      contract_signature: typed,
      contract_signed_ip: ip,
      terms_accepted_at: member.terms_accepted_at ?? signedAt,
      terms_version: STAFF_TERMS_VERSION,
    })
    .eq("user_id", guard.userId);
  if (error) return { error: "Signature impossible pour le moment, réessaie." };

  await sendContractEmail(member, signedAt, typed, STAFF_CONTRACT_VERSION).catch(() => false);
  notifyAdmin("Contrat signé", [
    `<strong>${escapeHtml(member.full_name)}</strong> (${escapeHtml(member.email)})`,
    `Poste : ${escapeHtml(getRoleCard(member.role_key)?.role.title ?? member.role_key)}`,
    `Signé le ${escapeHtml(new Date(signedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}, version ${STAFF_CONTRACT_VERSION}. Une copie lui a été envoyée par email.`,
  ]).catch(() => {});

  refresh();
  return { ok: true };
}

export async function resendContractEmail(): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { error: guard.error };
  const m = guard.member;
  if (!m.contract_signed_at || !m.contract_signature || !m.contract_version) return { error: "Aucun contrat signé à renvoyer." };
  const limited = await checkRateLimit(`staff-contract-mail:${guard.userId}`, 3, 3600);
  if (!limited.allowed) return { error: "Trop d'envois récents, réessaie dans une heure." };
  const sent = await sendContractEmail(m, m.contract_signed_at, m.contract_signature, m.contract_version);
  return sent ? { ok: true } : { error: "Envoi impossible pour le moment, réessaie plus tard." };
}

// Pas de requireStaff() complet ici : la personne n'a pas encore d'email
// vérifié, c'est justement ce qu'elle demande à renvoyer.
export async function resendStaffVerification(): Promise<Result> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const member = await getStaffMember(user.id);
  if (!member) return { error: "Accès équipe introuvable." };
  const limited = await checkRateLimit(`staff-verify:${user.id}`, 3, 3600);
  if (!limited.allowed) return { error: "Trop d'envois récents. Vérifie tes spams, puis réessaie dans une heure." };
  const sent = await sendStaffVerificationEmail(member.email, member.full_name, member.role_key);
  return sent ? { ok: true } : { error: "Envoi impossible pour le moment, réessaie dans quelques minutes." };
}
