import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { getNotes } from "@/lib/notes";
import { createAdminClient } from "@/lib/supabase-admin";
import NotesApp from "@/components/notes/NotesApp";
import ClaudeConnect from "@/components/notes/ClaudeConnect";

export const dynamic = "force-dynamic";

// Notes façon Obsidian/Tana, pour tout le monde (2026-09-30).
export default async function NotesPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const [{ notes, tags }, { data: tokens }] = await Promise.all([
    getNotes(user.id),
    createAdminClient().from("api_tokens").select("id, name, created_at, last_used_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  return (
    <Suspense>
      <NotesApp
        initialNotes={notes}
        tags={tags}
        connect={<ClaudeConnect tokens={(tokens ?? []) as { id: string; name: string; created_at: string; last_used_at: string | null }[]} />}
      />
    </Suspense>
  );
}
