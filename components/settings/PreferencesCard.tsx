"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Check } from "lucide-react";
import { PREFERENCE_QUESTIONS, type MemberPreferences } from "@/lib/personalization";
import { saveMemberPreferences } from "@/app/onboarding/actions";

// Priorité 1 du mandat permanent (rétention/activation) : le quiz de
// personnalisation (objectif, niveau, obstacle...) ne se répondait qu'une
// fois à l'inscription puis restait figé pour toujours, alors qu'il pilote
// réellement l'ordre des fonctionnalités et les messages du dashboard
// (derivePersonalization, lib/personalization.ts) — un objectif qui change
// 3 mois plus tard ne se reflétait donc jamais nulle part. Même pattern
// optimiste + tap-to-save que CoachSpecializationsCard : chaque réponse se
// sauvegarde seule, pas de bouton "Enregistrer" séparé. saveMemberPreferences
// fait déjà un upsert partiel (les autres champs ne sont jamais touchés),
// donc rejouable question par question sans risque d'écraser le reste.
export default function PreferencesCard({
  initialPreferences,
}: {
  initialPreferences: MemberPreferences | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<MemberPreferences>>(initialPreferences ?? {});
  const [isPending, startTransition] = useTransition();
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function select<K extends keyof MemberPreferences>(key: K, value: NonNullable<MemberPreferences[K]>) {
    const previous = answers[key] ?? null;
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSavedKey(null);
    startTransition(async () => {
      const result = await saveMemberPreferences({ [key]: value } as Partial<MemberPreferences>);
      if (result.error) {
        setAnswers((prev) => ({ ...prev, [key]: previous }));
      } else {
        setSavedKey(key);
        setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800);
        // Sans ça, le tableau de bord (Router Cache client, pas concerné par
        // le revalidatePath serveur) continuerait de servir l'ancien ordre de
        // personnalisation tant qu'un rechargement complet ne le forcerait
        // pas — même cause que le bug de l'Axe FO (MASTERCLASS.md).
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1 flex items-center gap-1.5">
        <SlidersHorizontal size={12} /> Ton profil
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Personnalisation</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <p style={{ margin: "0 0 16px", fontSize: 11, color: "rgba(245,237,237,0.45)", lineHeight: 1.5 }}>
          Tes réponses au questionnaire de bienvenue, modifiables à tout moment. Ça change
          l&apos;ordre de ce qui t&apos;est proposé sur ton tableau de bord et les messages que tu vois,
          donc ça vaut le coup de les tenir à jour si ta situation évolue.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PREFERENCE_QUESTIONS.map((question) => (
            <div key={question.key}>
              <p style={{
                margin: "0 0 8px", fontSize: 12.5, fontWeight: 700, color: "#F5EDED",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {question.title}
                {savedKey === question.key && (
                  <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 10.5, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Check size={11} /> Enregistré
                  </span>
                )}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {question.options.map((opt) => {
                  const active = answers[question.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isPending}
                      onClick={() => select(question.key, opt.value)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "7px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: active ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
                        background: active ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
                        color: active ? "#F5EDED" : "rgba(245,237,237,0.55)",
                        transition: "background 0.15s ease, border-color 0.15s ease",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
