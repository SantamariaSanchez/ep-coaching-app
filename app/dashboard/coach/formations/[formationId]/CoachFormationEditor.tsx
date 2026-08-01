"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Check, ChevronDown, ChevronUp, Plus, Eye, EyeOff, Save, Layers, Pencil, Trash2 } from "lucide-react";
import type { FormationWithModules, FormationLesson } from "@/utils/formations";
import {
  updateLessonYoutube,
  updateFormation,
  updateModuleTitle,
  updateSectionTitle,
  updateLessonTitle,
  addModule,
  addSection,
  addLesson,
  deleteModule,
  deleteSection,
  deleteLesson,
  deleteFormation,
} from "../actions";

// ── Titre modifiable inline ─────────────────────────────────────────────────
// Cliquer sur un titre (formation, module, section ou vidéo) le transforme en
// champ éditable — jusqu'ici seul le titre initial saisi à la création
// restait, sans aucun moyen de le corriger ensuite.
function EditableTitle({
  value,
  onSave,
  textStyle,
  inputStyle,
}: {
  value: string;
  onSave: (title: string) => Promise<unknown>;
  textStyle: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = text.trim();
    if (!trimmed || trimmed === value) {
      setText(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(224,30,30,0.35)",
          borderRadius: 6,
          color: "#F5EDED",
          padding: "3px 8px",
          fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
          outline: "none",
          ...textStyle,
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Cliquer pour modifier le titre"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", ...textStyle }}
    >
      {value}
      <Pencil size={11} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
    </span>
  );
}

export default function CoachFormationEditor({ formation }: { formation: FormationWithModules }) {
  const router = useRouter();
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

  async function renameFormation(title: string) {
    await updateFormation(formation.id, { title });
    window.location.reload();
  }

  async function renameModule(moduleId: string, title: string) {
    await updateModuleTitle(moduleId, title);
    window.location.reload();
  }

  async function renameSection(sectionId: string, title: string) {
    await updateSectionTitle(sectionId, title);
    window.location.reload();
  }

  async function renameLessonTitle(lessonId: string, title: string) {
    await updateLessonTitle(lessonId, title);
    window.location.reload();
  }

  async function handleAddModule() {
    const title = prompt("Titre de la section :");
    if (!title?.trim()) return;
    await addModule(formation.id, title.trim(), formation.modules.length);
    window.location.reload();
  }

  async function handleAddSection(moduleId: string, currentCount: number) {
    const title = prompt("Titre du module :");
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

  async function handleDeleteModule(moduleId: string, title: string) {
    if (!confirm(`Supprimer la section "${title}" et tout son contenu (modules, vidéos) ?`)) return;
    await deleteModule(moduleId);
    window.location.reload();
  }

  async function handleDeleteSection(sectionId: string, title: string) {
    if (!confirm(`Supprimer le module "${title}" et ses vidéos ?`)) return;
    await deleteSection(sectionId);
    window.location.reload();
  }

  async function handleDeleteLesson(lessonId: string, title: string) {
    if (!confirm(`Supprimer la vidéo "${title}" ?`)) return;
    await deleteLesson(lessonId);
    window.location.reload();
  }

  async function handleDeleteFormation() {
    if (!confirm(`Supprimer définitivement la formation "${formation.title}" et tout son contenu ? Cette action est irréversible.`)) return;
    const res = await deleteFormation(formation.id);
    if (!res.error) router.push("/dashboard/coach/formations");
  }

  async function saveMetaField(field: "subtitle" | "description" | "emoji", value: string) {
    await updateFormation(formation.id, { [field]: value });
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Formation meta */}
      <div className="ep-card" style={{ padding: "16px 18px" }}>
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(224,30,30,0.08)" }}>
          <p className="ep-label" style={{ marginBottom: 4 }}>Titre de la formation</p>
          <EditableTitle
            value={formation.title}
            onSave={renameFormation}
            textStyle={{ fontSize: 16, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em" }}
          />
        </div>

        <div style={{ display: "flex", gap: 14, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(224,30,30,0.08)" }}>
          <div style={{ flexShrink: 0, width: 80 }}>
            <p className="ep-label" style={{ marginBottom: 4 }}>Emoji</p>
            <EditableTitle
              value={formation.emoji}
              onSave={(v) => saveMetaField("emoji", v)}
              textStyle={{ fontSize: 20 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="ep-label" style={{ marginBottom: 4 }}>Sous-titre</p>
            <EditableTitle
              value={formation.subtitle ?? "Ajouter un sous-titre"}
              onSave={(v) => saveMetaField("subtitle", v)}
              textStyle={{ fontSize: 13, fontWeight: 600, color: formation.subtitle ? "#F5EDED" : "rgba(245,237,237,0.3)" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(224,30,30,0.08)" }}>
          <p className="ep-label" style={{ marginBottom: 4 }}>Description</p>
          <EditableTitle
            value={formation.description ?? "Ajouter une description"}
            onSave={(v) => saveMetaField("description", v)}
            textStyle={{ fontSize: 12, fontWeight: 500, color: formation.description ? "rgba(245,237,237,0.7)" : "rgba(245,237,237,0.3)", lineHeight: 1.5 }}
            inputStyle={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="ep-label" style={{ marginBottom: 4 }}>Statut publication</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: formation.is_published ? "#4ade80" : "rgba(245,237,237,0.4)", margin: 0 }}>
              {formation.is_published ? "✓ Publiée, visible par les clients" : "Brouillon, non visible"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={togglePublish}
              disabled={saving === "formation"}
              className="ep-btn-secondary"
              style={{ padding: "8px 14px", fontSize: 11 }}
            >
              {formation.is_published ? <><EyeOff size={13} /> Masquer</> : <><Eye size={13} /> Publier</>}
            </button>
            <button
              onClick={handleDeleteFormation}
              title="Supprimer la formation"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.2)",
                borderRadius: 8, padding: "8px 10px", cursor: "pointer",
              }}
            >
              <Trash2 size={13} style={{ color: "#E01E1E" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {formation.modules.map((mod, mi) => {
        const totalLessons = mod.sections.reduce((acc, s) => acc + s.lessons.length, 0);
        return (
          <div key={mod.id} className="ep-card" style={{ overflow: "hidden" }}>
            {/* Section header */}
            <div
              onClick={() => toggleModule(mod.id)}
              role="button"
              tabIndex={0}
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(224,30,30,0.55)", flexShrink: 0 }}>
                  S{mi + 1}
                </span>
                <EditableTitle
                  value={mod.title}
                  onSave={(title) => renameModule(mod.id, title)}
                  textStyle={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", letterSpacing: "-0.02em" }}
                />
                <span style={{ fontSize: 10, color: "rgba(245,237,237,0.25)", fontWeight: 600, flexShrink: 0 }}>
                  ({mod.sections.length} module{mod.sections.length !== 1 ? "s" : ""} · {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""})
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id, mod.title); }}
                  title="Supprimer la section"
                  style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                >
                  <Trash2 size={13} style={{ color: "rgba(224,30,30,0.4)" }} />
                </button>
                {openModules.has(mod.id)
                  ? <ChevronUp size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
                  : <ChevronDown size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
                }
              </div>
            </div>

            {/* Modules */}
            {openModules.has(mod.id) && (
              <div>
                {mod.sections.map((sec, si) => (
                  <div key={sec.id} style={{ borderBottom: "1px solid rgba(224,30,30,0.06)" }}>
                    {/* Module header */}
                    <div
                      onClick={() => toggleSection(sec.id)}
                      role="button"
                      tabIndex={0}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Layers size={11} style={{ color: "rgba(224,30,30,0.4)", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.4)", flexShrink: 0 }}>
                          M{si + 1}
                        </span>
                        <EditableTitle
                          value={sec.title}
                          onSave={(title) => renameSection(sec.id, title)}
                          textStyle={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(245,237,237,0.65)" }}
                        />
                        <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", fontWeight: 600, flexShrink: 0 }}>
                          ({sec.lessons.length})
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id, sec.title); }}
                          title="Supprimer le module"
                          style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                        >
                          <Trash2 size={12} style={{ color: "rgba(224,30,30,0.35)" }} />
                        </button>
                        {openSections.has(sec.id)
                          ? <ChevronUp size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
                          : <ChevronDown size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
                        }
                      </div>
                    </div>

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
                            onRenameTitle={renameLessonTitle}
                            onDelete={() => handleDeleteLesson(lesson.id, lesson.title)}
                          />
                        ))}

                        {/* Add lesson in section */}
                        {/* Ajouter une vidéo dans ce module */}
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
                    <Plus size={12} /> Ajouter un module
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add section */}
      <button
        onClick={handleAddModule}
        className="ep-btn-secondary"
        style={{ alignSelf: "flex-start" }}
      >
        <Plus size={14} /> Ajouter une section
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
  onRenameTitle,
  onDelete,
}: {
  lesson: FormationLesson;
  index: number;
  saving: string | null;
  saved: string | null;
  onSave: (id: string, url: string, published: boolean) => void;
  onRenameTitle: (id: string, title: string) => Promise<void>;
  onDelete: () => void;
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
        <div style={{ marginBottom: 6 }}>
          <EditableTitle
            value={lesson.title}
            onSave={(title) => onRenameTitle(lesson.id, title)}
            textStyle={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", lineHeight: 1.2 }}
          />
        </div>

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

          <button
            onClick={onDelete}
            title="Supprimer la vidéo"
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
              padding: "7px 9px", cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            <Trash2 size={13} style={{ color: "rgba(224,30,30,0.4)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
