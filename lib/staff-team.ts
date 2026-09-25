// Vie d'équipe : annuaire, messagerie, documents, formation, tâches
// assignées par le fondateur. Tables sans aucune policy RLS (voir
// 20260926_staff_workspace.sql) : tout passe par ce fichier, côté serveur,
// qui applique lui-même qui voit quoi.

import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { getRoleCard } from "@/lib/staff-roles";

export interface TeamPerson {
  id: string;
  name: string;
  subtitle: string;
  poleColor: string;
  isFounder: boolean;
}

export interface TeamMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  channel: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

type Admin = ReturnType<typeof createAdminClient>;

export async function getOwnerId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("is_platform_owner", true).limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

// Fondateur en tête, puis chaque membre actif de l'équipe.
export async function getTeamDirectory(ownerId: string): Promise<TeamPerson[]> {
  const admin = createAdminClient();
  const [{ data: owner }, { data: members }] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("id", ownerId).maybeSingle(),
    admin.from("staff_members").select("user_id, full_name, role_key").eq("owner_id", ownerId).eq("status", "actif").order("created_at"),
  ]);
  const people: TeamPerson[] = [];
  if (owner) people.push({ id: owner.id as string, name: (owner.full_name as string) || "Fondateur", subtitle: "Fondateur", poleColor: "#E01E1E", isFounder: true });
  for (const m of (members as { user_id: string; full_name: string; role_key: string }[]) ?? []) {
    const card = getRoleCard(m.role_key);
    people.push({ id: m.user_id, name: m.full_name, subtitle: card?.role.title ?? m.role_key, poleColor: card?.pole.color ?? "#888", isFounder: false });
  }
  return people;
}

async function isInTeam(admin: Admin, ownerId: string, userId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  const { data } = await admin.from("staff_members").select("user_id").eq("owner_id", ownerId).eq("user_id", userId).eq("status", "actif").maybeSingle();
  return !!data;
}

export async function getThread(ownerId: string, me: string, other: string): Promise<TeamMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_messages")
    .select("id, sender_id, recipient_id, channel, body, read_at, created_at")
    .eq("owner_id", ownerId)
    .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
    .order("created_at", { ascending: false })
    .limit(200);
  // Lu dès qu'il est affiché.
  await admin.from("team_messages").update({ read_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("sender_id", other).eq("recipient_id", me).is("read_at", null);
  return ((data as TeamMessage[]) ?? []).reverse();
}

export async function getChannel(ownerId: string): Promise<TeamMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_messages")
    .select("id, sender_id, recipient_id, channel, body, read_at, created_at")
    .eq("owner_id", ownerId)
    .eq("channel", "general")
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data as TeamMessage[]) ?? []).reverse();
}

/** Messages privés non lus, par expéditeur. */
export async function getUnreadBySender(ownerId: string, me: string): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("team_messages").select("sender_id").eq("owner_id", ownerId).eq("recipient_id", me).is("read_at", null);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of (data as { sender_id: string }[]) ?? []) out[r.sender_id] = (out[r.sender_id] ?? 0) + 1;
  return out;
}

export async function sendTeamMessage(
  ownerId: string,
  senderId: string,
  senderName: string,
  target: { recipientId: string } | { channel: "general" },
  body: string
): Promise<{ ok: true } | { error: string }> {
  const text = body.trim().slice(0, 4000);
  if (!text) return { error: "Message vide." };
  const admin = createAdminClient();
  if (!(await isInTeam(admin, ownerId, senderId))) return { error: "Accès refusé." };

  if ("recipientId" in target) {
    if (target.recipientId === senderId) return { error: "Destinataire invalide." };
    if (!(await isInTeam(admin, ownerId, target.recipientId))) return { error: "Cette personne ne fait pas partie de l'équipe." };
    const { error } = await admin.from("team_messages").insert({ owner_id: ownerId, sender_id: senderId, recipient_id: target.recipientId, body: text });
    if (error) return { error: "Envoi impossible (messagerie pas encore activée ?)." };
    const url = target.recipientId === ownerId ? `/dashboard/coach/admin/equipe/${senderId}` : `/equipe/messages?avec=${senderId}`;
    notifyUser(target.recipientId, { type: "staff", title: `Message de ${senderName}`, body: text.slice(0, 140), url, senderId }).catch(() => {});
    return { ok: true };
  }

  const { error } = await admin.from("team_messages").insert({ owner_id: ownerId, sender_id: senderId, channel: "general", body: text });
  if (error) return { error: "Envoi impossible (messagerie pas encore activée ?)." };
  const people = await getTeamDirectory(ownerId);
  for (const p of people) {
    if (p.id === senderId) continue;
    notifyUser(p.id, {
      type: "staff",
      title: `${senderName} sur le canal équipe`,
      body: text.slice(0, 140),
      url: p.isFounder ? "/dashboard/coach/admin/equipe/messages" : "/equipe/messages?avec=general",
      senderId,
    }).catch(() => {});
  }
  return { ok: true };
}

// ── Documents ───────────────────────────────────────────────────────────

export interface TeamDocument {
  id: string;
  staff_id: string | null;
  role_key: string | null;
  title: string;
  url: string | null;
  storage_path: string | null;
  note: string | null;
  uploaded_by: string;
  created_at: string;
  href: string | null;
  scope: string;
}

async function withHrefs(rows: Omit<TeamDocument, "href" | "scope">[]): Promise<TeamDocument[]> {
  const admin = createAdminClient();
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await admin.storage.from("staff-docs").createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed[s.path] = s.signedUrl;
  }
  return rows.map((r) => ({
    ...r,
    href: r.storage_path ? signed[r.storage_path] ?? null : r.url,
    scope: r.staff_id ? "Personnel" : r.role_key ? `Métier : ${getRoleCard(r.role_key)?.role.title ?? r.role_key}` : "Toute l'équipe",
  }));
}

const DOC_FIELDS = "id, staff_id, role_key, title, url, storage_path, note, uploaded_by, created_at";

/** Ce qu'une personne de l'équipe peut voir. */
export async function getDocumentsFor(ownerId: string, userId: string, roleKey: string): Promise<TeamDocument[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("staff_documents")
    .select(DOC_FIELDS)
    .eq("owner_id", ownerId)
    .or(`staff_id.eq.${userId},and(staff_id.is.null,role_key.is.null),and(staff_id.is.null,role_key.eq.${roleKey})`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return withHrefs((data as Omit<TeamDocument, "href" | "scope">[]) ?? []);
}

/** Vue fondateur : tout, ou tout ce qui concerne une personne. */
export async function getDocumentsForOwner(ownerId: string, member?: { userId: string; roleKey: string }): Promise<TeamDocument[]> {
  if (member) return getDocumentsFor(ownerId, member.userId, member.roleKey);
  const admin = createAdminClient();
  const { data, error } = await admin.from("staff_documents").select(DOC_FIELDS).eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(300);
  if (error) return [];
  return withHrefs((data as Omit<TeamDocument, "href" | "scope">[]) ?? []);
}

// ── Formation ───────────────────────────────────────────────────────────

export async function getTrainingDone(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("staff_training_progress").select("lesson_key").eq("staff_id", userId);
  if (error) return [];
  return ((data as { lesson_key: string }[]) ?? []).map((r) => r.lesson_key);
}

// ── Tâches assignées par le fondateur ───────────────────────────────────

export async function assignTask(
  ownerId: string,
  ownerName: string,
  memberId: string,
  task: { title: string; due: string | null; priority: string; notes: string | null }
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  if (!(await isInTeam(admin, ownerId, memberId)) || memberId === ownerId) return { error: "Membre introuvable." };
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const { error } = await admin.from("staff_records").insert({
    staff_id: memberId,
    kind: "task",
    status: "a_faire",
    title: task.title,
    occurred_on: task.due,
    data: {
      priority: task.priority,
      ...(task.notes ? { notes: task.notes } : {}),
      _assigned_by: ownerId,
      _assigned_by_name: ownerName,
      _stages: { a_faire: today },
    },
  });
  if (error) return { error: "Assignation impossible." };
  notifyUser(memberId, {
    type: "staff",
    title: `Nouvelle tâche de ${ownerName}`,
    body: `${task.title}${task.due ? `, pour le ${new Date(`${task.due}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}`,
    url: "/equipe/taches",
    senderId: ownerId,
  }).catch(() => {});
  return { ok: true };
}
