import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachAdCampaigns } from "@/lib/ad-campaigns";
import AdsTracker from "@/components/coach/AdsTracker";

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
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const campaigns = await getCoachAdCampaigns(user.id);

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/business" label={t("Retour")} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6" />

      <AdsTracker initialCampaigns={campaigns} />
    </div>
  );
}
