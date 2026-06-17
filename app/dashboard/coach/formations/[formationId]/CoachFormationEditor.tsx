"use client";

import { useState } from "react";
import { Video, Check, ChevronDown, ChevronUp, Plus, Eye, EyeOff, Save } from "lucide-react";
import type { FormationWithModules, FormationLesson } from "@/utils/formations";
import {
  updateLessonYoutube,
  updateFormation,
  addModule,
  addLesson,
} from "../actions";

export default function CoachFormationEditor({ formation }: { formation: FormationWithModules }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(formation.modules.map(m => m.id)));

  function toggleModule(id: string) {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveYoutube(lessonId: string, url: string, published: boolean) {
    setSaving(lessonId);
    const res = await updateLessonYoutube(lessonId, url, published);
    setSaving(null);
    if (!res.error) {
      setSaved(lessonId);
      setTimeout(() => setSaved(null), 2000);
    }
  }

  async function togglePublish() {
    setSaving("formation");
    await updateFormation(formation.id, { is_published: !formation.is_published });
    setSaving(null);
  }

  async function handleAddModule() {
    const title = prompt("Titre du module :");
    if (!title?.trim()) return;
    await addModule(formation.id, title.trim(), formation.modules.length);
    window.location.reload();
  }

  async function handleAddLesson(moduleId: string, currentCount: number) {
    const title = prompt("Titre de la vidéo :");
    if (!title?.trim()) return;
    await addLesson(moduleId, title.trim(), currentCount);
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Formation meta */}
      <div className="ep-card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="ep-label" style={{ marginBottom: 4 }}>Statut publication</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: formation.is_published ? "#4ade80" : "rgba(245,237,237,0.4)", margin: 0 }}>
              {formation.is_published ? "✓ Publiée — visible par les clients" : "Brouillon — non visible"}
            </p>
          </div>
          <button
            onClick={togglePublish}
            disabled={saving === "formation"}
            className="ep-btn-secondary"
            style={{ padding: "8px 14px", fontSize: 11 }}
          >
            {formation.is_published ? <><EyeOff size={13} /> Masquer</> : <><Eye size={13} /> Publier</>}
          </button>
        </div>
      </div>

      {/* Modules */}
      {formation.modules.map((mod, mi) => (
        <div key={mod.id} className="ep-card" style={{ overflow: "hidden" }}>
          {/* Module header */}
          <button
            onClick={() => toggleModule(mod.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: openModules.has(mod.id) ? "1px solid rgba(224,30,30,0.08)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(224,30,30,0.55)" }}>
                M{mi + 1}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em" }}>
                {mod.title}
              </span>
              <span style={{ fontSize: 10, color: "rgba(245,237,237,0.25)", fontWeight: 600 }}>
                ({mod.lessons.length} vidéo{mod.lessons.length !== 1 ? "s" : ""})
              </span>
            </div>
            {openModules.has(mod.id)
              ? <ChevronUp size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
              : <ChevronDown size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
            }
          </button>

          {/* Lessons */}
          {openModules.has(mod.id) && (
            <div>
              {mod.lessons.map((lesson, li) => (
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  index={li + 1}
                  saving={saving}
                  saved={saved}
                  onSave={saveYoutube}
                />
              ))}

              {/* Add lesson */}
              <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(224,30,30,0.05)" }}>
                <button
                  onClick={() => handleAddLesson(mod.id, mod.lessons.length)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "1px dashed rgba(224,30,30,0.18)",
                    borderRadius: 8,
                    color: "rgba(224,30,30,0.5)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "7px 14px",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <Plus size={12} /> Ajouter une vidéo
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add module */}
      <button
        onClick={handleAddModule}
        className="ep-btn-secondary"
        style={{ alignSelf: "flex-start" }}
      >
        <Plus size={14} /> Ajouter un module
      </button>
    </div>
  );
}

function LessonEditor({
  lesson,
  index,
  saving,
  saved,
  onSave,
}: {
  lesson: FormationLesson;
  index: number;
  saving: string | null;
  saved: string | null;
  onSave: (id: string, url: string, published: boolean) => void;
}) {
  const [url, setUrl] = useState(lesson.youtube_id ?? "");
  const [published, setPublished] = useState(lesson.is_published);

  const isSaving = saving === lesson.id;
  const isSaved = saved === lesson.id;
  const hasChanged = url !== (lesson.youtube_id ?? "") || published !== lesson.is_published;

  return (
    <div style={{
      padding: "12px 18px",
      borderBottom: "1px solid rgba(224,30,30,0.05)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <span style={{ fontSize: 11, color: "rgba(245,237,237,0.2)", fontWeight: 700, width: 22, flexShrink: 0 }}>
        {index}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px", lineHeight: 1.2 }}>
          {lesson.title}
        </p>

        {/* YouTube URL input */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Video
              size={13}
              style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: url ? "#E01E1E" : "rgba(245,237,237,0.2)",
              }}
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL ou ID YouTube"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${url ? "rgba(224,30,30,0.25)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 8,
                color: "#F5EDED",
                padding: "7px 10px 7px 30px",
                fontSize: 12,
                fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
                outline: "none",
              }}
            />
          </div>

          {/* Published toggle */}
          <button
            onClick={() => setPublished(!published)}
            title={published ? "Masquer" : "Publier"}
            style={{
              background: published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${published ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8,
              padding: "7px 9px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            {published
              ? <Eye size={13} style={{ color: "#4ade80" }} />
              : <EyeOff size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
            }
          </button>

          {/* Save button */}
          {(hasChanged || isSaving || isSaved) && (
            <button
              onClick={() => onSave(lesson.id, url, published)}
              disabled={isSaving}
              style={{
                background: isSaved ? "rgba(74,222,128,0.1)" : "rgba(224,30,30,0.12)",
                border: `1px solid ${isSaved ? "rgba(74,222,128,0.3)" : "rgba(224,30,30,0.25)"}`,
                borderRadius: 8,
                padding: "7px 9px",
                cursor: isSaving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isSaved
                ? <Check size={13} style={{ color: "#4ade80" }} />
                : <Save size={13} style={{ color: "#E01E1E" }} />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
