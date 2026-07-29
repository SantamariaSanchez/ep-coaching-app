import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getActiveProgram } from "@/utils/programs";
import { getClientIntake } from "@/utils/client-intake";
import { saveProgram } from "../actions";
import ProgramEditor from "@/components/ui/ProgramEditor";
import ClientReferenceCard from "@/components/ui/ClientReferenceCard";
import { ChevronLeft } from "lucide-react";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, program, intake] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    getActiveProgram(id),
    getClientIntake(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <Link
        href={`/dashboard/coach/clients/${id}/program`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Retour au programme
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          {program ? "Modifier le programme" : "Nouveau programme"}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
      </div>

      <ClientReferenceCard intake={intake} />

      <ProgramEditor clientId={id} program={program} saveProgram={saveProgram} intake={intake} />
    </div>
  );
}
