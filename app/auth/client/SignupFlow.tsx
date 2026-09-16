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
  // Acceptation explicite des conditions : jamais pré-cochée, et vérifiée aussi
  // côté serveur (voir selfSignup) — une case cochée dans le navigateur ne
  // prouve rien face à une requête forgée.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Consentement newsletter SÉPARÉ (2026-09-10) — jamais pré-coché : la
  // politique de confidentialité promet un consentement distinct de
  // l'acceptation des CGU pour la newsletter, voir selfSignup côté serveur.
  const [wantsNewsletter, setWantsNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null); // "free" | "coaching" | null

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Retour direct 2026-09-16 (repasse UX inscription) : un seul message
    // générique quel que soit le champ en cause forçait à relire tout le
    // formulaire pour deviner lequel corriger. Dit maintenant précisément
    // quel champ manque/est invalide, un à la fois (le plus utile en
    // premier).
    if (!fullName.trim()) {
      setError("Ton prénom et nom sont requis.");
      return;
    }
    if (!email.trim()) {
      setError("Ton email est requis.");
      return;
    }
    if (!phone.trim()) {
      setError("Ton numéro de téléphone est requis.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (!acceptedTerms) {
      setError("Tu dois accepter les conditions d'utilisation pour créer ton compte.");
      return;
    }
    setCreatingAccount(true);
    try {
      const result = await selfSignup({ fullName, email, phone, password, inviteCode, refCode, acceptedTerms, wantsNewsletter });
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
              Accès immédiat à ton entraînement, ta nutrition et ton suivi de progression. Gratuit
              pendant 60 jours, en 30 secondes.
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
            {/* Retour direct 2026-09-16 : le seuil de 8 caractères n'était
                visible qu'après un premier échec de soumission. Le dire
                avant évite cet aller-retour, surtout ici où la promesse
                affichée juste au-dessus est "en 30 secondes". */}
            <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", margin: "6px 0 0" }}>
              8 caractères minimum.
            </p>
          </div>

          {/* Acceptation des conditions. Le compte gratuit est borné à 60 jours
              et comporte des limites réelles : c'est dit ici en clair, pas
              seulement dans un lien que personne n'ouvre. */}
          <label
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
              padding: "12px 14px", borderRadius: 8,
              background: acceptedTerms ? "rgba(224,30,30,0.06)" : "rgba(245,237,237,0.03)",
              border: `1px solid ${acceptedTerms ? "rgba(224,30,30,0.3)" : "rgba(245,237,237,0.08)"}`,
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ width: 17, height: 17, marginTop: 1, accentColor: "#E01E1E", flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(245,237,237,0.55)" }}>
              J&apos;accepte les{" "}
              <a href="/legal/cgu" target="_blank" rel="noopener noreferrer" style={{ color: "#E01E1E", fontWeight: 700 }}>
                conditions d&apos;utilisation
              </a>
              ,{" "}
              <a href="/legal/cgv" target="_blank" rel="noopener noreferrer" style={{ color: "#E01E1E", fontWeight: 700 }}>
                les CGV
              </a>{" "}
              et la{" "}
              <a href="/legal/confidentialite" target="_blank" rel="noopener noreferrer" style={{ color: "#E01E1E", fontWeight: 700 }}>
                politique de confidentialité
              </a>
              . Je comprends que le compte gratuit dure 60 jours, qu&apos;il est suspendu ensuite si je
              ne prends pas d&apos;accompagnement, et qu&apos;un compte laissé sans connexion pendant 60
              jours est supprimé.
            </span>
          </label>

          {/* Newsletter — consentement SÉPARÉ de la case CGU ci-dessus,
              jamais pré-coché (RGPD : un consentement doit être une action
              affirmative, pas une case déjà cochée à décocher). */}
          <label
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
              padding: "12px 14px", borderRadius: 8, marginTop: 10,
              background: wantsNewsletter ? "rgba(224,30,30,0.06)" : "rgba(245,237,237,0.03)",
              border: `1px solid ${wantsNewsletter ? "rgba(224,30,30,0.3)" : "rgba(245,237,237,0.08)"}`,
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            <input
              type="checkbox"
              checked={wantsNewsletter}
              onChange={(e) => setWantsNewsletter(e.target.checked)}
              style={{ width: 17, height: 17, marginTop: 1, accentColor: "#E01E1E", flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(245,237,237,0.55)" }}>
              Je veux aussi recevoir la newsletter EP Coaching (conseils entraînement, nutrition,
              mindset, un mail de temps en temps). Optionnel, désinscription en un clic à tout moment.
            </span>
          </label>

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
