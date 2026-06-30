"use client";

import { useState } from "react";
import { Video, Check, ChevronDown, ChevronUp, Plus, Eye, EyeOff, Save, Layers } from "lucide-react";
import type { FormationWithModules, FormationLesson } from "@/utils/formations";
import {
  updateLessonYoutube,
  updateFormation,
  addModule,
  addSection,
  addLesson,
} from "../actions";

export default function CoachFormationEditor({ formation }: { formation: FormationWithModules }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(formation.modules.map(m => m.id)));
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(formation.modules.flatMap(m => m.sections.map(s => s.id)))
  );

  function toggleModule(id: string) {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

  async function handleAddSection(moduleId: string, currentCount: number) {
    const title = prompt("Titre de la section :");
    if (!title?.trim()) return;
    await addSection(moduleId, title.trim(), currentCount);
    window.location.reload();
  }

  async function handleAddLesson(sectionId: string, currentCount: number) {
    const title = prompt("Titre de la vidéo :");
    if (!title?.trim()) return;
    await addLesson(sectionId, title.trim(), currentCount);
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
      {formation.modules.map((mod, mi) => {
        const totalLessons = mod.sections.reduce((acc, s) => acc + s.lessons.length, 0);
        return (
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
                  ({mod.sections.length} section{mod.sections.length !== 1 ? "s" : ""} · {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""})
                </span>
              </div>
              {openModules.has(mod.id)
                ? <ChevronUp size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
                : <ChevronDown size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
              }
            </button>

            {/* Sections */}
            {openModules.has(mod.id) && (
              <div>
                {mod.sections.map((sec, si) => (
                  <div key={sec.id} style={{ borderBottom: "1px solid rgba(224,30,30,0.06)" }}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(sec.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 18px 10px 28px",
                        background: "rgba(224,30,30,0.03)",
                        border: "none",
                        borderBottom: openSections.has(sec.id) ? "1px solid rgba(224,30,30,0.06)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Layers size={11} style={{ color: "rgba(224,30,30,0.4)", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(245,237,237,0.65)" }}>
                          {si + 1}. {sec.title}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>
                          ({sec.lessons.length})
                        </span>
                      </div>
                      {openSections.has(sec.id)
                        ? <ChevronUp size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
                        : <ChevronDown size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
                      }
                    </button>

                    {/* Lessons in section */}
                    {openSections.has(sec.id) && (
                      <div>
                        {sec.lessons.map((lesson, li) => (
                          <LessonEditor
                            key={lesson.id}
                            lesson={lesson}
                            index={li + 1}
                            saving={saving}
                            saved={saved}
                            onSave={saveYoutube}
                          />
                        ))}

                        {/* Add lesson in section */}
                        <div style={{ padding: "8px 18px 8px 36px" }}>
                          <button
                            onClick={() => handleAddLesson(sec.id, sec.lessons.length)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "none",
                              border: "1px dashed rgba(224,30,30,0.14)",
                              borderRadius: 6,
                              color: "rgba(224,30,30,0.4)",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "5px 10px",
                              cursor: "pointer",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            <Plus size={10} /> Ajouter une vidéo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add section */}
                <div style={{ padding: "10px 18px" }}>
                  <button
                    onClick={() => handleAddSection(mod.id, mod.sections.length)}
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
                    <Plus size={12} /> Ajouter une section
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

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
      padding: "10px 18px 10px 36px",
      borderBottom: "1px solid rgba(224,30,30,0.04)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <span style={{ fontSize: 11, color: "rgba(245,237,237,0.18)", fontWeight: 700, width: 18, flexShrink: 0 }}>
        {index}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px", lineHeight: 1.2 }}>
          {lesson.title}
        </p>

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
