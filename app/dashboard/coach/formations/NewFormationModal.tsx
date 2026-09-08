"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Remplace les prompt()/alert() natifs du navigateur (2026-09-08) : deux
// popups système gris cassaient l'identité visuelle de l'appli pour une
// action aussi simple que créer une formation, et alert() bloquait tout
// l'onglet pour afficher une erreur — jamais utilisé ailleurs dans l'appli,
// où chaque erreur reste inline dans son propre écran. Même pattern que
// ApplyTemplateModal (overlay + panneau, Escape pour fermer).
export default function NewFormationModal({
  onCreate,
  onClose,
}: {
  onCreate: (title: string, emoji: string) => Promise<{ error?: string; id?: string }>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    setError(null);
    setCreating(true);
    const res = await onCreate(title.trim(), emoji.trim() || "📚");
    setCreating(false);
    if (res.error) setError(res.error);
    // Succès : la redirection est gérée par l'appelant (router.push), pas
    // la peine de fermer la modale nous-mêmes, la page change sous elle.
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="ep-modal-panel relative w-full sm:max-w-sm bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl z-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#890404]/20">
          <p className="text-sm font-bold text-white">Nouvelle formation</p>
          <button onClick={onClose} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 flex gap-3">
          <div className="w-16 flex-shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Emoji
            </label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              aria-label="Emoji de la formation"
              className={`${inputCls} text-center text-lg`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Titre
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ex : Mobilité & prévention"
              aria-label="Titre de la formation"
              autoFocus
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-2 flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
            <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="px-5 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-[#F5EDED]/40 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="flex-1 py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            {creating ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}
