"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { cleanText, LIMITS } from "@/lib/sanitize";
import type { ContactCategory, ContactStatus } from "@/lib/coach-network";

const VALID_CATEGORIES: ContactCategory[] = ["partenaire", "affilie", "influenceur", "fournisseur", "autre"];
const VALID_STATUSES: ContactStatus[] = ["a_contacter", "en_discussion", "actif", "inactif"];

export async function createNetworkContact(data: {
  name: string;
  category: ContactCategory;
  contact_info: string | null;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const name = cleanText(data.name, LIMITS.name);
  if (!name) return { error: "Nom obligatoire." };
  if (!VALID_CATEGORIES.includes(data.category)) return { error: "Catégorie invalide." };

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("coach_network_contacts")
    .insert({
      coach_id: guard.userId,
      name,
      category: data.category,
      contact_info: cleanText(data.contact_info ?? "", LIMITS.shortText) || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Erreur lors de la création." };

  revalidatePath("/dashboard/coach/business");
  return { id: row.id };
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!VALID_STATUSES.includes(status)) return { error: "Statut invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_network_contacts")
    .update({ status, last_contact_date: new Date().toISOString().split("T")[0] })
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de la mise à jour." };

  revalidatePath("/dashboard/coach/business");
  return {};
}

export async function updateContactNote(id: string, note: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const clean = cleanText(note, LIMITS.note);

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_network_contacts")
    .update({ note: clean || null })
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/coach/business");
  return {};
}

export async function deleteNetworkContact(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  await admin.from("coach_network_contacts").delete().eq("id", id).eq("coach_id", guard.userId);

  revalidatePath("/dashboard/coach/business");
  return {};
}
