"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquareHeart, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { submitAppFeedbackAction } from "@/app/actions/app-feedback";
import { safeAction } from "@/lib/safe-action";
import { MOST_USEFUL_CHOICES } from "@/lib/app-feedback";

// Avis volontaire sur l'appli (C78) : trois questions, ignorable d'un geste,
// jamais réaffiché avant 60 jours une fois envoyé. « Plus tard » le masque
// sur cet appareil pendant 14 jours (préférence locale, rien n'est envoyé).
const SNOOZE_KEY = "ep-feedback-snooze";
const SNOOZE_DAYS = 14;

function snoozed(): boolean {
  try {
    const v = Number(window.localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(v) && v > Date.now();
  } catch {
    return false;
  }
}

export default function AppFeedbackCard() {
  const t = useT();
  const [hidden, setHidden] = useState(true);
  const [usefulness, setUsefulness] = useState<number | null>(null);
  const [mostUseful, setMostUseful] = useState<string | null>(null);
  const [missing, setMissing] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Lu après le rendu : le stockage n'existe pas côté serveur.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHidden(snoozed()), []);

  if (hidden) return null;

  function later() {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      // Navigation privée : la carte revient au prochain passage, sans gravité.
    }
    setHidden(true);
  }

  function send() {
    if (!usefulness) return;
    setError(null);
    start(async () => {
      const res = await safeAction(() => submitAppFeedbackAction({ usefulness, mostUseful, missing }));
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  const chip = (on: boolean): React.CSSProperties => ({
    minHeight: 38, padding: "0 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
    border: `1px solid ${on ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.15)"}`,
    background: on ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
    color: on ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.65)",
  });

  return (
    <section className="ep-card" style={{ padding: "14px 16px", marginTop: 12 }} aria-label={t("Ton avis sur l'appli")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MessageSquareHeart size={15} style={{ color: "var(--ep-accent)" }} />
        <p style={{ margin: 0, flex: 1, fontSize: 13.5, fontWeight: 900, color: "var(--ep-ink)" }}>{done ? t("Merci, c'est bien reçu") : t("Ton avis en 20 secondes ?")}</p>
        {!done && (
          <button type="button" onClick={later} aria-label={t("Plus tard")} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", color: "rgba(var(--ep-ink-rgb),0.45)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        )}
      </div>

      {done ? (
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.5 }}>
          {t("Ton retour sert à décider quoi améliorer en premier.")}
        </p>
      ) : (
        <>
          <p style={{ margin: "10px 0 6px", fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>{t("L'appli t'aide vraiment, de 1 à 5 ?")}</p>
          <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label={t("Note de 1 à 5")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={usefulness === n} onClick={() => setUsefulness(n)} style={{ ...chip(usefulness === n), width: 44, padding: 0 }}>
                {n}
              </button>
            ))}
          </div>

          <p style={{ margin: "12px 0 6px", fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>{t("Ce qui te sert le plus")}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MOST_USEFUL_CHOICES.map((c) => (
              <button key={c.id} type="button" aria-pressed={mostUseful === c.id} onClick={() => setMostUseful((v) => (v === c.id ? null : c.id))} style={chip(mostUseful === c.id)}>
                {t(c.label)}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginTop: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>{t("Ce qui te manque ou t'a bloqué (facultatif)")}</span>
            <textarea
              value={missing}
              onChange={(e) => setMissing(e.target.value)}
              maxLength={500}
              rows={2}
              style={{ marginTop: 6, width: "100%", borderRadius: 10, padding: "8px 10px", fontSize: 13, border: "1px solid rgba(var(--ep-ink-rgb),0.15)", background: "rgba(var(--ep-shade-rgb),0.25)", color: "var(--ep-ink)" }}
            />
            <span style={{ fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.4)" }}>{t("Pas d'information de santé ici : parle de l'appli.")}</span>
          </label>

          {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#fca5a5" }}>{t(error)}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={send} disabled={!usefulness || pending} style={{ minHeight: 42, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 13, fontWeight: 900, cursor: usefulness ? "pointer" : "default", opacity: usefulness ? 1 : 0.5 }}>
              {t("Envoyer")}
            </button>
            <button type="button" onClick={later} style={{ minHeight: 42, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
              {t("Plus tard")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
