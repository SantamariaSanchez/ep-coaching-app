import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { notFound, redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getMasterclassGuide } from "@/lib/masterclass-guides";
import { getCoachMasterclassProgress } from "@/lib/coach-masterclass-progress";
import MasterclassGuideView from "@/components/coach/MasterclassGuideView";

export const dynamic = "force-dynamic";

export default async function MasterclassGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { slug } = await params;
  const guide = getMasterclassGuide(slug);
  if (!guide) notFound();

  const progress = await getCoachMasterclassProgress(user.id);
  const completedSteps = progress[guide.slug] ?? [];

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/masterclass" expect="/dashboard/coach/masterclass" label={t("Masterclass")} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6" />

      <MasterclassGuideView guide={guide} initialCompletedSteps={completedSteps} />
    </div>
  );
}
