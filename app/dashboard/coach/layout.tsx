import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";

// Bloque l'accès à tout l'espace coach tant que l'abonnement plateforme
// n'est pas actif — sauf le propriétaire historique (is_platform_owner),
// exempté par la migration 20260729b. La page de paiement elle-même vit
// hors de /dashboard/coach pour ne jamais boucler sur cette redirection.
export default async function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) return <>{children}</>;

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") return <>{children}</>;

  if (!profile.is_platform_owner && profile.platform_subscription_status !== "active") {
    redirect("/dashboard/coach-pending");
  }

  return <>{children}</>;
}
