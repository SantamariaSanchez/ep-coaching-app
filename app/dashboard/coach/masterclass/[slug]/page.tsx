import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
      <Link
        href="/dashboard/coach/masterclass"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Masterclass
      </Link>

      <MasterclassGuideView guide={guide} initialCompletedSteps={completedSteps} />
    </div>
  );
}
