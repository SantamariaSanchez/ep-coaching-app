import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { getNotes } from "@/lib/notes";
import NotesApp from "@/components/notes/NotesApp";

export const dynamic = "force-dynamic";

// Notes façon Obsidian/Tana, pour tout le monde (2026-09-30).
export default async function NotesPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const { notes, tags } = await getNotes(user.id);
  return (
    <Suspense>
      <NotesApp initialNotes={notes} tags={tags} />
    </Suspense>
  );
}
