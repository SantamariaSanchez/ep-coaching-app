"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Copy, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { createApiTokenAction, revokeApiTokenAction } from "@/app/actions/notes";

// Tuto + clé perso pour relier Claude (et Notion via Claude) à ses notes.
export default function ClaudeConnect({ tokens }: { tokens: { id: string; name: string; created_at: string; last_used_at: string | null }[] }) {
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const step = (n: number, title: string, body: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <span style={{ width: 24, height: 24, borderRadius: 99, background: "rgba(224,30,30,0.18)", color: "#ff6b6b", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{title}</p>
        <div style={{ fontSize: 12.5, color: "rgba(245,237,237,0.65)", marginTop: 2, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );

  return (
    <div className="ep-card" style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: "#F5EDED", textAlign: "left" }}>
        <Sparkles size={16} style={{ color: "#E01E1E" }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>{tr("Relier Claude et Notion")}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)" }}>{tr("Range tes idées et tes pages Notion ici en parlant à Claude")}</span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ padding: "4px 14px 14px" }}>
          {step(
            1,
            "Crée ta clé",
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const res = await createApiTokenAction("Claude");
                    if (res.error) return setError(res.error);
                    setUrl(res.url ?? null);
                    router.refresh();
                  });
                }}
                style={{ marginTop: 6, padding: "9px 13px", borderRadius: 10, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, cursor: "pointer" }}
              >
                {pending ? "..." : tr("Générer mon adresse de connecteur")}
              </button>
              {url && (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(224,30,30,0.35)" }}>
                  <p className="ep-selectable" style={{ fontSize: 11.5, color: "#F5EDED", wordBreak: "break-all", margin: "0 0 8px", fontFamily: "monospace" }}>{url}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "#F5EDED", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? tr("Copiée") : tr("Copier")}
                  </button>
                  <p style={{ fontSize: 11, color: "#facc15", margin: "8px 0 0" }}>{tr("Garde-la pour toi : elle ne sera plus affichée.")}</p>
                </div>
              )}
              {error && <p style={{ fontSize: 12, color: "#fca5a5", margin: "6px 0 0" }}>{error}</p>}
            </>
          )}
          {step(2, "Ajoute-la dans Claude", "Sur claude.ai : Réglages, Connecteurs, Ajouter un connecteur personnalisé. Nom : EP Coaching. Adresse : colle celle de l'étape 1.")}
          {step(3, "Active-le dans une conversation", "Bouton des outils sous la zone de texte : coche EP Coaching (et Notion si tu veux importer tes pages).")}
          {step(
            4,
            "Parle-lui normalement",
            <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
              <li>{tr("« Range cette idée dans mes notes EP Coaching #reel »")}</li>
              <li>{tr("« Importe ma page Notion Idées de contenu dans EP Coaching avec le tag #idées »")}</li>
              <li>{tr("« Quels sont mes chiffres de la semaine sur EP Coaching ? »")}</li>
            </ul>
          )}
          {tokens.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(245,237,237,0.07)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", margin: "0 0 6px" }}>{tr("Mes clés")}</p>
              {tokens.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(245,237,237,0.75)", marginBottom: 4 }}>
                  <span style={{ flex: 1 }}>
                    {t.name}{" "}{tr("· créée le")}{" "}{new Date(t.created_at).toLocaleDateString("fr-FR")}
                    {t.last_used_at ? ` · utilisée le ${new Date(t.last_used_at).toLocaleDateString("fr-FR")}` : tr(" · jamais utilisée")}
                  </span>
                  <button
                    type="button"
                    aria-label={tr("Supprimer la clé")}
                    onClick={() => {
                      if (!confirm("Supprimer cette clé ? Claude n'aura plus accès à tes notes.")) return;
                      start(async () => {
                        await revokeApiTokenAction(t.id);
                        router.refresh();
                      });
                    }}
                    style={{ background: "none", border: "none", color: "rgba(245,237,237,0.45)", cursor: "pointer" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
