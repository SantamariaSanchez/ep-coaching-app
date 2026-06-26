import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { BookOpen } from "lucide-react";

export default async function CoachRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/ressources");

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
      </div>

      <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
        <BookOpen size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[#F5EDED]/35">
          Ajoute ici tes guides et lead magnets — visibles par tous les clients (gratuits et payants).
        </p>
      </div>
    </div>
  );
}
