"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { cleanText, LIMITS } from "@/lib/sanitize";

// Accès aux formations d'un coach : donné à la main après un achat (lien de
// paiement du coach) ou offert. Réservé au coach propriétaire.

type Result = { error?: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ownFormation(formationId: string): Promise<{ ok: true; userId: string; title: string } | { ok: false; error: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;
  const { data } = await createAdminClient().from("formations").select("owner_id, title").eq("id", formationId).maybeSingle();
  if (!data || data.owner_id !== guard.userId) return { ok: false, error: "Formation introuvable." };
  return { ok: true, userId: guard.userId, title: data.title as string };
}

export async function grantFormationAccessAction(formationId: string, target: { userId?: string; email?: string }): Promise<Result> {
  const own = await ownFormation(formationId);
  if (!own.ok) return { error: own.error };
  const admin = createAdminClient();
  let userId = target.userId ?? null;
  if (!userId) {
    const email = cleanText(target.email ?? "", LIMITS.shortText)?.toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return { error: "Email invalide." };
    const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!data) return { error: "Aucun compte avec cet email : la personne doit d'abord créer son compte gratuit." };
    userId = data.id as string;
  } else {
    // Un id venu du navigateur : seulement un client de ce coach.
    const { data } = await admin.from("profiles").select("id").eq("id", userId).eq("coach_id", own.userId).maybeSingle();
    if (!data) return { error: "Client introuvable." };
  }
  if (userId === own.userId) return { error: "Tu as déjà accès à ta propre formation." };
  const { error } = await admin
    .from("formation_access")
    .upsert({ formation_id: formationId, user_id: userId, granted_by: own.userId, source: "manuel" }, { onConflict: "formation_id,user_id", ignoreDuplicates: true });
  if (error) {
    console.error("grantFormationAccessAction error:", error);
    return { error: "Accès impossible pour le moment." };
  }
  await notifyUser(userId, { type: "formation_access", title: "🎓 Nouvelle formation débloquée", body: `Tu as maintenant accès à « ${own.title} ».`, url: `/dashboard/client/formations/${formationId}` }).catch(() => {});
  revalidatePath(`/dashboard/coach/formations/${formationId}`);
  revalidatePath("/dashboard/client/formations", "layout");
  return {};
}

export async function revokeFormationAccessAction(formationId: string, userId: string): Promise<Result> {
  const own = await ownFormation(formationId);
  if (!own.ok) return { error: own.error };
  const { error } = await createAdminClient().from("formation_access").delete().eq("formation_id", formationId).eq("user_id", userId);
  if (error) return { error: "Retrait impossible." };
  revalidatePath(`/dashboard/coach/formations/${formationId}`);
  return {};
}
