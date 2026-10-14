"use client";

import { Palette } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import AmbiancePicker from "./AmbiancePicker";

export default function AmbianceCard() {
  const t = useT();
  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-1">
        <Palette size={12} /> {t("Apparence")}
      </p>
      <p className="text-[12px] text-(--ep-ink)/50 mb-3">{t("Fond sombre ou clair, et la couleur que tu préfères. Ça s'applique tout de suite, sur tous tes appareils.")}</p>
      <AmbiancePicker />
    </div>
  );
}
