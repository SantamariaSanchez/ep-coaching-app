"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import Link from "next/link";
import { HeartPulse, ShieldAlert, ChevronDown, ChevronRight, Plus, X, Activity, Trash2 } from "lucide-react";
import { MEDICAL_CONSTRAINTS, getMedicalConstraintBySlug } from "@/lib/medical-constraints";
import type { ClientMedicalConstraint, RecoveryLog } from "@/lib/client-medical-constraints";

// Rattache la bibliothèque "Contraintes & populations spécifiques"
// (/dashboard/coach/contraintes) au suivi réel de CE client, plutôt que de
// rester une bibliothèque qu'il faut penser à aller consulter à part.
// Demande directe 2026-09-09 : les onglets "juste info" (le médical cité
// en exemple) doivent devenir de vrais outils.
//
// Le coach choisit lui-même quelle(s) fiche(s) s'appliquent (jamais une
// détection automatique à partir du texte libre de la fiche client) : même
// garde-fou que le contenu lui-même (lib/medical-constraints.ts), un humain
// décide, l'outil ne fait qu'attacher la référence au suivi.

function painColor(pain: number): string {
  if (pain <= 3) return "var(--ep-ok)";
  if (pain <= 6) return "var(--ep-yellow)";
  return "var(--ep-accent)";
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

function RecoveryLogTool({
  clientId,
  logs,
  today,
  addRecoveryLog,
  deleteRecoveryLog,
}: {
  clientId: string;
  logs: RecoveryLog[];
  today: string;
  addRecoveryLog: (
    clientId: string,
    data: { log_date: string; zone: string; load_note: string | null; pain: number; note: string | null }
  ) => Promise<{ error?: string }>;
  deleteRecoveryLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [zone, setZone] = useState("");
  const [loadNote, setLoadNote] = useState("");
  const [pain, setPain] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plus ancien → plus récent (inverse de l'ordre de stockage) pour que la
  // tendance se lise gauche → droite dans le sens du temps, comme un
  // graphique classique.
  const chronological = [...logs].reverse();

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const res = await addRecoveryLog(clientId, {
      log_date: date,
      zone,
      load_note: loadNote || null,
      pain,
      note: note || null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setZone("");
    setLoadNote("");
    setPain(3);
    setNote("");
    setFormOpen(false);
  }

  return (
    <div style={{ borderTop: "1px solid rgba(var(--ep-ink-rgb),0.06)", marginTop: 12, paddingTop: 12 }}>
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40">
          <Activity size={12} className="text-(--ep-accent)" />
          {t("Journal de reprise")}
        </p>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-hi)"
          >
            <Plus size={11} />{" "}{t("Séance")}
          </button>
        )}
      </div>

      {chronological.length > 0 && (
        <div className="flex items-end gap-1 mb-3" style={{ height: 28 }}>
          {chronological.map((log) => (
            <div
              key={log.id}
              title={`${formatShortDate(log.log_date)} · ${log.zone} · douleur ${log.pain}/10`}
              style={{
                width: 6,
                height: Math.max(3, (log.pain / 10) * 28),
                borderRadius: 2,
                background: painColor(log.pain),
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <div className="rounded-lg border border-(--ep-line)/25 bg-(--ep-s2) p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              aria-label={t("Date")}
              className="bg-(--ep-bg) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) outline-none focus:border-(--ep-accent)/60"
            />
            <input
              type="number"
              min={0}
              max={10}
              value={pain}
              onChange={(e) => setPain(Number(e.target.value))}
              aria-label={t("Douleur sur 10")}
              placeholder={t("Douleur /10")}
              className="bg-(--ep-bg) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) outline-none focus:border-(--ep-accent)/60"
            />
          </div>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder={t("Zone / mouvement (ex. genou droit, squat)")}
            aria-label={t("Zone concernée")}
            className="w-full bg-(--ep-bg) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) placeholder-(--ep-ink)/20 outline-none focus:border-(--ep-accent)/60"
          />
          <input
            value={loadNote}
            onChange={(e) => setLoadNote(e.target.value)}
            placeholder={t("Charge / répétitions (optionnel, ex. 40kg x 8)")}
            aria-label={t("Charge et répétitions")}
            className="w-full bg-(--ep-bg) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) placeholder-(--ep-ink)/20 outline-none focus:border-(--ep-accent)/60"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Note (optionnel)")}
            aria-label={t("Note")}
            rows={2}
            className="w-full bg-(--ep-bg) border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) placeholder-(--ep-ink)/20 outline-none focus:border-(--ep-accent)/60 resize-none"
          />
          {error && <p className="text-[11px] text-red-400">{t(error)}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-strong) px-3"
            >
              {t("Annuler")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !zone.trim()}
              className="flex-1 bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-50 text-(--ep-strong) text-[10px] font-bold uppercase tracking-widest rounded-lg py-2"
            >
              {saving ? t("Enregistrement…") : t("Enregistrer")}
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-[11px] text-(--ep-ink)/25">{t("Aucune séance de reprise loguée pour l'instant.")}</p>
      ) : (
        <div className="space-y-1.5">
          {logs.slice(0, 6).map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-[11px]">
              <span
                className="flex-shrink-0 rounded-full font-black flex items-center justify-center"
                style={{ width: 20, height: 20, fontSize: 9, color: "var(--ep-bg)", background: painColor(log.pain) }}
              >
                {log.pain}
              </span>
              <span className="text-(--ep-ink)/60 flex-1 min-w-0 truncate">
                <strong className="text-(--ep-ink)/85 font-semibold">{log.zone}</strong>
                {log.load_note ? ` · ${log.load_note}` : ""} · {formatShortDate(log.log_date)}
              </span>
              <button
                type="button"
                onClick={() => deleteRecoveryLog(clientId, log.id)}
                aria-label={t("Supprimer cette séance")}
                className="text-(--ep-ink)/15 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientMedicalConstraintsPanel({
  clientId,
  activeConstraints,
  recoveryLogs,
  today,
  toggleClientConstraint,
  addRecoveryLog,
  deleteRecoveryLog,
}: {
  clientId: string;
  activeConstraints: ClientMedicalConstraint[];
  recoveryLogs: RecoveryLog[];
  today: string;
  toggleClientConstraint: (clientId: string, slug: string, active: boolean) => Promise<{ error?: string }>;
  addRecoveryLog: (
    clientId: string,
    data: { log_date: string; zone: string; load_note: string | null; pain: number; note: string | null }
  ) => Promise<{ error?: string }>;
  deleteRecoveryLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const activeSlugs = new Set(activeConstraints.map((c) => c.constraint_slug));

  async function handleToggle(slug: string, active: boolean) {
    setBusySlug(slug);
    await toggleClientConstraint(clientId, slug, active);
    setBusySlug(null);
  }

  return (
    <div className="ep-card" style={{ padding: "16px 18px" }}>
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-3">
        <HeartPulse size={13} className="text-(--ep-accent)" />
        {t("Contraintes médicales de ce client")}
      </p>

      {/* Sélecteur : le coach décide lui-même, jamais une détection auto à
          partir de la fiche client (même garde-fou que le contenu). */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {MEDICAL_CONSTRAINTS.map((c) => {
          const active = activeSlugs.has(c.slug);
          const busy = busySlug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              disabled={busy}
              onClick={() => handleToggle(c.slug, !active)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-50"
              style={{
                background: active ? "rgba(var(--ep-accent-rgb),0.15)" : "transparent",
                borderColor: active ? "rgba(var(--ep-accent-rgb),0.5)" : "rgba(var(--ep-line-rgb),0.25)",
                color: active ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.45)",
              }}
            >
              {active ? <X size={10} /> : <Plus size={10} />}
              {c.shortLabel}
            </button>
          );
        })}
      </div>

      {activeConstraints.length === 0 ? (
        <p className="text-[11.5px] text-(--ep-ink)/25 leading-relaxed">
          {t("Aucune contrainte rattachée. Ajoute une fiche ci-dessus si ce client a une blessure, une pathologie, un handicap ou une situation qui demande d'adapter son programme.")}
        </p>
      ) : (
        <div className="space-y-2.5">
          {activeConstraints.map((ac) => {
            const constraint = getMedicalConstraintBySlug(ac.constraint_slug);
            if (!constraint) return null;
            const expanded = expandedSlug === constraint.slug;
            return (
              <div key={ac.id} className="rounded-lg border border-(--ep-line)/20 bg-(--ep-shade)/20 px-3 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedSlug(expanded ? null : constraint.slug)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-[12.5px] font-black text-(--ep-strong)">{constraint.title}</span>
                  {expanded ? (
                    <ChevronDown size={14} className="text-(--ep-ink)/30 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-(--ep-ink)/30 flex-shrink-0" />
                  )}
                </button>

                {/* Signaux d'alerte : toujours visibles, jamais planqués
                    derrière le repli, c'est l'info de sécurité la plus
                    importante de la fiche. */}
                <div className="flex items-start gap-2 mt-2.5">
                  <ShieldAlert size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    {constraint.redFlags[0]}
                    {constraint.redFlags.length > 1 && !expanded ? ` (+${constraint.redFlags.length - 1})` : ""}
                  </p>
                </div>

                {expanded && (
                  <div className="mt-3 space-y-3">
                    {constraint.redFlags.length > 1 && (
                      <ul className="space-y-1.5 pl-5">
                        {constraint.redFlags.slice(1).map((f, i) => (
                          <li key={i} className="text-[11px] text-amber-300/70 leading-relaxed list-disc">
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <ul className="space-y-1.5">
                      {constraint.adaptationPrinciples.map((p, i) => (
                        <li key={i} className="text-[11.5px] text-(--ep-ink)/55 leading-relaxed flex gap-2">
                          <span className="text-(--ep-accent) flex-shrink-0">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/dashboard/coach/contraintes/${constraint.slug}`}
                      className="inline-block text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-hi)"
                    >
                      {t("Voir la fiche complète et les sources →")}
                    </Link>
                  </div>
                )}

                {constraint.slug === "blessures-reeducation" && (
                  <RecoveryLogTool
                    clientId={clientId}
                    logs={recoveryLogs}
                    today={today}
                    addRecoveryLog={addRecoveryLog}
                    deleteRecoveryLog={deleteRecoveryLog}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
