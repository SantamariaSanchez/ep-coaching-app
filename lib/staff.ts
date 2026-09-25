import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";
import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { getRoleCard, getStaffRoleConfig, staffLoginPath } from "@/lib/staff-roles";
import { buildStaffContract, contractToHtml } from "@/lib/staff-contract";
import { ONBOARDING_STEPS } from "@/lib/job-applications";
import type { StaffRecord, TeamMemberData } from "@/lib/staff-kpis";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

export interface StaffMember {
  user_id: string;
  owner_id: string;
  role_key: string;
  full_name: string;
  email: string;
  status: "actif" | "suspendu" | "termine";
  application_id: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  contract_version: string | null;
  contract_signed_at: string | null;
  contract_signature: string | null;
  created_at: string;
  /** Objectifs du mois (clé = TargetDef.key de lib/staff-playbooks.ts). */
  targets: Record<string, number>;
}

const MEMBER_FIELDS =
  "user_id, owner_id, role_key, full_name, email, status, application_id, terms_accepted_at, terms_version, contract_version, contract_signed_at, contract_signature, created_at";

export const getStaffMember = cache(async function getStaffMember(userId: string): Promise<StaffMember | null> {
  try {
    const admin = createAdminClient();
    const withTargets = await admin.from("staff_members").select(`${MEMBER_FIELDS}, targets`).eq("user_id", userId).maybeSingle();
    if (!withTargets.error) {
      const row = withTargets.data as StaffMember | null;
      return row ? { ...row, targets: (row.targets as Record<string, number> | null) ?? {} } : null;
    }
    // Colonne targets pas encore créée (migration 20260925b pas exécutée) :
    // l'accès à l'espace ne doit jamais en dépendre.
    const { data } = await admin.from("staff_members").select(MEMBER_FIELDS).eq("user_id", userId).maybeSingle();
    return data ? { ...(data as Omit<StaffMember, "targets">), targets: {} } : null;
  } catch {
    return null;
  }
});

export type StaffGuard =
  | { ok: true; userId: string; member: StaffMember }
  | { ok: false; error: string };

// Garde des actions serveur de l'espace équipe : session valide, ligne
// staff_members active (seule la service_role peut en créer une), et session
// forte si la double authentification est activée sur le compte.
export async function requireStaff(): Promise<StaffGuard> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    const member = await getStaffMember(user.id);
    if (!member || member.status !== "actif") return { ok: false, error: "Accès équipe inactif." };

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("mfa_enabled").eq("id", user.id).maybeSingle();
    if (profile?.mfa_enabled === true) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isStrongSession(session?.access_token)) {
        return { ok: false, error: "Double authentification requise pour cette action." };
      }
    }
    return { ok: true, userId: user.id, member };
  } catch {
    return { ok: false, error: "Session illisible, reconnecte-toi." };
  }
}

const RECORD_FIELDS = "id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at";

function normalize(rows: unknown[] | null): StaffRecord[] {
  return ((rows as StaffRecord[]) ?? []).map((r) => ({
    ...r,
    amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
    data: (r.data as Record<string, unknown>) ?? {},
  }));
}

// Lecture par le client de la personne connectée : la RLS
// (staff_records_own) garantit qu'on ne lit que ses propres données.
export const getMyRecords = cache(async function getMyRecords(userId: string): Promise<StaffRecord[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("staff_records")
      .select(RECORD_FIELDS)
      .eq("staff_id", userId)
      .order("created_at", { ascending: false })
      .limit(2000);
    return normalize(data);
  } catch {
    return [];
  }
});

// Vue "Mon équipe" d'un responsable de pôle. Service role, donc bornée ici :
// uniquement les métiers listés dans `team` de SA configuration, et
// uniquement l'équipe du même propriétaire de plateforme.
export async function getTeamData(member: StaffMember): Promise<TeamMemberData[]> {
  const cfg = getStaffRoleConfig(member.role_key);
  if (!cfg?.team?.length) return [];
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("staff_members")
      .select("user_id, full_name, role_key")
      .eq("owner_id", member.owner_id)
      .eq("status", "actif")
      .in("role_key", cfg.team);
    const list = (members as { user_id: string; full_name: string; role_key: string }[]) ?? [];
    if (list.length === 0) return [];
    const { data: rows } = await admin
      .from("staff_records")
      .select(RECORD_FIELDS)
      .in("staff_id", list.map((m) => m.user_id))
      .order("created_at", { ascending: false })
      .limit(5000);
    const records = normalize(rows);
    return list.map((m) => ({
      userId: m.user_id,
      fullName: m.full_name,
      roleKey: m.role_key,
      records: records.filter((r) => r.staff_id === m.user_id),
    }));
  } catch {
    return [];
  }
}

// ── Données réelles de la plateforme pour certains métiers ─────────────

export interface ApplicationForStaff {
  id: string;
  role_key: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  answers: Record<string, string> | null;
  created_at: string;
  cvUrl: string | null;
}

export async function signCvUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("job-cvs").createSignedUrls(paths, 60 * 60);
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
    }
    return map;
  } catch {
    return {};
  }
}

// RH : les candidatures reçues sur /carrieres. Réservé au métier RH (vérifié
// par l'appelant), lecture via service role bornée au propriétaire.
export async function getApplicationsForHr(ownerId: string): Promise<ApplicationForStaff[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("job_applications")
      .select("id, role_key, full_name, email, phone, status, answers, created_at, cv_path")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (data as (Omit<ApplicationForStaff, "cvUrl"> & { cv_path: string | null })[]) ?? [];
    const urls = await signCvUrls(rows.map((r) => r.cv_path).filter((p): p is string => !!p));
    return rows.map(({ cv_path, ...r }) => ({ ...r, cvUrl: cv_path ? urls[cv_path] ?? null : null }));
  } catch {
    return [];
  }
}

export interface NewClientRow {
  id: string;
  full_name: string | null;
  start_date: string | null;
  onboarding_completed_at: string | null;
}

// Coach onboarding : les vrais clients payants démarrés ces 45 derniers jours.
// Champs volontairement minimaux (nom, dates) : aucune donnée de santé.
export async function getRecentPayingClients(): Promise<NewClientRow[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, start_date, onboarding_completed_at")
      .eq("subscription_status", "active")
      .gte("start_date", since)
      .order("start_date", { ascending: false })
      .limit(100);
    return (data as NewClientRow[]) ?? [];
  } catch {
    return [];
  }
}

// ── Emails ──────────────────────────────────────────────────────────────

// Variante équipe de lib/email-verification.ts : même lien à usage unique
// (/auth/verifier-email), mais un texte qui parle d'un accès de travail, pas
// d'un programme d'entraînement.
export async function sendStaffVerificationEmail(email: string, fullName: string, roleKey: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return false;

    const link = `${APP_URL}/auth/verifier-email?token_hash=${encodeURIComponent(tokenHash)}`;
    const firstName = fullName.trim().split(" ")[0] || "toi";
    const roleTitle = getRoleCard(roleKey)?.role.title ?? "ton poste";
    const body = `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Équipe EP Coaching</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(firstName)}, ton accès ${escapeHtml(roleTitle)} est créé</h1>
<p style="margin:0 0 16px;">Une seule étape avant d'entrer dans ton espace : confirmer que cette adresse est bien la tienne. Juste après, tu signes ton contrat de collaboration et tu le reçois par email avec ta fiche de poste.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 22px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${link}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Confirmer mon email</a></td></tr></table>
<p style="margin:0;font-size:12px;color:rgba(245,237,237,0.4);">Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>`;
    return await sendBrevoEmail({
      to: email,
      subject: `${firstName}, confirme ton accès équipe EP Coaching`,
      htmlContent: wrapBrandedEmail(body),
    });
  } catch {
    return false;
  }
}

// Envoyé juste après la signature : contrat signé, fiche de poste, parcours
// d'intégration et liens utiles, tout ce qu'il faut pour démarrer.
export async function sendContractEmail(member: StaffMember, signedAt: string, signature: string, version: string): Promise<boolean> {
  const found = getRoleCard(member.role_key);
  const contract = buildStaffContract(member.role_key, member.full_name, member.email);
  if (!found || !contract) return false;
  const { role } = found;
  const firstName = member.full_name.trim().split(" ")[0] || "toi";

  const list = (items: string[]) =>
    `<ul style="margin:0 0 12px;padding-left:18px;color:rgba(245,237,237,0.85);font-size:13px;">${items
      .map((i) => `<li style="margin:0 0 4px;">${escapeHtml(i)}</li>`)
      .join("")}</ul>`;

  const body = `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Bienvenue dans l'équipe</p>
<h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(firstName)}, c'est signé</h1>
<p style="margin:0 0 14px;">Voici tout ce qu'il te faut pour démarrer comme ${escapeHtml(role.title)} : ta fiche de poste, ton parcours d'intégration et ton contrat signé. Garde cet email, il fait office de copie.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 22px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${APP_URL}/equipe" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Ouvrir mon espace</a></td></tr></table>
<h3 style="margin:18px 0 6px;font-size:14px;color:#ffffff;">Ta fiche de poste</h3>
<p style="margin:0 0 8px;color:rgba(245,237,237,0.85);font-size:13px;">${escapeHtml(role.mission)}</p>
${list(role.tasks)}
<p style="margin:0 0 4px;color:rgba(245,237,237,0.6);font-size:12px;font-weight:700;">Non négociable</p>
${list(role.nonNegotiable)}
<h3 style="margin:18px 0 6px;font-size:14px;color:#ffffff;">Ton parcours d'intégration</h3>
${list(ONBOARDING_STEPS.map((s) => `${s.when} : ${s.label}`))}
<h3 style="margin:18px 0 6px;font-size:14px;color:#ffffff;">Liens utiles</h3>
${list([
    `Ton espace : ${APP_URL}/equipe`,
    `Ta page de connexion : ${APP_URL}${staffLoginPath(member.role_key)}`,
    `Conditions de collaboration : ${APP_URL}/legal/equipe`,
    `Politique de confidentialité : ${APP_URL}/legal/confidentialite`,
  ])}
<div style="margin:24px 0 0;padding-top:18px;border-top:1px solid rgba(245,237,237,0.12);">
${contractToHtml(contract, { name: signature, signedAt, version })}
</div>`;

  return sendBrevoEmail({
    to: member.email,
    subject: `Ton contrat ${role.title} EP Coaching (copie signée)`,
    htmlContent: wrapBrandedEmail(body),
  });
}
