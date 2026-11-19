"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion, ChevronDown, Lightbulb, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { VOICE_SOURCE_LABELS, type VoiceTheme } from "@/lib/client-voice";
import { voiceThemeToIdeaAction } from "@/app/actions/client-voice";

// « Ce que tes clientes te demandent » : les thèmes qui reviennent dans leurs
// check-ins, messages, candidatures et questions de la communauté, sans nom.
// Un tap transforme un thème en idée de contenu (Studio > Idées). Même forme
// que « Ma semaine » (WeeklyLivedCard) : un bouton, une feuille.
export default function ClientVoiceCard({ themes, total, days, reasons = [] }: { themes: VoiceTheme[]; total: number; days: number; reasons?: { kind: string; text: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toIdea(id: string) {
    setError(null);
    start(async () => {
      const res = await voiceThemeToIdeaAction(id);
      if (res.error) return setError(t(res.error));
      setDone((d) => ({ ...d, [id]: true }));
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", marginBottom: 12, marginLeft: 8, borderRadius: 999, border: "1px solid rgba(var(--ep-line-rgb),0.35)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
      >
        <MessageCircleQuestion size={14} style={{ color: "var(--ep-violet)" }} />
        {t("Ce qu'elles te demandent")}
        {themes.length > 0 && <span style={{ fontSize: 11, opacity: 0.7 }}>· {themes.length}</span>}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <section className="ep-card" onClick={(e) => e.stopPropagation()} style={{ padding: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", borderRadius: "18px 18px 0 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 900 }}>{t("Ce que tes clientes te demandent")}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer")} style={{ background: "none", border: "none", color: "var(--ep-ink)", cursor: "pointer", padding: 6 }}><ChevronDown size={18} /></button>
            </div>
            <p style={{ margin: "6px 0 12px", fontSize: 12.5, opacity: 0.75 }}>
              {themes.length > 0
                ? t("Les thèmes qui reviennent sur {d} jours dans leurs check-ins, messages, candidatures et questions. Ton coaching est ton meilleur contenu.", { d: days })
                : t("Rien à exploiter sur {d} jours ({total} phrase(s) lue(s)). Dès qu'elles écrivent, leurs questions apparaissent ici par thème. Rien n'est inventé.", { d: days, total })}
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {themes.map((theme) => (
                <div key={theme.id} style={{ borderRadius: 12, border: "1px solid rgba(var(--ep-ink-rgb),0.1)", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{t(theme.label)} <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>· {theme.count}</span></div>
                      <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>{t(theme.angle)}</div>
                    </div>
                    <button
                      type="button"
                      disabled={pending || done[theme.id]}
                      onClick={() => toIdea(theme.id)}
                      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, minHeight: 32, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(var(--ep-line-rgb),0.35)", background: "transparent", color: "var(--ep-ink)", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pending || done[theme.id] ? 0.6 : 1 }}
                    >
                      {done[theme.id] ? <Check size={13} /> : <Lightbulb size={13} style={{ color: "var(--ep-violet)" }} />}
                      {done[theme.id] ? t("Ajoutée aux idées") : t("En faire une idée")}
                    </button>
                  </div>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "grid", gap: 4 }}>
                    {theme.examples.map((e, i) => (
                      <li key={i} style={{ fontSize: 12.5 }}>
                        « {e.text} » <span style={{ opacity: 0.6 }}>({t(VOICE_SOURCE_LABELS[e.source])})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {reasons.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{t("Pourquoi elles t'ont choisi")}</div>
                <div style={{ fontSize: 12.5, opacity: 0.75, margin: "2px 0 6px" }}>{t("Ce qu'elles ont écrit dans leur fiche d'onboarding. C'est ça qu'il faut mettre en avant.")}</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
                  {reasons.map((r, i) => (
                    <li key={i} style={{ fontSize: 12.5 }}>« {r.text} » <span style={{ opacity: 0.6 }}>({t(r.kind)})</span></li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p role="alert" style={{ marginTop: 10, fontSize: 12.5, color: "var(--ep-red, #E01E1E)" }}>{error}</p>}
            <p style={{ marginTop: 12, fontSize: 11.5, opacity: 0.6 }}>{t("Anonyme : aucun nom ni coordonnée. Les sujets de santé ne sont jamais repris.")}</p>
          </section>
        </div>
      )}
    </>
  );
}
