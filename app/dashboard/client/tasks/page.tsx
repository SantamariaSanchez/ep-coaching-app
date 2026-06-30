"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import type { ClientTask } from "@/utils/tasks";

export default function ClientTasksPage() {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const supabase = createClientSupabase();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      setTasks((data as ClientTask[]) ?? []);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComplete(taskId: string) {
    setCompleting(taskId);
    const completedAt = new Date().toISOString();
    await supabase
      .from("client_tasks")
      .update({ status: "done", completed_at: completedAt })
      .eq("id", taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "done", completed_at: completedAt } : t))
    );
    setCompleting(null);
  }

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 600, margin: "0 auto" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ep-skeleton" style={{ height: 64, borderRadius: 14, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)", margin: "0 0 4px" }}>
          Coach
        </p>
        <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.04em", color: "var(--color-ep-light)", margin: 0 }}>
          Mes tâches
        </h1>
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <ClipboardList size={32} style={{ color: "rgba(var(--color-ep-red-rgb),0.3)", margin: "0 auto 12px" }} strokeWidth={1.5} />
          <p style={{ color: "rgba(var(--color-ep-light-rgb),0.4)", fontSize: 13 }}>
            Aucune tâche en attente. 🎉
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {pending.map((task) => (
            <button
              key={task.id}
              onClick={() => handleComplete(task.id)}
              disabled={completing === task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                background: "linear-gradient(135deg,var(--color-ep-card) 0%,var(--color-ep-deep) 100%)",
                border: "1px solid rgba(var(--color-ep-red-rgb),0.25)",
                borderRadius: 14,
                padding: "14px 16px",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 20 }}>{task.icon}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--color-ep-light)" }}>
                {task.label}
              </span>
              {completing === task.id ? (
                <div
                  className="animate-spin"
                  style={{ width: 18, height: 18, border: "2px solid var(--color-ep-red)", borderTopColor: "transparent", borderRadius: "50%" }}
                />
              ) : (
                <Circle size={20} style={{ color: "rgba(var(--color-ep-red-rgb),0.4)" }} strokeWidth={2} />
              )}
            </button>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--color-ep-light-rgb),0.25)", margin: "0 0 12px" }}>
            Terminées
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {done.slice(0, 15).map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(74,222,128,0.15)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  opacity: 0.6,
                }}
              >
                <span style={{ fontSize: 16 }}>{task.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--color-ep-light)", textDecoration: "line-through" }}>
                  {task.label}
                </span>
                <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
