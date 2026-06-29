"use client";

import Link from "next/link";
import { EPLogo } from "@/components/ui/EPLogo";

export default function SignupGateModal() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0D0000",
          border: "1px solid rgba(224,30,30,0.3)",
          borderRadius: 18,
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <EPLogo size="md" showCoaching />
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#F5EDED",
            margin: "0 0 10px",
            lineHeight: 1.25,
          }}
        >
          Accède à toutes les ressources gratuitement.
        </h2>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", lineHeight: 1.6, margin: "0 0 26px" }}>
          Crée ton compte EP Coaching en 30 secondes.
        </p>

        <Link
          href="/auth/client"
          className="ep-btn-primary"
          style={{ display: "flex", width: "100%", height: 50, fontSize: 13, justifyContent: "center" }}
        >
          Créer mon compte
        </Link>

        <Link
          href="/auth/client?mode=login"
          style={{
            display: "block",
            marginTop: 16,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(245,237,237,0.3)",
            textDecoration: "none",
          }}
        >
          J&apos;ai déjà un compte
        </Link>
      </div>
    </div>
  );
}
