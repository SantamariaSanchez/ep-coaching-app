import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { saveProgramTemplate } from "../actions";
import ProgramTemplateEditor from "@/components/ui/ProgramTemplateEditor";
import { ChevronLeft } from "lucide-react";

export default async function NewProgramTemplatePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto page-transition">
      <Link
        href="/dashboard/coach/programmation"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Bibliothèque de modèles
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Nouveau modèle
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Modèle de programme</h1>
      </div>

      <ProgramTemplateEditor templateId={null} template={null} saveProgramTemplate={saveProgramTemplate} />
    </div>
  );
}
