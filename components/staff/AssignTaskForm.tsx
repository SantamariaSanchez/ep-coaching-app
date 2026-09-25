"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { assignTaskAction } from "@/app/equipe/team-actions";

// Côté fondateur : assigner une tâche à un membre de l'équipe. Elle apparaît
// dans ses Tâches avec "Assignée par", il est notifié, et le fondateur est
// prévenu quand elle passe en Fait.
export default function AssignTaskForm({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normale");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const r = await assignTaskAction(memberId, title, due, priority, notes);
      if ("error" in r) setMessage({ text: r.error, ok: false });
      else {
        setTitle("");
        setDue("");
        setNotes("");
        setPriority("normale");
        setMessage({ text: `Tâche envoyée à ${memberName}.`, ok: true });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Tâche pour ${memberName}`} aria-label="Tâche" className="ep-input" style={{ gridColumn: "1 / -1" }} required />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Échéance" className="ep-input" />
      <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorité" className="ep-input">
        <option value="haute">Priorité haute</option>
        <option value="normale">Priorité normale</option>
        <option value="basse">Priorité basse</option>
      </select>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Consignes (optionnel)" aria-label="Consignes" rows={2} className="ep-input" style={{ gridColumn: "1 / -1", resize: "vertical" }} />
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={pending || !title.trim()} className="ep-btn-primary" style={{ height: 40, padding: "0 16px", fontSize: 12 }}>
          <Plus size={14} /> {pending ? "Envoi..." : "Assigner la tâche"}
        </button>
        {message && <p role="status" style={{ fontSize: 12, margin: 0, color: message.ok ? "#4ade80" : "#FDC4C4" }}>{message.text}</p>}
      </div>
    </form>
  );
}
