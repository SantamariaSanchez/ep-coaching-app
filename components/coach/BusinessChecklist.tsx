"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { BUSINESS_CHECKLIST } from "@/lib/coach-business";
import { toggleBusinessChecklistItem } from "@/app/dashboard/coach/business/actions";

export default function BusinessChecklist({ initialDone }: { initialDone: string[] }) {
  const t = useT();
  const [done, setDone] = useState<Set<string>>(new Set(initialDone));
  const [isPending, startTransition] = useTransition();

  function toggle(key: string) {
    const wasDone = done.has(key);
    const next = new Set(done);
    if (wasDone) next.delete(key);
    else next.add(key);
    setDone(next);
    startTransition(async () => {
      // Axe B (MASTERCLASS.md) : résultat vérifié, retour en arrière si le
      // serveur refuse plutôt qu'un état optimiste jamais confirmé.
      const result = await toggleBusinessChecklistItem(key, !wasDone);
      if (result.error) {
        setDone((prev) => {
          const rollback = new Set(prev);
          if (wasDone) rollback.add(key);
          else rollback.delete(key);
          return rollback;
        });
      }
    });
  }

  const categories = Array.from(new Set(BUSINESS_CHECKLIST.map((i) => i.category)));
  const doneCount = BUSINESS_CHECKLIST.filter((i) => done.has(i.key)).length;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">
        {t("Checklist de construction ·")}{" "}{doneCount}/{BUSINESS_CHECKLIST.length}
      </p>
      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10.5px] font-bold text-(--ep-accent) uppercase tracking-widest mb-2">{cat}</p>
            <div className="space-y-1.5">
              {BUSINESS_CHECKLIST.filter((i) => i.category === cat).map((item) => {
                const isDone = done.has(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggle(item.key)}
                    disabled={isPending}
                    className="w-full flex items-start gap-3 text-left bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-4 py-3 hover:border-(--ep-line)/40 transition-colors"
                  >
                    <span
                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                        isDone ? "bg-(--ep-ok) border-(--ep-ok)" : "border-(--ep-line)/40 bg-transparent"
                      }`}
                    >
                      {isDone && <Check size={12} className="text-(--ep-okbg)" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] font-bold ${isDone ? "text-(--ep-ink)/40 line-through" : "text-(--ep-strong)"}`}>
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-(--ep-ink)/35 mt-0.5 leading-relaxed">{item.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
