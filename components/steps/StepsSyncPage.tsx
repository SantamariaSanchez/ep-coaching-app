import { getT } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStepsSyncStatus } from "@/utils/steps";
import StepsSyncSetup from "@/components/steps/StepsSyncSetup";
import { createStepsSyncToken, revokeStepsSyncToken } from "@/app/dashboard/client/steps/actions";

// Page d'installation de la synchro des pas, partagée par l'espace client et
// l'espace coach (Moi > Steps). Le lien iCloud du raccourci prêt à installer
// se règle avec NEXT_PUBLIC_STEPS_SHORTCUT_URL (vide = recette manuelle).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

export async function StepsSyncPage({ userId, backHref, ouraHref }: { userId: string; backHref: string; ouraHref: string }) {
  const t = await getT();
  const admin = createAdminClient();
  const [status, { data: oura }] = await Promise.all([
    getStepsSyncStatus(userId),
    admin.from("oura_connections").select("client_id").eq("client_id", userId).maybeSingle(),
  ]);
  const shortcutUrl = process.env.NEXT_PUBLIC_STEPS_SHORTCUT_URL?.trim() || null;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">{t("Steps")}</p>
        <h1 className="text-2xl font-black uppercase tracking-tight">{t("Synchro automatique")}</h1>
        <p className="text-sm text-(--ep-ink)/55 mt-1.5 leading-relaxed">{t("Une minute à installer, puis tes pas arrivent tout seuls. Plus rien à taper.")}</p>
      </div>
      <StepsSyncSetup
        status={status}
        endpoint={`${APP_URL.replace(/\/$/, "")}/api/steps/ingest`}
        shortcutUrl={shortcutUrl && /^https:\/\//.test(shortcutUrl) ? shortcutUrl : null}
        hasOura={!!oura}
        ouraHref={ouraHref}
        backHref={backHref}
        createToken={createStepsSyncToken}
        revokeToken={revokeStepsSyncToken}
      />
    </div>
  );
}
