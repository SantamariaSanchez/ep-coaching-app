"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export async function loginCoach(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    return { error: "Identifiants incorrects." };
  }

  // Verify role with admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role !== "coach") {
    // Sign out — not a coach
    await supabase.auth.signOut();
    return { error: "Accès non autorisé. Ce compte n'est pas un compte coach." };
  }

  redirect("/dashboard/coach");
}
