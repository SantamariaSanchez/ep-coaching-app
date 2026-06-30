import { createServerSupabase } from "@/lib/supabase-server";
import { getPointsMap } from "@/lib/gamification";

export type CommunityPostType = "victory" | "question";

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: "coach" | "client";
  author_subscription_status: string;
  author_avatar_url: string | null;
  author_points: number | null;
  type: CommunityPostType;
  content: string;
  image_url: string | null;
  status: "open" | "answered";
  created_at: string;
  comment_count: number;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_role: "coach" | "client";
  author_subscription_status: string;
  author_avatar_url: string | null;
  author_points: number | null;
  content: string;
  created_at: string;
}

export const COMMUNITY_PAGE_SIZE = 10;

export interface CommunityPostsPage {
  posts: CommunityPost[];
  nextCursor: string | null;
}

export async function getCommunityPostsPage(
  type: CommunityPostType,
  cursor?: string | null,
  limit: number = COMMUNITY_PAGE_SIZE
): Promise<CommunityPostsPage> {
  try {
    const supabase = await createServerSupabase();
    let query = supabase
      .from("community_posts")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt("created_at", cursor);

    const { data: posts } = await query;

    if (!posts || posts.length === 0) return { posts: [], nextCursor: null };

    const authorIds = [...new Set(posts.map((p) => p.author_id as string))];
    const postIds = posts.map((p) => p.id as string);

    const [{ data: authors }, { data: comments }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, subscription_status, avatar_url")
        .in("id", authorIds),
      supabase.from("community_comments").select("post_id").in("post_id", postIds),
    ]);

    type AuthorRow = {
      id: string;
      full_name: string | null;
      role: "coach" | "client";
      subscription_status: string;
      avatar_url: string | null;
    };
    const authorMap: Record<string, AuthorRow> = {};
    for (const a of (authors ?? []) as AuthorRow[]) {
      authorMap[a.id] = a;
    }

    const clientAuthorIds = (authors ?? []).filter((a) => a.role === "client").map((a) => a.id as string);
    const pointsMap = await getPointsMap(clientAuthorIds);

    const countMap: Record<string, number> = {};
    for (const c of comments ?? []) {
      const pid = (c as { post_id: string }).post_id;
      countMap[pid] = (countMap[pid] ?? 0) + 1;
    }

    const mapped: CommunityPost[] = posts.map((p) => {
      const author = authorMap[p.author_id];
      return {
        id: p.id,
        author_id: p.author_id,
        author_name: author?.full_name ?? "Membre",
        author_role: author?.role ?? "client",
        author_subscription_status: author?.subscription_status ?? "free",
        author_avatar_url: author?.avatar_url ?? null,
        author_points: author?.role === "client" ? pointsMap[p.author_id] ?? 0 : null,
        type: p.type,
        content: p.content,
        image_url: p.image_url,
        status: p.status,
        created_at: p.created_at,
        comment_count: countMap[p.id] ?? 0,
      };
    });

    return {
      posts: mapped,
      nextCursor: posts.length === limit ? mapped[mapped.length - 1].created_at : null,
    };
  } catch {
    return { posts: [], nextCursor: null };
  }
}

export async function getCommunityComments(postId: string): Promise<CommunityComment[]> {
  try {
    const supabase = await createServerSupabase();
    const { data: comments } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!comments || comments.length === 0) return [];

    const authorIds = [...new Set(comments.map((c) => c.author_id as string))];
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name, role, subscription_status, avatar_url")
      .in("id", authorIds);

    type AuthorRow = {
      id: string;
      full_name: string | null;
      role: "coach" | "client";
      subscription_status: string;
      avatar_url: string | null;
    };
    const authorMap: Record<string, AuthorRow> = {};
    for (const a of (authors ?? []) as AuthorRow[]) {
      authorMap[a.id] = a;
    }

    const clientAuthorIds = (authors ?? []).filter((a) => a.role === "client").map((a) => a.id as string);
    const pointsMap = await getPointsMap(clientAuthorIds);

    return comments.map((c) => {
      const author = authorMap[c.author_id];
      return {
        id: c.id,
        post_id: c.post_id,
        author_id: c.author_id,
        author_name: author?.full_name ?? "Membre",
        author_role: author?.role ?? "client",
        author_subscription_status: author?.subscription_status ?? "free",
        author_avatar_url: author?.avatar_url ?? null,
        author_points: author?.role === "client" ? pointsMap[c.author_id] ?? 0 : null,
        content: c.content,
        created_at: c.created_at,
      };
    });
  } catch {
    return [];
  }
}

// Used on profile pages to show how many things a member has shared.
export async function getCommunityPostCount(authorId: string): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", authorId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
