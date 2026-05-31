"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, User } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { submitClientRequest, loginClient } from "./actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.15)",
  borderRadius: 8,
  color: "#F5EDED",
  padding: "11px 14px",
  fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
  fontWeight: 500,
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(224,30,30,0.8)",
  marginBottom: 7,
};

// ── Inscription form ──────────────────────────────────────────────────────────

function InscriptionForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(submitClientRequest, null);

  if (state?.success) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <CheckCircle2 size={48} style={{ color: "#4ade80", margin: "0 auto 16px" }} strokeWidth={1.5} />
        <h3 style={{ fontWeight: 800, fontSize: 20, color: "#F5EDED", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Compte créé !
        </h3>
        <p style={{ fontSize: 14, color: "rgba(245,237,237,0.6)", margin: "0 0 8px", lineHeight: 1.6 }}>
          {state.message ?? "Tes identifiants arrivent par email."}
        </p>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: "0 0 24px" }}>
          Vérifie ta boîte mail (et les spams).
        </p>
        <button onClick={onSuccess} className="ep-btn-primary" style={{ width: "100%", height: 44 }}>
          Me connecter maintenant →
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Nom */}
      <div>
        <label style={labelStyle}>Prénom et Nom</label>
        <input name="nom" type="text" required placeholder="Jean Dupont" style={inputStyle} />
      </div>

      {/* Email + Téléphone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input name="email" type="email" required placeholder="ton@email.com" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Téléphone</label>
          <input name="telephone" type="tel" required placeholder="06 XX XX XX XX" style={inputStyle} />
        </div>
      </div>

      {/* Objectif */}
      <div>
        <label style={labelStyle}>Objectif principal</label>
        <textarea
          name="objectif"
          required
          placeholder="Pourquoi veux-tu être coaché ?"
          rows={3}
          style={{ ...inputStyle, resize: "none" }}
        />
      </div>

      {/* Niveau + Dispo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Niveau</label>
          <select name="niveau" required style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Choisir…</option>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Séances / semaine</label>
          <select name="dispo" required style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Choisir…</option>
            <option>3j</option>
            <option>4j</option>
            <option>5j</option>
            <option>6j</option>
          </select>
        </div>
      </div>

      {/* Source */}
      <div>
        <label style={labelStyle}>Comment tu as connu EP Coaching ?</label>
        <select name="source" required style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Choisir…</option>
          <option>Instagram</option>
          <option>Bouche à oreille</option>
          <option>YouTube</option>
          <option>Autre</option>
        </select>
      </div>

      {state?.error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(224,30,30,0.08)",
          border: "1px solid rgba(224,30,30,0.25)",
          borderRadius: 8,
          fontSize: 13,
          color: "#FDC4C4",
        }}>
          ⚠ {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="ep-btn-primary"
        style={{ width: "100%", height: 48, fontSize: 13, marginTop: 4 }}
      >
        {pending ? "Envoi en cours…" : "ENVOYER MA DEMANDE"}
      </button>
    </form>
  );
}

// ── Connexion form ────────────────────────────────────────────────────────────

function ConnexionForm() {
  const [state, formAction, pending] = useActionState(loginClient, null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>Email</label>
        <input name="email" type="email" required placeholder="ton@email.com" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Mot de passe</label>
        <input name="password" type="password" required placeholder="••••••••" style={inputStyle} />
      </div>

      {state?.error && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "rgba(224,30,30,0.08)",
          border: "1px solid rgba(224,30,30,0.25)",
          borderRadius: 8,
        }}>
          <span style={{ color: "#E01E1E", flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="ep-btn-primary"
        style={{ width: "100%", height: 48, fontSize: 13 }}
      >
        {pending ? "Connexion…" : "SE CONNECTER"}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientAuthPage() {
  const [tab, setTab] = useState<"inscription" | "connexion">("connexion");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 0",
    background: active ? "rgba(224,30,30,0.12)" : "transparent",
    border: `1px solid ${active ? "rgba(224,30,30,0.35)" : "rgba(224,30,30,0.1)"}`,
    borderRadius: 8,
    color: active ? "#E01E1E" : "rgba(245,237,237,0.3)",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        background:
          "radial-gradient(ellipse 70% 60% at 50% 30%, #3D0505 0%, #1A0101 40%, #0D0000 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Back */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(245,237,237,0.3)", textDecoration: "none",
          fontSize: 12, fontWeight: 600, marginBottom: 28,
        }}>
          <ChevronLeft size={14} />
          Retour
        </Link>

        {/* Logo + header */}
        <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <EPLogo size="md" showCoaching />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <User size={13} style={{ color: "rgba(224,30,30,0.7)" }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)" }}>
              Espace Client
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="animate-fade-up stagger-2" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button style={tabStyle(tab === "connexion")} onClick={() => setTab("connexion")}>
            Me connecter
          </button>
          <button style={tabStyle(tab === "inscription")} onClick={() => setTab("inscription")}>
            M&apos;inscrire
          </button>
        </div>

        {/* Content */}
        <div className="animate-fade-up stagger-3">
          {tab === "connexion" ? (
            <>
              <h2 style={{ fontWeight: 800, fontSize: 20, color: "#F5EDED", letterSpacing: "-0.03em", margin: "0 0 20px" }}>
                Mon espace client
              </h2>
              <ConnexionForm />
            </>
          ) : (
            <>
              <h2 style={{ fontWeight: 800, fontSize: 20, color: "#F5EDED", letterSpacing: "-0.03em", margin: "0 0 4px" }}>
                Rejoindre le coaching
              </h2>
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)", margin: "0 0 20px" }}>
                Remplis ce formulaire, Emmanuel te contactera.
              </p>
              <InscriptionForm onSuccess={() => setTab("connexion")} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
