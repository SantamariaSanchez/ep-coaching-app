"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { redirect } from "next/navigation";

export interface RequestState {
  success?: boolean;
  error?: string;
  message?: string;
}

export interface SelfSignupInput {
  fullName: string;
  email: string;
  password: string;
  objectif: string;
  niveau: string;
  source: string;
}

export type SelfSignupResult = { error: string } | { success: true; userId: string };

// Self-serve signup — anyone can join the free community on their own.
// Coaching access is unlocked separately via Stripe (see /dashboard/client/abonnement).
export async function selfSignup(input: SelfSignupInput): Promise<SelfSignupResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!fullName || !email || password.length < 6) {
    return { error: "Nom, email et mot de passe (6 caractères min.) requis." };
  }

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
      return { error: "Cet email est déjà utilisé. Utilise l'onglet Me connecter." };
    }
    return { error: "Erreur création du compte. Réessaie." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    full_name: fullName,
    email,
    goal: input.objectif || null,
    level: input.niveau || null,
    source: input.source || null,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Erreur création profil : " + profileError.message };
  }

  // Sign in on the request-bound client so the session cookie is set.
  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Compte créé mais connexion automatique impossible, connecte-toi manuellement." };
  }

  try {
    await sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Nouveau membre communauté - ${fullName}`,
      htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouveau membre inscrit</h2>
        <p><strong>Nom :</strong> ${fullName}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Objectif :</strong> ${input.objectif}</p>
        <p><strong>Niveau :</strong> ${input.niveau} · <strong>Source :</strong> ${input.source}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/coach/communaute/membres" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin-top:8px;">Voir la communauté</a>
      </div>`,
    });
  } catch (e) { console.error("Coach email error:", e); }

  return { success: true, userId: authData.user.id };
}

export async function loginClient(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = (formData.get("email")    as string).trim();
  const password = formData.get("password") as string;

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) return { error: "Email ou mot de passe incorrect." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", authData.user.id).single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Ton acces n est pas encore cree. Contacte ton coach." };
  }

  if (profile.role === "coach") redirect("/dashboard/coach");
  redirect("/dashboard/client");
}
