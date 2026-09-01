import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { FUNNEL_STAGES } from "@/lib/coach-business";
import BusinessChecklist from "@/components/coach/BusinessChecklist";
import { Rocket, Sparkles, GraduationCap, ArrowRight } from "lucide-react";

// Axe 6 (VISION.md) — demande directe 2026-08-19 : "un autre espace pour
// tout ce qui est entreprenariat donc la construction de sa propre
// entreprise d'un coach, pas juste gérer leurs clients (déjà hyper
// poussé) mais aussi tout ce qui dev son business de coaching". Le Studio
// créatif (/dashboard/coach/studio) est déjà scopé par coach — cette page
// fournit le cadre qui manquait par-dessus (funnel TOF/MOF/BOF) et la
// checklist de construction de marque personnelle, jamais fournis
// ailleurs.
export default async function CoachBusinessPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const supabase = await createServerSupabase();
  const { data: checklistRows } = await supabase
    .from("coach_business_checklist")
    .select("item_key")
    .eq("coach_id", user.id)
    .eq("done", true);
  const initialDone = (checklistRows ?? []).map((r) => r.item_key as string);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Rocket size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Développer mon business
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40 leading-relaxed max-w-xl">
          Suivre tes clients, c&apos;est déjà couvert partout ailleurs dans l&apos;appli. Ici, c&apos;est
          ton propre business de coach : contenu, marque personnelle, stratégie. Un système à suivre,
          pas juste des idées en vrac.
        </p>
      </div>

      {/* Liens rapides */}
      <div className="grid sm:grid-cols-2 gap-3 mt-6 mb-10">
        <Link
          href="/dashboard/coach/studio"
          className="ep-card group flex items-center gap-3"
          style={{ padding: "16px 18px", textDecoration: "none" }}
        >
          <div className="w-9 h-9 rounded-xl bg-[#E01E1E]/12 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-[#E01E1E]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-white">Studio créatif</p>
            <p className="text-[10.5px] text-[#F5EDED]/35">Idées, scripts, inspirations : ton espace de création</p>
          </div>
          <ArrowRight size={14} className="text-[#F5EDED]/20 group-hover:text-[#E01E1E] transition-colors flex-shrink-0" />
        </Link>
        <Link
          href="/dashboard/coach/moi/formations"
          className="ep-card group flex items-center gap-3"
          style={{ padding: "16px 18px", textDecoration: "none" }}
        >
          <div className="w-9 h-9 rounded-xl bg-[#E01E1E]/12 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={16} className="text-[#E01E1E]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-white">Mes formations</p>
            <p className="text-[10.5px] text-[#F5EDED]/35">Dont ENTREPRENARIAL SECRET, écrite pour toi</p>
          </div>
          <ArrowRight size={14} className="text-[#F5EDED]/20 group-hover:text-[#E01E1E] transition-colors flex-shrink-0" />
        </Link>
      </div>

      {/* Funnel TOF/MOF/BOF */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Système de contenu
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Ton funnel de contenu</h2>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.key} className="ep-card" style={{ padding: "18px 20px" }}>
              <p className="text-sm font-black text-white mb-1">{stage.label}</p>
              <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed mb-3">{stage.goal}</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {stage.formats.map((f, i) => (
                  <div key={i} className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1">
                      {f.platform} · {f.format}
                    </p>
                    <p className="text-[10.5px] text-[#F5EDED]/50 leading-relaxed">{f.idea}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist personal branding */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Marque personnelle
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Construis ta base</h2>
        <BusinessChecklist initialDone={initialDone} />
      </div>
    </div>
  );
}
