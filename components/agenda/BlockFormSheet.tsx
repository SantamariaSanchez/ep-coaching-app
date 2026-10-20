"use client";

// Formulaire complet d'un bloc (nom, jour, heures, couleur, notes,
// sous-tâches, rappel). La création courante passe par QuickAddSheet ; ce
// formulaire sert aux réglages fins et à la modification.

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { AGENDA_PRESETS } from "@/lib/agenda-presets";
import { ALL_DAYS, DAY_LABELS, DAY_SHORT, hhmm, toMin } from "@/lib/agenda-engine";
import { withAlpha } from "@/lib/theme-color";
import type { BlockFormData } from "./types";
import { Chip, DayPicker, ErrorText, PrimaryButton, SectionLabel, ToggleRow } from "./ui";

const COLOR_OPTIONS = ["var(--ep-accent)", "var(--ep-ok)", "var(--ep-info)", "var(--ep-warn)", "var(--ep-violet)", "var(--ep-pink)", "var(--ep-gold)"];
const inputClass =
  "w-full bg-(--ep-s2) border border-(--ep-line)/30 focus:border-(--ep-accent)/60 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) placeholder-(--ep-ink)/25 outline-none transition-colors";

export default function BlockFormSheet({
  initial,
  editing,
  allowRepeat,
  overlapsFor,
  onSave,
  onDelete,
  onClose,
}: {
  initial: BlockFormData;
  editing: boolean;
  allowRepeat: boolean;
  overlapsFor: (f: BlockFormData) => string[];
  onSave: (data: BlockFormData, repeatDays: number[]) => Promise<string | null>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [form, setForm] = useState<BlockFormData>(initial);
  const [repeat, setRepeat] = useState<number[]>([]);
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const ov = overlapsFor(form);

  async function save() {
    if (!form.label.trim()) return setErr(t("Nom du bloc obligatoire."));
    if (form.end_time <= form.start_time && form.end_time !== "00:00") return setErr(t("L'heure de fin doit être après l'heure de début."));
    setBusy(true);
    setErr(null);
    const data = { ...form, end_time: form.end_time === "00:00" ? "24:00" : form.end_time, notes: form.notes?.trim() || null };
    const res = await onSave(data, repeat);
    setBusy(false);
    if (res) setErr(res);
  }

  return (
    <Sheet
      title={editing ? t("Modifier le bloc") : `${t("Nouveau bloc")} · ${DAY_LABELS[form.day_of_week]}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {editing && onDelete && (
            <button
              type="button"
              onClick={() => (confirmDel ? onDelete() : setConfirmDel(true))}
              aria-label={t("Supprimer le bloc")}
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold"
              style={{ border: "1px solid rgba(var(--ep-bad-rgb),0.4)", color: "var(--ep-bad)", background: confirmDel ? "rgba(var(--ep-bad-rgb),0.1)" : "transparent" }}
            >
              <Trash2 size={14} /> {confirmDel ? t("Confirmer") : ""}
            </button>
          )}
          <div className="flex-1">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? t("Enregistrement…") : t("Enregistrer")}</PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <section>
          <SectionLabel>{t("Type")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AGENDA_PRESETS.map((p) => {
              const PIcon = p.icon;
              const active = form.icon === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: p.key, color: p.color, label: f.label.trim() ? f.label : p.label }))}
                  className="inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-lg text-[11px] font-bold border"
                  style={{ background: active ? withAlpha(p.color, "22") : "transparent", borderColor: active ? withAlpha(p.color, "88") : "rgba(var(--ep-line-rgb),0.25)", color: active ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.55)" }}
                >
                  <PIcon size={12} strokeWidth={2.2} style={{ color: p.color }} /> {t(p.label)}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionLabel>{t("Nom")}</SectionLabel>
          <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder={t("Ex. Montage vidéo, Séance, Déjeuner...")} aria-label={t("Nom")} className={inputClass} />
        </section>

        <section>
          <SectionLabel>{t("Jour")}</SectionLabel>
          <div className="grid grid-cols-7 gap-1">
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, day_of_week: d }))}
                className="h-9 rounded-lg text-[11px] font-black border"
                style={{ background: form.day_of_week === d ? "rgba(var(--ep-accent-rgb),0.18)" : "transparent", borderColor: form.day_of_week === d ? "rgba(var(--ep-accent-rgb),0.6)" : "rgba(var(--ep-line-rgb),0.3)", color: form.day_of_week === d ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.55)" }}
              >
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
        </section>

        {allowRepeat && (
          <section>
            <SectionLabel>{t("Répéter aussi le (optionnel)")}</SectionLabel>
            <DayPicker value={repeat} onChange={setRepeat} exclude={form.day_of_week} />
          </section>
        )}

        <section>
          <SectionLabel>{t("Horaires")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[15, 30, 60, 90, 120].map((m) => (
              <Chip key={m} onClick={() => setForm((f) => ({ ...f, end_time: hhmm(Math.min(1440, toMin(f.start_time) + m)) }))}>
                {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? "30" : ""}`}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label={t("Début")} type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={inputClass} />
            <input aria-label={t("Fin")} type="time" value={form.end_time === "24:00" ? "00:00" : form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={inputClass} />
          </div>
        </section>

        {ov.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(var(--ep-warn-rgb),0.3)", background: "rgba(var(--ep-warn-rgb),0.1)" }}>
            <AlertTriangle size={13} style={{ color: "var(--ep-warn)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: "var(--ep-warn)", margin: 0, lineHeight: 1.4 }}>{t("Chevauche")} {ov.join(", ")}.</p>
          </div>
        )}

        <section>
          <SectionLabel>{t("Couleur")}</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t("Couleur")}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className="w-8 h-8 rounded-full border-2"
                style={{ background: c, borderColor: form.color === c ? "var(--ep-strong)" : "transparent" }}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>{t("Sous-tâches")}</SectionLabel>
          {form.tasks.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {form.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 bg-(--ep-bg) border border-(--ep-line)/20 rounded-lg px-3 py-2">
                  <span className="flex-1 text-xs text-(--ep-ink) break-words">{task}</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, tasks: f.tasks.filter((_, j) => j !== i) }))} aria-label={t("Supprimer la tâche")} className="text-(--ep-ink)/30">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newTask.trim();
              if (!v) return;
              setForm((f) => ({ ...f, tasks: [...f.tasks, v] }));
              setNewTask("");
            }}
          >
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={t("Ex. Tourner 3 reels, ou un prompt à coller...")} aria-label={t("Nouvelle tâche")} className={inputClass} />
            <button type="submit" aria-label={t("Ajouter la tâche")} className="w-11 flex-shrink-0 rounded-lg border border-(--ep-line)/35 flex items-center justify-center text-(--ep-strong)">
              <Plus size={15} />
            </button>
          </form>
        </section>

        <section>
          <SectionLabel>{t("Notes (optionnel)")}</SectionLabel>
          <textarea aria-label={t("Notes (optionnel)")} rows={2} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} className={`${inputClass} resize-none`} />
        </section>

        <ToggleRow on={form.notify} onChange={(v) => setForm((f) => ({ ...f, notify: v }))} label={t("Me notifier au début de ce bloc")} />
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  );
}
