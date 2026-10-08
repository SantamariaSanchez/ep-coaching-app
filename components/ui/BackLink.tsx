"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Retour (2026-10-08, retour direct : « dans Claude et Notion il n'y a pas de
// bouton retour ») : revient à l'écran précédent, ou à la page de secours si
// la page a été ouverte directement (lien, notification).
export default function BackLink({ fallback, label }: { fallback: string; label?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 36, padding: "4px 8px 4px 0", marginBottom: 6, background: "none", border: "none", color: "rgba(245,237,237,0.55)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
    >
      <ChevronLeft size={16} /> {label ?? t("Retour")}
    </button>
  );
}
