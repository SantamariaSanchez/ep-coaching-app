"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Wand2 } from "lucide-react";
import type { GuideMagnet } from "@/lib/lead-magnets";
import { fetchGuidesForGenerator } from "@/app/dashboard/coach/studio/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60";

// Élargi le 2026-09-16 (retour direct : "je veux être une référence pour
// tout sujet dans ma niche... media... systeme pour le faire pour X,
// Reddit, WhatsApp, Discord, Telegram, YouTube en texte, carrousels et
// stories Insta") : jusqu'ici seuls carrousel/légende Insta + LinkedIn
// étaient couverts, et aucune case pour la story Insta malgré la demande.
// Même paradigme que buildPrompt ci-dessous (zéro appel IA, juste un prompt
// bien construit) : chaque plateforme est une consigne détaillée, cochée ou
// pas, injectée dans le prompt final dans cet ordre fixe. Les 3 par défaut
// (carrousel + légende Insta + LinkedIn) reproduisent exactement le
// comportement d'avant cet axe pour ne rien casser pour l'usage existant.
interface PlatformSpec {
  id: string;
  label: string;
  defaultOn: boolean;
  instruction: string;
}

const PLATFORM_SPECS: PlatformSpec[] = [
  {
    id: "carrousel",
    label: "Carrousel Instagram",
    defaultOn: true,
    instruction:
      "Un carrousel Instagram de 5 à 7 slides (une accroche forte en slide 1, une idée clé par slide ensuite, une slide de CTA finale qui invite à rejoindre EP Coaching ou à télécharger le guide complet)",
  },
  {
    id: "legende",
    label: "Légende Instagram",
    defaultOn: true,
    instruction:
      "Une légende Instagram complète, avec de vrais sauts de ligne, qui se termine par une question ou un appel à l'action, suivie de 5 à 8 hashtags pertinents",
  },
  {
    id: "story",
    label: "Story Instagram",
    defaultOn: false,
    instruction:
      "Une séquence de 3 à 5 stories Instagram : décris pour chaque slide le texte à afficher et le sticker interactif à utiliser (sondage, question, quiz, curseur), pensées pour être tournées ou écrites en 2 minutes, qui donnent envie d'aller voir le post ou le lien en bio",
  },
  {
    id: "linkedin",
    label: "Post LinkedIn",
    defaultOn: true,
    instruction:
      "Un post LinkedIn plus posé, avec un vrai hook en première ligne, 3 à 5 paragraphes courts ou puces, un appel à l'action final, sans hashtags",
  },
  {
    id: "x",
    label: "Thread X (Twitter)",
    defaultOn: false,
    instruction:
      "Un thread X (Twitter) de 5 à 8 tweets numérotés (1/, 2/...), premier tweet qui donne envie de dérouler sans tout dévoiler, un point clé par tweet, dernier tweet en résumé + appel à l'action vers EP Coaching",
  },
  {
    id: "reddit",
    label: "Post Reddit",
    defaultOn: false,
    instruction:
      "Un post Reddit pour un subreddit pertinent de la niche (fitness/nutrition/musculation), ton naturel et honnête, sans pub déguisée ni ton commercial (Reddit sanctionne ça très vite), qui apporte une vraie réponse ou un vrai retour d'expérience, avec juste un lien ou une mention discrète d'EP Coaching si c'est pertinent, pas forcé",
  },
  {
    id: "whatsapp_statut",
    label: "Statut WhatsApp",
    defaultOn: false,
    instruction:
      "Un texte court pour un Statut WhatsApp (l'équivalent d'une story, visible 24h par les contacts) : une phrase percutante ou un chiffre marquant, format très court, qui donne envie d'écrire en message privé pour en savoir plus",
  },
  {
    id: "whatsapp_diffusion",
    label: "Chaîne WhatsApp",
    defaultOn: false,
    instruction:
      "Un message pour une chaîne de diffusion WhatsApp (broadcast à des abonnés) : ton direct et personnel comme si on écrivait à un ami, un conseil actionnable immédiatement, sans lien commercial appuyé",
  },
  {
    id: "youtube_communaute",
    label: "Post communauté YouTube",
    defaultOn: false,
    instruction:
      "Un post pour l'onglet Communauté YouTube (texte + éventuellement une question ou un sondage), pensé pour relancer l'engagement entre deux vidéos, court et qui invite à commenter",
  },
  {
    id: "discord",
    label: "Message Discord",
    defaultOn: false,
    instruction:
      "Un message pour un serveur Discord de la communauté, ton décontracté et proche, qui lance une vraie discussion (question ouverte ou débat léger) plutôt qu'une annonce à sens unique",
  },
  {
    id: "telegram",
    label: "Message Telegram",
    defaultOn: false,
    instruction:
      "Un message pour une chaîne Telegram, format informatif et dense (les abonnés Telegram lisent plus volontiers un texte plus long qu'ailleurs), qui peut inclure une astuce concrète détaillée",
  },
];

// Générateur de PROMPT (demande explicite 2026-08-17 : "enlève l'IA, moi je
// veux des prompts pour Claude, hyper bien construit, et une petite partie
// à la fin où c'est moi qui remplis sujet et angle") — remplace l'ancienne
// version qui appelait Claude côté serveur pour produire directement un
// carrousel/légende/post. Ici, zéro appel IA : le prompt est construit en
// pur JS à partir du contenu déjà publié du guide, avec Sujet/Angle en
// champs libres à la fin, injectés en direct dans le texte affiché. Le
// coach copie ce prompt et le colle où il veut (cette conversation, une
// nouvelle conversation Claude, Claude Code...).
function buildPrompt(guide: GuideMagnet, sujet: string, angle: string, platformIds: string[]): string {
  const sections = guide.sections
    .map((s, i) => {
      const callout = s.callout ? `\nÀ retenir : ${s.callout}` : "";
      return `Section ${i + 1} : ${s.heading}\n${s.paragraphs.join("\n")}${callout}`;
    })
    .join("\n\n");

  const selected = PLATFORM_SPECS.filter((p) => platformIds.includes(p.id));
  const demandes = selected.length > 0 ? selected : PLATFORM_SPECS.filter((p) => p.defaultOn);
  const liste = demandes.map((p, i) => `${i + 1}. ${p.instruction}`).join("\n");

  return `Tu es le community manager d'EP Coaching, coaching bodybuilding et nutrition en ligne. Identité de marque : direct, concret, orienté action, jamais putaclic, jamais de superlatif vide ("incroyable", "révolutionnaire"), jamais de tiret em/en (—) nulle part dans ce que tu écris (virgule ou point à la place). Règle non négociable (retour direct 2026-09-16) : sur Instagram, zéro ton "étude"/jargon, simple au point qu'un enfant de 5 ans comprenne du premier coup, et qui parle/ce qu'il fait doit être clair dans les 3 premières secondes ou en légende, sans exception.

Voici un guide déjà publié sur le site, sers-t'en comme matière première :

TITRE : ${guide.title}
ACCROCHE : ${guide.hook}
INTRO : ${guide.intro}

${sections}

CONCLUSION : ${guide.conclusion}

À partir de ce contenu, crée-moi :
${liste}

Sujet : ${sujet || "(à préciser)"}
Angle : ${angle || "(à préciser)"}`;
}

// Retour direct 2026-09-18 ("j'ai mis 30s pour aller sur le prompteur") :
// le texte intégral des guides (≈1,6 Mo pour 482 guides publiés) ne
// transite plus par la page serveur (voir studio/page.tsx) — chargé ici à
// la demande, uniquement une fois cet onglet réellement ouvert (`active`
// passe à `true`, voir IdeationHub.tsx), jamais au chargement de Studio
// créatif dans son ensemble.
export default function SocialGenerator({ active }: { active: boolean }) {
  const [guides, setGuides] = useState<GuideMagnet[] | null>(null);
  const fetchStarted = useRef(false);

  useEffect(() => {
    if (!active || fetchStarted.current) return;
    fetchStarted.current = true;
    void fetchGuidesForGenerator().then(setGuides);
  }, [active]);

  // "" tant qu'aucun choix explicite n'a été fait dans le <select> — le
  // premier guide chargé sert alors de valeur par défaut, calculé au rendu
  // (effectiveSlug ci-dessous) plutôt que synchronisé depuis un effet une
  // fois les guides arrivés (guides est chargé après le premier rendu,
  // contrairement à l'ancienne version qui les recevait déjà en prop).
  const [slug, setSlug] = useState("");
  const [sujet, setSujet] = useState("");
  const [angle, setAngle] = useState("");
  const [copied, setCopied] = useState(false);
  const [platformIds, setPlatformIds] = useState<string[]>(
    PLATFORM_SPECS.filter((p) => p.defaultOn).map((p) => p.id)
  );

  function togglePlatform(id: string) {
    setPlatformIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const effectiveSlug = slug || guides?.[0]?.slug || "";
  const selected = (guides ?? []).find((g) => g.slug === effectiveSlug) ?? guides?.[0] ?? null;
  const prompt = useMemo(
    () => (selected ? buildPrompt(selected, sujet, angle, platformIds) : ""),
    [selected, sujet, angle, platformIds]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  if (guides === null) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[#F5EDED]/40">
        <div className="w-3.5 h-3.5 border-2 border-[#E01E1E]/40 border-t-[#E01E1E] rounded-full animate-spin" />
        Chargement des guides...
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <p className="text-[12px] text-[#F5EDED]/35 italic">
        Aucun guide publié pour l&apos;instant, reviens ici une fois un premier guide en ligne dans Ressources.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed mb-4">
        Choisis un guide déjà publié, précise le sujet et l&apos;angle si tu veux orienter le résultat, puis
        copie le prompt et colle-le dans Claude (ici ou ailleurs) pour obtenir carrousel, légende et post
        LinkedIn.
      </p>

      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-4 space-y-2.5">
        <select
          value={effectiveSlug}
          onChange={(e) => setSlug(e.target.value)}
          aria-label="Guide déjà publié"
          className={inputCls}
        >
          {guides.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title}
            </option>
          ))}
        </select>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <input
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="Sujet (optionnel, ex : la créatine chez les végétariens)" aria-label="Sujet (optionnel, ex : la créatine chez les végétariens)"
            className={inputCls}
          />
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="Angle (optionnel, ex : mythe vs réalité)" aria-label="Angle (optionnel, ex : mythe vs réalité)"
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
            Formats à générer
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_SPECS.map((p) => {
              const active = platformIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  aria-pressed={active}
                  className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-full transition-colors"
                  style={{
                    border: active ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
                    background: active ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
                    color: active ? "#F5EDED" : "rgba(245,237,237,0.5)",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 flex items-center gap-1.5">
            <Wand2 size={12} className="text-[#E01E1E]" /> Prompt prêt à coller dans Claude
          </p>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors"
          >
            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        <p className="text-[11.5px] text-[#F5EDED]/55 leading-relaxed whitespace-pre-wrap">{prompt}</p>
      </div>
    </div>
  );
}
