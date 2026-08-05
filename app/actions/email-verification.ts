"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendVerificationEmail } from "@/lib/email-verification";

export interface ResendResult {
  success?: boolean;
  error?: string;
}

// Renvoi de l'email de confirmation depuis le bandeau du dashboard. L'email
// cible n'est jamais pris dans l'input : il est relu en base pour le compte
// connecté, sinon n'importe qui pourrait s'en servir pour spammer une adresse.
export async function resendVerificationEmail(): Promise<ResendResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, email_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.email) return { error: "Aucune adresse email sur ce compte." };
  if (profile.email_verified_at) return { success: true };

  const sent = await sendVerificationEmail(profile.email, profile.full_name);
  if (!sent) return { error: "Envoi impossible pour le moment. Réessaie dans un instant." };

  return { success: true };
}
