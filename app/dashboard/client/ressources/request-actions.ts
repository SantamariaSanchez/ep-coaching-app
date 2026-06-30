"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import {
  notifyCoachNewResourceRequest,
  notifyClientRequestAnswered,
} from "@/app/actions/notifications";

export async function createResourceRequest(
  title: string,
  content: string
): Promise<{ error?: string; id?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };
    if (!title.trim() || !content.trim()) return { error: "Titre et description requis." };

    const { data, error } = await supabase
      .from("resource_requests")
      .insert({ author_id: user.id, title: title.trim(), content: content.trim() })
      .select("id")
      .single();

    if (error) return { error: "Erreur lors de l'envoi." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    notifyCoachNewResourceRequest(profile?.full_name ?? "Un membre", title.trim()).catch(() => {});

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return { id: data.id };
  } catch {
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
          request.author_id
        ).catch(() => {});
      }
    }

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteResourceRequest(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("resource_requests").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/ressources");
    revalidatePath("/dashboard/coach/ressources");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
