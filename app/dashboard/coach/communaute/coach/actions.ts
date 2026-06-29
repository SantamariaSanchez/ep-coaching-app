"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function createCoachPost(
  title: string,
  content: string
): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!title.trim() || !content.trim()) return { error: "Titre et contenu requis." };

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("coach_posts")
      .insert({ author_id: guard.userId, title: title.trim(), content: content.trim() })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de la publication." };

    revalidatePath("/dashboard/coach/communaute/coach");
    revalidatePath("/dashboard/client/communaute/coach");
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function updateCoachPost(
  postId: string,
  title: string,
  content: string
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!title.trim() || !content.trim()) return { error: "Titre et contenu requis." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("coach_posts")
      .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
      .eq("id", postId)
      .eq("author_id", guard.userId);

    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/coach/communaute/coach");
    revalidatePath("/dashboard/client/communaute/coach");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteCoachPost(postId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("coach_posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", guard.userId);

    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/coach/communaute/coach");
    revalidatePath("/dashboard/client/communaute/coach");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
