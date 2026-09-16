import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachAdCampaigns } from "@/lib/ad-campaigns";
import AdsTracker from "@/components/coach/AdsTracker";
import { ChevronLeft } from "lucide-react";

// Outil de pilotage MANUEL de la publicité payante (Google Ads, Meta Ads,
// TikTok Ads...) — demande directe du fondateur : aucun outil de ce type
// n'existait dans l'appli. Ce N'EST PAS une intégration API régie (pas de
// credentials, hors scope) : le coach saisit/copie ses chiffres depuis les
// régies, l'appli calcule les métriques de décision (CPM, CPC, CTR, coût
// par lead, ROAS). Voir lib/ad-campaigns.ts et
// supabase/migrations/20260916a_ad_campaigns.sql pour le détail.
//
// Scopé par coach_id (RLS + garde applicative, voir
// business/ads/actions.ts) — vit sous /business comme "Développer mon
// business" et "Appels de vente" (segment business/ads dans DashboardNav),
// mais reste sa propre page autonome, pas une section de BusinessHub.
export default async function AdsTrackerPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const campaigns = await getCoachAdCampaigns(user.id);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/business"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Retour
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon business
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Publicité</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Saisis tes campagnes Google/Meta/TikTok Ads et leurs chiffres à jour. Pas de connexion aux
          régies, juste les métriques qui aident à décider quoi couper ou scaler.
        </p>
      </div>

      <AdsTracker initialCampaigns={campaigns} />
    </div>
  );
}
