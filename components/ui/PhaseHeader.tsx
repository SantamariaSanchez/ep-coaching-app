"use client";

import { ChevronDown } from "lucide-react";

// Bannière de phase partagée entre les espaces de conception programme
// (ProgramEditor) et diète (DietPlanManager) — marque visuellement les temps
// du travail (réflexion, programmation, construction, livraison).
//
// CHANGÉ 2026-08-19 (retour direct : "les 4 points jusqu'à livraison, ba
// tout ça faut y mettre dans un bouton pas direct dans la même page...
// ya beaucoup de chose comme ça dans l'appli où faut mettre des choses
// dans des boutons pour pas que ya trop de truc d'un coup"). Décision
// d'origine documentée ici même ("tout reste visible... la page doit se
// LIRE comme un projet en plusieurs temps, pas comme un formulaire
// plat") explicitement infirmée par ce retour : sur un programme déjà
// avancé, les 4 phases mises bout à bout font des milliers de pixels de
// scroll avant d'atteindre la suivante. `open`/`onToggle` optionnels
// rendent l'en-tête cliquable (accordéon, une seule phase dépliée à la
// fois) sans casser un appel existant qui ne les passe pas.
export default function PhaseHeader({
  n,
  title,
  subtitle,
  id,
  open,
  onToggle,
}: {
  n: number;
  title: string;
  subtitle: string;
  id: string;
  open?: boolean;
  onToggle?: () => void;
}) {
  const collapsible = onToggle !== undefined;
  const Tag = collapsible ? "button" : "div";

  return (
    <Tag
      id={id}
      type={collapsible ? "button" : undefined}
      onClick={onToggle}
      aria-expanded={collapsible ? open : undefined}
      className={`w-full flex items-center gap-3 pt-4 scroll-mt-4 text-left ${collapsible ? "cursor-pointer" : ""}`}
    >
      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#E01E1E]/15 border border-[#E01E1E]/40 flex items-center justify-center text-sm font-black text-[#E01E1E]">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-wide text-white leading-tight">{title}</p>
        <p className="text-[10.5px] text-[#F5EDED]/35">{subtitle}</p>
      </div>
      {collapsible && (
        <ChevronDown
          size={16}
          className="flex-shrink-0 text-[#F5EDED]/30 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      )}
    </Tag>
  );
}
