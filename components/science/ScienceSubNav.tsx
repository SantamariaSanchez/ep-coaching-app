"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Recherche", segment: "recherche", countKey: null },
  { label: "Actualité", segment: "actualite", countKey: "actualite" },
  { label: "Bibliothèque", segment: "bibliotheque", countKey: "articles" },
  { label: "Nos études", segment: "etudes", countKey: "studies" },
] as const;

export default function ScienceSubNav({
  base,
  counts,
}: {
  base: "/dashboard/client/science" | "/dashboard/coach/science";
  counts?: { articles: number; actualite: number; studies: number };
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-6 border-b border-[#890404]/20 -mx-1 px-1 overflow-x-auto">
      {ITEMS.map(({ label, segment, countKey }) => {
        const href = `${base}/${segment}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const count = countKey && counts ? counts[countKey] : null;
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
            {count != null && <span className="opacity-50"> ({count})</span>}
          </Link>
        );
      })}
    </div>
  );
}
