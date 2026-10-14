import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getCommunityMembersWithActivity } from "@/utils/auth";
import { Heart } from "lucide-react";
import MembresView from "@/components/community/MembresView";
import { relaunchMember } from "./actions";

export default async function CoachMembresPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  // members ne dépend que de user.id (déjà connu), pas du contenu de
  // profile : lancé en parallèle plutôt qu'après la vérification de rôle.
  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/communaute/victoires");
  // Le fondateur voit tous les inscrits de l'appli, un coach ses membres gratuits.
  const platformView = !!profile?.is_platform_owner;
  const members = await getCommunityMembersWithActivity(user.id, { allPlatform: platformView });

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
          {t("Communauté")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Heart size={26} className="text-(--ep-accent)" strokeWidth={1.8} />
          {t("Membres")}
        </h1>
        <p className="text-sm text-(--ep-ink)/45 mt-2">
          {platformView
            ? t("Toutes les personnes inscrites sur l'appli : clients suivis, membres gratuits et coachs. Les coachs IA ne sont pas comptés.")
            : t("Membres gratuits de la communauté, autonomes, sans suivi coaching. Ils n'apparaissent pas dans tes clients.")}
        </p>
      </div>

      <MembresView members={members} relaunchMember={relaunchMember} platformView={platformView} />
    </div>
  );
}
