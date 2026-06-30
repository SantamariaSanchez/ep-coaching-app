"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CLIENT_ITEMS = [
  { label: "Programme", href: "/dashboard/client/program" },
  { label: "Logbook", href: "/dashboard/client/logbook" },
  { label: "Road Map", href: "/dashboard/client/roadmap" },
];

const COACH_MOI_ITEMS = [
  { label: "Programme", href: "/dashboard/coach/moi/programme" },
  { label: "Logbook", href: "/dashboard/coach/moi/logbook" },
];

export default function TrainingSubNav({ scope = "client" }: { scope?: "client" | "coach-moi" }) {
  const pathname = usePathname();
  const items = scope === "coach-moi" ? COACH_MOI_ITEMS : CLIENT_ITEMS;

  return (
    <div className="flex gap-1 mb-6 border-b border-[var(--color-ep-dark-red)]/20 -mx-1 px-1 overflow-x-auto">
      {items.map(({ label, href }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              active
                ? "text-[var(--color-ep-red)] border-b-2 border-[var(--color-ep-red)]"
                : "text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
