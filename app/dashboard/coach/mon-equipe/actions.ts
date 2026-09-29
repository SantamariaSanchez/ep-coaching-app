"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { requireTeamOwner } from "@/lib/team-owner";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { cleanText, escapeHtml, LIMITS } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRoleCard, isStaffRoleKey, staffLoginPath } from "@/lib/staff-roles";

// Mon équipe (2026-09-29) : un coach recrute et gère des coachs (équipe de
// coachs) et du staff (setter, closer, monteur...). Chaque action vérifie
// que l'élément appartient bien à l'équipe du coach connecté.

type Result = { error?: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
const PATH = "/dashboard/coach/mon-equipe";

type Admin = ReturnType<typeof createAdminClient>;

async function nameOf(admin: Admin, userId: string): Promise<string> {
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data?.full_name as string) || "Ton responsable";
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 22px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${href}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a></td></tr></table>`;
}

// ── Coachs ──────────────────────────────────────────────────────────────

export async function inviteCoachAction(input: { email: string; title?: string | null; sharePct?: number | string | null }): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  const email = cleanText(input.email, LIMITS.shortText)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return { error: "Email invalide." };
  const limited = await checkRateLimit(`coach-team-invite:${guard.userId}`, 30, 3600);
  if (!limited.allowed) return { error: "Trop d'invitations récentes, réessaie dans une heure." };
  const share = input.sharePct === null || input.sharePct === undefined || input.sharePct === "" ? null : Number(String(input.sharePct).replace(",", "."));
  if (share !== null && (!Number.isFinite(share) || share < 0 || share > 100)) return { error: "Part entre 0 et 100 %." };
  const title = cleanText(input.title ?? "", 80) || "Coach";

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("email, full_name").eq("id", guard.userId).maybeSingle();
  if ((me?.email as string | undefined)?.toLowerCase() === email) return { error: "C'est ton propre email." };

  const { data: existing } = await admin.from("coach_team_links").select("id, status").eq("owner_id", guard.userId).eq("email", email).maybeSingle();
  if (existing?.status === "actif") return { error: "Ce coach est déjà dans ton équipe." };
  const row = { owner_id: guard.userId, email, title, share_pct: share, status: "invite", coach_id: null, accepted_at: null, ended_at: null };
  const { error } = existing
    ? await admin.from("coach_team_links").update(row).eq("id", existing.id)
    : await admin.from("coach_team_links").insert(row);
  if (error) {
    console.error("inviteCoachAction error:", error);
    return { error: "Invitation impossible pour le moment." };
  }

  const owner = (me?.full_name as string) || "Un coach";
  const { data: target } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (target?.id && target.role === "coach") {
    await notifyUser(target.id as string, { type: "coach_team", title: "Invitation dans une équipe", body: `${owner} t'invite à rejoindre son équipe (${title}).`, url: PATH }).catch(() => {});
  }
  const link = target?.role === "coach" ? `${APP_URL}${PATH}` : `${APP_URL}/auth/coach`;
  const body = `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Invitation</p>
<h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(owner)} t'invite dans son équipe</h1>
<p style="margin:0 0 14px;">Poste : <strong>${escapeHtml(title)}</strong>${share !== null ? `, ${share} % du chiffre d'affaires reversé` : ""}. ${target?.role === "coach" ? "Accepte l'invitation depuis ta page Mon équipe." : "Crée ton compte coach avec cette adresse email, puis accepte l'invitation depuis ta page Mon équipe."}</p>
${button(target?.role === "coach" ? "Voir l'invitation" : "Créer mon compte coach", link)}`;
  await sendBrevoEmail({ to: email, subject: `${owner} t'invite dans son équipe`, htmlContent: wrapBrandedEmail(body) }).catch(() => false);

  revalidatePath(PATH);
  return {};
}

export async function updateCoachLinkAction(id: string, input: { title?: string | null; sharePct?: number | string | null; note?: string | null }): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  const share = input.sharePct === null || input.sharePct === undefined || input.sharePct === "" ? null : Number(String(input.sharePct).replace(",", "."));
  if (share !== null && (!Number.isFinite(share) || share < 0 || share > 100)) return { error: "Part entre 0 et 100 %." };
  const { error } = await createAdminClient()
    .from("coach_team_links")
    .update({ title: cleanText(input.title ?? "", 80) || "Coach", share_pct: share, note: cleanText(input.note ?? "", 1000) || null })
    .eq("id", id)
    .eq("owner_id", guard.userId);
  if (error) return { error: "Modification impossible." };
  revalidatePath(PATH);
  return {};
}

/** Retire un coach de l'équipe (ou annule son invitation). Ses clients restent les siens. */
export async function endCoachLinkAction(id: string): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: link } = await admin.from("coach_team_links").select("id, status, coach_id").eq("id", id).eq("owner_id", guard.userId).maybeSingle();
  if (!link) return { error: "Introuvable." };
  const { error } = link.status === "invite"
    ? await admin.from("coach_team_links").delete().eq("id", id)
    : await admin.from("coach_team_links").update({ status: "termine", ended_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Modification impossible." };
  if (link.coach_id && link.status === "actif") {
    await notifyUser(link.coach_id as string, { type: "coach_team", title: "Fin de collaboration", body: `${await nameOf(admin, guard.userId)} a mis fin à votre collaboration dans l'appli.`, url: PATH }).catch(() => {});
  }
  revalidatePath(PATH);
  return {};
}

/** Côté coach invité : accepter ou refuser. */
export async function respondCoachInviteAction(id: string, accept: boolean): Promise<Result> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("email, full_name").eq("id", guard.userId).maybeSingle();
  const email = (me?.email as string | undefined)?.toLowerCase();
  if (!email) return { error: "Email du compte introuvable." };
  const { data: link } = await admin.from("coach_team_links").select("id, owner_id, status, email").eq("id", id).eq("status", "invite").eq("email", email).maybeSingle();
  if (!link) return { error: "Invitation introuvable ou déjà traitée." };
  if (link.owner_id === guard.userId) return { error: "Invitation invalide." };
  const now = new Date().toISOString();
  const { error } = await admin
    .from("coach_team_links")
    .update(accept ? { status: "actif", coach_id: guard.userId, accepted_at: now } : { status: "refuse", coach_id: guard.userId, ended_at: now })
    .eq("id", id);
  if (error) return { error: "Réponse impossible pour le moment." };
  await notifyUser(link.owner_id as string, {
    type: "coach_team",
    title: accept ? "Invitation acceptée" : "Invitation refusée",
    body: `${(me?.full_name as string) || email} a ${accept ? "rejoint ton équipe" : "refusé ton invitation"}.`,
    url: PATH,
  }).catch(() => {});
  revalidatePath(PATH);
  return {};
}

/** Côté coach : quitter une équipe. */
export async function leaveCoachTeamAction(id: string): Promise<Result> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: link } = await admin.from("coach_team_links").select("id, owner_id").eq("id", id).eq("coach_id", guard.userId).eq("status", "actif").maybeSingle();
  if (!link) return { error: "Introuvable." };
  const { error } = await admin.from("coach_team_links").update({ status: "termine", ended_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Impossible pour le moment." };
  await notifyUser(link.owner_id as string, { type: "coach_team", title: "Un coach a quitté ton équipe", body: `${await nameOf(admin, guard.userId)} a quitté ton équipe.`, url: PATH }).catch(() => {});
  revalidatePath(PATH);
  return {};
}

// ── Staff (métiers) ─────────────────────────────────────────────────────

export async function inviteStaffAction(roleKey: string, rawEmail: string): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  if (!isStaffRoleKey(roleKey)) return { error: "Poste inconnu." };
  const email = cleanText(rawEmail, LIMITS.shortText)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return { error: "Email invalide." };
  const limited = await checkRateLimit(`staff-invite-mail:${guard.userId}`, 30, 3600);
  if (!limited.allowed) return { error: "Trop d'invitations récentes, réessaie dans une heure." };

  const admin = createAdminClient();
  const { data: taken } = await admin.from("staff_invites").select("owner_id, used_at").eq("role_key", roleKey).eq("email", email).maybeSingle();
  if (taken && taken.owner_id !== guard.userId) return { error: "Cet email est déjà invité sur ce poste par une autre équipe." };
  if (taken?.used_at) return { error: "Cette personne a déjà son accès." };
  if (!taken) {
    const { error } = await admin.from("staff_invites").insert({ owner_id: guard.userId, role_key: roleKey, email });
    if (error) {
      console.error("inviteStaffAction error:", error);
      return { error: "Invitation impossible pour le moment." };
    }
  }

  const found = getRoleCard(roleKey);
  const owner = await nameOf(admin, guard.userId);
  const link = `${APP_URL}${staffLoginPath(roleKey)}`;
  const body = `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Équipe de ${escapeHtml(owner)}</p>
<h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">Bienvenue à bord, ${escapeHtml(found?.role.title ?? "")}</h1>
<p style="margin:0 0 14px;">Ton espace de travail est prêt. Crée ton accès avec cette adresse email (onglet Première connexion) et confirme-la : tu retrouves ensuite tes outils, tes tâches et la messagerie de l'équipe.</p>
${button("Créer mon accès", link)}
<p style="margin:0;font-size:12px;color:rgba(245,237,237,0.45);">Garde ce lien, c'est aussi ta page de connexion : ${escapeHtml(link)}</p>`;
  const sent = await sendBrevoEmail({ to: email, subject: `Ton accès ${found?.role.title ?? "équipe"} chez ${owner}`, htmlContent: wrapBrandedEmail(body) }).catch(() => false);
  revalidatePath(PATH);
  return sent ? {} : { error: "Accès autorisé, mais l'email n'est pas parti. Envoie-lui le lien toi-même : " + link };
}

export async function revokeStaffInviteAction(inviteId: string): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  const { error } = await createAdminClient().from("staff_invites").delete().eq("id", inviteId).eq("owner_id", guard.userId).is("used_at", null);
  if (error) return { error: "Suppression impossible." };
  revalidatePath(PATH);
  return {};
}

export async function setStaffStatusAction(userId: string, status: "actif" | "suspendu" | "termine"): Promise<Result> {
  const guard = await requireTeamOwner();
  if (!guard.ok) return { error: guard.error };
  if (!["actif", "suspendu", "termine"].includes(status)) return { error: "Statut invalide." };
  const { error } = await createAdminClient().from("staff_members").update({ status }).eq("user_id", userId).eq("owner_id", guard.userId);
  if (error) return { error: "Modification impossible." };
  revalidatePath(PATH);
  revalidatePath("/dashboard/coach/admin/equipe");
  return {};
}
