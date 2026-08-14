import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { getPublicVictories } from "@/utils/community";

export const dynamic = "force-dynamic";

function fmtDate(d: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

// Item 44 : mur de réussites publiques, sans compte — uniquement les
// victoires que leur auteur a explicitement rendues publiques (voir la
// case à cocher dans CommunityFeed.tsx). Jamais de nom de famille, jamais
// de contenu affiché par défaut.
export default async function ReussitesPage() {
  const victories = await getPublicVictories();

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/ressources"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors mb-4"
        >
          <ArrowLeft size={11} /> Ressources
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          EP Coaching
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Réussites</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Ce que les membres partagent eux-mêmes dans la communauté, avec leur accord pour l&apos;afficher ici.
        </p>
      </div>

      {victories.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Trophy size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune réussite publique pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {victories.map((v) => (
            <div key={v.id} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={13} className="text-amber-400" />
                <span className="text-xs font-black text-white">{v.author_first_name}</span>
                <span className="text-[10px] text-[#F5EDED]/25">· {fmtDate(v.created_at)}</span>
              </div>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed mb-3">{v.content}</p>
              {v.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.image_url}
                  alt={`Photo de la réussite de ${v.author_first_name}`}
                  style={{ width: "100%", maxWidth: 320, borderRadius: 10, border: "1px solid rgba(137,4,4,0.25)" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
