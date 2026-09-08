"use client";

import { useState, useTransition } from "react";
import { BellRing, ShieldCheck } from "lucide-react";
import { MUTABLE_CATEGORIES, CATEGORY_META, type NotificationCategory } from "@/lib/notification-preferences";
import { setNotificationCategoryMuted } from "@/app/actions/notification-preferences";

// Card séparée de PermissionsCard : celle-là gère l'autorisation OS (le
// canal existe ou non), celle-ci gère QUOI passer dans ce canal une fois
// ouvert — deux décisions différentes, jamais à mélanger dans un seul
// composant sous peine de rendre les deux illisibles.
export default function NotificationPreferencesCard({
  initialMuted,
}: {
  /** Catégories mutables actuellement coupées, ex. ["communaute"]. */
  initialMuted: NotificationCategory[];
}) {
  const [muted, setMuted] = useState<Set<NotificationCategory>>(new Set(initialMuted));
  const [isPending, startTransition] = useTransition();

  function toggle(category: NotificationCategory) {
    const wasMuted = muted.has(category);
    const next = new Set(muted);
    if (wasMuted) next.delete(category);
    else next.add(category);
    setMuted(next);
    startTransition(async () => {
      const result = await setNotificationCategoryMuted(category, !wasMuted);
      if (result.error) {
        // Retour arrière si le serveur refuse plutôt qu'un état optimiste
        // jamais confirmé (même principe que BusinessChecklist).
        setMuted((prev) => {
          const rollback = new Set(prev);
          if (wasMuted) rollback.add(category);
          else rollback.delete(category);
          return rollback;
        });
      }
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
        <BellRing size={12} /> Ce que tu reçois en notification
      </p>

      <div className="flex items-start gap-2.5 pb-3.5 mb-3.5 border-b border-[#890404]/10">
        <ShieldCheck size={14} className="text-[#F5EDED]/25 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">{CATEGORY_META.essentiel.label}</p>
          <p className="text-[11px] text-[#F5EDED]/35 mt-0.5 leading-relaxed">{CATEGORY_META.essentiel.description}</p>
        </div>
      </div>

      {MUTABLE_CATEGORIES.map((category) => {
        const meta = CATEGORY_META[category];
        const isMuted = muted.has(category);
        return (
          <div key={category} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{meta.label}</p>
              <p className="text-[11px] text-[#F5EDED]/35 mt-0.5 leading-relaxed">{meta.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!isMuted}
              aria-label={meta.label}
              onClick={() => toggle(category)}
              disabled={isPending}
              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50"
              style={{ background: isMuted ? "rgba(245,237,237,0.12)" : "#E01E1E" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: isMuted ? "translateX(2px)" : "translateX(22px)" }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
