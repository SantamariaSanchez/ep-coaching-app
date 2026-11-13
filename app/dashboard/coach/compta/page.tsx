import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachFinanceEntries } from "@/lib/coach-finance";
import CoachFinanceTracker from "@/components/coach/CoachFinanceTracker";

// Axe 4 (VISION.md) : comptabilité personnelle du coach pour SON activité —
// distinct de /dashboard/coach/finance (MRR plateforme, réservé au
// fondateur) et de lib/coach-billing.ts (abonnement du coach À la
// plateforme). Journal déclaratif, complété depuis le 2026-08-20 (Axe AZ,
// MASTERCLASS.md) par l'import auto du premier paiement d'un client via
// Stripe (lib/coach-finance-stripe-import.ts) — le reste (dépenses,
// renouvellements, coaching individuel...) reste saisi à la main.
export default async function CoachComptaPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const entries = await getCoachFinanceEntries(user.id);

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <CoachFinanceTracker initialEntries={entries} />
    </div>
  );
}
