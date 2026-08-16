"use client";

import { useState, useTransition } from "react";
import { Sparkles, Download, Copy, Check, AtSign, Briefcase, Wand2 } from "lucide-react";
import { generateSocialPack, type SocialPack } from "@/app/dashboard/coach/studio/social-actions";

// Générateur de contenu réseaux sociaux (demande explicite 2026-08-16) :
// transforme un guide déjà publié en pack prêt à poster (carrousel Insta,
// légende, post LinkedIn, prompt réutilisable ailleurs dans Claude). Les
// images de carrousel ne sont jamais stockées : chaque <img> appelle
// app/api/social-carousel/route.tsx qui les reconstruit à la volée depuis
// le texte en query string.
function CopyBlock({ label, icon: Icon, text }: { label: string; icon: React.ElementType; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 flex items-center gap-1.5">
          <Icon size={12} className="text-[#E01E1E]" /> {label}
        </p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="text-[12px] text-[#F5EDED]/60 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function carouselSrc(title: string, body: string, index: number, total: number, variant: "hook" | "content") {
  const params = new URLSearchParams({ title, body, index: String(index), total: String(total), variant });
  return `/api/social-carousel?${params.toString()}`;
}

export default function SocialGenerator({ guideMagnets }: { guideMagnets: { slug: string; title: string }[] }) {
  const [slug, setSlug] = useState(guideMagnets[0]?.slug ?? "");
  const [pack, setPack] = useState<SocialPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!slug) return;
    setError(null);
    startTransition(async () => {
      const result = await generateSocialPack(slug);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPack(result.data ?? null);
    });
  }

  if (guideMagnets.length === 0) {
    return (
      <p className="text-[12px] text-[#F5EDED]/35 italic">
        Aucun guide publié pour l&apos;instant, reviens ici une fois un premier guide en ligne dans Ressources.
      </p>
    );
  }

  return (
    <div>
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
          Générer depuis un guide
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E01E1E]/60"
          >
            {guideMagnets.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="ep-btn-primary disabled:opacity-50 flex-shrink-0"
            style={{ height: 42, borderRadius: "var(--radius-sm)" }}
          >
            <Sparkles size={13} />
            {isPending ? "Génération…" : "Générer"}
          </button>
        </div>
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </div>

      {pack && (
        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2.5">
              Carrousel Instagram, {pack.slides.length} slides
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {pack.slides.map((slide, i) => {
                const src = carouselSrc(slide.title, slide.body, i + 1, pack.slides.length, i === 0 ? "hook" : "content");
                return (
                  <div key={i} className="rounded-lg overflow-hidden border border-[#890404]/20 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image générée à la volée par app/api/social-carousel, jamais optimisable par next/image */}
                    <img src={src} alt={`Slide ${i + 1} : ${slide.title}`} className="w-full aspect-[4/5] object-cover" loading="lazy" />
                    <a
                      href={src}
                      download={`ep-coaching-slide-${i + 1}.png`}
                      className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-md p-1.5 text-white/80 hover:text-white transition-colors"
                      aria-label={`Télécharger la slide ${i + 1}`}
                    >
                      <Download size={12} />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <CopyBlock label="Légende Instagram" icon={AtSign} text={pack.instagramCaption} />
          <CopyBlock label="Post LinkedIn" icon={Briefcase} text={pack.linkedinPost} />
          <CopyBlock label="Prompt pour Claude" icon={Wand2} text={pack.claudePrompt} />
        </div>
      )}
    </div>
  );
}
