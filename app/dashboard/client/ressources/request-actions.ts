"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { requireAuth, requireCoach } from "@/lib/auth-guards";
import {
  notifyCoachNewResourceRequest,
  notifyClientRequestAnswered,
} from "@/app/actions/notifications";

export async function createResourceRequest(
  title: string,
  content: string
): Promise<{ error?: string; id?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    if (!title.trim() || !content.trim()) return { error: "Titre et description requis." };

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("resource_requests")
      .insert({ author_id: guard.userId, title: title.trim(), content: content.trim() })
      .select("id")
      .single();

    if (error) return { error: "Erreur lors de l'envoi." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", guard.userId)
      .single();
    notifyCoachNewResourceRequest(profile?.full_name ?? "Un membre", title.trim(), guard.userId).catch(() => {});

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return { id: data.id };
  } catch (e) {
    console.error("createResourceRequest error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function respondToResourceRequest(
  requestId: string,
  response: string
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { data: request } = await admin
      .from("resource_requests")
      .select("author_id, title")
      .eq("id", requestId)
      .single();
    if (!request) return { error: "Demande introuvable." };

    // Cloisonnement multi-coach : sans ça, n'importe quel coach de la
    // plateforme peut répondre à la demande d'un client qui n'est pas le
    // sien (requireCoach() ne vérifie que le rôle, pas la relation).
    const { data: authorForCheck } = await admin
      .from("profiles")
      .select("coach_id")
      .eq("id", request.author_id)
      .single();
    if (request.author_id !== guard.userId && authorForCheck?.coach_id !== guard.userId) {
      return { error: "Cette demande ne t'appartient pas." };
    }

    const { error } = await admin
      .from("resource_requests")
      .update({
        coach_response: response.trim(),
        status: "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) return { error: "Erreur lors de la réponse." };

    if (request) {
      const { data: authorProfile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", request.author_id)
        .single();
      if (authorProfile?.email) {
        notifyClientRequestAnswered(
          authorProfile.email,
          authorProfile.full_name ?? "",
          request.title,
          request.author_id,
          guard.userId
        ).catch(() => {});
      }
    }

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return {};
  } catch (e) {
    console.error("respondToResourceRequest error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteResourceRequest(id: string): Promise<{ error?: string }> {
  try {
    // Cette action n'avait AUCUNE vérification applicative : elle s'en
    // remettait entièrement à la policy RLS "Author or coach can delete a
    // request". On redit ici la même règle (auteur ou coach), en défense en
    // profondeur, et le guard applique au passage la 2FA sur le compte.
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    const admin = createAdminClient();
    const { data: request } = await admin
      .from("resource_requests")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    if (!request) return { error: "Demande introuvable." };

    let allowed = request.author_id === guard.userId;
    // Cloisonnement multi-coach : un coach ne peut supprimer que les
    // demandes venant de SES clients, pas de n'importe quel coach.
    if (!allowed && guard.role === "coach") {
      const { data: authorForCheck } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", request.author_id)
        .single();
      allowed = authorForCheck?.coach_id === guard.userId;
    }
    if (!allowed) {
      return { error: "Tu ne peux supprimer que tes propres demandes." };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.from("resource_requests").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return {};
  } catch (e) {
    console.error("deleteResourceRequest error:", e);
    return { error: "Erreur inattendue." };
  }
}
