"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle, Zap, TrendingUp, BarChart2, Heart, Flame } from "lucide-react";

interface Template {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  subject: string;
  body: string;
}

function buildTemplates(clientName: string): Template[] {
  const first = clientName.split(" ")[0] ?? clientName;
  return [
    {
      id: "checkin",
      label: "Check-in hebdo",
      icon: BarChart2,
      color: "#60a5fa",
      subject: "Check-in semaine",
      body: `Salut ${first} 👋

C'est l'heure du check-in hebdo !

Merci de me transmettre :
- Ton poids (moyenne de la semaine ou mesure du matin à jeun)
- Ton niveau d'énergie sur 10
- Tes sensations à l'entraînement
- Ton observance nutrition (sur 10)
- Des points particuliers à signaler (stress, sommeil, douleurs…)

Prends le temps de répondre précisément, c'est ce qui me permet d'ajuster au mieux ton suivi 🎯`,
    },
    {
      id: "positif",
      label: "Retour positif",
      icon: TrendingUp,
      color: "#4ade80",
      subject: "Excellent travail cette semaine",
      body: `${first} 💪

Je viens de regarder tes données de la semaine et je voulais te dire : excellent travail.

Les chiffres parlent d'eux-mêmes, tu es dans la bonne direction. Continue comme ça, la régularité est la clé et tu le prouvent semaine après semaine.

On reste sur le même cap, keep going 🔥`,
    },
    {
      id: "recadrage",
      label: "Retour à recadrer",
      icon: Zap,
      color: "#f97316",
      subject: "Point important cette semaine",
      body: `${first},

Je voulais revenir sur cette semaine. Les résultats ne sont pas au niveau de ce qu'on a prévu ensemble, et je pense qu'on doit en parler.

Ce n'est pas une critique, c'est mon rôle de te signaler quand on dévie du plan. Ce qui compte, c'est ce qu'on fait maintenant.

Qu'est-ce qui s'est passé cette semaine ? Dis-moi franchement, qu'on puisse ajuster ensemble si nécessaire.`,
    },
    {
      id: "calories",
      label: "Ajustement calorique",
      icon: Flame,
      color: "#E01E1E",
      subject: "Ajustement de tes calories",
      body: `${first} 👋

Suite à ton check-in et à l'analyse de tes données sur ces dernières semaines, on va ajuster ton apport calorique.

Je t'envoie le détail dans les notes de suivi. En résumé :
- Nouvel objectif calorique
- Ajustement des macros si nécessaire

N'hésite pas si tu as des questions sur ces changements. L'objectif est toujours de progresser de façon régulière et durable 💯`,
    },
    {
      id: "motivation",
      label: "Motivation milieu de programme",
      icon: Heart,
      color: "#fb7185",
      subject: "Tu es à mi-chemin",
      body: `${first} 🔥

Tu es exactement à mi-chemin du programme. C'est souvent là que c'est le plus dur mentalement, les premiers résultats sont là mais la fin semble encore loin.

Je voulais juste te rappeler pourquoi tu as commencé. Tu as déjà accompli énormément et chaque semaine te rapproche de là où tu veux être.

Reste concentré, reste régulier. Le reste suivra. On est ensemble dans cette aventure 💪`,
    },
    {
      id: "refeed",
      label: "Refeed / Semaine de relâche",
      icon: MessageCircle,
      color: "#fbbf24",
      subject: "Refeed cette semaine",
      body: `${first} 👋

Cette semaine, on met en place un refeed. Voici ce que ça signifie :

📈 On remonte les calories (principalement via les glucides)
🛌 Objectif : recharger les réserves de glycogène et relancer les hormones
⚡ Tu devrais te sentir plus énergique à l'entraînement

Ce n'est pas un cheat meal, ce n'est pas une semaine off, c'est une stratégie réfléchie pour optimiser tes résultats long terme.

Je t'ai mis les détails dans les notes. On reprend le déficit la semaine suivante 🎯`,
    },
  ];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-[#F5EDED]/5 text-[#F5EDED]/40 hover:text-[#F5EDED]/70 hover:bg-[#F5EDED]/10 border border-[#890404]/20"
      }`}
    >
      {copied ? (
        <>
          <Check size={11} />
          Copié
        </>
      ) : (
        <>
          <Copy size={11} />
          Copier
        </>
      )}
    </button>
  );
}

function TemplateCard({
  template,
}: {
  template: Template;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = template.icon;

  return (
    <div className="bg-[#1f0101]/60 border border-[#890404]/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${template.color}18`, border: `1px solid ${template.color}30` }}
          >
            <Icon size={15} style={{ color: template.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{template.label}</p>
            <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest mt-0.5 font-semibold">
              {template.subject}
            </p>
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`flex-shrink-0 transition-transform text-[#F5EDED]/30 ${expanded ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 5L7 9.5L11.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#890404]/20">
          <pre className="mt-4 text-sm text-[#F5EDED]/75 whitespace-pre-wrap leading-relaxed font-sans bg-black/20 rounded-lg px-4 py-3 border border-[#890404]/15">
            {template.body}
          </pre>
          <div className="mt-3 flex justify-end">
            <CopyButton text={template.body} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function NoteTemplates({
  clientName,
}: {
  clientName: string;
}) {
  const templates = buildTemplates(clientName);

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}
