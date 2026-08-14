import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getPrioritizedCoachView } from "@/lib/coach-analytics";
import { AlertTriangle, AlertCircle, Info, Clock3, ChevronRight, CheckCircle2 } from "lucide-react";

const SEVERITY_META = {
  high: { label: "Critique", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", Icon: AlertTriangle },
  medium: { label: "Attention", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", Icon: AlertCircle },
  low: { label: "À surveiller", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", Icon: Info },
} as const;

// Axe 3 (VISION.md) : "qui a besoin de moi cette semaine" en une seule vue
// priorisée, plutôt que des signaux dispersés en notifications. Deux
// sections : les clients avec un signal explicite (repris d'UrgentAlertsSection,
// ici sans limite à 3), et les clients SANS signal mais sans contact live
// depuis 30+ jours — pour ne jamais laisser un client "silencieux" filer
// entre les mailles juste parce qu'il ne déclenche aucune alerte.
export default async function CoachPrioritairesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { flagged, quiet } = await getPrioritizedCoachView(user.id);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Espace Coach
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Qui a besoin de moi</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Tous les signaux, en une seule vue triée par priorité.
        </p>
      </div>

      {flagged.length === 0 && quiet.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <CheckCircle2 size={22} className="text-green-400/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Rien à signaler. Tous tes clients actifs sont suivis.</p>
        </div>
      ) : (
        <>
          {flagged.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={13} className="text-red-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-red-400/80">
                  Signal explicite
                </h2>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                  {flagged.length}
                </span>
              </div>
              <div className="space-y-3">
                {flagged.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/dashboard/coach/clients/${c.clientId}`}
                    className="block bg-[#1f0101] border border-[#890404]/20 hover:border-red-500/30 rounded-xl px-4 py-3.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-black text-white">{c.clientName ?? "Client"}</p>
                      <ChevronRight size={14} className="text-[#F5EDED]/25 flex-shrink-0" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {c.alerts.map((a, i) => {
                        const meta = SEVERITY_META[a.severity];
                        const Icon = meta.Icon;
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <Icon size={11} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }} />
                            <p className="text-[11px] text-[#F5EDED]/55 leading-snug">{a.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {quiet.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock3 size={13} className="text-[#F5EDED]/40" />
                <h2 className="text-xs font-black uppercase tracking-widest text-[#F5EDED]/45">
                  Silencieux, sans signal
                </h2>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#F5EDED]/10 text-[#F5EDED]/50 border border-[#F5EDED]/15">
                  {quiet.length}
                </span>
              </div>
              <p className="text-[11px] text-[#F5EDED]/35 mb-3 leading-relaxed">
                Aucune alerte, mais pas d&apos;appel live depuis 30 jours ou plus. Rien ne clignote,
                ça ne veut pas dire qu&apos;il n&apos;y a rien à faire.
              </p>
              <div className="space-y-2">
                {quiet.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/dashboard/coach/clients/${c.clientId}`}
                    className="flex items-center justify-between gap-2 bg-[#1f0101] border border-[#890404]/15 hover:border-[#890404]/30 rounded-xl px-4 py-3 transition-colors"
                  >
                    <p className="text-xs font-bold text-white">{c.clientName ?? "Client"}</p>
                    <span className="text-[10px] text-[#F5EDED]/35 flex-shrink-0">
                      {c.lastContactDays == null ? "Jamais eu d'appel" : `Depuis ${c.lastContactDays} jours`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
