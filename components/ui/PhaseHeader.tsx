"use client";

// Bannière de phase partagée entre les espaces de conception programme
// (ProgramEditor) et diète (DietPlanManager) — marque visuellement les temps
// du travail (réflexion, programmation, construction, livraison). Pas des
// étapes verrouillées les unes derrière les autres : tout reste visible et
// modifiable dans n'importe quel ordre, mais la page doit se LIRE comme un
// projet en plusieurs temps, pas comme un formulaire plat.
export default function PhaseHeader({
  n,
  title,
  subtitle,
  id,
}: {
  n: number;
  title: string;
  subtitle: string;
  id: string;
}) {
  return (
    <div id={id} className="flex items-center gap-3 pt-4 scroll-mt-4">
      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#E01E1E]/15 border border-[#E01E1E]/40 flex items-center justify-center text-sm font-black text-[#E01E1E]">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-wide text-white leading-tight">{title}</p>
        <p className="text-[10.5px] text-[#F5EDED]/35">{subtitle}</p>
      </div>
    </div>
  );
}
