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
  const title = clientCount === 0 ? t("Invite ton 1er client") : t("Inviter un client");

  // Discret (retour fondateur 2026-10-21 : « enlève le gros lien avec le
  // pavé long, ça doit être discret ») : une seule ligne avec Partager et
  // Copier ; le lien, les autres canaux et le mode d'emploi restent repliés.
  return (
    <section
      className="ep-card animate-fade-up"
      aria-labelledby="invite-first-client-title"
      style={{ padding: "12px 14px", marginBottom: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <UserPlus size={16} style={{ color: "var(--ep-accent)", flexShrink: 0 }} strokeWidth={1.9} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 id="invite-first-client-title" style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ep-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </h2>
          <p style={{ margin: "1px 0 0", fontSize: 11, lineHeight: 1.4, color: "rgba(var(--ep-ink-rgb),0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t("Il sera rattaché à toi")}
          </p>
        </div>
        {link ? (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={share} style={{ ...primary, minHeight: 34, padding: "0 12px" }}>
              <Share2 size={13} />
              {t("Partager")}
            </button>
            <button
              type="button"
              onClick={() => copy("link")}
              aria-label={copied === "link" ? t("Lien copié") : t("Copier le lien")}
              title={copied === "link" ? t("Lien copié") : t("Copier le lien")}
              style={{ ...ghost, minHeight: 34, width: 34, padding: 0 }}
            >
              {copied === "link" ? <Check size={14} style={{ color: "var(--ep-ok)" }} /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <button type="button" onClick={generate} disabled={loading} style={{ ...primary, minHeight: 34, padding: "0 12px", flexShrink: 0 }}>
            <Send size={13} />
            {loading ? t("Génération...") : t("Créer mon lien")}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ep-bad)" }}>
          {error}
        </p>
      )}

      {(link || showSteps) && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", listStylePosition: "inside" }}>
            {t("Autres options")}
          </summary>
          {link && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 8px", minWidth: 0 }}>
                <Link2 size={12} style={{ color: "rgba(var(--ep-ink-rgb),0.4)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                  {link}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer" style={{ ...ghost, minHeight: 32, fontSize: 11 }}>
                  <MessageCircle size={13} /> WhatsApp
                </a>
                <a href={`sms:?&body=${encoded}`} style={{ ...ghost, minHeight: 32, fontSize: 11 }}>
                  <Smartphone size={13} /> SMS
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(t("Ton coaching sur EP Coaching"))}&body=${encoded}`} style={{ ...ghost, minHeight: 32, fontSize: 11 }}>
                  <Mail size={13} /> {t("E-mail")}
                </a>
                <button type="button" onClick={() => copy("message")} style={{ ...ghost, minHeight: 32, fontSize: 11 }}>
                  {copied === "message" ? <Check size={13} style={{ color: "var(--ep-ok)" }} /> : <Copy size={13} />}
                  {copied === "message" ? t("Message copié") : t("Copier un message tout prêt")}
                </button>
              </div>
            </>
          )}
          {showSteps && (
            <ol style={{ margin: "10px 0 0", paddingLeft: 18, listStyle: "decimal", display: "grid", gap: 4, fontSize: 11.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
              <li>{t("Il crée son compte avec ton lien (30 secondes) et apparaît dans tes Clients.")}</li>
              <li>{t("Tu ouvres sa fiche et cliques « Activer le coaching ».")}</li>
              <li>{t("Il remplit sa fiche de départ, puis retrouve programme, diète, bilans et messages.")}</li>
            </ol>
          )}
        </details>
      )}
    </section>
  );
}
