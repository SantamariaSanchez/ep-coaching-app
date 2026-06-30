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
} from "lucide-react";
import type { CommunityComment, CommunityPost, CommunityPostType } from "@/utils/community";
import RankBadge from "@/components/ui/RankBadge";

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
          className="rounded-full bg-gradient-to-br from-[var(--color-ep-red)] to-[var(--color-ep-dark-red)] flex items-center justify-center font-black text-white"
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
  onPosted,
}: {
  type: CommunityPostType;
  onPosted: () => void;
}) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder =
    type === "victory"
      ? "Partage ta victoire de la semaine — perte de poids, nouveau record, séance réussie..."
      : "Pose ta question à la communauté et au coach...";

  async function handleSubmit() {
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("content", content.trim());
      if (image) formData.append("image", image);

      const res = await fetch("/api/community/posts", { method: "POST", body: formData });
      if (res.ok) {
        setContent("");
        setImage(null);
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
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-transparent text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none resize-none"
      />
      {image && (
        <p className="text-[10px] text-[var(--color-ep-light)]/40 mb-2 truncate">📎 {image.name}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-ep-dark-red)]/15">
        {type === "victory" ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/60 transition-colors"
            >
              <ImageIcon size={14} strokeWidth={1.8} />
              Photo
            </button>
          </>
        ) : (
          <span />
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
          className="flex items-center gap-1.5 bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
        >
          {posting ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={13} strokeWidth={2} />
          )}
          Publier
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-400 font-semibold mt-2">⚠ {error}</p>
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
}: {
  postId: string;
  basePath: string;
  comments: CommunityComment[] | undefined;
  loading: boolean;
  onAdded: (comment: CommunityComment) => void;
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
        <p className="text-[10px] text-[var(--color-ep-light)]/30 mt-3">Chargement des réponses...</p>
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
            <div className="w-6 h-6 rounded-full bg-[var(--color-ep-dark-red)]/20 flex items-center justify-center text-[8px] font-black text-[var(--color-ep-light)]/60 flex-shrink-0">
              {initials(c.author_name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--color-ep-light)]/60">
              {c.author_id ? (
                <Link href={`${basePath}/profile/${c.author_id}`} className="hover:text-[var(--color-ep-light)]/90">
                  {c.author_name}
                </Link>
              ) : (
                c.author_name
              )}{" "}
              <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--color-ep-light)]/25">
                · {badgeLabel(c.author_role, c.author_subscription_status)}
              </span>{" "}
              {c.author_points != null && <RankBadge points={c.author_points} />}
              <span className="text-[var(--color-ep-light)]/25 font-normal"> · {timeAgo(c.created_at)}</span>
            </p>
            <p className="text-xs text-[var(--color-ep-light)]/70">{c.content}</p>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-ep-dark-red)]/10">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Répondre..."
          className="flex-1 bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/40"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="text-[var(--color-ep-red)] disabled:opacity-30 transition-opacity"
        >
          <Send size={15} strokeWidth={2} />
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-red-400 font-semibold mt-1.5">⚠ {error}</p>
      )}
    </>
  );
}

// ── Post card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  basePath,
  isCoach,
  expanded,
  onToggleExpand,
  comments,
  commentsLoading,
  onCommentAdded,
  onStatusChanged,
}: {
  post: CommunityPost;
  basePath: string;
  isCoach: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  comments: CommunityComment[] | undefined;
  commentsLoading: boolean;
  onCommentAdded: (comment: CommunityComment) => void;
  onStatusChanged: (status: "open" | "answered") => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4 mb-3">
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
            <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-ep-light)]/30 flex-shrink-0">
              {badgeLabel(post.author_role, post.author_subscription_status)}
            </span>
            {post.author_points != null && <RankBadge points={post.author_points} />}
            <span className="text-[10px] text-[var(--color-ep-light)]/30 flex-shrink-0">
              · {timeAgo(post.created_at)}
            </span>
          </div>
          <p className="text-sm text-[var(--color-ep-light)]/75 mt-1 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {post.image_url && (
            <div className="relative w-full mt-3 rounded-lg overflow-hidden border border-[var(--color-ep-dark-red)]/15" style={{ aspectRatio: "4/3" }}>
              <Image src={post.image_url} alt="" fill className="object-cover" unoptimized />
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
                  className="ml-2 text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/60 transition-colors"
                >
                  Marquer {post.status === "answered" ? "non répondu" : "répondu"}
                </button>
              )}
            </div>
          )}

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/55 transition-colors"
          >
            <MessageCircle size={12} strokeWidth={1.8} />
            {post.comment_count > 0 ? `${post.comment_count} réponse${post.comment_count > 1 ? "s" : ""}` : "Répondre"}
          </button>

          {expanded && (
            <CommentsThread
              postId={post.id}
              basePath={basePath}
              comments={comments}
              loading={commentsLoading}
              onAdded={onCommentAdded}
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
}: {
  type: CommunityPostType;
  initialPosts: CommunityPost[];
  initialNextCursor: string | null;
  isCoach: boolean;
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

  const Icon = type === "victory" ? Trophy : HelpCircle;

  return (
    <div>
      <Composer type={type} onPosted={reload} />

      {posts.length === 0 ? (
        <div className="bg-[var(--color-ep-card)] border border-dashed border-[var(--color-ep-dark-red)]/25 rounded-xl py-12 text-center">
          <Icon size={26} className="text-[var(--color-ep-light)]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-ep-light)]/35">
            {type === "victory"
              ? "Sois le premier à partager une victoire !"
              : "Sois le premier à poser une question !"}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              basePath={basePath}
              isCoach={isCoach}
              expanded={expandedId === post.id}
              onToggleExpand={() => handleToggleExpand(post.id)}
              comments={commentsByPost[post.id]}
              commentsLoading={loadingComments[post.id] ?? false}
              onCommentAdded={(c) => handleCommentAdded(post.id, c)}
              onStatusChanged={(s) => handleStatusChanged(post.id, s)}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-[var(--color-ep-red)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!nextCursor && posts.length > 0 && (
            <p className="text-center text-[10px] text-[var(--color-ep-light)]/20 py-4 uppercase tracking-widest font-bold">
              Fin du fil
            </p>
          )}
        </>
      )}
    </div>
  );
}
