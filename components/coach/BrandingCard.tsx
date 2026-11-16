"use client";

import { useRef, useState, useTransition } from "react";
import { Palette, Upload, Trash2 } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { safeAction } from "@/lib/safe-action";
import { saveCoachBrand, uploadCoachLogo, removeCoachLogo } from "@/app/actions/coach-branding";

// Réglage de la marque personnalisée (Premium) : nom, couleur, logo, vus
// par les clients du coach à la place de ceux d'EP Coaching.
export default function BrandingCard({ initial, premium }: { initial: { name: string | null; color: string | null; logoUrl: string | null }; premium: boolean }) {
  const t = useT();
  const [name, setName] = useState(initial.name ?? "");
  const [color, setColor] = useState(initial.color ?? "#e01e1e");
  const [logo, setLogo] = useState(initial.logoUrl);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await safeAction(() => saveCoachBrand({ name, color }));
      setMsg(res.error ?? "Enregistré : tes clients voient ta marque.");
    });
  }

  function upload(f: File | undefined) {
    if (!f) return;
    const form = new FormData();
    form.append("logo", f);
    setMsg(null);
    start(async () => {
      const res = await safeAction(() => uploadCoachLogo(form));
      if (res.error) setMsg(res.error);
      else setLogo(res.url ?? null);
    });
  }

  return (
    <section className="ep-card" style={{ padding: "16px", marginBottom: 18, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="brand-title">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Palette size={16} style={{ color: "var(--ep-accent)" }} />
        <h2 id="brand-title" style={{ margin: 0, fontSize: 15, fontWeight: 900, flex: 1 }}>{t("Ma marque")}</h2>
        {!premium && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-gold)" }}>{t("Premium")}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.5 }}>
        {premium ? t("Ton nom, ta couleur et ton logo remplacent ceux d'EP Coaching dans l'appli de tes clients.") : t("Avec le plan Premium, tes clients voient ton nom, ta couleur et ton logo dans l'appli.")}
      </p>
      {premium && (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700 }}>
            {t("Nom affiché")}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t("Ex. Coaching Léa")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)", fontSize: 15 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 700 }}>
            {t("Couleur")}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label={t("Couleur de ta marque")} style={{ width: 44, height: 34, border: "none", background: "none", cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)" }}>{color}</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={t("Ton logo")} style={{ height: 40, maxWidth: 140, objectFit: "contain", borderRadius: 8, background: "rgba(var(--ep-shade-rgb),0.4)", padding: 4 }} />
            ) : (
              <span style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("Pas encore de logo")}</span>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" disabled={pending} onClick={() => file.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
              <Upload size={13} /> {t(logo ? "Changer" : "Ajouter mon logo")}
            </button>
            {logo && (
              <button type="button" disabled={pending} aria-label={t("Retirer le logo")} onClick={() => start(async () => { const r = await safeAction(() => removeCoachLogo()); if (!r.error) setLogo(null); else setMsg(r.error); })} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "none", color: "rgba(var(--ep-ink-rgb),0.45)", cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <button type="button" disabled={pending} onClick={save} style={{ alignSelf: "flex-start", padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
            {t("Enregistrer")}
          </button>
        </>
      )}
      {msg && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: msg.startsWith("Enregistré") ? "var(--ep-ok)" : "var(--ep-bad)" }}>{t(msg)}</p>}
    </section>
  );
}
