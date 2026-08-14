"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, FlaskConical, Users, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { sendTestMailing, sendMailingToClients, getMailingRecipientCount, MAX_RECIPIENTS_PER_SEND } from "@/app/dashboard/coach/mailing/actions";
import type { CoachMailing } from "@/lib/coach-mailings";

// Axe 2 (VISION.md) : mailing par coach — segmentation par tag/liste sous
// le compte Brevo unique (décision prise avec l'utilisateur, 2026-08-14).
// Envoie de vrais emails à de vrais clients : jamais d'auto-envoi, chaque
// diffusion exige une confirmation explicite + un envoi de test d'abord
// possible.
export default function CoachMailingComposer({ initialHistory }: { initialHistory: CoachMailing[] }) {
  const [history, setHistory] = useState(initialHistory);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialHistory change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getMailingRecipientCount().then((r) => setRecipientCount(r.count));
  }, []);

  function sendTest() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await sendTestMailing(subject, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTestSent(true);
    });
  }

  function confirmSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendMailingToClients(subject, body);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      setSuccess(`Envoyé à ${result.recipientCount} client${(result.recipientCount ?? 0) > 1 ? "s" : ""}.`);
      setHistory((prev) => [
        { id: `tmp-${Date.now()}`, subject, recipient_count: result.recipientCount ?? 0, status: "sent", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setSubject("");
      setBody("");
      setTestSent(false);
      setConfirming(false);
    });
  }

  const overLimit = recipientCount != null && recipientCount > MAX_RECIPIENTS_PER_SEND;

  return (
    <div>
      <div className="ep-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
          <Users size={13} />
          {recipientCount == null ? "..." : `${recipientCount} client${recipientCount > 1 ? "s" : ""} actif${recipientCount > 1 ? "s" : ""} recevrai${recipientCount > 1 ? "ent" : "t"} ce mail`}
        </div>

        <input
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setTestSent(false); }}
          placeholder="Sujet" aria-label="Sujet"
          style={inputStyle}
        />
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setTestSent(false); }}
          placeholder="Ton message (HTML simple accepté : <b>, <a href>, <br>...)" aria-label="Ton message (HTML simple accepté : <b>, <a href>, <br>...)"
          rows={8}
          style={{ ...inputStyle, marginTop: 8, resize: "vertical", fontFamily: "inherit" }}
        />

        {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
        {success && <p style={{ color: "#4ade80", fontSize: 12, marginTop: 8 }}>{success}</p>}
        {overLimit && (
          <p style={{ color: "#fbbf24", fontSize: 11.5, marginTop: 8 }}>
            {recipientCount} clients dépasse le plafond de {MAX_RECIPIENTS_PER_SEND} par envoi (compte Brevo gratuit,
            partagé avec les emails critiques de l&apos;appli). Contacte-moi pour augmenter le plafond si besoin.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={sendTest}
            disabled={isPending || !subject.trim() || !body.trim()}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/50 hover:text-[#F5EDED]/80 disabled:opacity-30 transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
          >
            <FlaskConical size={13} /> {testSent ? "Test envoyé ✓" : "Envoyer un test (à moi)"}
          </button>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={isPending || !subject.trim() || !body.trim() || overLimit || !recipientCount}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#E01E1E", color: "#fff",
                padding: "9px 16px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, border: "none",
                cursor: "pointer", opacity: isPending || !subject.trim() || !body.trim() || overLimit || !recipientCount ? 0.4 : 1,
              }}
            >
              <Send size={13} /> Envoyer à mes clients
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: "#fbbf24", fontWeight: 700 }}>
                Confirmer l&apos;envoi à {recipientCount} client{(recipientCount ?? 0) > 1 ? "s" : ""} ?
              </span>
              <button
                type="button"
                onClick={confirmSend}
                disabled={isPending}
                style={{ background: "#E01E1E", color: "#fff", padding: "7px 14px", borderRadius: 999, fontWeight: 800, fontSize: 11.5, border: "none", cursor: "pointer" }}
              >
                {isPending ? "..." : "Oui, envoyer"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                style={{ background: "none", color: "rgba(245,237,237,0.4)", padding: "7px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11.5, border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer" }}
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2">Historique</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((m) => (
              <div key={m.id} className="ep-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                {m.status === "sent" ? (
                  <CheckCircle2 size={13} style={{ color: "#4ade80", flexShrink: 0 }} />
                ) : (
                  <XCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                )}
                <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 12, fontWeight: 700, color: "#F5EDED" }}>{m.subject}</p>
                <span style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", flexShrink: 0 }}>
                  {m.status === "sent" ? `${m.recipient_count} destinataires` : "échec"}
                </span>
                <span style={{ fontSize: 10, color: "rgba(245,237,237,0.25)", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock3 size={10} />
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(m.created_at))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};
