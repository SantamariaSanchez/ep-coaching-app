import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPositioning } from "@/lib/positioning-server";
import { getT } from "@/lib/i18n-server";
import PositioningBuilder from "@/components/coach/PositioningBuilder";

export const dynamic = "force-dynamic";

// Ma niche et mon avatar (2026-10-07) : le positionnement du coach construit
// pas à pas, sur le modèle du Notion du fondateur, puis réutilisé partout
// (bio, scripts, Claude, page Notion du coach).
export default async function PositioningPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");
  const t = await getT();

  const [{ data }, { count }] = await Promise.all([
    getPositioning(user.id),
    createAdminClient().from("api_tokens").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Business")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-1">{t("Ma niche et mon avatar")}</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.6)", margin: "0 0 18px", lineHeight: 1.6 }}>
        {t("Ton positionnement en 4 étapes : qui tu aides, ce que tu promets, ton client idéal et ton offre. Tout s'enregistre seul et sert ensuite à tes scripts, ta bio et à Claude.")}
      </p>
      <PositioningBuilder initial={data} hasClaudeKey={(count ?? 0) > 0} />
    </div>
  );
}
