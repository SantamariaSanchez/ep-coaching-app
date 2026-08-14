"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Plus, Send, Trash2 } from "lucide-react";
import type { ClientTask } from "@/utils/tasks";

const TASK_SUGGESTIONS = [
  { icon: "💊", label: "Prends ta créatine" },
  { icon: "💊", label: "Prends tes compléments" },
  { icon: "💧", label: "Bois de l'eau" },
  { icon: "⚖️", label: "Pèse-toi" },
  { icon: "📸", label: "Envoie tes photos" },
  { icon: "🍽️", label: "Logge ton repas" },
];

const NAG_OPTIONS = [15, 30, 60, 120];

const MOTIVATION_SUGGESTIONS = [
  "💪 Allez, dernière ligne droite aujourd'hui !",
  "🔥 Continue comme ça, tu progresses bien !",
  "🚀 Une séance de plus, une version de toi en plus !",
  "👊 Pense à pourquoi tu as commencé.",
];

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "jamais";
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.round(hours / 24)}j`;
}

export default function CoachClientTasksView({
  clientId,
  initialTasks,
  createClientTask,
  deleteClientTask,
  sendMotivationMessage,
}: {
  clientId: string;
  initialTasks: ClientTask[];
  createClientTask: (
    clientId: string,
    label: string,
    icon: string,
    nagMinutes: number
  ) => Promise<{ error?: string }>;
  deleteClientTask: (clientId: string, taskId: string) => Promise<{ error?: string }>;
  sendMotivationMessage: (clientId: string, message: string) => Promise<{ error?: string }>;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialTasks change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("✅");
  const [nagMinutes, setNagMinutes] = useState(30);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [motivationText, setMotivationText] = useState("");
  const [sendingMotivation, setSendingMotivation] = useState(false);
  const [motivationResult, setMotivationResult] = useState<string | null>(null);

  async function handleCreate() {
    if (!label.trim()) return;
    setCreating(true);
    setCreateError(null);
    const result = await createClientTask(clientId, label.trim(), icon, nagMinutes);
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    setTasks((prev) => [
      {
        id: `optimistic-${Date.now()}`,
        client_id: clientId,
        created_by: null,
        label: label.trim(),
        icon,
        status: "pending",
        nag_minutes: nagMinutes,
        last_notified_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setLabel("");
    setIcon("✅");
    setNagMinutes(30);
  }

  async function handleDelete(taskId: string) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    const backup = tasks[idx];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const result = await deleteClientTask(clientId, taskId);
    // MASTERCLASS.md Axe B : suppression optimiste jamais annulée en cas
    // d'échec serveur — la tâche restait invisible jusqu'au prochain
    // chargement complet même si elle n'avait pas vraiment été supprimée.
    if (result.error && backup) {
      setTasks((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, backup);
        return next;
      });
    }
  }

  async function handleSendMotivation(text: string) {
    if (!text.trim()) return;
    setSendingMotivation(true);
    setMotivationResult(null);
    const result = await sendMotivationMessage(clientId, text.trim());
    setSendingMotivation(false);
    setMotivationResult(result.error ?? "Message envoyé !");
    if (!result.error) setMotivationText("");
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* ── Create task ── */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Nouveau rappel
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {TASK_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setLabel(s.label);
                setIcon(s.icon);
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#890404]/25 text-[#F5EDED]/60 hover:border-[#E01E1E]/50 hover:text-white transition-colors"
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label="Icône"
            className={inputCls + " w-14 text-center"}
            maxLength={2}
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Prends ta créatine" aria-label="Ex. Prends ta créatine"
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              Relance toutes les
            </span>
            <select
              value={nagMinutes}
              onChange={(e) => setNagMinutes(parseInt(e.target.value))}
              aria-label="Relance toutes les"
              className={inputCls + " w-auto py-1.5"}
            >
              {NAG_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60}h`}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={!label.trim() || creating}
            className="inline-flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
          >
            <Plus size={13} />
            {creating ? "Envoi…" : "Envoyer"}
          </button>
        </div>
        {createError && <p className="text-xs text-red-400 mt-2">{createError}</p>}
      </div>

      {/* ── Pending tasks ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          En attente ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p className="text-xs text-[#F5EDED]/30 italic">Aucun rappel en attente.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.label}</p>
                    <p className="text-[10px] text-[#F5EDED]/35 flex items-center gap-1">
                      <Bell size={9} /> relance / {t.nag_minutes} min · dernière {timeAgo(t.last_notified_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-[#F5EDED]/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Done tasks ── */}
      {done.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Terminés ({done.length})
          </p>
          <div className="space-y-2">
            {done.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-[#1f0101]/50 border border-green-500/15 rounded-xl px-4 py-2.5 opacity-70"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={15} className="text-green-400" />
                  <p className="text-sm text-white/70">{t.label}</p>
                </div>
                <span className="text-[10px] text-[#F5EDED]/30 flex items-center gap-1">
                  <Clock size={9} /> {timeAgo(t.completed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Motivation message ── */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Message de motivation
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {MOTIVATION_SUGGESTIONS.map((m) => (
            <button
              key={m}
              onClick={() => handleSendMotivation(m)}
              disabled={sendingMotivation}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#890404]/25 text-[#F5EDED]/60 hover:border-[#E01E1E]/50 hover:text-white transition-colors disabled:opacity-40"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={motivationText}
            onChange={(e) => setMotivationText(e.target.value)}
            placeholder="Écris ton propre message…" aria-label="Écris ton propre message…"
            className={inputCls}
          />
          <button
            onClick={() => handleSendMotivation(motivationText)}
            disabled={!motivationText.trim() || sendingMotivation}
            className="inline-flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
        {motivationResult && (
          <p className="text-xs mt-2 text-[#F5EDED]/50">{motivationResult}</p>
        )}
      </div>
    </div>
  );
}
