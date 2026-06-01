"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

type AddClientState = { error: string } | { success: true } | null;

export async function addClient(
  prevState: AddClientState,
  formData: FormData
): Promise<AddClientState> {
  const admin = createAdminClient();

  const fullName = (formData.get("full_name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string).trim() || null;
  const weightStart = formData.get("weight_start") as string;
  const goal = (formData.get("goal") as string).trim() || null;
  const startDate = (formData.get("start_date") as string) || null;

  if (!fullName || !email || !password) {
    return { error: "Nom, email et mot de passe sont requis." };
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return { error: "Ce client est déjà inscrit. Il apparaît dans ta liste de clients — rafraîchis la page si besoin." };
    }
    return { error: authError?.message ?? "Erreur lors de la création du compte." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    full_name: fullName,
    email,
    phone,
    weight_start: weightStart ? parseFloat(weightStart) : null,
    goal,
    start_date: startDate,
    status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/clients");
  return { success: true };
}
