"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateClientProfile(data: {
  phone?: string | null;
}): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { error } = await supabase
      .from("profiles")
      .update({ phone: data.phone ?? null })
      .eq("id", user.id);

    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/client/profile");
    revalidatePath("/dashboard/client");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
