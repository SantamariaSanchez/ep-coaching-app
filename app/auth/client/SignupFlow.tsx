"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Heart, PhoneCall } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";
import { selfSignup } from "./actions";

// Avant de reserver un appel, le prospect passe par un questionnaire de
// prequalification — plus de lien Calendly direct.
const PREQUALIFICATION_URL = "https://ep-coaching-formulaires.vercel.app/prequalification";

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

type Step = "info" | "choix";

export default function SignupFlow({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("coach") ?? undefined;
  // Item 41 : lien de parrainage /auth/client?ref=CODE, indépendant du code
  // coach ci-dessus — ne change jamais l'attribution, sert juste à créditer
  // qui a invité.
  const refCode = searchParams.get("ref") ?? undefined;
  const [step, setStep] = useState<Step>("info");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null); // "free" | "coaching" | null

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || password.length < 8) {
      setError("Prénom, email, téléphone et mot de passe (8 caractères min.) requis.");
      return;
    }
    setCreatingAccount(true);
    try {
      const result = await selfSignup({ fullName, email, phone, password, inviteCode, refCode });
      if ("error" in result) {
        setError(result.error);
        setCreatingAccount(false);
        return;
      }
      setStep("choix");
    } catch {
      setError("Une erreur est survenue. Réessaie.");
    }
    setCreatingAccount(false);
  }

  // Le compte existe déjà à ce stade (créé à l'étape précédente) : ces deux
  // choix ne font que rediriger, jamais perdre ce que la personne a saisi.
  function handleChoice(choice: "free" | "coaching") {
    setSubmitting(choice);
    if (choice === "coaching") {
      window.location.href = PREQUALIFICATION_URL;
    } else {
      router.push("/dashboard/client");
      router.refresh();
    }
  }

  return (
    <div>
      {step === "info" && (
        <form onSubmit={handleCreateAccount} className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ marginBottom: 2 }}>
            <h2 style={{ fontWeight: 800, fontSize: 19, color: "#F5EDED", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Crée ton compte
            </h2>
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: 0, lineHeight: 1.5 }}>
              Accès immédiat à la communauté, aux recettes et au suivi. Gratuit, en 30 secondes.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Prénom et nom</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Ton prénom et nom" aria-label="Ton prénom et nom" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ton@email.com" aria-label="ton@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="06 12 34 56 78" aria-label="06 12 34 56 78" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              inputStyle={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={{
              padding: "12px 16px",
              background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.25)",
              borderRadius: 8, fontSize: 13, color: "#FDC4C4",
            }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={creatingAccount} className="ep-btn-primary" style={{ width: "100%", height: 48, fontSize: 13, marginTop: 4 }}>
            {creatingAccount ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>
      )}

      {step === "choix" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 19, color: "#F5EDED", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Compte créé 🎉
            </h2>
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)", margin: 0 }}>
              Rejoins la communauté gratuitement, ou passe directement en coaching premium.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleChoice("free")}
            disabled={submitting !== null}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 18px", borderRadius: 12,
              border: "1px solid rgba(245,237,237,0.3)",
              background: "rgba(245,237,237,0.1)",
              color: "#F5EDED", cursor: "pointer", textAlign: "left",
            }}
          >
            <Heart size={20} style={{ color: "#F5EDED", flexShrink: 0 }} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>Rejoindre la communauté</span>
              <span style={{ display: "block", fontSize: 11, color: "rgba(245,237,237,0.5)", marginTop: 2 }}>
                Gratuit · Victoires, Questions, Ressources
              </span>
            </span>
            {submitting === "free" ? (
              <div style={{ width: 16, height: 16, border: "2px solid #F5EDED", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
            ) : (
              <ChevronRight size={16} style={{ color: "#F5EDED" }} />
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(245,237,237,0.08)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(245,237,237,0.25)", textTransform: "uppercase" }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "rgba(245,237,237,0.08)" }} />
          </div>

          <button
            type="button"
            onClick={() => handleChoice("coaching")}
            disabled={submitting !== null}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 18px", borderRadius: 12,
              border: "1px solid rgba(224,30,30,0.45)",
              background: "rgba(224,30,30,0.12)",
              color: "#F5EDED", cursor: "pointer", textAlign: "left",
            }}
          >
            <PhoneCall size={18} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>Je veux un coaching individuel</span>
              <span style={{ display: "block", fontSize: 10, color: "rgba(245,237,237,0.35)", marginTop: 2 }}>
                Réserve ton appel découverte de 30 min
              </span>
            </span>
            {submitting === "coaching" ? (
              <div style={{ width: 16, height: 16, border: "2px solid #E01E1E", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
            ) : (
              <ChevronRight size={16} style={{ color: "rgba(224,30,30,0.6)" }} />
            )}
          </button>
        </div>
      )}

      {step === "info" && (
        <button
          type="button"
          onClick={onLoginClick}
          style={{
            display: "block", width: "100%", textAlign: "center",
            marginTop: 18, background: "none", border: "none",
            color: "rgba(245,237,237,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Déjà membre ? <span style={{ color: "#E01E1E" }}>Me connecter</span>
        </button>
      )}
    </div>
  );
}
