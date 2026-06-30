import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getScienceStudies } from "@/utils/science";
import { FlaskConical } from "lucide-react";
import ScienceSubNav from "@/components/science/ScienceSubNav";
import StudiesView from "@/components/science/StudiesView";
import { createStudy, updateStudy, deleteStudy } from "@/app/dashboard/client/science/actions";

export const dynamic = "force-dynamic";

export default async function ClientScienceEtudesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/science/etudes");

  const studies = await getScienceStudies();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <FlaskConical size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Science
        </h1>
      </div>

      <ScienceSubNav base="/dashboard/client/science" />

      <StudiesView
        studies={studies}
        isCoach={false}
        createStudy={createStudy}
        updateStudy={updateStudy}
        deleteStudy={deleteStudy}
      />
    </div>
  );
}
