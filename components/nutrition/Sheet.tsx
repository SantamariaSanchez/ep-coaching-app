"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Panneau du bas (plein écran sur mobile, centré sur ordinateur) commun au
// tracker : ajout d'aliment, modification, remplacement.
export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Rendu à la racine du document : la page a une animation d'entrée qui
  // crée son propre plan d'empilement, et la barre de navigation, le
  // bandeau "Bilan du matin" et le menu du bas passaient par-dessus.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483000] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#890404]/35 shadow-[0_-10px_60px_rgba(137,4,4,0.35)]"
        style={{ background: "linear-gradient(180deg, #1a0202 0%, #0d0000 100%)" }}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-[#890404]/20">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-tight text-white truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-[#F5EDED]/45 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 -m-1 rounded-lg text-[#F5EDED]/50 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-[#890404]/20 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
