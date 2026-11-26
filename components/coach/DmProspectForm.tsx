"use client";

import { useState, useTransition } from "react";
import { UserPlus, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { safeAction } from "@/lib/safe-action";
import { addDmProspect } from "@/app/dashboard/coach/studio/actions";

// Noter la personne qui a commenté « NNN » après lui avoir envoyé le guide
// (26/11, suivi des prospects : objectif, difficulté, ressource envoyée).
// Elle arrive dans Leads, statut « Contacté », avec le guide et le script.
export default function DmProspectForm({ scriptId, guideSlug }: { scriptId: string; guideSlug: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [objective, setObjective] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await safeAction(() => addDmProspect({ scriptId, guideSlug, handle, objective, difficulty }));
      if (r.error) { setError(r.error); return; }
      setSaved((n) => n + 1);
      setHandle("");
      setObjective("");
      setDifficulty("");
      setOpen(false);
    });
  }

  const input: React.CSSProperties = { width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 8, color: "var(--ep-ink)", padding: "8px 10px", fontSize: 12, outline: "none" };

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px dashed rgba(var(--ep-yellow-rgb),0.45)", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 800, color: "var(--ep-ink)", cursor: "pointer", minHeight: 32 }}
        >
          {saved > 0 ? <Check size={13} style={{ color: "var(--ep-ok)" }} /> : <UserPlus size={13} style={{ color: "var(--ep-yellow)" }} />}
          {saved > 0 ? `${saved} ${saved > 1 ? t("prospects notés") : t("prospect noté")} · ${t("en noter un autre")}` : t("Noter ce prospect")}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={t("@pseudo Instagram")} aria-label={t("Pseudo Instagram")} style={input} autoFocus />
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder={t("Son objectif (si elle l'a dit)")} aria-label={t("Objectif")} style={input} />
          <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder={t("Ce qui coince pour elle (si elle l'a dit)")} aria-label={t("Difficulté")} style={input} />
          {error && <p style={{ margin: 0, fontSize: 11, color: "var(--ep-bad)" }}>{t(error)}</p>}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={submit} disabled={isPending} style={{ background: "var(--ep-accent)", color: "#fff", border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", minHeight: 32 }}>
              {isPending ? "..." : t("Ajouter aux leads")}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(var(--ep-ink-rgb),0.5)", fontSize: 12, cursor: "pointer" }}>
              {t("Annuler")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
