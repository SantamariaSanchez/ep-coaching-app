"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Champ mot de passe avec bascule afficher/masquer — évite de taper un mot
// de passe à l'aveugle sans jamais pouvoir vérifier ce qu'on a saisi.
export default function PasswordInput({
  inputStyle,
  wrapperStyle,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", ...wrapperStyle }}>
      <input
        aria-label="Mot de passe"
        {...props}
        type={visible ? "text" : "password"}
        className={className}
        style={{ ...inputStyle, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          padding: 6,
          color: "rgba(245,237,237,0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
