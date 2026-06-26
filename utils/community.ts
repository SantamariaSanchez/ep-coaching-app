import { createServerSupabase } from "@/lib/supabase-server";

export type CommunityPostType = "victory" | "question";

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
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
      supabase.from("profiles").select("id, full_name").in("id", authorIds),
      supabase.from("community_comments").select("post_id").in("post_id", postIds),
    ]);

    const nameMap: Record<string, string> = {};
    for (const a of authors ?? []) {
      nameMap[(a as { id: string }).id] = (a as { full_name: string | null }).full_name ?? "Membre";
    }

    const countMap: Record<string, number> = {};
    for (const c of comments ?? []) {
      const pid = (c as { post_id: string }).post_id;
      countMap[pid] = (countMap[pid] ?? 0) + 1;
    }

    const mapped: CommunityPost[] = posts.map((p) => ({
      id: p.id,
      author_id: p.author_id,
      author_name: nameMap[p.author_id] ?? "Membre",
      type: p.type,
      content: p.content,
      image_url: p.image_url,
      status: p.status,
      created_at: p.created_at,
      comment_count: countMap[p.id] ?? 0,
    }));

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
      .select("id, full_name")
      .in("id", authorIds);

    const nameMap: Record<string, string> = {};
    for (const a of authors ?? []) {
      nameMap[(a as { id: string }).id] = (a as { full_name: string | null }).full_name ?? "Membre";
    }

    return comments.map((c) => ({
      id: c.id,
      post_id: c.post_id,
      author_id: c.author_id,
      author_name: nameMap[c.author_id] ?? "Membre",
      content: c.content,
      created_at: c.created_at,
    }));
  } catch {
    return [];
  }
}
