import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachFinanceEntries } from "@/lib/coach-finance";
import CoachFinanceTracker from "@/components/coach/CoachFinanceTracker";

// Axe 4 (VISION.md) : comptabilité personnelle du coach pour SON activité —
// distinct de /dashboard/coach/finance (MRR plateforme, réservé au
// fondateur) et de lib/coach-billing.ts (abonnement du coach À la
// plateforme). Ici : un journal revenus/dépenses déclaratif, pas connecté
// à Stripe ni à un mouvement d'argent réel.
export default async function CoachComptaPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const entries = await getCoachFinanceEntries(user.id);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon activité
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Revenus & dépenses</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Un suivi rapide et déclaratif, pas un logiciel de compta. Exporte en CSV pour ton vrai
          suivi comptable si besoin.
        </p>
      </div>

      <CoachFinanceTracker initialEntries={entries} />
    </div>
  );
}
