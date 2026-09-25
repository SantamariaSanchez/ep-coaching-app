"use client";

import { useState } from "react";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClientSupabase } from "@/lib/supabase-client";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned-password";

export default function StaffPasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) return setMessage({ text: "8 caractères minimum.", ok: false });
    if (password !== confirm) return setMessage({ text: "Les deux mots de passe ne correspondent pas.", ok: false });
    setBusy(true);
    if (await isPasswordPwned(password)) {
      setBusy(false);
      return setMessage({ text: PWNED_PASSWORD_MESSAGE, ok: false });
    }
    const { error } = await createClientSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage({ text: "Mise à jour impossible. Reconnecte-toi puis réessaie.", ok: false });
    setPassword("");
    setConfirm("");
    setMessage({ text: "Mot de passe mis à jour.", ok: true });
  }

  return (
    <form onSubmit={save} className="ep-card" style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" autoComplete="new-password" className="ep-input" />
      <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirme le mot de passe" aria-label="Confirme le mot de passe" autoComplete="new-password" className="ep-input" />
      {message && <p role="status" style={{ fontSize: 12, margin: 0, color: message.ok ? "#4ade80" : "#FDC4C4" }}>{message.text}</p>}
      <button type="submit" disabled={busy} className="ep-btn-primary" style={{ height: 42, fontSize: 12 }}>
        {busy ? "Mise à jour..." : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
