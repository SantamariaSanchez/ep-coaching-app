"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Wand2 } from "lucide-react";
import type { GuideMagnet } from "@/lib/lead-magnets";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60";

// Générateur de PROMPT (demande explicite 2026-08-17 : "enlève l'IA, moi je
// veux des prompts pour Claude, hyper bien construit, et une petite partie
// à la fin où c'est moi qui remplis sujet et angle") — remplace l'ancienne
// version qui appelait Claude côté serveur pour produire directement un
// carrousel/légende/post. Ici, zéro appel IA : le prompt est construit en
// pur JS à partir du contenu déjà publié du guide, avec Sujet/Angle en
// champs libres à la fin, injectés en direct dans le texte affiché. Le
// coach copie ce prompt et le colle où il veut (cette conversation, une
// nouvelle conversation Claude, Claude Code...).
function buildPrompt(guide: GuideMagnet, sujet: string, angle: string): string {
  const sections = guide.sections
    .map((s, i) => {
      const callout = s.callout ? `\nÀ retenir : ${s.callout}` : "";
      return `Section ${i + 1} : ${s.heading}\n${s.paragraphs.join("\n")}${callout}`;
    })
    .join("\n\n");

  return `Tu es le community manager d'EP Coaching, coaching bodybuilding et nutrition en ligne. Identité de marque : direct, concret, orienté action, jamais putaclic, jamais de superlatif vide ("incroyable", "révolutionnaire"), jamais de tiret em/en (—) nulle part dans ce que tu écris (virgule ou point à la place).

Voici un guide déjà publié sur le site, sers-t'en comme matière première :

TITRE : ${guide.title}
ACCROCHE : ${guide.hook}
INTRO : ${guide.intro}

${sections}

CONCLUSION : ${guide.conclusion}

À partir de ce contenu, crée-moi :
1. Un carrousel Instagram de 5 à 7 slides (une accroche forte en slide 1, une idée clé par slide ensuite, une slide de CTA finale qui invite à rejoindre EP Coaching ou à télécharger le guide complet)
2. Une légende Instagram complète, avec de vrais sauts de ligne, qui se termine par une question ou un appel à l'action, suivie de 5 à 8 hashtags pertinents
3. Un post LinkedIn plus posé, avec un vrai hook en première ligne, 3 à 5 paragraphes courts ou puces, un appel à l'action final, sans hashtags

Sujet : ${sujet || "(à préciser)"}
Angle : ${angle || "(à préciser)"}`;
}

export default function SocialGenerator({ guides }: { guides: GuideMagnet[] }) {
  const [slug, setSlug] = useState(guides[0]?.slug ?? "");
  const [sujet, setSujet] = useState("");
  const [angle, setAngle] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = guides.find((g) => g.slug === slug) ?? guides[0] ?? null;
  const prompt = useMemo(() => (selected ? buildPrompt(selected, sujet, angle) : ""), [selected, sujet, angle]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
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
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
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
            placeholder="Sujet (optionnel, ex : la créatine chez les végétariens)"
            className={inputCls}
          />
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="Angle (optionnel, ex : mythe vs réalité)"
            className={inputCls}
          />
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
