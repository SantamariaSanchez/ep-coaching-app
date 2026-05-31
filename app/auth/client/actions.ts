"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass + "Ep1!";
}

export interface RequestState {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function submitClientRequest(
  _prev: RequestState | null,
  formData: FormData
): Promise<RequestState> {
  const nom       = (formData.get("nom")       as string).trim();
  const email     = (formData.get("email")     as string).trim().toLowerCase();
  const telephone = (formData.get("telephone") as string).trim();
  const objectif  = (formData.get("objectif")  as string).trim();
  const niveau    = formData.get("niveau")    as string;
  const dispo     = formData.get("dispo")     as string;
  const source    = formData.get("source")    as string;

  if (!nom || !email) return { error: "Nom et email requis." };

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
      return { error: "Cet email est deja utilise. Utilise l onglet Me connecter." };
    }
    return { error: "Erreur creation du compte. Reessaie." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    full_name: nom,
    email,
    phone: telephone || null,
    goal: objectif || null,
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Erreur creation profil : " + profileError.message };
  }

  try {
    await sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Nouveau client inscrit - ${nom}`,
      htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Nouveau client inscrit</h2>
        <p><strong>Nom :</strong> ${nom}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Tel :</strong> ${telephone || "non renseigne"}</p>
        <p><strong>Objectif :</strong> ${objectif}</p>
        <p><strong>Niveau :</strong> ${niveau} / ${dispo}/sem / ${source}</p>
        <div style="background:#1A0101;border:1px solid #E01E1E;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 6px;color:#E01E1E;font-weight:700;">Identifiants temporaires</p>
          <p style="margin:0 0 4px;"><strong>Email :</strong> ${email}</p>
          <p style="margin:0;"><strong>MDP :</strong> ${tempPassword}</p>
        </div>
        <a href="${APP_URL}/dashboard/coach/clients" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">Voir mes clients</a>
      </div>`,
    });
  } catch (e) { console.error("Coach email error:", e); }

  try {
    await sendBrevoEmail({
      to: email,
      subject: "Bienvenue chez EP Coaching - Tes identifiants",
      htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
        <h2 style="color:#E01E1E;margin-top:0;">Bienvenue ${nom.split(" ")[0]} !</h2>
        <p>Ton espace coaching est pret. Voici tes identifiants :</p>
        <div style="background:#1A0101;border:1px solid rgba(224,30,30,0.3);border-radius:8px;padding:16px;margin:16px 0;">
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Mot de passe :</strong> ${tempPassword}</p>
          <p style="color:rgba(245,237,237,0.4);font-size:12px;margin:8px 0 0;">Change ton mot de passe apres connexion.</p>
        </div>
        <a href="${APP_URL}/auth/client" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">Acceder a mon espace</a>
      </div>`,
    });
  } catch (e) { console.error("Client email error:", e); }

  return {
    success: true,
    message: "Compte cree ! Tes identifiants arrivent par email. Tu peux te connecter maintenant.",
  };
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
