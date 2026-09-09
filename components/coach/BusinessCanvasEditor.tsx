"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { CANVAS_BLOCKS, type BusinessCanvas } from "@/lib/coach-business-canvas";
import { saveCanvasBlock } from "@/app/dashboard/coach/business/canvas-actions";

// Modèle économique (Business Model Canvas, 9 blocs classiques) — Axe 6,
// passe "masterclass" 2026-09-09. Chaque bloc s'enregistre indépendamment
// au blur (même pattern que la vision de la roadmap, RoadmapPlanner.tsx),
// jamais un unique gros formulaire à valider d'un coup.

function CanvasBlockField({
  label,
  prompt,
  value: initialValue,
  onSave,
}: {
  label: string;
  prompt: string;
  value: string;
  onSave: (value: string) => Promise<{ error?: string }>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    if (value === initialValue) return;
    startTransition(async () => {
      const res = await onSave(value);
      if (!res.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  return (
    <div className="ep-card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-white">{label}</p>
        {saved && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-green-400">
            <Save size={9} /> Enregistré
          </span>
        )}
      </div>
      <p className="text-[10.5px] text-[#F5EDED]/35 leading-relaxed mb-2">{prompt}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        rows={4}
        maxLength={20000}
        className="w-full flex-1 bg-[#150000] border border-[#890404]/25 rounded-lg px-3 py-2.5 text-[12.5px] text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50 resize-none leading-relaxed"
      />
    </div>
  );
}

export default function BusinessCanvasEditor({ canvas }: { canvas: BusinessCanvas | null }) {
  const filledCount = CANVAS_BLOCKS.filter((b) => canvas?.[b.key]?.trim()).length;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
        {filledCount}/{CANVAS_BLOCKS.length} blocs remplis
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {CANVAS_BLOCKS.map((block) => (
          <CanvasBlockField
            key={block.key}
            label={block.label}
            prompt={block.prompt}
            value={canvas?.[block.key] ?? ""}
            onSave={(value) => saveCanvasBlock(block.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
