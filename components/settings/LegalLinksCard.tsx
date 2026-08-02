import Link from "next/link";
import { LifeBuoy, FileText, ShieldCheck, ScrollText, ChevronRight } from "lucide-react";

const LINKS = [
  { label: "Assistance", href: "/support", icon: LifeBuoy },
  { label: "Conditions d'utilisation", href: "/legal/cgu", icon: FileText },
  { label: "Conditions de vente", href: "/legal/cgv", icon: ScrollText },
  { label: "Politique de confidentialité", href: "/legal/confidentialite", icon: ShieldCheck },
];

export default function LegalLinksCard() {
  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
        Assistance &amp; légal
      </p>
      <div className="space-y-0.5">
        {LINKS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between py-2.5 border-b border-[#890404]/10 last:border-0 group"
          >
            <span className="flex items-center gap-2.5 text-sm text-white font-medium">
              <Icon size={14} className="text-[#F5EDED]/40" />
              {label}
            </span>
            <ChevronRight size={13} className="text-[#F5EDED]/20 group-hover:text-[#F5EDED]/50 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
