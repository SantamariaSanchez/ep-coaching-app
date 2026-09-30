"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Gift, X, Copy } from "lucide-react";
import { updateFormation } from "../actions";
import { grantFormationAccessAction, revokeFormationAccessAction } from "../access-actions";

// Vente et accès d'une formation de coach : incluse dans son coaching (tous
// ses clients) ou payante (lien de paiement du coach, puis accès donné à la
// personne ici, en un clic).

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(137,4,4,0.35)",
  borderRadius: 10,
  padding: "9px 10px",
  fontSize: 14,
  color: "#F5EDED",
  outline: "none",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 4 };
const ghost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.75)", fontSize: 11.5, fontWeight: 800, cursor: "pointer" };

function chip(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    padding: "11px 12px",
    borderRadius: 12,
    cursor: "pointer",
    border: `1px solid ${active ? "rgba(224,30,30,0.7)" : "rgba(137,4,4,0.35)"}`,
    background: active ? "rgba(224,30,30,0.14)" : "rgba(0,0,0,0.25)",
    color: "#F5EDED",
    fontSize: 13,
    fontWeight: 800,
  };
}

export default function FormationSalesPanel({
  formationId,
  accessMode,
  price,
  paymentUrl,
  granted,
  clients,
}: {
  formationId: string;
  accessMode: "inclus" | "payant";
  price: number | null;
  paymentUrl: string | null;
  granted: { userId: string; name: string; email: string | null; grantedAt: string; source: string }[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState(accessMode);
  const [p, setP] = useState(price === null ? "" : String(price));
  const [url, setUrl] = useState(paymentUrl ?? "");
  const [who, setWho] = useState("");
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) => {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: ok });
      after?.();
      router.refresh();
    });
  };

  const grantedIds = new Set(granted.map((g) => g.userId));
  const grantable = clients.filter((c) => !grantedIds.has(c.id));

  return (
    <section className="ep-card" style={{ padding: "16px 16px", marginBottom: 18 }}>
      <p className="ep-label" style={{ margin: "0 0 10px" }}>Vente et accès</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" style={chip(mode === "inclus")} onClick={() => setMode("inclus")}>
          <Gift size={15} color="#E01E1E" /> Incluse pour mes clients
        </button>
        <button type="button" style={chip(mode === "payant")} onClick={() => setMode("payant")}>
          <Lock size={15} color="#E01E1E" /> Payante
        </button>
      </div>
      {mode === "payant" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Prix (€)</label>
            <input style={input} inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="97" aria-label="Prix" />
          </div>
          <div>
            <label style={lbl}>Ton lien de paiement</label>
            <input style={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://buy.stripe.com/..." aria-label="Lien de paiement" />
          </div>
        </div>
      )}
      <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "0 0 10px", lineHeight: 1.5 }}>
        {mode === "inclus"
          ? "Tous tes clients la voient dès qu'elle est publiée. Tu peux aussi l'offrir à quelqu'un d'autre ci-dessous."
          : "Tes clients voient la formation et son prix, avec ton lien de paiement. Après l'achat, donne l'accès à la personne ci-dessous."}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => updateFormation(formationId, { access_mode: mode, price_eur: mode === "payant" && p.trim() ? Number(p.replace(",", ".")) : null, payment_url: mode === "payant" ? url : null }), "Réglages enregistrés.")}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", opacity: pending ? 0.6 : 1 }}
      >
        Enregistrer
      </button>

      <div style={{ borderTop: "1px solid rgba(245,237,237,0.07)", marginTop: 14, paddingTop: 12 }}>
        <p style={{ ...lbl, marginBottom: 8 }}>Donner l&apos;accès</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {grantable.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              <select style={input} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Client">
                <option value="">Un de mes clients</option>
                {grantable.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" disabled={pending || !who} style={ghost} onClick={() => run(() => grantFormationAccessAction(formationId, { userId: who }), "Accès donné.", () => setWho(""))}>
                <Check size={12} />
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ou son email" aria-label="Email" />
            <button type="button" disabled={pending || !email.trim()} style={ghost} onClick={() => run(() => grantFormationAccessAction(formationId, { email }), "Accès donné.", () => setEmail(""))}>
              <Check size={12} />
            </button>
          </div>
        </div>

        {granted.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {granted.map((g) => (
              <div key={g.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(245,237,237,0.8)" }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.name}
                  {g.email ? <span style={{ color: "rgba(245,237,237,0.4)" }}> · {g.email}</span> : null}
                </span>
                <button type="button" disabled={pending} aria-label="Retirer l'accès" style={{ background: "none", border: "none", color: "rgba(245,237,237,0.45)", cursor: "pointer" }} onClick={() => run(() => revokeFormationAccessAction(formationId, g.userId), "Accès retiré.")}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {mode === "payant" && url && (
        <button
          type="button"
          style={{ ...ghost, marginTop: 12 }}
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }}
        >
          <Copy size={12} /> {copied ? "Lien copié" : "Copier le lien de paiement"}
        </button>
      )}
      {msg && <p style={{ fontSize: 12, color: msg.ok ? "#4ade80" : "#fca5a5", margin: "10px 0 0" }}>{msg.text}</p>}
    </section>
  );
}
