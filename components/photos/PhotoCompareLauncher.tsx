"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Columns2 } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { type PhotoSet, daysBetween, durationLabel, formatSetDate } from "@/lib/photo-sets";
import type { ComparatorAudience } from "./PhotoComparator";

// Chargé seulement au premier tap : le comparateur (gestes, dessin,
// export canvas) ne pèse rien sur la page tant qu'on ne l'ouvre pas.
const PhotoComparator = dynamic(() => import("./PhotoComparator"), { ssr: false });

/**
 * Carte d'entrée du comparateur : aperçu première / dernière séance et un
 * seul gros bouton. Rien n'est affiché sous deux séances photo (rien à
 * comparer).
 */
export default function PhotoCompareLauncher({
  sets,
  audience,
  subjectName,
  className,
  variant = "card",
  initialAfterId,
}: {
  sets: PhotoSet[];
  audience: ComparatorAudience;
  subjectName?: string | null;
  className?: string;
  /** "button" : un seul bouton (étape Photos du check-in guidé). */
  variant?: "card" | "button";
  initialAfterId?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (sets.length < 2) return null;

  const comparator = open && (
    <PhotoComparator
      sets={sets}
      audience={audience}
      subjectName={subjectName}
      initialAfterId={initialAfterId}
      onClose={() => setOpen(false)}
    />
  );

  if (variant === "button") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full min-h-12 px-4 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[12px] font-black uppercase tracking-widest inline-flex items-center justify-center gap-2 ${className ?? ""}`}
        >
          <Columns2 size={16} />
          {t("Comparateur plein écran")}
          <ArrowRight size={15} />
        </button>
        {comparator}
      </>
    );
  }

  const first = sets[0];
  const last = sets[sets.length - 1];
  const gap = daysBetween(first.date, last.date);

  return (
    <section className={`rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) p-4 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-shrink-0" aria-hidden>
          {[first, last].map((s, i) => (
            <div key={s.id} className="relative w-[52px] h-[70px] rounded-lg overflow-hidden bg-(--ep-s2) border border-(--ep-line)/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.urls[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span
                className={`absolute bottom-0 inset-x-0 text-center text-[8px] font-black uppercase tracking-wider py-0.5 ${
                  i === 1 ? "bg-(--ep-accent) text-(--ep-strong)" : "bg-(--ep-page)/75 text-(--ep-ink)"
                }`}
              >
                {i === 0 ? t("Avant") : t("Après")}
              </span>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{t("Comparateur photo")}</p>
          <p className="text-[15px] font-black uppercase tracking-tight text-(--ep-strong) leading-tight">
            {gap > 0 ? `${durationLabel(gap)} ${t("de progression")}` : t("Avant / Après")}
          </p>
          <p className="text-[11px] text-(--ep-ink)/55 mt-0.5">
            {sets.length} {t("séances photo depuis le")} {formatSetDate(first.date, true)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full h-12 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[12px] font-black uppercase tracking-widest inline-flex items-center justify-center gap-2"
      >
        <Columns2 size={16} />
        {audience === "coach" ? t("Comparer ses photos") : t("Comparer mes photos")}
        <ArrowRight size={15} />
      </button>
      {comparator}
    </section>
  );
}
