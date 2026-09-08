"use server";

// Remplace l'ancienne fonctionnalité d'upload de PDF (ResourceManager,
// retirée 2026-09-02, "c'est inutile maintenant car c'est toi qui les
// fais") : un coach (le fondateur ou, demain, un coach tiers de la
// plateforme) peut ajouter son propre lead magnet, distinct du catalogue
// officiel produit par la routine cloud IA (coach_id NULL, jamais touché
// ici). Voir supabase/migrations/20260902b_lead_magnets_coach_owned.sql.

import { revalidatePath, updateTag } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { RESOURCE_CATEGORIES } from "@/lib/resource-categories";
import type { LeadMagnetFormat, LeadMagnetSource } from "@/lib/lead-magnets";

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "leadmagnet"
  );
}

// ~200 mots/min de lecture, même repère que le reste du produit (voir
// LEADMAGNETS.md) pour rester cohérent avec le read_time des entrées
// produites par la routine.
function estimateReadTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min`;
}

function revalidateEverywhere() {
  // updateTag et non revalidateTag : ces actions tournent dans un Server Action
  // et le coach doit voir SON lead magnet immediatement apres l'avoir cree ou
  // supprime (read-your-own-writes). revalidateTag en profil "max" sert du
  // contenu perime le temps du rafraichissement, ce qui donnerait l'impression
  // que l'ajout n'a pas fonctionne.
  updateTag("lead-magnets");
  revalidatePath("/dashboard/coach/ressources");
  revalidatePath("/dashboard/client/ressources");
  revalidatePath("/ressources");
}

export interface CreateCoachLeadMagnetInput {
  title: string;
  hook: string;
  category: string;
  format: Extract<LeadMagnetFormat, "guide" | "checklist">;
  // Texte libre : paragraphes séparés par une ligne vide pour un guide, un
  // item par ligne pour une checklist — même geste qu'écrire une note,
  // volontairement plus simple que le schéma multi-sections de la routine
  // IA (pensé pour être rempli à la main, pas généré).
  body: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export async function createCoachLeadMagnet(
  input: CreateCoachLeadMagnetInput
): Promise<{ error?: string; slug?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const title = input.title.trim();
  const hook = input.hook.trim();
  const body = input.body.trim();
  if (!title || !hook || !body) {
    return { error: "Titre, accroche et contenu sont obligatoires." };
  }
  if (!(RESOURCE_CATEGORIES as readonly string[]).includes(input.category)) {
    return { error: "Catégorie invalide." };
  }
  if (input.format !== "guide" && input.format !== "checklist") {
    return { error: "Format invalide." };
  }

  const admin = createAdminClient();

  // Slug unique dérivé du titre, comme createFormation() ailleurs dans
  // l'appli : suffixe court aléatoire seulement en cas de collision.
  const base = slugify(title);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await admin
      .from("lead_magnets")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const sources: LeadMagnetSource[] | null = input.sourceLabel?.trim()
    ? [{ label: input.sourceLabel.trim(), doi: null, url: input.sourceUrl?.trim() || null }]
    : null;

  let content: Record<string, unknown>;
  if (input.format === "checklist") {
    const items = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (items.length < 2) return { error: "Une checklist a besoin d'au moins 2 lignes." };
    content = { intro: hook, groups: [{ items }], conclusion: "" };
  } else {
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) return { error: "Le contenu est vide." };
    content = { intro: hook, sections: [{ heading: title, paragraphs }], conclusion: "" };
  }

  const { error } = await admin.from("lead_magnets").insert({
    slug,
    title,
    hook,
    category: input.category,
    subcategory: null,
    format: input.format,
    read_time: estimateReadTime(wordCount),
    icon: "Sparkles",
    content,
    sources,
    published: true,
    coach_id: guard.userId,
  });

  if (error) {
    console.error("createCoachLeadMagnet error:", error);
    return { error: "Erreur lors de la création." };
  }

  revalidateEverywhere();
  return { slug };
}

// Vérifie que la ligne appartient bien au coach qui agit avant toute
// modification/suppression : requireCoach() ne vérifie que le rôle, pas la
// propriété (même précaution que resource-requests.ts pour le
// cloisonnement multi-coach).
async function assertOwnership(id: string, coachId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin.from("lead_magnets").select("coach_id").eq("id", id).maybeSingle();
  if (!row) return { ok: false as const, error: "Introuvable." };
  if (row.coach_id !== coachId) return { ok: false as const, error: "Tu ne peux gérer que tes propres lead magnets." };
  return { ok: true as const };
}

export async function deleteCoachLeadMagnet(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const owns = await assertOwnership(id, guard.userId);
  if (!owns.ok) return { error: owns.error };

  const admin = createAdminClient();
  const { error } = await admin.from("lead_magnets").delete().eq("id", id);
  if (error) return { error: "Erreur lors de la suppression." };

  revalidateEverywhere();
  return {};
}

export async function toggleCoachLeadMagnetPublished(
  id: string,
  published: boolean
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const owns = await assertOwnership(id, guard.userId);
  if (!owns.ok) return { error: owns.error };

  const admin = createAdminClient();
  const { error } = await admin.from("lead_magnets").update({ published }).eq("id", id);
  if (error) return { error: "Erreur." };

  revalidateEverywhere();
  return {};
}
