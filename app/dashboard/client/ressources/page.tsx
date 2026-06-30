import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getResources } from "@/utils/resources";
import { getResourceRequests } from "@/utils/resource-requests";
import { getResourceHref } from "@/lib/resource-href";
import { BookOpen, FileText, Download } from "lucide-react";
import ResourceRequests from "@/components/resources/ResourceRequests";
import { createResourceRequest, respondToResourceRequest, deleteResourceRequest } from "./request-actions";

export default async function ClientRessourcesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/ressources");

  const [resources, requests] = await Promise.all([
    getResources(),
    getResourceRequests(),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
      </div>

      {resources.length === 0 ? (
        <div className="bg-[var(--color-ep-card)] border border-dashed border-[var(--color-ep-dark-red)]/25 rounded-xl py-16 text-center">
          <BookOpen size={26} className="text-[var(--color-ep-light)]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-ep-light)]/35">
            Les guides et ressources gratuites arrivent bientôt ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <a
              key={r.id}
              href={getResourceHref(r)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40 rounded-xl px-4 py-3.5 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-ep-dark-red)]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-[var(--color-ep-dark-red)]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.title}</p>
                {r.description && (
                  <p className="text-[10px] text-[var(--color-ep-light)]/35 truncate">{r.description}</p>
                )}
              </div>
              <Download
                size={15}
                className="text-[var(--color-ep-light)]/25 group-hover:text-[var(--color-ep-light)]/50 transition-colors flex-shrink-0"
                strokeWidth={1.8}
              />
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[var(--color-ep-dark-red)]/15">
        <ResourceRequests
          initialRequests={requests}
          isCoach={false}
          createRequest={createResourceRequest}
          respondToRequest={respondToResourceRequest}
          deleteRequest={deleteResourceRequest}
        />
      </div>
    </div>
  );
}
