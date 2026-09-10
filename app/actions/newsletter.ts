"use server";

import { requireAuth } from "@/lib/auth-guards";
import { getProfile } from "@/utils/auth";
import { addBrevoContactToList, isBrevoContactSubscribed, NEWSLETTER_LIST_ID } from "@/utils/brevo";

// Newsletter (2026-09-10) : jusqu'ici seule une inscription au moment du
// signup (app/auth/client|coach/actions.ts) ou un email laissé sur un
// leadmagnet (app/ressources/actions.ts) rejoignaient la liste Brevo — un
// membre existant qui avait décoché la case, ou qui s'est inscrit avant que
// cette case existe, n'avait aucun moyen de s'y ajouter depuis l'appli.
// Action volontairement à sens unique (pas de désinscription ici : ça se
// fait déjà via le lien en pied de chaque email Brevo, mécanisme standard
// et déjà conforme, pas besoin de le dupliquer côté appli).

export async function getNewsletterSubscriptionStatus(): Promise<boolean> {
  const guard = await requireAuth();
  if (!guard.ok) return false;

  const profile = await getProfile(guard.userId);
  if (!profile?.email) return false;

  return isBrevoContactSubscribed(profile.email, NEWSLETTER_LIST_ID);
}

export async function subscribeToNewsletter(): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const profile = await getProfile(guard.userId);
  if (!profile?.email) return { error: "Email introuvable sur ton profil." };

  const ok = await addBrevoContactToList(profile.email, NEWSLETTER_LIST_ID, profile.full_name?.split(" ")[0]);
  if (!ok) return { error: "Inscription impossible pour l'instant, réessaie dans un instant." };

  return { success: true };
}
