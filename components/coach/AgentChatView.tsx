"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Trash2, Plus, Check, Circle, CircleDot, X } from "lucide-react";
import type { AIAgent } from "@/lib/ai-agents";
import type { AgentMessage, AgentTask } from "@/utils/ai-agents";
import {
  sendAgentMessage,
  clearAgentConversation,
  createAgentTask,
  updateAgentTaskStatus,
  deleteAgentTask,
  type AgentTaskStatus,
} from "@/app/dashboard/coach/admin/organisation/agents/actions";
import { withAlpha } from "@/lib/theme-color";

const TASK_STATUS_META: Record<AgentTaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  a_faire: { label: "À faire", color: "rgba(var(--ep-ink-rgb),0.4)", icon: Circle },
  en_cours: { label: "En cours", color: "var(--ep-warn)", icon: CircleDot },
  fait: { label: "Fait", color: "var(--ep-ok)", icon: Check },
};
const TASK_STATUS_ORDER: AgentTaskStatus[] = ["a_faire", "en_cours", "fait"];

function TaskRow({
  task,
  onChangeStatus,
  onDelete,
}: {
  task: AgentTask;
  onChangeStatus: (status: AgentTaskStatus) => void;
  onDelete: () => void;
}) {
  const tr = useT();
  return (
    <div className="bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-[12.5px] font-bold ${task.status === "fait" ? "text-(--ep-ink)/35 line-through" : "text-(--ep-strong)"}`}>
          {task.title}
        </p>
        <button onClick={onDelete} aria-label={tr("Supprimer la tâche")} className="flex-shrink-0 text-(--ep-ink)/25 hover:text-red-400 transition-colors">
          <X size={13} />
        </button>
      </div>
      {task.description && (
        <p className="text-[11px] text-(--ep-ink)/40 leading-relaxed mb-2">{task.description}</p>
      )}
      <div className="flex gap-1">
        {TASK_STATUS_ORDER.map((s) => {
          const m = TASK_STATUS_META[s];
          const active = task.status === s;
          return (
            <button
              key={s}
              onClick={() => onChangeStatus(s)}
              className="flex-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-md border transition-colors"
              style={
                active
                  ? { background: `${withAlpha(m.color, "1f")}`, borderColor: `${withAlpha(m.color, "70")}`, color: m.color }
                  : { background: "transparent", borderColor: "rgba(var(--ep-line-rgb),0.2)", color: "rgba(var(--ep-ink-rgb),0.3)" }
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AgentChatView({
  agent,
  initialMessages,
  initialTasks,
}: {
  agent: AIAgent;
  initialMessages: AgentMessage[];
  initialTasks: AgentTask[];
}) {
  const tr = useT();
  const [messages, setMessages] = useState(initialMessages);
  const [tasks, setTasks] = useState(initialTasks);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPending, startTaskTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    const optimisticUser: AgentMessage = {
      id: `tmp-${Date.now()}`,
      agent_key: agent.key,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    startTransition(async () => {
      const result = await sendAgentMessage(agent.key, text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `tmp-${Date.now()}-a`,
            agent_key: agent.key,
            role: "assistant",
            content: result.reply!,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    });
  }

  function handleClear() {
    setMessages([]);
    clearAgentConversation(agent.key);
  }

  function handleCreateTask() {
    if (!taskTitle.trim()) return;
    startTaskTransition(async () => {
      const result = await createAgentTask(agent.key, taskTitle, taskDesc);
      if (result.error || !result.id) {
        setError(result.error ?? "Erreur lors de la création.");
        return;
      }
      setTasks((prev) => [
        { id: result.id!, agent_key: agent.key, title: taskTitle.trim(), description: taskDesc.trim() || null, status: "a_faire", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setTaskTitle("");
      setTaskDesc("");
      setShowTaskForm(false);
    });
  }

  async function handleTaskStatus(taskId: string, status: AgentTaskStatus) {
    const backup = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const result = await updateAgentTaskStatus(taskId, agent.key, status);
    if (result.error) setTasks(backup);
  }

  async function handleTaskDelete(taskId: string) {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const result = await deleteAgentTask(taskId, agent.key);
    if (result.error) setTasks(backup);
  }

  return (
    <div>
      {/* ── Fiche agent ── */}
      <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-accent)/70 mb-1">{agent.roleTitle}</p>
        <p className="text-[13px] text-(--ep-ink)/60 leading-relaxed mb-3">{agent.mission}</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-[9.5px] text-(--ep-ink)/40 border border-(--ep-line)/25 rounded-full px-2 py-0.5">
              {s.length > 42 ? s.slice(0, 42) + "…" : s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Tâches ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {tr("Tâches assignées")}{" "}{tasks.length > 0 && `(${tasks.length})`}
          </p>
          <button
            onClick={() => setShowTaskForm((v) => !v)}
            aria-expanded={showTaskForm}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-(--ep-accent)"
          >
            <Plus size={12} />{" "}{tr("Assigner")}
          </button>
        </div>

        {showTaskForm && (
          <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-lg p-3 mb-2.5 space-y-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={tr("Titre de la tâche")} aria-label={tr("Titre de la tâche")}
              className="w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2 text-[13px] text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none focus:border-(--ep-accent)/60"
            />
            <textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder={tr("Détails (optionnel)")} aria-label={tr("Détails (optionnel)")}
              rows={2}
              className="w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2 text-[12px] text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none focus:border-(--ep-accent)/60 resize-none"
            />
            <button
              onClick={handleCreateTask}
              disabled={taskPending}
              className="ep-btn-primary disabled:opacity-50"
              style={{ height: 38, borderRadius: "var(--radius-sm)" }}
            >
              {taskPending ? tr("Création…") : tr("Créer la tâche")}
            </button>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onChangeStatus={(s) => handleTaskStatus(t.id, s)}
                onDelete={() => handleTaskDelete(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Discussion ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">{tr("Discussion")}</p>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-(--ep-ink)/30 hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} />{" "}{tr("Effacer")}
            </button>
          )}
        </div>

        <div className="bg-(--ep-s2) border border-(--ep-line)/20 rounded-xl p-3 mb-3 flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-[12px] text-(--ep-ink)/30 italic py-4 text-center">
              {tr("Écris à")}{" "}{agent.name}{" "}{tr("pour commencer, par exemple : « ")}{agent.exampleTasks[0]}&nbsp;&raquo;
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "self-end bg-(--ep-accent)/15 text-(--ep-strong)" : "self-start bg-(--ep-s1) text-(--ep-ink)/75"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
          {isPending && (
            <div className="self-start bg-(--ep-s1) text-(--ep-ink)/40 rounded-xl px-3 py-2 text-[12px]">
              {agent.name}{" "}{tr("réfléchit…")}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="text-[11px] text-red-400 mb-2">{tr(error)}</p>}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Écris à ${agent.name}…`}
            aria-label={`Message à ${agent.name}`}
            rows={2}
            className="flex-1 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none focus:border-(--ep-accent)/60 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            className="ep-btn-primary disabled:opacity-50 flex-shrink-0"
            style={{ height: 44, width: 44, borderRadius: "var(--radius-sm)", padding: 0 }}
            aria-label={tr("Envoyer")}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
