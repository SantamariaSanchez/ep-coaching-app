"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

type AddClientState = { error: string } | { success: true } | null;

export async function addClient(
  prevState: AddClientState,
  formData: FormData
): Promise<AddClientState> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();

  const fullName = (formData.get("full_name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string).trim() || null;
  const weightStart = formData.get("weight_start") as string;
  const goal = (formData.get("goal") as string).trim() || null;
  const startDate = (formData.get("start_date") as string) || null;

  if (!fullName || !email || !password) {
    return { error: "Nom, email et mot de passe sont requis." };
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return { error: "Ce client est déjà inscrit. Il apparaît dans ta liste de clients — rafraîchis la page si besoin." };
    }
    return { error: authError?.message ?? "Erreur lors de la création du compte." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    full_name: fullName,
    email,
    phone,
    weight_start: weightStart ? parseFloat(weightStart) : null,
    goal,
    start_date: startDate,
    status: "active",
    // Ce formulaire sert uniquement à créer un client coaché individuellement
    // (le coach le remplit après avoir vendu le coaching) — contrairement au
    // formulaire d'auto-inscription publique, qui lui reste sur "free" par
    // défaut. Sans ce champ, le client resterait bloqué sur l'espace gratuit
    // (pas de messages, pas de bilan coach, pas de formations) sans qu'il y
    // ait nulle part ailleurs un moyen de l'activer.
    subscription_status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/clients");
  return { success: true };
}

// Activer/désactiver le coaching individuel d'un client manuellement. Le
// webhook Stripe (app/api/webhooks/stripe/route.ts) sait mettre à jour ce
// même champ, mais rien dans l'app ne crée jamais de Checkout Session avec
// le client_reference_id attendu — en pratique un client ne peut donc devenir
// "actif" que si le coach l'active ici lui-même (paiement réglé par ailleurs :
// virement, espèces, lien Stripe envoyé à la main...).
export async function setClientSubscriptionStatus(
  clientId: string,
  status: "free" | "active" | "canceled"
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ subscription_status: status })
    .eq("id", clientId)
    .eq("role", "client");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/clients");
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/communaute/membres");
  return { success: true };
}
