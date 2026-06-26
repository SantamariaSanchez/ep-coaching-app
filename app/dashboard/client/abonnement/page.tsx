import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import {
  Check,
  Crown,
  Users,
  MessageCircleQuestion,
  Dumbbell,
  Apple,
  HeartHandshake,
  GraduationCap,
} from "lucide-react";

const COACHING_CATEGORIES = [
  {
    title: "Entraînement",
    icon: Dumbbell,
    perks: [
      "Programme 100% personnalisé, construit par ton coach",
      "Logbook complet : séances, séries, records personnels",
      "Suivi vidéo de tes exercices avec retours correctifs du coach",
      "Road Map : objectifs court/moyen/long terme avec échéances",
    ],
  },
  {
    title: "Nutrition",
    icon: Apple,
    perks: [
      "Calcul de tes besoins (TDEE/BMR) et macros par ton coach",
      "Plan alimentaire adapté à ta phase (perte / prise / maintenance)",
      "Suivi quotidien des repas et des écarts",
    ],
  },
  {
    title: "Suivi & accompagnement",
    icon: HeartHandshake,
    perks: [
      "Bilans hebdomadaires avec ton coach (poids, adhérence, ressenti)",
      "Check-in réguliers",
      "Messagerie directe avec ton coach",
      "Suivi photos de progression",
      "Rappels personnalisés (pesée, compléments, etc.)",
    ],
  },
  {
    title: "Contenu",
    icon: GraduationCap,
    perks: [
      "80h+ de formations vidéo complètes (entraînement, nutrition, mental...)",
      "Modules structurés, accessibles à vie, enrichis régulièrement",
    ],
  },
];

export default async function AbonnementPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const alreadySubscribed = isSubscribed(profile);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Abonnement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Passer Premium
        </h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2 leading-relaxed">
          Avec l&apos;offre gratuite, tu as accès à la Communauté (Victoires,
          Questions) et aux Ressources. Pour débloquer le coaching complet
          (programme, nutrition, logbook, bilans...), choisis une formule
          ci-dessous.
        </p>
      </div>

      {alreadySubscribed && (
        <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6">
          <Check size={14} className="text-green-400 flex-shrink-0" />
          <p className="text-xs font-bold text-green-400">
            Tu es déjà abonné — merci pour ta confiance !
          </p>
        </div>
      )}

      {/* ── Plans ── */}
      <div className="space-y-3 mb-10">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const url = `${plan.url}?client_reference_id=${user.id}${
            user.email ? `&prefilled_email=${encodeURIComponent(user.email)}` : ""
          }`;
          return (
            <a
              key={plan.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition-colors border ${
                plan.highlight
                  ? "bg-[#E01E1E]/10 border-[#E01E1E]/40 hover:bg-[#E01E1E]/15"
                  : "bg-[#1f0101] border-[#890404]/25 hover:border-[#890404]/45"
              }`}
            >
              <div className="flex items-center gap-3">
                {plan.highlight && (
                  <Crown size={18} className="text-[#E01E1E] flex-shrink-0" strokeWidth={1.8} />
                )}
                <div>
                  <p className="text-sm font-black text-white">{plan.label}</p>
                  <p className="text-[10px] text-[#F5EDED]/40">{plan.sublabel}</p>
                </div>
              </div>
              <p className="text-base font-black text-white whitespace-nowrap">
                {plan.priceLabel}
              </p>
            </a>
          );
        })}
      </div>

      {/* ── Ce que débloque l'abonnement ── */}
      <section className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Tout ce que contient le coaching
        </p>
        <div className="space-y-3">
          {COACHING_CATEGORIES.map(({ title, icon: Icon, perks }) => (
            <div key={title} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-3.5">
                <Icon size={16} className="text-[#E01E1E] flex-shrink-0" strokeWidth={1.8} />
                <p className="text-sm font-black text-white">{title}</p>
              </div>
              <div className="space-y-2.5">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-start gap-2.5">
                    <Check size={13} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#F5EDED]/70">{perk}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Toujours gratuit ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Toujours gratuit
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
            <Users size={18} className="text-[#F5EDED]/40" strokeWidth={1.8} />
            <p className="text-xs font-bold text-white">Communauté</p>
            <p className="text-[10px] text-[#F5EDED]/35">Victoires & Questions</p>
          </div>
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
            <MessageCircleQuestion size={18} className="text-[#F5EDED]/40" strokeWidth={1.8} />
            <p className="text-xs font-bold text-white">Ressources</p>
            <p className="text-[10px] text-[#F5EDED]/35">Guides & lead magnets</p>
          </div>
        </div>
      </section>
    </div>
  );
}
