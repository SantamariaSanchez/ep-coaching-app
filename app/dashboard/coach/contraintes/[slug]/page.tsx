import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getMedicalConstraintBySlug, MEDICAL_CONSTRAINTS } from "@/lib/medical-constraints";
import { ChevronLeft, ShieldAlert, ListChecks, BookOpen } from "lucide-react";

export function generateStaticParams() {
  return MEDICAL_CONSTRAINTS.map((c) => ({ slug: c.slug }));
}

export default async function CoachContraintePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const constraint = getMedicalConstraintBySlug(slug);
  if (!constraint) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/contraintes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Contraintes & populations
      </Link>

      <h1 className="text-2xl font-black uppercase tracking-tight mb-3">{constraint.title}</h1>
      <p className="text-sm text-[#F5EDED]/50 leading-relaxed mb-8">{constraint.overview}</p>

      <div className="ep-card" style={{ padding: "18px 20px", marginBottom: 20 }}>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          <ListChecks size={13} className="text-[#E01E1E]" />
          Principes d&apos;adaptation
        </p>
        <ul className="space-y-2.5">
          {constraint.adaptationPrinciples.map((p, i) => (
            <li key={i} className="text-[12.5px] text-[#F5EDED]/60 leading-relaxed flex gap-2">
              <span className="text-[#E01E1E] flex-shrink-0">•</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3.5 mb-8">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2.5">
          <ShieldAlert size={13} />
          Signaux d&apos;alerte — orienter vers un professionnel
        </p>
        <ul className="space-y-2">
          {constraint.redFlags.map((f, i) => (
            <li key={i} className="text-[12px] text-amber-300/80 leading-relaxed flex gap-2">
              <span className="flex-shrink-0">•</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
          <BookOpen size={12} />
          Sources
        </p>
        <ul className="space-y-1">
          {constraint.sources.map((s, i) => (
            <li key={i} className="text-[10.5px] text-[#F5EDED]/30 leading-relaxed italic">{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
