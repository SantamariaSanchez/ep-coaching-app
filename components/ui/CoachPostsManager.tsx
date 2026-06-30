"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { CoachPost } from "@/utils/coach-posts";

const inputCls =
  "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(dateStr)
  );
}

function PostEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CoachPost;
  onSave: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Titre et contenu requis.");
      return;
    }
    setSaving(true);
    setError(null);
    await onSave(title.trim(), content.trim());
    setSaving(false);
  }

  return (
    <div className="bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-xl p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre — ex. Pourquoi la constance bat l'intensité"
        className={`${inputCls} font-bold`}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder="Ta réflexion, ton conseil, ton retour d'expérience…"
        className={`${inputCls} resize-none`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Publication…" : initial ? "Mettre à jour" : "Publier"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[var(--color-ep-dark-red)]/40 text-[var(--color-ep-light)]/50 hover:text-[var(--color-ep-light)]/80 rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function CoachPostsManager({
  posts,
  createCoachPost,
  updateCoachPost,
  deleteCoachPost,
}: {
  posts: CoachPost[];
  createCoachPost: (title: string, content: string) => Promise<{ error?: string; id?: string }>;
  updateCoachPost: (postId: string, title: string, content: string) => Promise<{ error?: string }>;
  deleteCoachPost: (postId: string) => Promise<{ error?: string }>;
}) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35">
          {posts.length} publication{posts.length !== 1 ? "s" : ""}
        </p>
        {!showNew && (
          <button
            onClick={() => { setShowNew(true); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-red)] hover:text-[#ff4444] transition-colors"
          >
            <Plus size={12} /> Nouveau post
          </button>
        )}
      </div>

      {showNew && (
        <PostEditor
          onSave={async (title, content) => {
            await createCoachPost(title, content);
            setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {posts.length === 0 && !showNew && (
        <p className="text-xs text-[var(--color-ep-light)]/25 italic text-center py-8">
          Aucune publication pour l&apos;instant — partage une réflexion ou un conseil avec tes membres.
        </p>
      )}

      <div className="space-y-2.5">
        {posts.map((post) =>
          editingId === post.id ? (
            <PostEditor
              key={post.id}
              initial={post}
              onSave={async (title, content) => {
                await updateCoachPost(post.id, title, content);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={post.id} className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-sm font-bold text-white">{post.title}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(post.id); setShowNew(false); }}
                    className="text-[var(--color-ep-light)]/25 hover:text-[var(--color-ep-light)]/60 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  {confirmDeleteId === post.id ? (
                    <button
                      onClick={() => deleteCoachPost(post.id)}
                      className="text-[10px] font-bold uppercase tracking-widest text-red-400"
                    >
                      Confirmer
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      className="text-[var(--color-ep-light)]/25 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-ep-light)]/30 mb-2">{formatDate(post.created_at)}</p>
              <p className="text-sm text-[var(--color-ep-light)]/60 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
