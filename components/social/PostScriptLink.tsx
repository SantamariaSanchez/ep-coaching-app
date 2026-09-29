"use client";

import { useState, useTransition } from "react";
import { linkPostToScriptAction } from "@/app/dashboard/coach/stats-reseaux/actions";

// Relier une publication au script du Studio créatif dont elle vient (ou
// corriger un lien automatique). Un lien fait ici n'est jamais écrasé.
export default function PostScriptLink({ postId, scriptId, source, scripts }: { postId: string; scriptId: string | null; source: string | null; scripts: { id: string; title: string }[] }) {
  const [value, setValue] = useState(scriptId ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        value={value}
        disabled={pending}
        aria-label="Script lié"
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          setError(null);
          start(async () => {
            const res = await linkPostToScriptAction(postId, next || null);
            if (res.error) {
              setValue(prev);
              setError(res.error);
            }
          });
        }}
        style={{ maxWidth: "100%", width: 220, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.35)", borderRadius: 8, padding: "5px 8px", fontSize: 11.5, color: "#F5EDED" }}
      >
        <option value="">Aucun script</option>
        {scripts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title.slice(0, 60)}
          </option>
        ))}
      </select>
      {source === "auto" && value === scriptId && scriptId && <span style={{ display: "block", fontSize: 10, color: "rgba(245,237,237,0.4)", marginTop: 2 }}>relié automatiquement</span>}
      {error && <span style={{ display: "block", fontSize: 10.5, color: "#fca5a5", marginTop: 2 }}>{error}</span>}
    </div>
  );
}
