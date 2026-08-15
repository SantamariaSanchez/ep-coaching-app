"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, BookmarkPlus, Camera, Video, Briefcase, Sparkles, ExternalLink } from "lucide-react";
import { createInspiration, deleteInspiration } from "@/app/dashboard/coach/studio/actions";
import { safeExternalUrl } from "@/lib/sanitize";
import type { Inspiration, InspirationPlatform } from "@/lib/coach-ideation";

const PLATFORM_META: Record<InspirationPlatform, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: "Instagram", icon: Camera, color: "#E1306C" },
  youtube: { label: "YouTube", icon: Video, color: "#FF0000" },
  linkedin: { label: "LinkedIn", icon: Briefcase, color: "#0A66C2" },
  general: { label: "Général", icon: Sparkles, color: "#E01E1E" },
};
const PLATFORM_ORDER: InspirationPlatform[] = ["instagram", "youtube", "linkedin", "general"];

// Swipe file (Idéation, 2026-08-15) : des liens vus ailleurs — un post, une
// vidéo, un carrousel — qui méritent de servir de référence plus tard,
// plutôt que de les perdre dans les favoris du navigateur ou une conv privée.
export default function IdeationInspirations({ initialInspirations }: { initialInspirations: Inspiration[] }) {
  const [items, setItems] = useState(initialInspirations);

  useEffect(() => {
    setItems(initialInspirations);
  }, [initialInspirations]);

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<InspirationPlatform>("instagram");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitNew() {
    setError(null);
    const u = url.trim();
    if (!u) {
      setError("Lien requis.");
      return;
    }
    startTransition(async () => {
      const result = await createInspiration({ url: u, platform, note: note || undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => [
        {
          id: `tmp-${Date.now()}`,
          coach_id: "",
          url: u,
          platform,
          note: note || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUrl("");
      setNote("");
      setShowForm(false);
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => {
      deleteInspiration(id);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button type="button" onClick={() => setShowForm((v) => !v)} style={addButtonStyle}>
          <Plus size={14} /> Sauvegarder un lien
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            aria-label="Lien à sauvegarder"
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {PLATFORM_ORDER.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} style={chipStyle(platform === p)}>
                {PLATFORM_META[p].label}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pourquoi tu gardes ça ? (facultatif)"
            aria-label="Pourquoi tu gardes ça"
            style={{ ...inputStyle, marginTop: 10 }}
          />
          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button type="button" onClick={submitNew} disabled={isPending} style={submitButtonStyle(isPending)}>
            {isPending ? "..." : "Sauvegarder"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <BookmarkPlus size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune référence sauvegardée pour l&apos;instant.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {items.map((item) => {
            const meta = PLATFORM_META[item.platform];
            const Icon = meta.icon;
            const safeHref = safeExternalUrl(item.url) ?? "#";
            return (
              <div key={item.id} className="ep-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: item.note ? 8 : 0 }}>
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon size={12} style={{ color: meta.color }} />
                  </div>
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#F5EDED", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.url}</span>
                    <ExternalLink size={10} style={{ flexShrink: 0, color: "rgba(245,237,237,0.35)" }} />
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label="Supprimer"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 2 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {item.note && (
                  <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)", lineHeight: 1.5 }}>{item.note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#E01E1E",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  border: "none",
  cursor: "pointer",
};

function submitButtonStyle(pending: boolean): React.CSSProperties {
  return {
    marginTop: 10,
    background: "#E01E1E",
    color: "#fff",
    padding: "9px 18px",
    borderRadius: "var(--radius-lg)",
    fontWeight: 800,
    fontSize: 12.5,
    border: "none",
    cursor: "pointer",
    opacity: pending ? 0.6 : 1,
  };
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 11.5,
    fontWeight: 700,
    padding: "7px 12px",
    borderRadius: 999,
    cursor: "pointer",
    border: active ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
    background: active ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
    color: active ? "#F5EDED" : "rgba(245,237,237,0.55)",
  };
}
