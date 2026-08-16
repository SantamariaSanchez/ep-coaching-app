"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { getPlatformOwnerId } from "@/lib/job-applications";
import { sendBrevoEmail } from "@/utils/brevo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Même pattern que callerIp() dans app/ressources/actions.ts (dupliqué
// plutôt que partagé, pas de lien fonctionnel entre les deux dossiers).
async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

// Action publique, sans authentification (voir app/ressources/actions.ts::
// submitLead pour le même principe) : écrit en base via le client admin
// (RLS contournée par design, job_applications n'a aucune policy insert)
// et notifie le fondateur par email, best effort.
export async function submitApplication(
  roleKey: string,
  roleTitle: string,
  fullName: string,
  email: string,
  phone: string
): Promise<{ error?: string; ok?: boolean }> {
  const ip = await callerIp();
  const limited = await checkRateLimit(`job-application:${ip}`, PRESETS.email.limit, PRESETS.email.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de tentatives, réessaie dans un instant." };
  }

  const name = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!name) return { error: "Ton nom est requis." };
  if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) return { error: "Un email valide est requis." };
  if (!roleKey) return { error: "Poste invalide." };

  const ownerId = await getPlatformOwnerId();
  if (!ownerId) return { error: "Impossible d'envoyer la candidature, réessaie plus tard." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("job_applications").insert({
      owner_id: ownerId,
      role_key: roleKey,
      full_name: name,
      email: trimmedEmail,
      phone: trimmedPhone || null,
    });
    if (error) {
      console.error("submitApplication error:", error);
      return { error: "Erreur lors de l'envoi, réessaie." };
    }

    sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Nouvelle candidature : ${roleTitle}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">Nouvelle candidature</h2>
          <p><strong>Poste :</strong> ${roleTitle}</p>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${trimmedEmail}</p>
          <p><strong>Téléphone :</strong> ${trimmedPhone || "non renseigné"}</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/coach/admin/organisation"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px;font-weight:bold;">
            Voir dans l'appli
          </a>
        </div>
      `,
    }).catch(() => {});

    return { ok: true };
  } catch (e) {
    console.error("submitApplication error:", e);
    return { error: "Erreur inattendue." };
  }
}
