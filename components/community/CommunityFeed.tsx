"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Image as ImageIcon,
  Send,
  MessageCircle,
  CheckCircle2,
  Trophy,
  HelpCircle,
} from "lucide-react";
import type { CommunityPost, CommunityPostType } from "@/utils/community";

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

function Composer({ type, onPosted }: { type: CommunityPostType; onPosted: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder =
    type === "victory"
      ? "Partage ta victoire de la semaine — perte de poids, nouveau record, séance réussie..."
      : "Pose ta question à la communauté et au coach...";

  async function handleSubmit() {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("content", content.trim());
      if (image) formData.append("image", image);

      const res = await fetch("/api/community/posts", { method: "POST", body: formData });
      if (res.ok) {
        setContent("");
        setImage(null);
        router.refresh();
        onPosted();
      }
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
        rows={3}
        className="w-full bg-transparent text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none resize-none"
      />
      {image && (
        <p className="text-[10px] text-[#F5EDED]/40 mb-2 truncate">📎 {image.name}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-[#890404]/15">
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
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
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
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsThread({ postId }: { postId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent("");
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#890404]/10">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Répondre..."
        className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
      />
      <button
        onClick={handleSend}
        disabled={!content.trim() || sending}
        className="text-[#E01E1E] disabled:opacity-30 transition-opacity"
      >
        <Send size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Post card ───────────────────────────────────────────────────────────────

function PostCard({
  post,
  isCoach,
  expanded,
  onToggleExpand,
  comments,
}: {
  post: CommunityPost;
  isCoach: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  comments: { id: string; author_name: string; content: string; created_at: string }[];
}) {
  const router = useRouter();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function toggleAnswered() {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: post.status === "answered" ? "open" : "answered" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
          {initials(post.author_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white truncate">{post.author_name}</p>
            <span className="text-[10px] text-[#F5EDED]/30 flex-shrink-0">
              {timeAgo(post.created_at)}
            </span>
          </div>
          <p className="text-sm text-[#F5EDED]/75 mt-1 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {post.image_url && (
            <div className="relative w-full mt-3 rounded-lg overflow-hidden border border-[#890404]/15" style={{ aspectRatio: "4/3" }}>
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
                  className="ml-2 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
                >
                  Marquer {post.status === "answered" ? "non répondu" : "répondu"}
                </button>
              )}
            </div>
          )}

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/55 transition-colors"
          >
            <MessageCircle size={12} strokeWidth={1.8} />
            {post.comment_count > 0 ? `${post.comment_count} réponse${post.comment_count > 1 ? "s" : ""}` : "Répondre"}
          </button>

          {expanded && (
            <>
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full bg-[#890404]/20 flex items-center justify-center text-[8px] font-black text-[#F5EDED]/60 flex-shrink-0">
                    {initials(c.author_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#F5EDED]/60">
                      {c.author_name} <span className="text-[#F5EDED]/25 font-normal">· {timeAgo(c.created_at)}</span>
                    </p>
                    <p className="text-xs text-[#F5EDED]/70">{c.content}</p>
                  </div>
                </div>
              ))}
              <CommentsThread postId={post.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────

export default function CommunityFeed({
  type,
  posts,
  isCoach,
  commentsByPost,
}: {
  type: CommunityPostType;
  posts: CommunityPost[];
  isCoach: boolean;
  commentsByPost: Record<string, { id: string; author_name: string; content: string; created_at: string }[]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const Icon = type === "victory" ? Trophy : HelpCircle;

  return (
    <div>
      <Composer type={type} onPosted={() => {}} />

      {posts.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center">
          <Icon size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            {type === "victory"
              ? "Sois le premier à partager une victoire !"
              : "Sois le premier à poser une question !"}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isCoach={isCoach}
            expanded={expandedId === post.id}
            onToggleExpand={() => setExpandedId(expandedId === post.id ? null : post.id)}
            comments={commentsByPost[post.id] ?? []}
          />
        ))
      )}
    </div>
  );
}
