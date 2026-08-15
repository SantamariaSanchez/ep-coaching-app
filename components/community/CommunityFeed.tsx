"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Image as ImageIcon,
  Send,
  MessageCircle,
  CheckCircle2,
  Trophy,
  HelpCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { CommunityComment, CommunityPost, CommunityPostType } from "@/utils/community";
import RankBadge from "@/components/ui/RankBadge";
import { POINTS } from "@/lib/gamification-types";
import { createIdeaFromQuestion } from "@/app/dashboard/coach/studio/actions";

function badgeLabel(role: "coach" | "client", subscriptionStatus: string): string {
  if (role === "coach") return "Coach";
  if (subscriptionStatus === "active") return "Premium";
  return "Membre gratuit";
}

function AuthorAvatarLink({
  basePath,
  authorId,
  authorName,
  authorAvatarUrl,
  size,
}: {
  basePath: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  size: number;
}) {
  return (
    <Link href={`${basePath}/profile/${authorId}`} className="flex-shrink-0" style={{ width: size, height: size }}>
      {authorAvatarUrl ? (
        <Image
          src={authorAvatarUrl}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center font-black text-white"
          style={{ width: size, height: size, fontSize: size * 0.32 }}
        >
          {initials(authorName)}
        </div>
      )}
    </Link>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(iso)
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Composer ────────────────────────────────────────────────────────────────

function Composer({
  type,
  initialContent,
  isCoach,
  basePath,
  onPosted,
}: {
  type: CommunityPostType;
  initialContent?: string;
  isCoach: boolean;
  basePath: string;
  onPosted: () => void;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [image, setImage] = useState<File | null>(null);
  // Item 44 : opt-in explicite, jamais coché par défaut — une victoire
  // reste privée à la communauté tant que l'auteur ne choisit pas
  // activement de la rendre publique.
  const [makePublic, setMakePublic] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPosted, setJustPosted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder =
    type === "victory"
      ? "Partage ta victoire de la semaine : perte de poids, nouveau record, séance réussie..."
      : "Pose ta question à la communauté et au coach...";

  const pointsEarned = type === "victory" ? POINTS.community_victory : POINTS.community_question;

  async function handleSubmit() {
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("content", content.trim());
      if (image) formData.append("image", image);
      if (type === "victory" && makePublic) formData.append("is_public", "1");

      const res = await fetch("/api/community/posts", { method: "POST", body: formData });
      if (res.ok) {
        setContent("");
        setImage(null);
        setMakePublic(false);
        setJustPosted(true);
        setTimeout(() => setJustPosted(false), 4000);
        onPosted();
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "La publication a échoué. Réessaie.");
      }
    } catch {
      setError("La publication a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={3}
        className="w-full bg-transparent text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none resize-none"
      />
      {image && (
        <p className="text-[10px] text-[#F5EDED]/40 mb-2 truncate">📎 {image.name}</p>
      )}
      {type === "victory" && (
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={makePublic}
            onChange={(e) => setMakePublic(e.target.checked)}
            className="accent-[#E01E1E]"
          />
          <span className="text-[10.5px] text-[#F5EDED]/35 leading-relaxed">
            Autoriser à afficher sur le mur public du site (prénom uniquement, sans nom de famille)
          </span>
        </label>
      )}
      {type === "question" && !isCoach && (
        <p className="text-[10px] text-[#F5EDED]/30 mb-2 leading-relaxed">
          Visible par le coach et toute la communauté, quelqu&apos;un d&apos;autre a probablement la même
          question. Pour quelque chose de plus personnel,{" "}
          <Link href={`${basePath}/messages`} className="text-[#F5EDED]/50 hover:text-[#F5EDED]/80 underline underline-offset-2">
            écris plutôt en privé
          </Link>
          .
        </p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-[#890404]/15">
        {type === "victory" ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Ajouter une image"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
            >
              <ImageIcon size={14} strokeWidth={1.8} />
              Photo
            </button>
          </>
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">
            +{pointsEarned} points à la publication
          </span>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
          className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
        >
          {posting ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={13} strokeWidth={2} />
          )}
          Publier
        </button>
      </div>
      {type === "victory" && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mt-2">
          +{pointsEarned} points à la publication
        </p>
      )}
      {error && (
        <p className="animate-slide-up text-[11px] text-red-400 font-semibold mt-2">⚠ {error}</p>
      )}
      {justPosted && (
        <p className="animate-slide-up text-[11px] font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
          <CheckCircle2 size={13} strokeWidth={2} />
          Publié ! +{pointsEarned} points, visible par la communauté et ton coach.
        </p>
      )}
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsThread({
  postId,
  basePath,
  comments,
  loading,
  onAdded,
  onAutoAnswered,
}: {
  postId: string;
  basePath: string;
  comments: CommunityComment[] | undefined;
  loading: boolean;
  onAdded: (comment: CommunityComment) => void;
  onAutoAnswered?: () => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.autoAnswered) onAutoAnswered?.();
        onAdded({
          id: data.id,
          post_id: postId,
          author_id: "",
          author_name: "Toi",
          author_role: "client",
          author_subscription_status: "free",
          author_avatar_url: null,
          author_points: null,
          content: content.trim(),
          created_at: new Date().toISOString(),
        });
        setContent("");
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "L'envoi a échoué. Réessaie.");
      }
    } catch {
      setError("L'envoi a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {loading && (
        <p className="text-[10px] text-[#F5EDED]/30 mt-3">Chargement des réponses...</p>
      )}
      {comments?.map((c) => (
        <div key={c.id} className="flex items-start gap-2 mt-3">
          {c.author_id ? (
            <AuthorAvatarLink
              basePath={basePath}
              authorId={c.author_id}
              authorName={c.author_name}
              authorAvatarUrl={c.author_avatar_url}
              size={24}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#890404]/20 flex items-center justify-center text-[8px] font-black text-[#F5EDED]/60 flex-shrink-0">
              {initials(c.author_name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#F5EDED]/60">
              {c.author_id ? (
                <Link href={`${basePath}/profile/${c.author_id}`} className="hover:text-[#F5EDED]/90">
                  {c.author_name}
                </Link>
              ) : (
                c.author_name
              )}{" "}
              <span className="text-[8px] font-bold uppercase tracking-wide text-[#F5EDED]/25">
                · {badgeLabel(c.author_role, c.author_subscription_status)}
              </span>{" "}
              {c.author_points != null && <RankBadge points={c.author_points} />}
              <span className="text-[#F5EDED]/25 font-normal"> · {timeAgo(c.created_at)}</span>
            </p>
            <p className="text-xs text-[#F5EDED]/70">{c.content}</p>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#890404]/10">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Répondre..." aria-label="Répondre..."
          className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          aria-label="Envoyer"
          className="text-[#E01E1E] disabled:opacity-30 transition-opacity"
        >
          <Send size={15} strokeWidth={2} />
        </button>
      </div>
      {error && (
        <p className="animate-slide-up text-[10px] text-red-400 font-semibold mt-1.5">⚠ {error}</p>
      )}
    </>
  );
}

// ── Post card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  basePath,
  isCoach,
  isPlatformOwner,
  currentUserId,
  expanded,
  onToggleExpand,
  comments,
  commentsLoading,
  onCommentAdded,
  onStatusChanged,
  onDeleted,
}: {
  post: CommunityPost;
  basePath: string;
  isCoach: boolean;
  isPlatformOwner: boolean;
  currentUserId: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  comments: CommunityComment[] | undefined;
  commentsLoading: boolean;
  onCommentAdded: (comment: CommunityComment) => void;
  onStatusChanged: (status: "open" | "answered") => void;
  onDeleted: () => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ideaSaved, setIdeaSaved] = useState(false);
  const [savingIdea, setSavingIdea] = useState(false);

  // Modération (suppression) réservée au fondateur, même dans le mur
  // partagé — un coach tiers peut toujours supprimer SES PROPRES posts.
  const canDelete = isPlatformOwner || currentUserId === post.author_id;

  async function handleDelete() {
    if (!confirm("Supprimer ce post ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  async function toggleAnswered() {
    setUpdatingStatus(true);
    try {
      const nextStatus = post.status === "answered" ? "open" : "answered";
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) onStatusChanged(nextStatus);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Axe 2 (VISION.md) : une question de membre est souvent une bonne idée
  // de contenu toute faite — un tap l'envoie dans le Studio créatif du
  // coach sans ressaisie.
  async function saveAsIdea() {
    setSavingIdea(true);
    try {
      const result = await createIdeaFromQuestion(post.id, post.content);
      if (!result.error) setIdeaSaved(true);
    } finally {
      setSavingIdea(false);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <AuthorAvatarLink
          basePath={basePath}
          authorId={post.author_id}
          authorName={post.author_name}
          authorAvatarUrl={post.author_avatar_url}
          size={32}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`${basePath}/profile/${post.author_id}`} className="text-xs font-bold text-white truncate hover:underline">
              {post.author_name}
            </Link>
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#F5EDED]/30 flex-shrink-0">
              {badgeLabel(post.author_role, post.author_subscription_status)}
            </span>
            {post.author_points != null && <RankBadge points={post.author_points} />}
            <span className="text-[10px] text-[#F5EDED]/30 flex-shrink-0">
              · {timeAgo(post.created_at)}
            </span>
          </div>
          <p className="text-sm text-[#F5EDED]/75 mt-1 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {post.image_url && (
            <div className="relative w-full mt-3 rounded-lg overflow-hidden border border-[#890404]/15" style={{ aspectRatio: "4/3" }}>
              <Image src={post.image_url} alt={`Photo partagée par ${post.author_name}`} fill className="object-cover" unoptimized />
            </div>
          )}

          {post.type === "question" && (
            <div className="mt-2.5">
              {post.status === "answered" ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">
                  <CheckCircle2 size={10} /> Répondu
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  En attente
                </span>
              )}
              {isCoach && (
                <button
                  onClick={toggleAnswered}
                  disabled={updatingStatus}
                  className="ml-2 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
                >
                  Marquer {post.status === "answered" ? "non répondu" : "répondu"}
                </button>
              )}
              {isCoach && (
                <button
                  onClick={saveAsIdea}
                  disabled={savingIdea || ideaSaved}
                  className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors disabled:opacity-60"
                >
                  <Sparkles size={10} />
                  {ideaSaved ? "Envoyé au studio" : "→ Idée de contenu"}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/55 transition-colors"
            >
              <MessageCircle size={12} strokeWidth={1.8} />
              {post.comment_count > 0 ? `${post.comment_count} réponse${post.comment_count > 1 ? "s" : ""}` : "Répondre"}
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/20 hover:text-red-400 transition-colors disabled:opacity-30"
              >
                <Trash2 size={11} strokeWidth={1.8} />
                Supprimer
              </button>
            )}
          </div>

          {expanded && (
            <CommentsThread
              postId={post.id}
              basePath={basePath}
              comments={comments}
              loading={commentsLoading}
              onAdded={onCommentAdded}
              onAutoAnswered={() => onStatusChanged("answered")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────

export default function CommunityFeed({
  type,
  initialPosts,
  initialNextCursor,
  isCoach,
  isPlatformOwner = false,
  currentUserId,
  initialShareText,
}: {
  type: CommunityPostType;
  initialPosts: CommunityPost[];
  initialNextCursor: string | null;
  isCoach: boolean;
  isPlatformOwner?: boolean;
  currentUserId?: string | null;
  initialShareText?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const basePath = isCoach ? "/dashboard/coach" : "/dashboard/client";

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/community/posts?type=${type}&cursor=${encodeURIComponent(nextCursor)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, type]);

  // Infinite scroll — load the next page as the sentinel enters the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  async function reload() {
    setExpandedId(null);
    setCommentsByPost({});
    const res = await fetch(`/api/community/posts?type=${type}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
    }
  }

  async function handleToggleExpand(postId: string) {
    const next = expandedId === postId ? null : postId;
    setExpandedId(next);
    if (next && !commentsByPost[next]) {
      setLoadingComments((s) => ({ ...s, [next]: true }));
      try {
        const res = await fetch(`/api/community/posts/${next}/comments`);
        if (res.ok) {
          const data = await res.json();
          setCommentsByPost((s) => ({ ...s, [next]: data.comments }));
        }
      } finally {
        setLoadingComments((s) => ({ ...s, [next]: false }));
      }
    }
  }

  function handleCommentAdded(postId: string, comment: CommunityComment) {
    setCommentsByPost((s) => ({ ...s, [postId]: [...(s[postId] ?? []), comment] }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    );
  }

  function handleStatusChanged(postId: string, status: "open" | "answered") {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status } : p)));
  }

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const Icon = type === "victory" ? Trophy : HelpCircle;
  const emptyPoints = type === "victory" ? POINTS.community_victory : POINTS.community_question;

  return (
    <div>
      <Composer
        type={type}
        initialContent={initialShareText}
        isCoach={isCoach}
        basePath={basePath}
        onPosted={reload}
      />

      {posts.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 px-6 text-center">
          <Icon size={28} className="text-[#E01E1E]/70 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-base font-black uppercase tracking-tight text-white mb-2">
            {type === "victory" ? "Sois le premier à partager" : "Sois le premier à demander"}
          </p>
          <p className="text-sm text-[#F5EDED]/45 max-w-sm mx-auto leading-relaxed">
            {type === "victory"
              ? "Une séance réussie, un kilo de perdu, un nouveau record : ta victoire motive toute la communauté et reste visible sur ton profil."
              : "Aucune question n'est trop basique : celle que tu n'oses pas poser, quelqu'un d'autre se la pose aussi. Ton coach et toute la communauté peuvent y répondre ici."}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-bold uppercase tracking-widest text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5">
            <Trophy size={11} strokeWidth={2} />
            +{emptyPoints} points à la première publication
          </div>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              basePath={basePath}
              isCoach={isCoach}
              isPlatformOwner={isPlatformOwner}
              currentUserId={currentUserId ?? null}
              expanded={expandedId === post.id}
              onToggleExpand={() => handleToggleExpand(post.id)}
              comments={commentsByPost[post.id]}
              commentsLoading={loadingComments[post.id] ?? false}
              onCommentAdded={(c) => handleCommentAdded(post.id, c)}
              onStatusChanged={(s) => handleStatusChanged(post.id, s)}
              onDeleted={() => handlePostDeleted(post.id)}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-[#E01E1E] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!nextCursor && posts.length > 0 && (
            <p className="text-center text-[10px] text-[#F5EDED]/20 py-4 uppercase tracking-widest font-bold">
              Fin du fil
            </p>
          )}
        </>
      )}
    </div>
  );
}
