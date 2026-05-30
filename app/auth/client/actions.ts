"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

// ── Inscription request (no Supabase account created) ────────────────────────

export interface RequestState {
  success?: boolean;
  error?: string;
}

export async function submitClientRequest(
  _prev: RequestState | null,
  formData: FormData
): Promise<RequestState> {
  const nom = formData.get("nom") as string;
  const email = formData.get("email") as string;
  const telephone = formData.get("telephone") as string;
  const objectif = formData.get("objectif") as string;
  const niveau = formData.get("niveau") as string;
  const dispo = formData.get("dispo") as string;
  const source = formData.get("source") as string;

  try {
    await sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Nouvelle demande coaching — ${nom}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;max-width:600px;">
          <h2 style="color:#E01E1E;margin-top:0;">Nouvelle demande de coaching</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);width:140px;">Nom</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${nom}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);">Email</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${email}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);">Téléphone</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${telephone}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);">Niveau</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${niveau}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);">Disponibilités</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${dispo} / semaine</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(245,237,237,0.5);">Source</td><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:600;">${source}</td></tr>
            <tr><td colspan="2" style="padding:16px 0 8px;color:rgba(245,237,237,0.5);">Objectif</td></tr>
            <tr><td colspan="2" style="padding:0 0 16px;font-style:italic;">"${objectif}"</td></tr>
          </table>
          <a href="${APP_URL}/dashboard/coach"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                    text-decoration:none;display:inline-block;margin-top:8px;font-weight:700;
                    letter-spacing:0.05em;font-size:13px;text-transform:uppercase;">
            Créer son compte →
          </a>
        </div>
      `,
    });

    return { success: true };
  } catch (e) {
    console.error("Email send error:", e);
    return { error: "Erreur lors de l'envoi. Réessaie dans quelques instants." };
  }
}

// ── Client login ──────────────────────────────────────────────────────────────

export async function loginClient(
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
    return { error: "Email ou mot de passe incorrect." };
  }

  // Read role with admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "Ton accès n'est pas encore créé. Contacte ton coach.",
    };
  }

  // Redirect based on role (coach can also log in here)
  if (profile.role === "coach") {
    redirect("/dashboard/coach");
  }

  redirect("/dashboard/client");
}
