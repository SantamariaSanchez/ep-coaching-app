"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { AgentTask } from "@/utils/ai-agents";
import { markAssistantTaskDone } from "@/app/dashboard/coach/assistant/actions";

export default function AssistantTaskList({ initialTasks }: { initialTasks: AgentTask[] }) {
  const [tasks, setTasks] = useState(initialTasks.filter((t) => t.status !== "fait"));
  const [isPending, startTransition] = useTransition();

  function markDone(taskId: string) {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      const result = await markAssistantTaskDone(taskId);
      if (result.error) setTasks(backup);
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="text-[11.5px] text-[#F5EDED]/30 italic">
        Rien à signaler pour l&apos;instant, ton assistant garde un œil dessus chaque jour.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <button
            type="button"
            onClick={() => markDone(task.id)}
            disabled={isPending}
            title="Marquer comme fait"
            aria-label="Marquer comme fait"
            className="flex-shrink-0 w-5 h-5 mt-0.5 rounded border border-[#890404]/40 flex items-center justify-center hover:bg-[#4ade80] hover:border-[#4ade80] transition-colors group"
          >
            <Check size={12} className="text-transparent group-hover:text-[#0a1f0a]" strokeWidth={3} />
          </button>
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-white leading-snug">{task.title}</p>
            {task.description && (
              <p className="text-[11px] text-[#F5EDED]/40 mt-1 leading-relaxed">{task.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
