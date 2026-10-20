"use client";

// Journées types (2026-10-20) : une journée réussie s'enregistre telle
// quelle (« Jour de tournage », « Jour de repos ») et s'applique ensuite sur
// plusieurs jours d'un coup — en complétant les trous, ou en remplaçant ces
// jours après confirmation.

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import { Layers, Trash2 } from "lucide-react";
import { DAY_LABELS, clockLabel, templateFromColumn, type DayTemplate, type Placed } from "@/lib/agenda-engine";
import { Chip, DayPicker, ErrorText, PrimaryButton, SectionLabel } from "./ui";

export default function DayTemplatesSheet({
  templates,
  col,
  colPlaced,
  ready,
  replaceCount,
  onSaveTemplates,
  onApply,
  onClose,
}: {
  templates: DayTemplate[];
  col: number;
  colPlaced: Placed[];
  ready: boolean;
  /** Nombre de blocs de la semaine type qui seraient remplacés sur ces jours. */
  replaceCount: (days: number[]) => number;
  onSaveTemplates: (list: DayTemplate[]) => Promise<string | null>;
  onApply: (tpl: DayTemplate, days: number[], mode: "completer" | "remplacer") => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(templates[0]?.id ?? null);
  const [days, setDays] = useState<number[]>([]);
  const [mode, setMode] = useState<"completer" | "remplacer">("completer");
  const [confirm, setConfirm] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function save() {
    const n = name.trim() || `Journée type ${DAY_LABELS[col].toLowerCase()}`;
    const tpl = templateFromColumn(colPlaced, n, `t${Date.now().toString(36)}`);
    setBusy(true);
    setErr(null);
    const res = await onSaveTemplates([...templates, tpl]);
    setBusy(false);
    if (res) return setErr(res);
    setName("");
    setOpenId(tpl.id);
    setMsg(t("Journée type enregistrée."));
  }

  async function apply(tpl: DayTemplate) {
    if (mode === "remplacer" && !confirm && replaceCount(days) > 0) return setConfirm(true);
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await onApply(tpl, days, mode);
    setBusy(false);
    setConfirm(false);
    if (res) return setErr(res);
    onClose();
  }

  return (
    <Sheet title={t("Journées types")} subtitle={t("Enregistre une journée, applique-la sur plusieurs jours")} onClose={onClose}>
      <div className="space-y-5 pb-2">
        <section>
          <SectionLabel>{t("Enregistrer")} {DAY_LABELS[col].toLowerCase()} {t("comme journée type")}</SectionLabel>
          {colPlaced.length === 0 ? (
            <p className="text-xs text-(--ep-ink)/45">{t("Ce jour est vide : remplis-le d'abord, puis enregistre-le ici.")}</p>
          ) : (
            <div className="flex gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Ex. Jour de tournage")}
                aria-label={t("Nom de la journée type")}
                className="flex-1 min-w-0 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) outline-none"
              />
              <button type="button" onClick={save} disabled={busy || !ready} className="px-4 rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-40" style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}>
                {t("Enregistrer")}
              </button>
            </div>
          )}
          {colPlaced.length > 0 && (
            <p className="text-[11px] text-(--ep-ink)/45 mt-1.5">
              {colPlaced.length} {t("blocs")} · {clockLabel(colPlaced[0].s)} → {clockLabel(colPlaced[colPlaced.length - 1].e)}
            </p>
          )}
        </section>

        <section>
          <SectionLabel>{t("Mes journées types")}</SectionLabel>
          {templates.length === 0 && <p className="text-xs text-(--ep-ink)/45">{t("Aucune pour l'instant.")}</p>}
          <div className="space-y-2">
            {templates.map((tpl) => {
              const open = openId === tpl.id;
              const first = tpl.blocks[0];
              const last = tpl.blocks[tpl.blocks.length - 1];
              return (
                <div key={tpl.id} className="rounded-xl border border-(--ep-line)/30 bg-(--ep-s1)">
                  <div className="flex items-center gap-2 p-3">
                    <button type="button" onClick={() => { setOpenId(open ? null : tpl.id); setConfirm(false); }} className="flex-1 min-w-0 text-left">
                      <p className="flex items-center gap-1.5 text-sm font-black text-(--ep-strong) truncate"><Layers size={13} className="text-(--ep-accent) flex-shrink-0" /> {tpl.name}</p>
                      <p className="text-[11px] text-(--ep-ink)/45 mt-0.5">
                        {tpl.blocks.length} {t("blocs")}{first && last ? ` · ${clockLabel(first.s)} → ${clockLabel(last.e)}` : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label={t("Supprimer la journée type")}
                      onClick={async () => {
                        if (confirmDel !== tpl.id) return setConfirmDel(tpl.id);
                        setBusy(true);
                        const res = await onSaveTemplates(templates.filter((x) => x.id !== tpl.id));
                        setBusy(false);
                        setConfirmDel(null);
                        if (res) setErr(res);
                      }}
                      className="flex items-center gap-1 px-2 py-2 rounded-lg text-[11px] font-bold"
                      style={{ color: "var(--ep-bad)", background: confirmDel === tpl.id ? "rgba(var(--ep-bad-rgb),0.1)" : "transparent" }}
                    >
                      <Trash2 size={14} /> {confirmDel === tpl.id ? t("Supprimer") : ""}
                    </button>
                  </div>
                  {open && (
                    <div className="px-3 pb-3 space-y-3 border-t border-(--ep-line)/15 pt-3">
                      <div className="flex flex-wrap gap-1">
                        {tpl.blocks.slice(0, 14).map((b, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${b.color} 16%, transparent)`, color: "var(--ep-ink)" }}>
                            {clockLabel(b.s)} {b.label}
                          </span>
                        ))}
                        {tpl.blocks.length > 14 && <span className="text-[10px] text-(--ep-ink)/40">+{tpl.blocks.length - 14}</span>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-(--ep-ink)/45 mb-1.5">{t("Appliquer sur")}</p>
                        <DayPicker value={days} onChange={(d) => { setDays(d); setConfirm(false); }} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Chip active={mode === "completer"} onClick={() => { setMode("completer"); setConfirm(false); }}>{t("Compléter les trous")}</Chip>
                        <Chip active={mode === "remplacer"} onClick={() => setMode("remplacer")}>{t("Remplacer ces jours")}</Chip>
                      </div>
                      {mode === "remplacer" && days.length > 0 && (
                        <p className="text-[11px]" style={{ color: confirm ? "var(--ep-bad)" : "rgba(var(--ep-ink-rgb),0.5)" }}>
                          {replaceCount(days)} {t("blocs de ta semaine type seront remplacés (jamais tes rendez-vous datés ni ton réveil).")}
                        </p>
                      )}
                      <PrimaryButton danger={confirm} disabled={busy || days.length === 0} onClick={() => apply(tpl)}>
                        {busy ? "…" : confirm ? t("Confirmer le remplacement") : `${t("Appliquer sur")} ${days.length} ${days.length > 1 ? t("jours") : t("jour")}`}
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        {!ready && <p className="text-[11px]" style={{ color: "var(--ep-warn)" }}>{t("Les journées types s'enregistrent dès la prochaine mise à jour de la base.")}</p>}
        {msg && <p role="status" className="text-xs" style={{ color: "var(--ep-ok)" }}>{msg}</p>}
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  );
}
