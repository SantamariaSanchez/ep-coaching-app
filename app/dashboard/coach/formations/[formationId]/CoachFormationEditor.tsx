"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Check, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus, Eye, EyeOff, Save, Layers, Pencil, Trash2, Copy, CheckSquare, AlertTriangle } from "lucide-react";
import type { FormationWithModules, FormationLesson } from "@/utils/formations";
import { onKeyActivate } from "@/lib/a11y";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import {
  updateLessonYoutube,
  updateLessonDetails,
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
  moveModule,
  moveSection,
  moveLesson,
  publishSectionLessons,
  duplicateModule,
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
        aria-label="Modifier le titre"
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
        // MASTERCLASS.md Axe E : text n'était initialisé qu'au tout premier
        // rendu du composant — si le titre avait changé ailleurs (rename
        // groupé, etc.) avant le premier clic sur "modifier", l'input se
        // serait ouvert sur l'ancien texte au lieu du titre actuel.
        setText(value);
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

// Bouton "Ajouter..." avec saisie inline plutôt qu'un prompt() natif du
// navigateur (2026-09-08) : même principe que EditableTitle ci-dessus (un
// clic révèle un champ, jamais de popup système qui casse l'identité
// visuelle de l'appli et bloque tout l'onglet). Un seul composant pour les
// 3 usages (module/section/vidéo) plutôt que dupliquer la logique 3 fois.
function AddItemButton({
  label,
  onAdd,
  dashed = true,
  iconSize = 12,
  style,
  className,
}: {
  label: string;
  // MASTERCLASS.md Axe B (repasse 2026-09-10) : doit renvoyer { error? } pour
  // que commit() sache si l'ajout a vraiment réussi — sinon impossible de
  // distinguer un échec d'un succès, et le champ se vidait dans les deux cas.
  onAdd: (title: string) => Promise<{ error?: string } | void>;
  dashed?: boolean;
  iconSize?: number;
  style?: React.CSSProperties;
  /** Quand fourni, le déclencheur utilise cette classe (ex. "ep-btn-secondary")
   * au lieu du style pointillé par défaut — pour le bouton racine "Ajouter un
   * module", visuellement plus important que les ajouts imbriqués. */
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  async function commit() {
    const trimmed = text.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    setAdding(true);
    const res = await onAdd(trimmed);
    setAdding(false);
    // MASTERCLASS.md Axe B : ne vider/fermer le champ que si l'ajout a
    // vraiment réussi — sinon le titre tapé à la main était perdu en cas
    // d'échec (permission, réseau), sans même un message clair puisque le
    // champ se refermait comme si tout s'était bien passé.
    if (!res?.error) {
      setText("");
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        disabled={adding}
        placeholder={label}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setText("");
            setEditing(false);
          }
        }}
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(224,30,30,0.35)",
          borderRadius: dashed ? 6 : 8,
          color: "#F5EDED",
          padding: dashed ? "5px 10px" : "7px 14px",
          fontSize: dashed ? 11 : 12,
          fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
          outline: "none",
          width: "100%",
          maxWidth: 260,
          ...style,
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={className}
      style={
        className
          ? { alignSelf: "flex-start", ...style }
          : {
              display: "flex",
              alignItems: "center",
              gap: dashed ? 5 : 6,
              background: "none",
              border: `1px dashed rgba(224,30,30,${dashed ? 0.14 : 0.18})`,
              borderRadius: dashed ? 6 : 8,
              color: `rgba(224,30,30,${dashed ? 0.4 : 0.5})`,
              fontSize: dashed ? 10 : 11,
              fontWeight: 700,
              padding: dashed ? "5px 10px" : "7px 14px",
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              ...style,
            }
      }
    >
      <Plus size={iconSize} /> {label}
    </button>
  );
}

export default function CoachFormationEditor({ formation }: { formation: FormationWithModules }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(formation.modules.map(m => m.id)));
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(formation.modules.flatMap(m => m.sections.map(s => s.id)))
  );
  // MASTERCLASS.md Axe B : la quasi-totalité des actions de cet éditeur
  // (renommer, ajouter, supprimer, réordonner...) ignoraient un `.error`
  // éventuel — en cas d'échec (permission, contrainte, réseau), le coach
  // n'avait aucun retour, juste un router.refresh() qui ne montre rien de
  // changé. runAction() centralise la vérification pour ne plus avoir à y
  // penser à chaque nouvel handler.
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction<T extends { error?: string }>(fn: () => Promise<T>): Promise<T> {
    const res = await fn();
    setActionError(res.error ?? null);
    return res;
  }

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
    const res = await runAction(() => updateLessonYoutube(lessonId, url, published));
    setSaving(null);
    if (!res.error) {
      setSaved(lessonId);
      setTimeout(() => setSaved(null), 2000);
    }
  }

  async function saveLessonDetails(lessonId: string, data: { description?: string; duration_min?: number }) {
    setSaving(`details-${lessonId}`);
    const res = await runAction(() => updateLessonDetails(lessonId, data));
    setSaving(null);
    if (!res.error) {
      setSaved(lessonId);
      setTimeout(() => setSaved(null), 2000);
      router.refresh();
    }
  }

  async function togglePublish() {
    setSaving("formation");
    await runAction(() => updateFormation(formation.id, { is_published: !formation.is_published }));
    setSaving(null);
  }

  async function renameFormation(title: string) {
    const res = await runAction(() => updateFormation(formation.id, { title }));
    if (!res.error) router.refresh();
  }

  async function renameModule(moduleId: string, title: string) {
    const res = await runAction(() => updateModuleTitle(moduleId, title));
    if (!res.error) router.refresh();
  }

  async function renameSection(sectionId: string, title: string) {
    const res = await runAction(() => updateSectionTitle(sectionId, title));
    if (!res.error) router.refresh();
  }

  async function renameLessonTitle(lessonId: string, title: string) {
    const res = await runAction(() => updateLessonTitle(lessonId, title));
    if (!res.error) router.refresh();
  }

  async function handleAddModule(title: string) {
    const res = await runAction(() => addModule(formation.id, title, formation.modules.length));
    if (!res.error) router.refresh();
    return res;
  }

  async function handleAddSection(moduleId: string, currentCount: number, title: string) {
    const res = await runAction(() => addSection(moduleId, title, currentCount));
    if (!res.error) router.refresh();
    return res;
  }

  async function handleAddLesson(sectionId: string, currentCount: number, title: string) {
    const res = await runAction(() => addLesson(sectionId, title, currentCount));
    if (!res.error) router.refresh();
    return res;
  }

  // handleDeleteModule/handleDeleteSection avaient leurs messages de
  // confirmation inversés (2026-09-08, même bug que les libellés des
  // boutons "Ajouter..." plus haut) : supprimer un module affichait "la
  // section", et inversement — corrigé ici en même temps que le passage à
  // useConfirm().
  async function handleDeleteModule(moduleId: string, title: string) {
    if (!(await confirm(`Supprimer le module "${title}" et tout son contenu (sections, vidéos) ?`))) return;
    const res = await runAction(() => deleteModule(moduleId));
    if (!res.error) router.refresh();
  }

  async function handleDeleteSection(sectionId: string, title: string) {
    if (!(await confirm(`Supprimer la section "${title}" et ses vidéos ?`))) return;
    const res = await runAction(() => deleteSection(sectionId));
    if (!res.error) router.refresh();
  }

  async function handleDeleteLesson(lessonId: string, title: string) {
    if (!(await confirm(`Supprimer la vidéo "${title}" ?`))) return;
    const res = await runAction(() => deleteLesson(lessonId));
    if (!res.error) router.refresh();
  }

  async function handleDeleteFormation() {
    if (
      !(await confirm(
        `Supprimer définitivement la formation "${formation.title}" et tout son contenu ? Cette action est irréversible.`
      ))
    )
      return;
    const res = await runAction(() => deleteFormation(formation.id));
    if (!res.error) router.push("/dashboard/coach/formations");
  }

  async function saveMetaField(field: "subtitle" | "description" | "emoji", value: string) {
    const res = await runAction(() => updateFormation(formation.id, { [field]: value }));
    if (!res.error) router.refresh();
  }

  async function handleMoveModule(moduleId: string, direction: "up" | "down") {
    const res = await runAction(() => moveModule(formation.id, moduleId, direction));
    if (!res.error) router.refresh();
  }

  async function handleMoveSection(moduleId: string, sectionId: string, direction: "up" | "down") {
    const res = await runAction(() => moveSection(moduleId, sectionId, direction));
    if (!res.error) router.refresh();
  }

  async function handleMoveLesson(sectionId: string, lessonId: string, direction: "up" | "down") {
    const res = await runAction(() => moveLesson(sectionId, lessonId, direction));
    if (!res.error) router.refresh();
  }

  async function handleDuplicateModule(moduleId: string) {
    setSaving(`dup-${moduleId}`);
    const res = await runAction(() => duplicateModule(moduleId));
    setSaving(null);
    if (!res.error) router.refresh();
  }

  async function handlePublishSection(sectionId: string, publish: boolean) {
    setSaving(`pub-${sectionId}`);
    const res = await runAction(() => publishSectionLessons(sectionId, publish));
    setSaving(null);
    if (!res.error) router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {actionError && (
        <div
          role="alert"
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10,
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#f87171", flex: 1 }}>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 4 }}
          >
            OK
          </button>
        </div>
      )}
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
              aria-label="Supprimer la formation"
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
              onKeyDown={onKeyActivate(() => toggleModule(mod.id))}
              role="button"
              tabIndex={0}
              aria-expanded={openModules.has(mod.id)}
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveModule(mod.id, "up"); }}
                  disabled={mi === 0}
                  title="Monter" aria-label="Monter"
                  style={{ display: "flex", background: "none", border: "none", cursor: mi === 0 ? "default" : "pointer", padding: 2, opacity: mi === 0 ? 0.2 : 1 }}
                >
                  <ArrowUp size={13} style={{ color: "rgba(245,237,237,0.4)" }} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveModule(mod.id, "down"); }}
                  disabled={mi === formation.modules.length - 1}
                  title="Descendre" aria-label="Descendre"
                  style={{ display: "flex", background: "none", border: "none", cursor: mi === formation.modules.length - 1 ? "default" : "pointer", padding: 2, opacity: mi === formation.modules.length - 1 ? 0.2 : 1 }}
                >
                  <ArrowDown size={13} style={{ color: "rgba(245,237,237,0.4)" }} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicateModule(mod.id); }}
                  disabled={saving === `dup-${mod.id}`}
                  title="Dupliquer cette section (structure, sans les vidéos)" aria-label="Dupliquer cette section (structure, sans les vidéos)"
                  style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                >
                  <Copy size={13} style={{ color: "rgba(245,237,237,0.3)" }} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id, mod.title); }}
                  title="Supprimer la section" aria-label="Supprimer la section"
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
                      onKeyDown={onKeyActivate(() => toggleSection(sec.id))}
                      role="button"
                      tabIndex={0}
                      aria-expanded={openSections.has(sec.id)}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {sec.lessons.some((l) => l.youtube_id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublishSection(sec.id, !sec.lessons.every((l) => l.is_published));
                            }}
                            disabled={saving === `pub-${sec.id}`}
                            title={sec.lessons.every((l) => l.is_published) ? "Masquer toutes les vidéos de ce module" : "Publier toutes les vidéos de ce module (celles avec une URL renseignée)"} aria-label={sec.lessons.every((l) => l.is_published) ? "Masquer toutes les vidéos de ce module" : "Publier toutes les vidéos de ce module (celles avec une URL renseignée)"}
                            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                          >
                            <CheckSquare size={12} style={{ color: sec.lessons.every((l) => l.is_published) ? "#4ade80" : "rgba(245,237,237,0.3)" }} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveSection(mod.id, sec.id, "up"); }}
                          disabled={si === 0}
                          title="Monter" aria-label="Monter"
                          style={{ display: "flex", background: "none", border: "none", cursor: si === 0 ? "default" : "pointer", padding: 2, opacity: si === 0 ? 0.2 : 1 }}
                        >
                          <ArrowUp size={12} style={{ color: "rgba(245,237,237,0.3)" }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveSection(mod.id, sec.id, "down"); }}
                          disabled={si === mod.sections.length - 1}
                          title="Descendre" aria-label="Descendre"
                          style={{ display: "flex", background: "none", border: "none", cursor: si === mod.sections.length - 1 ? "default" : "pointer", padding: 2, opacity: si === mod.sections.length - 1 ? 0.2 : 1 }}
                        >
                          <ArrowDown size={12} style={{ color: "rgba(245,237,237,0.3)" }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id, sec.title); }}
                          title="Supprimer le module" aria-label="Supprimer le module"
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
                            canMoveUp={li > 0}
                            canMoveDown={li < sec.lessons.length - 1}
                            onSave={saveYoutube}
                            onSaveDetails={saveLessonDetails}
                            onRenameTitle={renameLessonTitle}
                            onDelete={() => handleDeleteLesson(lesson.id, lesson.title)}
                            onMove={(dir) => handleMoveLesson(sec.id, lesson.id, dir)}
                          />
                        ))}

                        {/* Ajouter une vidéo dans cette section */}
                        <div style={{ padding: "8px 18px 8px 36px" }}>
                          <AddItemButton
                            label="Ajouter une vidéo"
                            iconSize={10}
                            onAdd={(title) => handleAddLesson(sec.id, sec.lessons.length, title)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Ajouter une section dans ce module. Le libellé de ce
                    bouton disait "Ajouter un module" avant ce fix
                    (2026-09-08) — inversé avec celui juste en dessous, un
                    coach cliquait "Ajouter un module" en pensant en créer un
                    nouveau et se retrouvait avec une section de plus dans
                    l'existant. */}
                <div style={{ padding: "10px 18px" }}>
                  <AddItemButton
                    label="Ajouter une section"
                    dashed={false}
                    onAdd={(title) => handleAddSection(mod.id, mod.sections.length, title)}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Ajouter un module à la formation (voir le commentaire ci-dessus sur
          l'inversion des deux libellés). */}
      <AddItemButton
        label="Ajouter un module"
        iconSize={14}
        onAdd={handleAddModule}
        className="ep-btn-secondary"
      />
    </div>
  );
}

function LessonEditor({
  lesson,
  index,
  saving,
  saved,
  canMoveUp,
  canMoveDown,
  onSave,
  onSaveDetails,
  onRenameTitle,
  onDelete,
  onMove,
}: {
  lesson: FormationLesson;
  index: number;
  saving: string | null;
  saved: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSave: (id: string, url: string, published: boolean) => void;
  onSaveDetails: (id: string, data: { description?: string; duration_min?: number }) => void;
  onRenameTitle: (id: string, title: string) => Promise<void>;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [url, setUrl] = useState(lesson.youtube_id ?? "");
  const [published, setPublished] = useState(lesson.is_published);
  // MASTERCLASS.md Axe E : "Publier toutes les vidéos du module" (bouton
  // groupé plus haut) republie chaque leçon côté serveur sans passer par ce
  // composant — sans resync, une leçon publiée en masse restait affichée
  // comme non publiée dans sa propre ligne tant qu'elle ne remontait pas.
  // url/description/durationMin restent volontairement non resynchronisés
  // (saisie libre en cours, jamais modifiée par l'action groupée).
  useEffect(() => {
    // Resync légitime avec une écriture externe (voir commentaire ci-dessus),
    // pas une dérivation qu'on pourrait calculer pendant le rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublished(lesson.is_published);
  }, [lesson.is_published]);
  const [showDetails, setShowDetails] = useState(false);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [durationMin, setDurationMin] = useState(String(lesson.duration_min));

  const isSaving = saving === lesson.id;
  const isSaved = saved === lesson.id;
  const hasChanged = url !== (lesson.youtube_id ?? "") || published !== lesson.is_published;
  const detailsChanged = description !== (lesson.description ?? "") || durationMin !== String(lesson.duration_min);
  const isSavingDetails = saving === `details-${lesson.id}`;

  return (
    <div style={{
      padding: "10px 18px 10px 36px",
      borderBottom: "1px solid rgba(224,30,30,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.18)", fontWeight: 700, width: 18, flexShrink: 0 }}>
          {index}
        </span>

        {lesson.youtube_id && (
          // eslint-disable-next-line @next/next/no-img-element -- miniature YouTube externe, pas une image du projet
          <img
            src={`https://i.ytimg.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
            alt=""
            width={48}
            height={27}
            style={{ borderRadius: 4, flexShrink: 0, objectFit: "cover", background: "rgba(0,0,0,0.4)" }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <EditableTitle
              value={lesson.title}
              onSave={(title) => onRenameTitle(lesson.id, title)}
              textStyle={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", lineHeight: 1.2 }}
            />
            <button
              onClick={() => setShowDetails((v) => !v)}
              title="Description et durée" aria-label="Description et durée"
              aria-expanded={showDetails}
              style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              {showDetails
                ? <ChevronUp size={12} style={{ color: "rgba(245,237,237,0.3)" }} />
                : <ChevronDown size={12} style={{ color: "rgba(245,237,237,0.3)" }} />
              }
            </button>
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
                placeholder="URL ou ID YouTube" aria-label="URL ou ID YouTube"
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
              title={published ? "Masquer" : "Publier"} aria-label={published ? "Masquer" : "Publier"}
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
              onClick={() => onMove("up")}
              disabled={!canMoveUp}
              title="Monter"
              aria-label="Monter"
              style={{ display: "flex", background: "none", border: "none", cursor: canMoveUp ? "pointer" : "default", padding: 2, opacity: canMoveUp ? 1 : 0.2 }}
            >
              <ChevronUp size={14} style={{ color: "rgba(245,237,237,0.3)" }} />
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={!canMoveDown}
              title="Descendre"
              aria-label="Descendre"
              style={{ display: "flex", background: "none", border: "none", cursor: canMoveDown ? "pointer" : "default", padding: 2, opacity: canMoveDown ? 1 : 0.2 }}
            >
              <ChevronDown size={14} style={{ color: "rgba(245,237,237,0.3)" }} />
            </button>

            <button
              onClick={onDelete}
              title="Supprimer la vidéo"
              aria-label="Supprimer la vidéo"
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                padding: "7px 9px", cursor: "pointer", display: "flex", alignItems: "center",
              }}
            >
              <Trash2 size={13} style={{ color: "rgba(224,30,30,0.4)" }} />
            </button>
          </div>

          {showDetails && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description affichée au client sous la vidéo…" aria-label="Description affichée au client sous la vidéo…"
                rows={2}
                style={{
                  width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, color: "#F5EDED", padding: "7px 10px", fontSize: 11.5,
                  fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif", outline: "none", resize: "vertical",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600 }}>Durée (min)</label>
                <input aria-label="Durée (min)"
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  style={{
                    width: 64, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8, color: "#F5EDED", padding: "6px 8px", fontSize: 11.5, outline: "none",
                  }}
                />
                {detailsChanged && (
                  <button
                    onClick={() => onSaveDetails(lesson.id, { description: description.trim(), duration_min: parseInt(durationMin, 10) || 10 })}
                    disabled={isSavingDetails}
                    style={{
                      background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.25)", borderRadius: 8,
                      padding: "6px 9px", cursor: isSavingDetails ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 700, color: "#E01E1E",
                    }}
                  >
                    <Save size={12} /> {isSavingDetails ? "…" : "Enregistrer"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
