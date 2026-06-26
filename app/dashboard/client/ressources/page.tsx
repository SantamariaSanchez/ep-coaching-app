import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResources } from "@/utils/resources";
import { BookOpen, FileText, Download } from "lucide-react";

export default async function ClientRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/ressources");

  const resources = await getResources();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
      </div>

      {resources.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <BookOpen size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            Les guides et ressources gratuites arrivent bientôt ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <a
              key={r.id}
              href={r.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/40 rounded-xl px-4 py-3.5 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-[#890404]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.title}</p>
                {r.description && (
                  <p className="text-[10px] text-[#F5EDED]/35 truncate">{r.description}</p>
                )}
              </div>
              <Download
                size={15}
                className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/50 transition-colors flex-shrink-0"
                strokeWidth={1.8}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
