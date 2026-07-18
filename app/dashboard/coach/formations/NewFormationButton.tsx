"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createFormation } from "./actions";

export default function NewFormationButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const title = prompt("Titre de la nouvelle formation :");
    if (!title?.trim()) return;
    const emoji = prompt("Emoji (optionnel) :", "📚") ?? "📚";
    setCreating(true);
    const res = await createFormation(title.trim(), emoji.trim());
    setCreating(false);
    if (res.id) router.push(`/dashboard/coach/formations/${res.id}`);
    else alert(res.error ?? "Erreur lors de la création.");
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="ep-btn-secondary"
      style={{ marginBottom: 16, alignSelf: "flex-start" }}
    >
      {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
      Nouvelle formation
    </button>
  );
}
