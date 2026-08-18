"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Plus, Camera, Video, Briefcase, Sparkles, Trash2, MessageCircleQuestion } from "lucide-react";
import { createContentIdea, updateContentIdea, deleteContentIdea } from "@/app/dashboard/coach/studio/actions";
import type { ContentIdea, ContentPlatform, ContentStatus } from "@/lib/content-ideas";

// Pas de logos de marque (Instagram/YouTube/LinkedIn) : lucide-react ne les
// exporte plus (retirés pour raisons de droits), même convention déjà en
// place ailleurs dans l'app (ex. AtSign pour instagram_handle).
const PLATFORM_META: Record<ContentPlatform, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: "Instagram", icon: Camera, color: "#E1306C" },
  youtube: { label: "YouTube", icon: Video, color: "#FF0000" },
  linkedin: { label: "LinkedIn", icon: Briefcase, color: "#0A66C2" },
  general: { label: "Général", icon: Sparkles, color: "#E01E1E" },
};

const STATUS_META: Record<ContentStatus, { label: string; color: string }> = {
  idee: { label: "Idée", color: "rgba(245,237,237,0.4)" },
  brouillon: { label: "Brouillon", color: "#fbbf24" },
  pret: { label: "Prêt", color: "#60a5fa" },
  publie: { label: "Publié", color: "#4ade80" },
};

// Axe 2 (VISION.md) : espace de travail pour que le coach pose et fasse
// mûrir des idées de contenu (Insta/YouTube/LinkedIn) au lieu de les
// perdre. Statut = "où j'en suis", pas un vrai kanban drag-and-drop — plus
// simple à utiliser vite entre deux clients qu'un board à glisser-déposer.
export default function ContentStudio({ initialIdeas }: { initialIdeas: ContentIdea[] }) {
  const [ideas, setIdeas] = useState(initialIdeas);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialIdeas change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setIdeas(initialIdeas);
  }, [initialIdeas]);
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("instagram");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (platformFilter === "all" ? ideas : ideas.filter((i) => i.platform === platformFilter)),
    [ideas, platformFilter]
  );

  function submitNew() {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Titre requis.");
      return;
    }
    startTransition(async () => {
      const result = await createContentIdea({ title: t, platform, notes: notes || undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Optimiste : plutôt qu'un refetch, on ajoute localement — id
      // temporaire pas critique ici (aucune action derrière avant reload).
      setIdeas((prev) => [
        {
          id: `tmp-${Date.now()}`,
          coach_id: "",
          title: t,
          platform,
          notes: notes || null,
          status: "idee",
          source: "manuel",
          source_question_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle("");
      setNotes("");
      setShowForm(false);
    });
  }

  // MASTERCLASS.md Axe B (rattrapé ici le 2026-08-19, même trou que
  // partout ailleurs déjà corrigé) : les deux mises à jour optimistes
  // ci-dessous n'attendaient ni ne vérifiaient jamais le résultat de
  // l'action serveur — un échec (réseau, RLS, rate limit) laissait
  // l'écran afficher un état faux (statut changé, idée supprimée) sans
  // aucun retour en arrière, jusqu'au prochain rechargement complet.
  function changeStatus(id: string, status: ContentStatus) {
    const backup = ideas.find((i) => i.id === id)?.status;
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    startTransition(async () => {
      const result = await updateContentIdea(id, { status });
      if (result.error && backup) {
        setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: backup } : i)));
        setError(result.error);
      }
    });
  }

  function remove(id: string) {
    const idx = ideas.findIndex((i) => i.id === id);
    const backup = ideas[idx];
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteContentIdea(id);
      if (result.error && backup) {
        setIdeas((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setPlatformFilter("all")}
          style={chipStyle(platformFilter === "all")}
        >
          Tout
        </button>
        {CONTENT_PLATFORM_ORDER.map((p) => {
          const meta = PLATFORM_META[p];
          const Icon = meta.icon;
          return (
            <button key={p} type="button" onClick={() => setPlatformFilter(p)} style={chipStyle(platformFilter === p)}>
              <Icon size={11} style={{ marginRight: 4, verticalAlign: -2 }} />
              {meta.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            marginLeft: "auto",
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
          }}
        >
          <Plus size={14} /> Nouvelle idée
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Le titre / l'accroche de l'idée" aria-label="Le titre / l'accroche de l'idée"
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {CONTENT_PLATFORM_ORDER.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} style={chipStyle(platform === p)}>
                {PLATFORM_META[p].label}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes, script, angle... (facultatif)" aria-label="Notes, script, angle... (facultatif)"
            rows={3}
            style={{ ...inputStyle, marginTop: 10, resize: "vertical", fontFamily: "inherit" }}
          />
          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button
            type="button"
            onClick={submitNew}
            disabled={isPending}
            style={{
              marginTop: 10,
              background: "#E01E1E",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: "var(--radius-lg)",
              fontWeight: 800,
              fontSize: 12.5,
              border: "none",
              cursor: "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "..." : "Ajouter"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Sparkles size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune idée pour l&apos;instant. Note tout ce qui te passe par la tête.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((idea) => {
            const meta = PLATFORM_META[idea.platform];
            const Icon = meta.icon;
            return (
              <div key={idea.id} className="ep-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{idea.title}</p>
                    {idea.notes && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {idea.notes}
                      </p>
                    )}
                    {idea.source === "question" && (
                      <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
                        <MessageCircleQuestion size={11} /> Depuis une question de membre
                      </p>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {CONTENT_STATUS_ORDER.map((s) => {
                        const active = idea.status === s;
                        const sMeta = STATUS_META[s];
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeStatus(idea.id, s)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 999,
                              cursor: "pointer",
                              border: active ? `1px solid ${sMeta.color}` : "1px solid rgba(245,237,237,0.12)",
                              background: active ? `${sMeta.color}22` : "transparent",
                              color: active ? sMeta.color : "rgba(245,237,237,0.4)",
                            }}
                          >
                            {sMeta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idea.id)}
                    aria-label="Supprimer"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CONTENT_PLATFORM_ORDER: ContentPlatform[] = ["instagram", "youtube", "linkedin", "general"];
const CONTENT_STATUS_ORDER: ContentStatus[] = ["idee", "brouillon", "pret", "publie"];

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
