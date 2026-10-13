"use client";

import { useState } from "react";
import { Info, Link2 } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { Exercise } from "@/utils/programs";
import { formatPrescription, supersetLabels, supersetSize, techniqueHint, techniqueLabel } from "@/lib/program-sheet";

// Lecture d'une séance programmée, la même côté client (Mon programme) et
// côté coach (fiche client) : les supersets sont regroupés dans un même
// cadre, la cible s'affiche dans la bonne unité (reps, secondes, mètres) et
// chaque technique s'explique en un tap.

const COLORS = ["#E01E1E", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6"];

type Block = { label: string | null; color: string | null; items: { ex: Exercise; tag: string | null }[] };

function toBlocks(exercises: Exercise[]): Block[] {
  const groups = exercises.map((e) => e.superset_group ?? null);
  const labels = supersetLabels(groups);
  const blocks: Block[] = [];
  let colorIdx = 0;
  exercises.forEach((ex, i) => {
    const tag = labels[i];
    const continuesBlock = tag != null && i > 0 && groups[i - 1] === groups[i];
    if (continuesBlock && blocks.length) {
      blocks[blocks.length - 1].items.push({ ex, tag });
      return;
    }
    if (tag) {
      const size = supersetSize(groups, i);
      blocks.push({
        label: size >= 3 ? "Circuit" : "Superset",
        color: COLORS[colorIdx++ % COLORS.length],
        items: [{ ex, tag }],
      });
      return;
    }
    blocks.push({ label: null, color: null, items: [{ ex, tag: null }] });
  });
  return blocks;
}

export default function ProgramExerciseList({ exercises, dayNotes }: { exercises: Exercise[]; dayNotes?: string | null }) {
  const t = useT();
  const [hintFor, setHintFor] = useState<string | null>(null);
  const blocks = toBlocks(exercises);

  return (
    <div className="flex flex-col gap-2">
      {dayNotes && (
        <p className="text-[11.5px] leading-relaxed text-[#F5EDED]/70 bg-[#E01E1E]/[0.07] border border-[#E01E1E]/20 rounded-lg px-3 py-2">
          {dayNotes}
        </p>
      )}
      {blocks.map((b, bi) => (
        <div
          key={bi}
          className={b.label ? "rounded-xl border p-1.5 pt-1" : ""}
          style={b.color ? { borderColor: `${b.color}55`, background: `${b.color}0d` } : undefined}
        >
          {b.label && (
            <p className="flex items-center gap-1 px-1.5 py-1 text-[9.5px] font-black uppercase tracking-widest" style={{ color: b.color ?? undefined }}>
              <Link2 size={11} /> {t(b.label)} · {t("enchaîne sans repos, repos après le dernier")}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {b.items.map(({ ex, tag }) => {
              const tech = techniqueLabel(ex.technique);
              const prescription = formatPrescription({
                sets: ex.sets,
                reps: ex.reps,
                reps_unit: ex.reps_unit,
                rir: ex.rir,
                // Dans un superset, le repos ne s'affiche que sur le dernier.
                rest_seconds: ex.rest_seconds,
                tempo: ex.tempo,
              });
              return (
                <div key={ex.id} className="bg-black/35 border border-[#890404]/20 rounded-xl px-3.5 py-2.5">
                  <p className="text-[13px] font-bold text-[#F5EDED] leading-snug flex items-center gap-1.5">
                    {tag && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${b.color}26`, color: b.color ?? undefined }}>
                        {tag}
                      </span>
                    )}
                    <span className="min-w-0">{ex.name}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-[11px] text-[#F5EDED]/55 font-semibold">{prescription || t("à définir avec ton coach")}</span>
                    {tech && (
                      <button
                        type="button"
                        onClick={() => setHintFor(hintFor === ex.id ? null : ex.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300"
                        aria-expanded={hintFor === ex.id}
                      >
                        {tech} <Info size={10} />
                      </button>
                    )}
                  </div>
                  {tech && hintFor === ex.id && (
                    <p className="mt-1.5 text-[11px] text-amber-100/80 leading-relaxed">{t(techniqueHint(ex.technique) ?? "")}</p>
                  )}
                  {ex.notes && <p className="text-[11px] text-[#F5EDED]/40 mt-1.5 italic leading-snug">{ex.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
