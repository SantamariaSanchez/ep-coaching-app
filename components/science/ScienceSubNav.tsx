"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Recherche", segment: "recherche" },
  { label: "Actualité", segment: "actualite" },
  { label: "Bibliothèque", segment: "bibliotheque" },
  { label: "Nos études", segment: "etudes" },
];

export default function ScienceSubNav({ base }: { base: "/dashboard/client/science" | "/dashboard/coach/science" }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-6 border-b border-[#890404]/20 -mx-1 px-1 overflow-x-auto">
      {ITEMS.map(({ label, segment }) => {
        const href = `${base}/${segment}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              active
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
