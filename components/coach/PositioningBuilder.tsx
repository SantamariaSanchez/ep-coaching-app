"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Lightbulb, Copy } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import ClaudePrompt from "@/components/ai/ClaudePrompt";
import { savePositioningAction } from "@/app/actions/positioning";
import {
  NICHE_PRESETS, bioLines, completion, oneLiner, pillarList, positioningMarkdown,
  type Positioning,
} from "@/lib/positioning";

type Field = { key: keyof Positioning; label: string; help: string; long?: boolean };

const STEPS: { title: string; intro: string; fields: Field[] }[] = [
  {
    title: "Ta niche et ta promesse",
    intro: "Une niche, c'est une personne précise avec un problème précis. Si tu peux imaginer son prénom et sa journée, tu es sur la bonne voie.",
    fields: [
      { key: "niche", label: "Qui tu aides", help: "Qui + situation. Ex. « les salariés de 30 à 45 ans qui n'ont pas le temps ». Évite « tout le monde » ou « les gens qui veulent être en forme »." },
      { key: "result", label: "Le résultat que tu promets", help: "Concret et visible. Ex. « perdre 6 à 10 kg de gras sans régime extrême »." },
      { key: "timeframe", label: "En combien de temps", help: "Un délai réaliste. Ex. « 12 semaines »." },
      { key: "mechanism", label: "Ta méthode, en une phrase", help: "Ce qui rend le résultat possible. Ex. « 3 séances de 45 min et un plan avec leurs plats habituels »." },
    ],
  },
  {
    title: "Ton avatar client",
    intro: "Décris UNE personne, pas une moyenne. Plus c'est précis, plus ton contenu lui parle comme si tu lisais dans ses pensées.",
    fields: [
      { key: "avatarName", label: "Son prénom", help: "Donne-lui un prénom, ça aide à écrire pour une vraie personne." },
      { key: "avatarAge", label: "Âge, métier, famille", help: "Ex. « 37 ans, cadre, 2 enfants »." },
      { key: "avatarSituation", label: "Sa situation aujourd'hui", help: "Où il en est, ce qui se passe dans sa vie en ce moment.", long: true },
      { key: "pains", label: "Ce qui lui fait mal", help: "Les douleurs concrètes, pas « il veut maigrir ». Ex. « il ne rentre plus dans ses pantalons ».", long: true },
      { key: "desires", label: "Ce qu'il veut vraiment", help: "Le résultat derrière le résultat. Ex. « être un exemple pour ses enfants ».", long: true },
      { key: "objections", label: "Ses objections", help: "Ce qu'il se dit pour ne pas acheter. Ex. « je n'ai pas le temps », « j'ai déjà essayé ».", long: true },
      { key: "tried", label: "Ce qu'il a déjà essayé", help: "Régimes, applis, programmes gratuits... et pourquoi ça n'a pas marché." },
      { key: "words", label: "Ses mots exacts", help: "Les phrases qu'il emploie vraiment (commentaires, messages, appels). C'est de l'or pour tes accroches.", long: true },
      { key: "where", label: "Où il passe son temps", help: "Réseaux, horaires, podcasts, lieux." },
    ],
  },
  {
    title: "Ton offre",
    intro: "Une offre claire se résume en une phrase : ce qu'on reçoit, combien de temps, à quel prix.",
    fields: [
      { key: "offerName", label: "Nom de l'offre", help: "Ex. « Programme Ventre plat 12 semaines »." },
      { key: "offerFormat", label: "Format", help: "Suivi individuel, groupe, programme en autonomie, formation..." },
      { key: "offerPrice", label: "Prix", help: "Ex. « 200 € par mois » ou « 590 € les 12 semaines »." },
      { key: "offerIncludes", label: "Ce qui est inclus", help: "Programme, nutrition, bilans hebdo, messages, appels...", long: true },
    ],
  },
  {
    title: "Ta différence",
    intro: "Pourquoi toi plutôt qu'un autre coach ou une appli gratuite ? Ton vécu, ta méthode, tes résultats.",
    fields: [
      { key: "difference", label: "Ce qui te rend différent", help: "Ton histoire, ta spécialité, ta façon de faire.", long: true },
      { key: "proof", label: "Tes preuves", help: "Résultats clients, diplômes, ta propre transformation. Ex. « 40 clients accompagnés »." },
      { key: "enemy", label: "Ce contre quoi tu te bats", help: "Ex. « les régimes à 1 200 kcal », « les programmes copiés-collés »." },
      { key: "pillars", label: "Tes piliers de contenu", help: "3 à 5 thèmes séparés par des virgules. Ex. « repas rapides, mythes du régime, avant/après »." },
    ],
  },
];

export default function PositioningBuilder({ initial, hasClaudeKey }: { initial: Positioning; hasClaudeKey: boolean }) {
  const t = useT();
  const [data, setData] = useState<Positioning>(initial);
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<string>(initial.nicheKey || "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [howOpen, setHowOpen] = useState(!initial.niche);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaved("saving");
      const res = await savePositioningAction(data);
      setSaved(res.error ? "error" : "saved");
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data]);

  const example = useMemo(() => NICHE_PRESETS.find((p) => p.key === preset)?.example ?? {}, [preset]);
  const pct = completion(data);
  const set = (k: keyof Positioning, v: string) => setData((d) => ({ ...d, [k]: v }));

  function applyExample() {
    setData((d) => {
      const next = { ...d, nicheKey: preset };
      for (const [k, v] of Object.entries(example)) {
        const key = k as keyof Positioning;
        if (typeof v === "string" && !next[key].trim()) next[key] = v;
      }
      return next;
    });
  }

  const isResult = step === STEPS.length;
  const md = positioningMarkdown(data);
  const line = oneLiner(data);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Avancement */}
      <div className="ep-card" style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(245,237,237,0.65)", marginBottom: 6 }}>
          <span>{t("Rempli à {n} %", { n: pct })}</span>
          <span>{saved === "saving" ? t("Enregistrement...") : saved === "saved" ? t("Enregistré") : saved === "error" ? t("Pas enregistré, réessaie") : ""}</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "rgba(245,237,237,0.07)" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #890404, #E01E1E)", transition: "width 0.3s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }} className="no-scrollbar">
          {[...STEPS.map((s) => s.title), "Ma fiche finale"].map((title, i) => (
            <button
              key={title}
              type="button"
              onClick={() => setStep(i)}
              style={{ flexShrink: 0, padding: "6px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${step === i ? "rgba(224,30,30,0.6)" : "rgba(245,237,237,0.08)"}`, background: step === i ? "rgba(224,30,30,0.15)" : "transparent", color: step === i ? "#ff6b6b" : "rgba(245,237,237,0.6)" }}
            >
              {i + 1}. {t(title)}
            </button>
          ))}
        </div>
      </div>

      {/* Méthode */}
      {step === 0 && (
        <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
          <button type="button" onClick={() => setHowOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", color: "#F5EDED", cursor: "pointer", textAlign: "left" }}>
            <Lightbulb size={16} style={{ color: "#E01E1E" }} />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{t("Comment choisir sa niche")}</span>
            {howOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {howOpen && (
            <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Tu la connais de l'intérieur", "Ton vécu, ta propre transformation ou un public que tu côtoies déjà. On vend mieux ce qu'on a vécu."],
                ["Son problème est urgent", "Une douleur qu'elle veut régler maintenant (un mariage, une compétition, une douleur au dos), pas un « ce serait bien »."],
                ["Elle peut payer", "Elle a un budget et l'habitude d'investir pour elle (abonnement, vêtements, compléments)."],
                ["Tu peux la trouver", "Elle est sur les réseaux où tu publies, avec des mots-clés et des comptes que tu peux repérer."],
                ["Teste avant de tout changer", "Publie 2 à 3 semaines pour cette niche, regarde tes stats réseaux et tes messages, puis ajuste."],
              ].map(([title, body]) => (
                <div key={title} style={{ display: "flex", gap: 8 }}>
                  <Check size={14} style={{ color: "#4ade80", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.5 }}>
                    <strong style={{ color: "#F5EDED" }}>{t(title)}</strong> : {t(body)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Étapes */}
      {!isResult && (
        <section>
          <h2 style={{ margin: "4px 0 4px", fontSize: 18, fontWeight: 900, color: "#F5EDED" }}>{t(STEPS[step].title)}</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(245,237,237,0.6)", lineHeight: 1.55 }}>{t(STEPS[step].intro)}</p>

          {step === 0 && (
            <div style={{ marginBottom: 12 }}>
              <p className="ep-label" style={{ marginBottom: 6 }}>{t("Pars d'un exemple de ta niche")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {NICHE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{ padding: "7px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${preset === p.key ? "rgba(224,30,30,0.6)" : "rgba(245,237,237,0.08)"}`, background: preset === p.key ? "rgba(224,30,30,0.15)" : "rgba(245,237,237,0.04)", color: preset === p.key ? "#F5EDED" : "rgba(245,237,237,0.65)" }}
                  >
                    {t(p.label)}
                  </button>
                ))}
              </div>
              {preset && (
                <button type="button" onClick={applyExample} style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(224,30,30,0.4)", background: "rgba(224,30,30,0.1)", color: "#ff6b6b", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                  {t("Remplir les cases vides avec cet exemple")}
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS[step].fields.map((f) => {
              const ex = example[f.key];
              return (
                <label key={f.key} style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#F5EDED", marginBottom: 2 }}>{t(f.label)}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)", marginBottom: 6, lineHeight: 1.45 }}>{t(f.help)}</span>
                  {f.long ? (
                    <textarea className="ep-input" rows={3} value={data[f.key]} placeholder={typeof ex === "string" ? ex : ""} onChange={(e) => set(f.key, e.target.value)} style={{ width: "100%", resize: "vertical" }} />
                  ) : (
                    <input className="ep-input" value={data[f.key]} placeholder={typeof ex === "string" ? ex : ""} onChange={(e) => set(f.key, e.target.value)} style={{ width: "100%" }} />
                  )}
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} style={{ padding: "11px 16px", borderRadius: 12, border: "1px solid rgba(245,237,237,0.12)", background: "transparent", color: "rgba(245,237,237,0.7)", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: step === 0 ? 0.4 : 1 }}>
              {t("Retour")}
            </button>
            <button type="button" onClick={() => { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
              {step === STEPS.length - 1 ? t("Voir ma fiche") : t("Suivant")}
            </button>
          </div>
        </section>
      )}

      {/* Fiche finale */}
      {isResult && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ep-card-hero" style={{ padding: "16px 18px" }}>
            <p className="ep-label" style={{ marginBottom: 6 }}>{t("Ma phrase de positionnement")}</p>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#F5EDED", lineHeight: 1.45 }}>
              {line || t("Remplis ta niche et ton résultat pour la générer.")}
            </p>
          </div>

          {bioLines(data).length > 0 && (
            <CopyBlock title={t("Ma bio (Instagram, TikTok, LinkedIn)")} text={bioLines(data).join("\n")} />
          )}

          {pillarList(data).length > 0 && (
            <div className="ep-card" style={{ padding: "14px 16px" }}>
              <p className="ep-label" style={{ marginBottom: 8 }}>{t("Mes piliers de contenu")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pillarList(data).map((p) => (
                  <span key={p} style={{ padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(224,30,30,0.12)", color: "#F5EDED" }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          <CopyBlock title={t("Ma fiche complète")} text={md} long />

          <p className="ep-label" style={{ margin: "6px 0 0" }}>{t("Aller plus loin avec Claude")}</p>
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.55 }}>
            {hasClaudeKey
              ? t("Ton connecteur EP Coaching est relié : Claude lit ta fiche tout seul et peut enregistrer ses propositions dans l'appli.")
              : t("Ces demandes marchent avec ton compte Claude, même sans connecteur : ta fiche est incluse dans le texte copié. Relie EP Coaching dans Paramètres pour que Claude enregistre ses propositions directement ici.")}
          </p>
          <ClaudePrompt
            title={t("Créer ma page Notion de positionnement")}
            hint={t("Active Notion dans Claude : il crée une page complète avec ton avatar, les réponses à chaque objection et 30 idées de contenu.")}
            prompt={`Voici mon positionnement de coach (fiche EP Coaching) :\n\n${md}\n\nAvec Notion, crée une page « Mon positionnement » qui contient : ma phrase de positionnement, mon avatar détaillé, une réponse courte et convaincante à chacune de ses objections, 10 idées de contenu par pilier écrites avec les mots exacts de mon avatar, et ma bio pour Instagram, TikTok et LinkedIn. Si une information importante manque, pose-moi d'abord 3 questions maximum.`}
          />
          <ClaudePrompt
            title={t("Challenger ma niche")}
            hint={t("Claude joue le consultant exigeant et te propose 3 versions plus fortes.")}
            prompt={`Voici mon positionnement de coach :\n\n${md}\n\nChallenge-le comme un consultant exigeant : ma niche est-elle assez précise, mon résultat est-il désirable, mesurable et crédible, mon offre est-elle claire ? Propose 3 versions plus fortes de ma phrase de positionnement et explique en une ligne pourquoi chacune est meilleure. Quand je choisis une version, si le connecteur EP Coaching est actif, enregistre-la avec l'outil enregistrer_positionnement.`}
          />
          <ClaudePrompt
            title={t("Écrire 5 scripts pour mon avatar")}
            hint={t("Avec le connecteur, Claude lit aussi tes stats réseaux et range les scripts dans ton Studio.")}
            prompt={`Voici mon positionnement de coach :\n\n${md}\n\nÉcris 5 scripts de reels de 30 à 45 secondes pour mon avatar : une accroche forte avec ses mots exacts, le développement, et une fin qui l'invite à m'écrire. Varie les piliers. Si le connecteur EP Coaching est actif, regarde d'abord mes stats réseaux (outil mes_stats_reseaux) pour t'inspirer de ce qui marche, puis ajoute chaque script dans mon Studio (outil ajouter_script).`}
          />
        </section>
      )}
    </div>
  );
}

function CopyBlock({ title, text, long }: { title: string; text: string; long?: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="ep-card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <p className="ep-label" style={{ margin: 0 }}>{title}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 9, border: "1px solid rgba(245,237,237,0.12)", background: "transparent", color: "#F5EDED", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? t("Copié") : t("Copier")}
        </button>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12.5, color: "rgba(245,237,237,0.8)", lineHeight: 1.6, maxHeight: long ? 260 : undefined, overflow: "auto" }}>{text}</pre>
    </div>
  );
}
