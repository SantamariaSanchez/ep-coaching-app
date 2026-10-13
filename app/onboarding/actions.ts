"use server";

import { after } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { escapeHtml } from "@/lib/sanitize";
import { notifyUser } from "@/lib/notify";
import { pushFounder } from "@/lib/admin-notify";
import { requireAuth } from "@/lib/auth-guards";
import type { MemberPreferences, PrimaryGoal } from "@/lib/personalization";
import { categoryForPrimaryGoal, pickGuide, type GuideCategory, type GuideRef } from "@/lib/reengagement";
import { PRESET_PROGRAMS } from "@/lib/preset-programs";
import { getAccessType } from "@/utils/auth-client";
import { getActiveProgram, saveProgramForClient } from "@/utils/programs";

// Labels historiques utilisés côté fiche client coach (profiles.goal /
// profiles.level), conservés tels quels pour ne rien casser à l'affichage.
const GOAL_LABELS: Record<string, string> = {
  perte_poids: "Perte de poids",
  prise_muscle: "Prise de muscle",
  performance: "Performance",
  sante_bien_etre: "Santé & bien-être",
  remise_en_forme: "Remise en forme",
};

const LEVEL_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Avancé",
};

export async function saveMemberPreferences(
  input: Partial<MemberPreferences>
): Promise<{ error?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    const { error } = await supabase.from("member_preferences").upsert({
      id: guard.userId,
      ...input,
      completed_at: new Date().toISOString(),
    });

    if (error) return { error: "Erreur lors de la sauvegarde." };

    // Le quiz remplace l'ancien questionnaire pré-inscription : on répercute
    // objectif/niveau sur le profil pour que la fiche client coach reste
    // renseignée, sans lui ajouter d'étape en plus.
    const profileUpdate: Record<string, string> = {};
    if (input.primary_goal && GOAL_LABELS[input.primary_goal]) {
      profileUpdate.goal = GOAL_LABELS[input.primary_goal];
    }
    if (input.experience_level && LEVEL_LABELS[input.experience_level]) {
      profileUpdate.level = LEVEL_LABELS[input.experience_level];
    }
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from("profiles").update(profileUpdate).eq("id", guard.userId);
    }

    return {};
  } catch (e) {
    console.error("saveMemberPreferences error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Premier guide offert dès la fin du quiz, choisi selon l'objectif déclaré
// (voir OnboardingTour) — jusqu'ici le seul moment où un membre gratuit
// recevait un vrai guide de la bibliothèque était après 10 jours d'inactivité
// (lib/reengagement.ts), jamais dès l'inscription. Repose sur les mêmes
// catégorie/tirage que la relance des dormants pour ne pas dupliquer la
// logique de choix.
export async function getWelcomeGuide(
  primaryGoal: PrimaryGoal | null | undefined
): Promise<GuideRef | null> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return null;
    const supabase = await createServerSupabase();

    async function guidesIn(category: GuideCategory): Promise<GuideRef[]> {
      const { data } = await supabase
        .from("lead_magnets")
        .select("slug, title, hook")
        .eq("published", true)
        .eq("category", category)
        .limit(60);
      return (data as GuideRef[] | null) ?? [];
    }

    const category = categoryForPrimaryGoal(primaryGoal ?? null);
    let guides = await guidesIn(category);
    // Une catégorie ciblée peut être vide si la bibliothèque n'a pas encore
    // été garnie dessus : "Général" sert de filet plutôt que de ne rien
    // offrir du tout.
    if (guides.length === 0 && category !== "Général") {
      guides = await guidesIn("Général");
    }

    return pickGuide(guides, guard.userId, 0);
  } catch (e) {
    console.error("getWelcomeGuide error:", e);
    return null;
  }
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", guard.userId);

    if (error) return { error: "Erreur lors de la sauvegarde." };
    const userId = guard.userId;
    after(() => announceOnboardingDone(userId).catch(() => {}));
    return {};
  } catch (e) {
    console.error("completeOnboarding error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Installe le programme de départ choisi dans le tour d'onboarding (voir
// recommendPreset() dans lib/preset-programs.ts) : un membre gratuit sort de
// l'inscription avec une vraie séance prête à lancer au lieu d'un écran
// "Créer mon programme" vide. Réservé aux membres gratuits (getAccessType,
// seule source de vérité) : le programme d'un client accompagné est fait
// par son coach, et on n'écrase jamais un programme déjà actif.
export async function installStarterProgram(presetId: string): Promise<{ error?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    const preset = PRESET_PROGRAMS.find((p) => p.id === presetId);
    if (!preset) return { error: "Programme introuvable." };

    const supabase = await createServerSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, subscription_status")
      .eq("id", guard.userId)
      .single();
    if (getAccessType(profile) !== "membre_gratuit") {
      return { error: "Ton programme est préparé par ton coach." };
    }

    const existing = await getActiveProgram(guard.userId);
    if (existing && existing.days.length > 0) return {};

    return await saveProgramForClient(supabase, guard.userId, preset.input);
  } catch (e) {
    console.error("installStarterProgram error:", e);
    return { error: "Erreur inattendue." };
  }
}

const CHECKIN_DAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// Fin d'onboarding (2026-10-13, retour direct : « il a fait son onboarding,
// bam un mail »). Trois choses, après la réponse (after) pour ne jamais
// ralentir l'écran : un email court au membre avec ses 3 gestes de la
// semaine, l'info à son coach (objectif, niveau) pour qu'il puisse agir
// tout de suite, et la notification au fondateur quand le coach n'est pas
// lui (sinon il l'a déjà en tant que coach).
async function announceOnboardingDone(userId: string): Promise<void> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    admin.from("profiles").select("full_name, email, coach_id, role, checkin_day").eq("id", userId).maybeSingle(),
    admin.from("member_preferences").select("primary_goal, experience_level").eq("id", userId).maybeSingle(),
  ]);
  if (!profile || profile.role !== "client") return;
  const name = (profile.full_name as string | null) ?? "Un membre";
  const first = name.split(" ")[0] || "toi";
  const goal = GOAL_LABELS[(prefs?.primary_goal as string | null) ?? ""] ?? null;
  const level = LEVEL_LABELS[(prefs?.experience_level as string | null) ?? ""] ?? null;
  const details = [goal ? `Objectif : ${goal}` : null, level ? `niveau ${level.toLowerCase()}` : null].filter(Boolean).join(" · ");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  const checkinDay = CHECKIN_DAYS[(profile.checkin_day as number | null) ?? 0] || null;

  const tasks: Promise<unknown>[] = [];
  if (profile.email) {
    tasks.push(sendBrevoEmail({
      to: profile.email as string,
      subject: `Ton espace est prêt, ${first}`,
      htmlContent: wrapBrandedEmail(`
        <p style="margin:0 0 14px;">${escapeHtml(first)}, ton espace EP Coaching est prêt${goal ? ` pour ton objectif : <strong>${escapeHtml(goal.toLowerCase())}</strong>` : ""}.</p>
        <p style="margin:0 0 10px;">Pour les 7 prochains jours, garde juste trois choses en tête :</p>
        <p style="margin:0 0 8px;"><strong>1. Ton bilan du matin.</strong> Poids et sommeil, 20 secondes. C'est ce qui permet d'ajuster ta diète au bon moment.</p>
        <p style="margin:0 0 8px;"><strong>2. Ta séance du jour.</strong> Elle est déjà dans l'onglet Training : tu ouvres, tu suis.</p>
        <p style="margin:0 0 14px;"><strong>3. Tes repas.</strong> Tu valides en un tap ce que tu as mangé.</p>
        ${checkinDay ? `<p style="margin:0 0 14px;">Et chaque ${checkinDay}, ton check-in de la semaine : 5 minutes pour faire le point, ton coach s'en sert pour ajuster la suite.</p>` : ""}
        <p style="margin:0 0 18px;">Le meilleur plan, c'est celui que tu suis. Pas besoin d'être parfait, juste régulier.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${appUrl}/dashboard/client" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Ouvrir mon espace</a></td></tr></table>
        <p style="margin:0;">Santamaria</p>
      `),
    }));
  }

  const coachId = (profile.coach_id as string | null) ?? null;
  let coachIsOwner = false;
  if (coachId) {
    const { data: coach } = await admin.from("profiles").select("is_platform_owner, is_ai_coach").eq("id", coachId).maybeSingle();
    coachIsOwner = !!coach?.is_platform_owner;
    if (!coach?.is_ai_coach) {
      tasks.push(notifyUser(coachId, {
        type: "client_onboarding_done",
        title: `✅ ${name} a fini son onboarding`,
        body: details || "Son profil est complet, sa fiche est prête.",
        url: `/dashboard/coach/clients/${userId}`,
        senderId: userId,
      }));
    }
  }
  if (!coachIsOwner) {
    tasks.push(pushFounder({ title: `✅ ${name} a fini son onboarding`, body: details || undefined, url: "/dashboard/coach/communaute/membres" }));
  }
  await Promise.allSettled(tasks);
}
