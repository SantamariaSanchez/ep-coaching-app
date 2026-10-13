"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { AMBIANCE_STORAGE_KEY } from "@/lib/theme-color";
import AmbiancePicker from "./AmbiancePicker";

// Annonce unique pour les comptes déjà inscrits (2026-10-13) : les
// nouveaux choisissent leur ambiance à l'onboarding, les autres ne
// sauraient jamais que l'appli existe en clair ou en rose poudré.
const SEEN_KEY = "ep-ambiance-announced";

export default function AmbianceAnnounce() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) || localStorage.getItem(AMBIANCE_STORAGE_KEY)) return;
      if (/onboarding|contrat|verifier/.test(window.location.pathname)) return;
      const space = window.location.pathname.startsWith("/dashboard/coach") ? "coach" : "client";
      // Jamais par-dessus la visite d'accueil.
      if (localStorage.getItem(`ep-tour-done-v1-${space}`) !== "1") return;
    } catch {
      return;
    }
    const tm = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(tm);
  }, []);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-label={t("Choisis ton ambiance")} className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div className="ep-modal-overlay absolute inset-0 bg-(--ep-shade)/60" onClick={close} />
      <div className="ep-modal-panel relative w-full sm:max-w-md bg-(--ep-s1) border border-(--ep-line)/40 rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <button type="button" onClick={close} aria-label={t("Fermer")} className="absolute top-4 right-4 text-(--ep-ink)/45">
          <X size={18} />
        </button>
        <p className="text-[11px] font-black uppercase tracking-widest text-(--ep-accent) mb-1">{t("Nouveau")}</p>
        <h2 className="text-xl font-black text-(--ep-strong) mb-1">{t("Choisis ton ambiance")}</h2>
        <p className="text-[13px] text-(--ep-ink)/60 mb-4">{t("L'appli existe maintenant en clair et en rose poudré. Touche celle qui te plaît, ça change tout de suite.")}</p>
        <AmbiancePicker compact />
        <button type="button" onClick={close} className="ep-btn-primary w-full mt-4" style={{ height: 48 }}>
          {t("C'est parfait")}
        </button>
      </div>
    </div>
  );
}
