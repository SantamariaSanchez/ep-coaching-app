"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { requirePlatformOwner } from "@/lib/auth-guards";
import { cleanText, safeExternalUrl, LIMITS } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireStaff } from "@/lib/staff";
import { isContractSigned } from "@/lib/staff-page";
import { isStaffRoleKey } from "@/lib/staff-roles";
import { trainingFor } from "@/lib/staff-training";
import { assignTask, sendTeamMessage } from "@/lib/staff-team";

type Result = { ok: true } | { error: string };

// Qui appelle : une recrue active sous contrat, ou le fondateur.
async function caller(): Promise<{ userId: string; ownerId: string; name: string; isFounder: boolean; roleKey: string | null } | { error: string }> {
  const staff = await requireStaff();
  if (staff.ok) {
    if (!isContractSigned(staff.member)) return { error: "Signe ton contrat avant de commencer." };
    return { userId: staff.userId, ownerId: staff.member.owner_id, name: staff.member.full_name, isFounder: false, roleKey: staff.member.role_key };
  }
  const owner = await requirePlatformOwner();
  if (!owner.ok) return { error: owner.error };
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("full_name").eq("id", owner.userId).maybeSingle();
  return { userId: owner.userId, ownerId: owner.userId, name: (data?.full_name as string) || "Fondateur", isFounder: true, roleKey: null };
}

function refreshAll() {
  revalidatePath("/equipe", "layout");
  revalidatePath("/dashboard/coach/admin/equipe", "layout");
}

export async function sendTeamMessageAction(target: string, body: string): Promise<Result> {
  const who = await caller();
  if ("error" in who) return who;
  const limited = await checkRateLimit(`team-msg:${who.userId}`, 60, 600);
  if (!limited.allowed) return { error: "Trop de messages d'un coup, attends un instant." };
  const text = cleanText(body, 4000);
  if (!text) return { error: "Message vide." };
  const result = await sendTeamMessage(who.ownerId, who.userId, who.name, target === "general" ? { channel: "general" } : { recipientId: target }, text);
  if ("error" in result) return result;
  refreshAll();
  return { ok: true };
}

export async function toggleLessonAction(lessonKey: string, done: boolean): Promise<Result> {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  if (!trainingFor(staff.member.role_key).some((l) => l.key === lessonKey)) return { error: "Leçon inconnue." };
  const admin = createAdminClient();
  const { error } = done
    ? await admin.from("staff_training_progress").upsert({ staff_id: staff.userId, lesson_key: lessonKey }, { onConflict: "staff_id,lesson_key" })
    : await admin.from("staff_training_progress").delete().eq("staff_id", staff.userId).eq("lesson_key", lessonKey);
  if (error) return { error: "Formation pas encore activée (migration 20260926 à exécuter)." };
  refreshAll();
  return { ok: true };
}

const MAX_FILE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

// Ajout d'un document : fichier (bucket privé staff-docs) ou lien. Une
// recrue ne dépose que pour elle-même ; le fondateur choisit la cible
// (une personne, un métier, toute l'équipe).
export async function addDocumentAction(formData: FormData): Promise<Result> {
  const who = await caller();
  if ("error" in who) return who;
  const title = cleanText(formData.get("title"), 200);
  if (!title) return { error: "Donne un titre au document." };
  const note = cleanText(formData.get("note"), LIMITS.bio);
  const url = safeExternalUrl(formData.get("url"));
  const file = formData.get("file");

  let staffId: string | null = who.userId;
  let roleKey: string | null = null;
  if (who.isFounder) {
    const target = String(formData.get("target") ?? "all");
    staffId = null;
    if (target.startsWith("user:")) staffId = target.slice(5);
    else if (target.startsWith("role:")) {
      roleKey = target.slice(5);
      if (!isStaffRoleKey(roleKey)) return { error: "Métier inconnu." };
    }
  }

  const admin = createAdminClient();
  if (staffId && staffId !== who.userId) {
    const { data: m } = await admin.from("staff_members").select("user_id").eq("owner_id", who.ownerId).eq("user_id", staffId).maybeSingle();
    if (!m) return { error: "Membre introuvable." };
  }
  let storagePath: string | null = null;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_FILE) return { error: "Fichier trop lourd (10 Mo maximum)." };
    if (!ALLOWED_TYPES.has(file.type)) return { error: "Format accepté : PDF, image, Word, Excel, PowerPoint, texte." };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    storagePath = `${who.ownerId}/${staffId ?? (roleKey ? `role-${roleKey}` : "equipe")}/${crypto.randomUUID()}-${safeName}`;
    const up = await admin.storage.from("staff-docs").upload(storagePath, new Uint8Array(await file.arrayBuffer()), { contentType: file.type });
    if (up.error) return { error: "Envoi du fichier impossible (stockage pas encore activé ?)." };
  } else if (!url) {
    return { error: "Ajoute un fichier ou un lien." };
  }

  const { error } = await admin.from("staff_documents").insert({
    owner_id: who.ownerId,
    staff_id: staffId,
    role_key: roleKey,
    title,
    url: storagePath ? null : url,
    storage_path: storagePath,
    note,
    uploaded_by: who.userId,
  });
  if (error) return { error: "Enregistrement impossible (migration 20260926 à exécuter ?)." };
  refreshAll();
  return { ok: true };
}

export async function deleteDocumentAction(id: string): Promise<Result> {
  const who = await caller();
  if ("error" in who) return who;
  const admin = createAdminClient();
  const { data: doc } = await admin.from("staff_documents").select("id, owner_id, uploaded_by, storage_path").eq("id", id).maybeSingle();
  if (!doc || doc.owner_id !== who.ownerId) return { error: "Document introuvable." };
  if (!who.isFounder && doc.uploaded_by !== who.userId) return { error: "Seul celui qui l'a ajouté peut le supprimer." };
  if (doc.storage_path) await admin.storage.from("staff-docs").remove([doc.storage_path as string]);
  await admin.from("staff_documents").delete().eq("id", id);
  refreshAll();
  return { ok: true };
}

export async function assignTaskAction(memberId: string, title: string, due: string, priority: string, notes: string): Promise<Result> {
  const who = await caller();
  if ("error" in who) return who;
  if (!who.isFounder) return { error: "Réservé au fondateur." };
  const cleanTitle = cleanText(title, LIMITS.shortText);
  if (!cleanTitle) return { error: "Donne un titre à la tâche." };
  const result = await assignTask(who.ownerId, who.name, memberId, {
    title: cleanTitle,
    due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    priority: ["haute", "normale", "basse"].includes(priority) ? priority : "normale",
    notes: cleanText(notes, LIMITS.bio),
  });
  if ("error" in result) return result;
  refreshAll();
  return { ok: true };
}
