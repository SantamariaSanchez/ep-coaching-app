"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

// Inscription newsletter Brevo (POST /api/newsletter/subscribe, voir cette
// route pour le detail : liste "Newsletter EP Coaching" id 6, deja
// existante). Un seul composant reutilise sur la home et sur /ressources
// (deux points d'entree publics, voir la demande explicite d'implementer
// "dans le site et dans l'app"). Classes .ep-input/.ep-btn-primary : le
// systeme de design existant (globals.css), pas de nouveau style invente.
export default function NewsletterSignupForm({
  source,
  compact = false,
}: {
  source: "app_home" | "ressources";
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, jamais affiche
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading" || state === "done") return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, website }),
      });
      const data = (await res.json()) as { ok: boolean };
      setState(data.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: compact ? "14px 16px" : "18px 20px",
          color: "#F5EDED",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Check size={16} color="#E01E1E" /> Inscription confirmée, à demain !
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        gap: 10,
        width: "100%",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(245,237,237,0.7)",
          display: compact ? "none" : "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Mail size={14} color="#E01E1E" /> Un mail par jour : conseils entraînement, nutrition, mindset
      </p>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {/* Honeypot anti-bot : jamais visible, jamais rempli par un humain. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <input
          type="email"
          required
          placeholder="ton@email.com" aria-label="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ep-input"
          style={{ flex: 1, fontSize: 15 }}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="ep-btn-primary"
          style={{ whiteSpace: "nowrap", padding: "0 20px" }}
        >
          {state === "loading" ? "..." : "Je m'inscris"}
        </button>
      </div>
      {state === "error" && (
        <p style={{ margin: 0, fontSize: 12, color: "#FDC4C4" }}>
          L&rsquo;inscription n&rsquo;a pas fonctionné, réessaie dans un instant.
        </p>
      )}
    </form>
  );
}
