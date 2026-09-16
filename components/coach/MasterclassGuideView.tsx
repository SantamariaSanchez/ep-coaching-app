"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock, ChevronDown, Target, AlertTriangle, Lightbulb } from "lucide-react";
import type { MasterclassGuide, MasterclassBlock } from "@/lib/masterclass-guides";
import { toggleMasterclassStep } from "@/app/dashboard/coach/masterclass/actions";

function Block({ block }: { block: MasterclassBlock }) {
  switch (block.type) {
    case "heading":
      return <p className="text-[12.5px] font-black text-white mt-3 mb-1.5">{block.text}</p>;
    case "paragraph":
      return <p className="text-[12.5px] text-[#F5EDED]/70 leading-relaxed mb-2.5">{block.text}</p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`mb-2.5 space-y-1.5 pl-0 ${block.ordered ? "list-decimal" : ""}`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] text-[#F5EDED]/70 leading-relaxed">
              {!block.ordered && <span className="text-[#E01E1E] flex-shrink-0">•</span>}
              {block.ordered && <span className="text-[#E01E1E] font-bold flex-shrink-0">{i + 1}.</span>}
              <span>{item}</span>
            </li>
          ))}
        </Tag>
      );
    }
    case "example":
      return (
        <div className="flex gap-2 bg-[#E01E1E]/8 border border-[#E01E1E]/20 rounded-lg px-3 py-2.5 mb-2.5">
          <Lightbulb size={13} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#F5EDED]/75 leading-relaxed italic">{block.text}</p>
        </div>
      );
    case "warning":
      return (
        <div className="flex gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 mb-2.5">
          <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-300/90 leading-relaxed">{block.text}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function MasterclassGuideView({
  guide,
  initialCompletedSteps,
}: {
  guide: MasterclassGuide;
  initialCompletedSteps: number[];
}) {
  const [completed, setCompleted] = useState<Set<number>>(new Set(initialCompletedSteps));
  const [openIndex, setOpenIndex] = useState<number>(() => {
    // Ouvre par défaut la première étape pas encore faite, pour reprendre
    // exactement où le coach s'était arrêté.
    const firstTodo = guide.steps.findIndex((_, i) => !initialCompletedSteps.includes(i));
    return firstTodo === -1 ? 0 : firstTodo;
  });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = guide.steps.length;
  const percent = useMemo(
    () => (total > 0 ? Math.round((completed.size / total) * 100) : 0),
    [completed, total]
  );

  function toggle(stepIndex: number) {
    const wasCompleted = completed.has(stepIndex);
    setError(null);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(stepIndex);
      else next.add(stepIndex);
      return next;
    });
    startTransition(async () => {
      const result = await toggleMasterclassStep(guide.slug, stepIndex, !wasCompleted);
      if (result.error) {
        setError(result.error);
        setCompleted((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.add(stepIndex);
          else next.delete(stepIndex);
          return next;
        });
      }
    });
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#F5EDED]/40">
            <Clock size={12} />
            {guide.estimatedMinutes} min
          </span>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
          {guide.title}
        </h1>
        <p className="mt-2 text-[13px] text-[#F5EDED]/50 leading-relaxed">{guide.summary}</p>

        <div className="flex gap-2 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-3.5 py-3 mt-4">
          <Target size={14} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Résultat à la fin
            </p>
            <p className="text-[12.5px] text-[#F5EDED]/75 leading-relaxed">{guide.finalOutcome}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
              {completed.size}/{total} étapes faites
            </p>
            <p className="text-[10px] font-bold text-[#F5EDED]/40">{percent}%</p>
          </div>
          <div className="h-1.5 bg-[#0f0000] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                background: percent === 100 ? "#4ade80" : "#E01E1E",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

      <div className="space-y-2.5">
        {guide.steps.map((step, index) => {
          const isDone = completed.has(index);
          const isOpen = openIndex === index;

          return (
            <div
              key={index}
              className="bg-[#1a0000] border border-[#890404]/25 rounded-xl overflow-hidden"
            >
              <div className="w-full flex items-start gap-3 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-label={isDone ? "Marquer non fait" : "Marquer fait"}
                  className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-md border flex items-center justify-center transition-colors ${
                    isDone ? "bg-[#4ade80] border-[#4ade80]" : "border-[#890404]/40 bg-transparent"
                  }`}
                >
                  {isDone && <Check size={14} className="text-[#0a1f0a]" strokeWidth={3} />}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex-1 min-w-0 flex items-start justify-between gap-3 text-left"
                >
                  <p
                    className={`text-[13.5px] font-bold leading-snug ${
                      isDone ? "text-[#F5EDED]/45 line-through" : "text-white"
                    }`}
                  >
                    <span className="text-[#E01E1E]/70 mr-1.5">{index + 1}.</span>
                    {step.title}
                  </p>
                  <ChevronDown
                    size={14}
                    className="text-[#F5EDED]/30 flex-shrink-0 mt-1"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-[#890404]/20 px-4 py-4 pl-[52px]">
                  {step.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}

                  {step.deliverables && step.deliverables.length > 0 && (
                    <div className="mt-3 bg-[#0f0000] border border-[#890404]/15 rounded-lg p-3">
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                        À avoir en main à la fin de cette étape
                      </p>
                      <ul className="space-y-1">
                        {step.deliverables.map((d, i) => (
                          <li key={i} className="flex gap-2 text-[11.5px] text-[#F5EDED]/60 leading-relaxed">
                            <Check size={12} className="text-[#4ade80] flex-shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className={`mt-3.5 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-colors ${
                      isDone
                        ? "border-[#890404]/25 text-[#F5EDED]/40 hover:text-white"
                        : "border-[#4ade80]/40 text-[#4ade80] hover:bg-[#4ade80]/10"
                    }`}
                  >
                    <Check size={12} />
                    {isDone ? "Marquer non fait" : "Marquer cette étape faite"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
