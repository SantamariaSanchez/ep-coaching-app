"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Eye, CheckCircle2 } from "lucide-react";
import type { CoachPost } from "@/utils/coach-posts";

const inputCls =
  "w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2 text-sm text-(--ep-strong) placeholder:text-(--ep-ink)/25 focus:outline-none focus:border-(--ep-accent)/60 transition-colors";

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
  // MASTERCLASS.md Axe B : Promise<void> empêchait d'afficher une erreur
  // serveur ici malgré l'état `error` déjà présent dans cet éditeur.
  onSave: (title: string, content: string) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const t = useT();
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
    const result = await onSave(title.trim(), content.trim());
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-(--ep-s2) border border-(--ep-line)/30 rounded-xl p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("Titre, ex. Pourquoi la constance bat l'intensité")} aria-label={t("Titre, ex. Pourquoi la constance bat l'intensité")}
        className={`${inputCls} font-bold`}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder={t("Ta réflexion, ton conseil, ton retour d'expérience…")} aria-label={t("Ta réflexion, ton conseil, ton retour d'expérience…")}
        className={`${inputCls} resize-none`}
      />
      {error && <p className="text-xs text-red-400">{t(error)}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-50 text-(--ep-strong) rounded-lg transition-colors"
        >
          {saving ? t("Publication…") : initial ? t("Mettre à jour") : t("Publier")}
        </button>
        <button
          onClick={onCancel}
          aria-label={t("Annuler")}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-(--ep-line)/40 text-(--ep-ink)/50 hover:text-(--ep-ink)/80 rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function CoachPostsManager({
  posts,
  viewCounts,
  totalMembers,
  createCoachPost,
  updateCoachPost,
  deleteCoachPost,
}: {
  posts: CoachPost[];
  viewCounts: Record<string, number>;
  totalMembers: number;
  createCoachPost: (title: string, content: string) => Promise<{ error?: string; id?: string; notifiedCount?: number }>;
  updateCoachPost: (postId: string, title: string, content: string) => Promise<{ error?: string }>;
  deleteCoachPost: (postId: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35">
          {posts.length}{" "}{t("publication")}{posts.length !== 1 ? "s" : ""}
        </p>
        {!showNew && (
          <button
            onClick={() => { setShowNew(true); setEditingId(null); setJustPublished(null); }}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-hi) transition-colors"
          >
            <Plus size={12} />{" "}{t("Nouveau post")}
          </button>
        )}
      </div>

      {justPublished != null && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
          <CheckCircle2 size={13} strokeWidth={2} />
          {t("Publié !")}{" "}{justPublished}{" "}{t("membre")}{justPublished !== 1 ? "s" : ""}{" "}{t("notifié")}{justPublished !== 1 ? "s" : ""}.
        </p>
      )}

      {showNew && (
        <PostEditor
          onSave={async (title, content) => {
            const res = await createCoachPost(title, content);
            if (!res.error) {
              setShowNew(false);
              setJustPublished(res.notifiedCount ?? 0);
            }
            return res;
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {posts.length === 0 && !showNew && (
        <p className="text-xs text-(--ep-ink)/25 italic text-center py-8">
          {t("Aucune publication pour l'instant. Partage une réflexion ou un conseil avec tes membres.")}
        </p>
      )}

      <div className="space-y-2.5">
        {posts.map((post) =>
          editingId === post.id ? (
            <PostEditor
              key={post.id}
              initial={post}
              onSave={async (title, content) => {
                const result = await updateCoachPost(post.id, title, content);
                if (!result.error) setEditingId(null);
                return result;
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={post.id} className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-sm font-bold text-(--ep-strong)">{post.title}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(post.id); setShowNew(false); }}
                    aria-label={`Modifier le post ${post.title}`}
                    className="text-(--ep-ink)/25 hover:text-(--ep-ink)/60 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  {confirmDeleteId === post.id ? (
                    <button
                      onClick={() => deleteCoachPost(post.id)}
                      className="text-[10px] font-bold uppercase tracking-widest text-red-400"
                    >
                      {t("Confirmer")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      aria-label={`Supprimer le post ${post.title}`}
                      className="text-(--ep-ink)/25 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="flex items-center gap-2 text-[10px] text-(--ep-ink)/30 mb-2">
                {formatDate(post.created_at)}
                <span className="inline-flex items-center gap-1 text-(--ep-ink)/25">
                  <Eye size={10} />{" "}{t("Lu par")}{" "}{viewCounts[post.id] ?? 0}/{totalMembers}
                </span>
              </p>
              <p className="text-sm text-(--ep-ink)/60 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
