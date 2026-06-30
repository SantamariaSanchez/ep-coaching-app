"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton({ fallbackHref, label = "Retour" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors mb-6"
    >
      <ChevronLeft size={14} />
      {label}
    </button>
  );
}
