"use client";

import { useState, useEffect } from "react";
import { Send, MessageCircle, CheckCircle2, Lightbulb, Trash2 } from "lucide-react";
import type { ResourceRequest } from "@/utils/resource-requests";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

export default function ResourceRequests({
  initialRequests,
  isCoach,
  createRequest,
  respondToRequest,
  deleteRequest,
}: {
  initialRequests: ResourceRequest[];
  isCoach: boolean;
  createRequest: (title: string, content: string) => Promise<{ error?: string; id?: string }>;
  respondToRequest: (id: string, response: string) => Promise<{ error?: string }>;
  deleteRequest: (id: string) => Promise<{ error?: string }>;
}) {
  const [requests, setRequests] = useState(initialRequests);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialRequests change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [savingResponse, setSavingResponse] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !content.trim() || posting) return;
    setPosting(true);
    setError(null);
    const res = await createRequest(title, content);
    setPosting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setRequests((prev) => [
        {
          id: res.id!,
          author_id: "",
          author_name: "Toi",
          title: title.trim(),
          content: content.trim(),
          status: "open",
          coach_response: null,
          created_at: new Date().toISOString(),
          answered_at: null,
        },
        ...prev,
      ]);
      setTitle("");
      setContent("");
    }
  }

  async function handleRespond(id: string) {
    if (!responseText.trim()) return;
    setSavingResponse(true);
    const res = await respondToRequest(id, responseText);
    setSavingResponse(false);
    if (!res.error) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "answered", coach_response: responseText.trim() } : r
        )
      );
      setRespondingId(null);
      setResponseText("");
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteRequest(id);
    if (!res.error) setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={15} className="text-[#E01E1E]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
          Demandes de guides
        </p>
      </div>

      {!isCoach && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sujet du guide souhaité (ex. Comment gérer une stagnation)"
            className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40 mb-2"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Détaille ta demande..."
            rows={2}
            className="w-full bg-transparent text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none resize-none mb-2"
          />
          <div className="flex items-center justify-end pt-2 border-t border-[#890404]/15">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || posting}
              className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              {posting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={13} strokeWidth={2} />
              )}
              Envoyer
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400 font-semibold mt-2">⚠ {error}</p>}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 text-center">
          <MessageCircle size={22} className="text-[#F5EDED]/15 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune demande pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{r.title}</p>
                  <p className="text-[10px] text-[#F5EDED]/30">
                    {r.author_name} · {timeAgo(r.created_at)}
                  </p>
                </div>
                {r.status === "answered" ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">
                    <CheckCircle2 size={10} /> Répondu
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    En attente
                  </span>
                )}
              </div>
              <p className="text-xs text-[#F5EDED]/65 mt-2 whitespace-pre-wrap">{r.content}</p>

              {r.coach_response && (
                <div className="mt-3 pt-3 border-t border-[#890404]/15">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1">
                    Réponse du coach
                  </p>
                  <p className="text-xs text-[#F5EDED]/70 whitespace-pre-wrap">{r.coach_response}</p>
                </div>
              )}

              {isCoach && r.status === "open" && (
                <div className="mt-3 pt-3 border-t border-[#890404]/15">
                  {respondingId === r.id ? (
                    <div>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Ta réponse..."
                        rows={2}
                        className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40 mb-2 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(r.id)}
                          disabled={!responseText.trim() || savingResponse}
                          className="text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
                        >
                          Répondre
                        </button>
                        <button
                          onClick={() => setRespondingId(null)}
                          className="text-[10px] font-bold text-[#F5EDED]/40"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingId(r.id)}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E]"
                    >
                      Répondre à cette demande
                    </button>
                  )}
                </div>
              )}

              {isCoach && (
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex items-center gap-1 text-[10px] text-[#F5EDED]/25 hover:text-red-400 transition-colors mt-2"
                >
                  <Trash2 size={10} /> Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
