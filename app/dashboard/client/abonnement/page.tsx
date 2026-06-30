import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getTotalPoints } from "@/lib/gamification";
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
  FlaskConical,
  UtensilsCrossed,
  LibraryBig,
  Gift,
  Sparkles,
} from "lucide-react";
import PointsProgressCard from "@/components/ui/PointsProgressCard";

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
      "Lives & appels coaching",
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

const ALWAYS_FREE = [
  { icon: Dumbbell, label: "Training autonome", sub: "Programme, Logbook, Road Map" },
  { icon: Apple, label: "Nutrition autonome", sub: "Calcul, journal, bilan, photos" },
  { icon: LibraryBig, label: "Bibliothèque", sub: "Exercices & salles de sport" },
  { icon: FlaskConical, label: "Science", sub: "Recherche, actualité, bibliothèque PubMed" },
  { icon: UtensilsCrossed, label: "Recettes", sub: "Base de recettes & créateur de repas" },
  { icon: Users, label: "Communauté", sub: "Victoires, Questions, profils" },
  { icon: MessageCircleQuestion, label: "Ressources", sub: "Guides & lead magnets" },
];

export default async function AbonnementPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const alreadySubscribed = isSubscribed(profile);
  const points = await getTotalPoints(user.id);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Abonnement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Passer Premium
        </h1>
        <p className="text-sm text-[var(--color-ep-light)]/45 mt-2 leading-relaxed">
          Avec l&apos;offre gratuite, tu as déjà accès à tous les outils d&apos;entraînement et de
          nutrition en autonomie, à la bibliothèque, à Science et à la Communauté. Deux chemins
          pour débloquer le reste : prendre l&apos;abonnement tout de suite, ou accumuler des
          points en utilisant l&apos;appli et en publiant — voir plus bas.
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
                  ? "bg-[var(--color-ep-red)]/10 border-[var(--color-ep-red)]/40 hover:bg-[var(--color-ep-red)]/15"
                  : "bg-[var(--color-ep-card)] border-[var(--color-ep-dark-red)]/25 hover:border-[var(--color-ep-dark-red)]/45"
              }`}
            >
              <div className="flex items-center gap-3">
                {plan.highlight && (
                  <Crown size={18} className="text-[var(--color-ep-red)] flex-shrink-0" strokeWidth={1.8} />
                )}
                <div>
                  <p className="text-sm font-black text-white">{plan.label}</p>
                  <p className="text-[10px] text-[var(--color-ep-light)]/40">{plan.sublabel}</p>
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-3">
          Tout ce que contient le coaching
        </p>
        <div className="space-y-3">
          {COACHING_CATEGORIES.map(({ title, icon: Icon, perks }) => (
            <div key={title} className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-3.5">
                <Icon size={16} className="text-[var(--color-ep-red)] flex-shrink-0" strokeWidth={1.8} />
                <p className="text-sm font-black text-white">{title}</p>
              </div>
              <div className="space-y-2.5">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-start gap-2.5">
                    <Check size={13} className="text-[var(--color-ep-red)] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--color-ep-light)]/70">{perk}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Toujours gratuit ── */}
      <section className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-3">
          Toujours gratuit, dès l&apos;inscription
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ALWAYS_FREE.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <Icon size={18} className="text-[var(--color-ep-light)]/40" strokeWidth={1.8} />
              <p className="text-xs font-bold text-white">{label}</p>
              <p className="text-[10px] text-[var(--color-ep-light)]/35">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Débloque en jouant le jeu (points/rang) ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={11} /> Ou débloque en l&apos;utilisant
        </p>
        <p className="text-sm text-[var(--color-ep-light)]/45 mb-3 leading-relaxed">
          Chaque bilan loggé, séance complétée, leçon vue ou victoire publiée dans la Communauté
          te rapporte des points (lentement — c&apos;est une récompense de fidélité, pas un
          raccourci). En cumulant assez de points, tu débloques certains contenus sans payer.
          Tout ce qui demande du temps réel de ton coach (messages, bilans coachés, programme
          construit pour toi, etc.) reste réservé à l&apos;abonnement.
        </p>
        <PointsProgressCard points={points} isSubscribed={alreadySubscribed} />
        {!alreadySubscribed && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-amber-300/70">
            <Gift size={11} /> Au rang Légende, les membres abonnés reçoivent une Oura Ring offerte par le coach.
          </p>
        )}
      </section>
    </div>
  );
}
