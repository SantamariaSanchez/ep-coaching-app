"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import {
  sendCoachCampaign,
  getCoachClientsForMailing,
  getBrevoLists,
  wrapBrandedEmail,
  type BrevoListSummary,
} from "@/lib/brevo-mailing";
import { audienceToStorageKey, storageKeyToAudience, type MailingAudience } from "@/lib/mailing-audience";
import { revalidatePath } from "next/cache";

// Axe 2 (VISION.md) : mailing par coach.
//
// Mailing v2 (2026-08-18) : suite de l'audit (MASTERCLASS.md Axe V) et du
// retour direct de l'utilisateur — dupliquer un envoi, programmer, aperçu,
// bannière de marque automatique, et une audience choisie plutôt que
// toujours "mes clients actifs" (tous les membres / les coachs / une liste
// Brevo existante, réservé au propriétaire de la plateforme : ces
// audiences dépassent le périmètre d'un coach sur ses propres clients).

function validate(subject: string, htmlContent: string): string | null {
  if (!subject.trim()) return "Sujet requis.";
  if (subject.length > 150) return "Sujet trop long (150 caractères max).";
  if (!htmlContent.trim()) return "Message requis.";
  if (htmlContent.length > 20000) return "Message trop long.";
  return null;
}

// Les audiences au-delà de "mes clients actifs" touchent des personnes qui
// ne sont pas les propres clients du coach appelant — réservées au
// propriétaire de la plateforme, comme le reste des écrans multi-coach.
async function ensureAudienceAllowed(userId: string, audience: MailingAudience): Promise<string | null> {
  if (audience.type === "mes_clients_actifs") return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_platform_owner").eq("id", userId).maybeSingle();
  if (!(profile as { is_platform_owner: boolean | null } | null)?.is_platform_owner) {
    return "Cette audience est réservée au propriétaire de la plateforme.";
  }
  return null;
}

// audienceKey optionnel : "tous_les_membres"/"coachs" comptent un univers
// différent de "mes clients actifs" (voir ensureAudienceAllowed pour la
// même restriction appliquée à l'envoi réel). "liste_..." n'a pas besoin
// d'appel ici : le composeur a déjà totalSubscribers depuis brevoLists.
export async function getMailingRecipientCount(audienceKey: string = "mes_clients_actifs"): Promise<{ count: number; error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { count: 0, error: guard.error };

  const audience = storageKeyToAudience(audienceKey);
  const audienceError = await ensureAudienceAllowed(guard.userId, audience);
  if (audienceError) return { count: 0, error: audienceError };

  if (audience.type === "liste_existante") return { count: 0 };

  const admin = createAdminClient();
  if (audience.type === "tous_les_membres") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").not("email", "is", null);
    return { count: count ?? 0 };
  }
  if (audience.type === "coachs") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach").not("email", "is", null);
    return { count: count ?? 0 };
  }

  const clients = await getCoachClientsForMailing(guard.userId);
  return { count: clients.length };
}

// Listes Brevo déjà existantes (dont la newsletter historique), pour le
// sélecteur d'audience "liste Brevo existante" — réservé au propriétaire de
// la plateforme (voir ensureAudienceAllowed), pas la peine d'exposer un
// appel API Brevo à un coach qui n'en a de toute façon pas l'usage.
export async function getBrevoListsForComposer(): Promise<{ lists: BrevoListSummary[]; isPlatformOwner: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { lists: [], isPlatformOwner: false };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_platform_owner").eq("id", guard.userId).maybeSingle();
  const isPlatformOwner = !!(profile as { is_platform_owner: boolean | null } | null)?.is_platform_owner;
  if (!isPlatformOwner) return { lists: [], isPlatformOwner: false };

  return { lists: await getBrevoLists(), isPlatformOwner: true };
}

// Envoi de test : sur soi-même uniquement, via l'email transactionnel déjà
// éprouvé (pas la voie campagne) — pour vérifier le rendu avant un vrai
// envoi. Habillé avec la même bannière de marque que l'envoi réel, pour
// que le test soit un vrai aperçu.
export async function sendTestMailing(subject: string, htmlContent: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const err = validate(subject, htmlContent);
  if (err) return { error: err };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email").eq("id", guard.userId).maybeSingle();
  const email = (profile as { email: string | null } | null)?.email;
  if (!email) return { error: "Email introuvable sur ton profil." };

  const ok = await sendBrevoEmail({ to: email, subject: `[TEST] ${subject}`, htmlContent: wrapBrandedEmail(htmlContent) });
  if (!ok) return { error: "Échec de l'envoi du test." };
  return { success: true };
}

export async function sendMailingToClients(
  subject: string,
  htmlContent: string,
  audienceKey: string = "mes_clients_actifs",
  scheduledAt?: string
): Promise<{ error?: string; success?: boolean; recipientCount?: number; failedSyncCount?: number; scheduled?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const err = validate(subject, htmlContent);
  if (err) return { error: err };

  const audience = storageKeyToAudience(audienceKey);
  const audienceError = await ensureAudienceAllowed(guard.userId, audience);
  if (audienceError) return { error: audienceError };

  if (scheduledAt) {
    const target = new Date(scheduledAt);
    if (isNaN(target.getTime()) || target.getTime() <= Date.now()) {
      return { error: "La date de programmation doit être dans le futur." };
    }
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", guard.userId).maybeSingle();
  const coachName = (profile as { full_name: string | null } | null)?.full_name ?? "Coach";
  const brandedHtml = wrapBrandedEmail(htmlContent);

  try {
    const { recipientCount, campaignId, failedSyncCount, scheduled } = await sendCoachCampaign(
      guard.userId,
      coachName,
      subject,
      brandedHtml,
      audience,
      scheduledAt
    );
    if (recipientCount === 0) return { error: "Aucun destinataire à qui envoyer pour cette audience." };

    await admin.from("coach_mailings").insert({
      coach_id: guard.userId,
      subject,
      html_content: htmlContent,
      audience: audienceToStorageKey(audience),
      scheduled_at: scheduledAt ?? null,
      recipient_count: recipientCount,
      brevo_campaign_id: campaignId,
      status: scheduled ? "scheduled" : "sent",
    });

    revalidatePath("/dashboard/coach/mailing");
    return { success: true, recipientCount, failedSyncCount, scheduled };
  } catch (e) {
    await admin.from("coach_mailings").insert({
      coach_id: guard.userId,
      subject,
      html_content: htmlContent,
      audience: audienceToStorageKey(audience),
      recipient_count: 0,
      status: "failed",
    });
    revalidatePath("/dashboard/coach/mailing");
    return { error: e instanceof Error ? e.message : "Erreur lors de l'envoi." };
  }
}
