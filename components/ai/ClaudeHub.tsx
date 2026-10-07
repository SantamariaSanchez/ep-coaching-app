"use client";

import { useState } from "react";
import { ShieldCheck, Sparkles, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import ClaudeConnect from "@/components/notes/ClaudeConnect";
import ClaudePrompt from "@/components/ai/ClaudePrompt";
import { promptGroupsFor, type ClaudeRole } from "@/lib/claude-prompts";

type Token = { id: string; name: string; created_at: string; last_used_at: string | null };

const FAQ: [string, string][] = [
  ["Faut-il une clé d'API ou savoir coder ?", "Non. Tu utilises ton propre compte Claude et une adresse de connecteur générée ici. Tout se fait en cliquant et en parlant normalement."],
  ["Faut-il payer Claude ?", "Il te faut un compte Claude. Selon ton offre Claude, l'ajout de connecteurs peut être limité : les demandes toutes prêtes de cette page marchent aussi sans connecteur, il suffit de coller tes infos dans la conversation."],
  ["Qu'est-ce que Claude peut faire dans mon compte ?", "Lire tes chiffres, et ajouter des notes, un bilan du jour, des repas, des scripts, des idées et ton positionnement. Il ne peut rien supprimer."],
  ["Mes données sont-elles protégées ?", "Ta clé ne donne accès qu'à tes propres données (et à celles de tes clients si tu es coach). Supprime-la ici à tout moment : Claude perd l'accès immédiatement."],
  ["Et Notion ?", "Ajoute aussi le connecteur Notion officiel dans Claude. Dans une conversation, active EP Coaching et Notion : Claude fait le lien entre les deux, sans copier-coller."],
];

// Page « Claude et Notion » : relier son compte Claude en 2 minutes, puis
// des demandes toutes prêtes adaptées au rôle (coach, client, métier).
export default function ClaudeHub({ role, tokens }: { role: ClaudeRole; tokens: Token[] }) {
  const t = useT();
  const groups = promptGroupsFor(role);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const connected = tokens.some((k) => k.last_used_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="ep-card-hero" style={{ padding: "16px 18px", display: "flex", gap: 12 }}>
        <Sparkles size={20} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "#F5EDED" }}>
            {connected ? t("Claude est relié à ton compte EP Coaching.") : t("Ton assistant IA personnel, sans clé d'API ni code.")}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.55 }}>
            {role === "coach"
              ? t("Claude lit tes clients, tes stats réseaux et ton positionnement, écrit tes scripts et les range dans ton Studio, et construit tes pages Notion.")
              : role === "staff"
                ? t("Claude résume ta semaine, range tes comptes rendus et tes idées dans tes notes, et fait le lien avec Notion.")
                : t("Claude note ta journée, ajoute tes repas à partir d'une photo, analyse ta semaine et tes records, et fait le lien avec Notion.")}
          </p>
        </div>
      </div>

      <section>
        <p className="ep-label" style={{ marginBottom: 8 }}>{t("1. Relier Claude (2 minutes, une seule fois)")}</p>
        <ClaudeConnect tokens={tokens} defaultOpen={!connected} />
      </section>

      {groups.map((g, gi) => (
        <section key={g.title}>
          <p className="ep-label" style={{ marginBottom: 8 }}>
            {gi === 0 ? `2. ${t("Ce que tu peux lui demander")} : ` : ""}{t(g.title)}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {g.cards.map((c) => (
              <ClaudePrompt key={c.title} title={t(c.title)} hint={t(c.hint)} prompt={t(c.prompt)} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <HelpCircle size={12} /> {t("Questions fréquentes")}
        </p>
        <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
          {FAQ.map(([q, a], i) => (
            <div key={q} style={{ borderTop: i ? "1px solid rgba(245,237,237,0.06)" : "none" }}>
              <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "none", border: "none", color: "#F5EDED", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 700 }}>
                <span style={{ flex: 1 }}>{t(q)}</span>
                {faqOpen === i ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {faqOpen === i && <p style={{ margin: 0, padding: "0 14px 13px", fontSize: 12.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.55 }}>{t(a)}</p>}
            </div>
          ))}
        </div>
      </section>

      <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>
        <ShieldCheck size={13} /> {t("Claude ne peut rien supprimer dans ton compte.")}
      </p>
    </div>
  );
}
