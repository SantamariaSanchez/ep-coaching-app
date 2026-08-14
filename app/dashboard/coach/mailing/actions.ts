"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { sendCoachCampaign, getCoachClientsForMailing, MAX_RECIPIENTS_PER_SEND } from "@/lib/brevo-mailing";
import { revalidatePath } from "next/cache";

// Axe 2 (VISION.md) : mailing par coach.

function validate(subject: string, htmlContent: string): string | null {
  if (!subject.trim()) return "Sujet requis.";
  if (subject.length > 150) return "Sujet trop long (150 caractères max).";
  if (!htmlContent.trim()) return "Message requis.";
  if (htmlContent.length > 20000) return "Message trop long.";
  return null;
}

export async function getMailingRecipientCount(): Promise<{ count: number; error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { count: 0, error: guard.error };
  const clients = await getCoachClientsForMailing(guard.userId);
  return { count: clients.length };
}

// Envoi de test : sur soi-même uniquement, via l'email transactionnel déjà
// éprouvé (pas la voie campagne) — pour vérifier le rendu avant un vrai envoi.
export async function sendTestMailing(subject: string, htmlContent: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const err = validate(subject, htmlContent);
  if (err) return { error: err };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email").eq("id", guard.userId).maybeSingle();
  const email = (profile as { email: string | null } | null)?.email;
  if (!email) return { error: "Email introuvable sur ton profil." };

  const ok = await sendBrevoEmail({ to: email, subject: `[TEST] ${subject}`, htmlContent });
  if (!ok) return { error: "Échec de l'envoi du test." };
  return { success: true };
}

export async function sendMailingToClients(subject: string, htmlContent: string): Promise<{ error?: string; success?: boolean; recipientCount?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const err = validate(subject, htmlContent);
  if (err) return { error: err };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", guard.userId).maybeSingle();
  const coachName = (profile as { full_name: string | null } | null)?.full_name ?? "Coach";

  try {
    const { recipientCount, campaignId } = await sendCoachCampaign(guard.userId, coachName, subject, htmlContent);
    if (recipientCount === 0) return { error: "Aucun client actif à qui envoyer." };

    await admin.from("coach_mailings").insert({
      coach_id: guard.userId,
      subject,
      recipient_count: recipientCount,
      brevo_campaign_id: campaignId,
      status: "sent",
    });

    revalidatePath("/dashboard/coach/mailing");
    return { success: true, recipientCount };
  } catch (e) {
    await admin.from("coach_mailings").insert({
      coach_id: guard.userId,
      subject,
      recipient_count: 0,
      status: "failed",
    });
    revalidatePath("/dashboard/coach/mailing");
    return { error: e instanceof Error ? e.message : "Erreur lors de l'envoi." };
  }
}

export { MAX_RECIPIENTS_PER_SEND };
