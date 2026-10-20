"use client";

import { useState } from "react";
import { Check, Copy, Link2, Mail, MessageCircle, Send, Share2, Smartphone, UserPlus } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { ensureInviteCode } from "@/app/dashboard/coach/profile/actions";

// « Invite ton premier client » (retour direct 2026-10-20 : « c'est encore moi
// qui ai dû lui dire qu'il fallait envoyer le lien de coaching à son client,
// donc ce n'est pas clair »). Le lien d'invitation vivait seulement dans
// Paramètres : il est maintenant poussé sur l'accueil, la page Clients et
// l'onboarding tant que le coach a peu de clients, avec un message tout prêt
// et ce que le client verra en l'ouvrant.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

export function inviteLinkFor(code: string): string {
  return `${APP_URL}/auth/client?coach=${code}`;
}

export function inviteMessage(link: string, coachFirstName: string | null): string {
  const signature = coachFirstName ? `\n\n${coachFirstName}` : "";
  return (
    "Salut ! Pour ton coaching, tout va se passer sur l'appli EP Coaching : ton programme, ta diète, tes bilans et nos messages.\n\n" +
    `Crée ton compte avec ce lien (30 secondes), tu seras directement rattaché(e) à moi :\n${link}\n\n` +
    "Ensuite remplis ta fiche de départ, je prépare ton programme dès que je la reçois." +
    signature
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
const primary: React.CSSProperties = { ...btn, border: "none", background: "var(--ep-accent)", color: "var(--ep-strong)" };
const ghost: React.CSSProperties = {
  ...btn,
  border: "1px solid rgba(var(--ep-line-rgb),0.35)",
  background: "rgba(var(--ep-ink-rgb),0.03)",
  color: "var(--ep-ink)",
};

export default function InviteFirstClientCard({
  inviteCode,
  coachFirstName,
  clientCount = 0,
  showSteps = true,
}: {
  inviteCode: string | null;
  coachFirstName: string | null;
  /** 0 : « Invite ton premier client », sinon « Invite un nouveau client ». */
  clientCount?: number;
  /** Ce que voit le client en ouvrant le lien. */
  showSteps?: boolean;
}) {
  const t = useT();
  const [code, setCode] = useState(inviteCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  const link = code ? inviteLinkFor(code) : null;
  const message = link ? inviteMessage(link, coachFirstName) : "";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await ensureInviteCode();
      if (res.code) setCode(res.code);
      else setError(res.error ?? t("Lien non généré, réessaie."));
    } catch {
      setError(t("Connexion perdue, réessaie."));
    }
    setLoading(false);
  }

  async function copy(what: "link" | "message") {
    const text = what === "link" ? link : message;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(t("Copie impossible ici, sélectionne le lien à la main."));
    }
  }

  async function share() {
    if (!link) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("Mon coaching sur EP Coaching"), text: message });
        return;
      } catch {
        // Partage annulé : rien à faire.
        return;
      }
    }
    copy("message");
  }

  const encoded = encodeURIComponent(message);
  const title = clientCount === 0 ? t("Invite ton premier client") : t("Invite un nouveau client");

  return (
    <section
      className="ep-card animate-fade-up"
      aria-labelledby="invite-first-client-title"
      style={{ padding: "18px 18px 16px", marginBottom: 20, border: "1px solid rgba(var(--ep-accent-rgb),0.3)" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: "rgba(var(--ep-accent-rgb),0.12)", border: "1px solid rgba(var(--ep-accent-rgb),0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <UserPlus size={18} style={{ color: "var(--ep-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 id="invite-first-client-title" style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--ep-ink)", letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "rgba(var(--ep-ink-rgb),0.55)" }}>
            {t("Ton client ne te trouve pas tout seul : envoie-lui ton lien personnel. En s'inscrivant avec, il est rattaché à toi automatiquement.")}
          </p>
        </div>
      </div>

      {link ? (
        <>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginBottom: 10,
              background: "rgba(var(--ep-shade-rgb),0.3)", border: "1px solid rgba(var(--ep-accent-rgb),0.15)", minWidth: 0,
            }}
          >
            <Link2 size={14} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--ep-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {link}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={share} style={primary}>
              <Share2 size={14} />
              {t("Partager")}
            </button>
            <button type="button" onClick={() => copy("link")} style={ghost}>
              {copied === "link" ? <Check size={14} style={{ color: "var(--ep-ok)" }} /> : <Copy size={14} />}
              {copied === "link" ? t("Lien copié") : t("Copier le lien")}
            </button>
          </div>

          <details style={{ marginBottom: showSteps ? 12 : 0 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--ep-accent)" }}>
              {t("Message tout prêt à envoyer")}
            </summary>
            <p
              style={{
                whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, margin: "10px 0", padding: "10px 12px", borderRadius: 10,
                background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)", color: "rgba(var(--ep-ink-rgb),0.75)",
                overflowWrap: "anywhere",
              }}
            >
              {message}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer" style={ghost}>
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a href={`sms:?&body=${encoded}`} style={ghost}>
                <Smartphone size={14} /> SMS
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(t("Ton coaching sur EP Coaching"))}&body=${encoded}`} style={ghost}>
                <Mail size={14} /> {t("E-mail")}
              </a>
              <button type="button" onClick={() => copy("message")} style={ghost}>
                {copied === "message" ? <Check size={14} style={{ color: "var(--ep-ok)" }} /> : <Copy size={14} />}
                {copied === "message" ? t("Message copié") : t("Copier le message")}
              </button>
            </div>
          </details>
        </>
      ) : (
        <button type="button" onClick={generate} disabled={loading} style={{ ...primary, marginBottom: showSteps ? 12 : 0 }}>
          <Send size={14} />
          {loading ? t("Génération...") : t("Créer mon lien d'invitation")}
        </button>
      )}

      {error && (
        <p role="alert" style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ep-bad)" }}>
          {error}
        </p>
      )}

      {showSteps && (
        <div style={{ borderTop: "1px solid rgba(var(--ep-line-rgb),0.2)", paddingTop: 12 }}>
          <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.4)" }}>
            {t("Ce que voit ton client en ouvrant le lien")}
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12, lineHeight: 1.55, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
            <li>{t("Une page d'inscription EP Coaching : prénom, e-mail, téléphone, mot de passe. 30 secondes.")}</li>
            <li>{t("Son compte est créé et rattaché à toi, il apparaît aussitôt dans ta page Clients.")}</li>
            <li>{t("Toi : ouvre sa fiche et clique « Activer le coaching ».")}</li>
            <li>{t("Lui : il remplit sa fiche de départ (objectifs, santé, disponibilités), puis retrouve son programme, sa diète, ses bilans et tes messages. Le bouton « Voir comme mon client » de sa fiche te montre exactement son écran.")}</li>
          </ol>
        </div>
      )}
    </section>
  );
}
