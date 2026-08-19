"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { BUSINESS_CHECKLIST } from "@/lib/coach-business";
import { toggleBusinessChecklistItem } from "@/app/dashboard/coach/business/actions";

export default function BusinessChecklist({ initialDone }: { initialDone: string[] }) {
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
        Checklist de construction · {doneCount}/{BUSINESS_CHECKLIST.length}
      </p>
      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10.5px] font-bold text-[#E01E1E] uppercase tracking-widest mb-2">{cat}</p>
            <div className="space-y-1.5">
              {BUSINESS_CHECKLIST.filter((i) => i.category === cat).map((item) => {
                const isDone = done.has(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggle(item.key)}
                    disabled={isPending}
                    className="w-full flex items-start gap-3 text-left bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3 hover:border-[#890404]/40 transition-colors"
                  >
                    <span
                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                        isDone ? "bg-[#4ade80] border-[#4ade80]" : "border-[#890404]/40 bg-transparent"
                      }`}
                    >
                      {isDone && <Check size={12} className="text-[#0a1f0a]" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] font-bold ${isDone ? "text-[#F5EDED]/40 line-through" : "text-white"}`}>
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-[#F5EDED]/35 mt-0.5 leading-relaxed">{item.detail}</span>
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
