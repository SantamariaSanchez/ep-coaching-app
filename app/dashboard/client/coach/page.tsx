import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { resolveAvatarUrl } from "@/utils/avatar";
import { MessageCircle, AtSign, ChevronRight, Dumbbell, Apple, ClipboardCheck, MessageSquareText } from "lucide-react";

const INCLUDES = [
  { icon: Dumbbell, text: "Programme d'entraînement sur mesure, ajusté séance après séance" },
  { icon: Apple, text: "Plan nutritionnel personnalisé, recalculé automatiquement à chaque ajustement" },
  { icon: ClipboardCheck, text: "Bilan hebdomadaire avec un vrai retour de ton coach, pas juste un chiffre" },
  { icon: MessageSquareText, text: "Messagerie directe pour toutes tes questions entre deux bilans" },
];

// Item 25 : qui est ton coach, comment le joindre, ce qui est inclus dans
// l'accompagnement — distinct de /communaute/coach qui est le fil des
// publications du coach, pas une page dédiée à la relation elle-même.
export default async function ClientMonCoachPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach");
  // Membre gratuit sans coach personnel attitré : rien à afficher ici, la
  // page de découverte des coachs est le bon endroit.
  if (!profile.coach_id) redirect("/dashboard/client/coachs");

  const coach = await getProfile(profile.coach_id);
  if (!coach) redirect("/dashboard/client");

  const avatarSrc = await resolveAvatarUrl(coach.avatar_url);
  const initials = (coach.full_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon accompagnement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon coach</h1>
      </div>

      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt={coach.full_name ?? "Coach"} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-black text-white"
              style={{ background: "linear-gradient(135deg, #E01E1E, #890404)" }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-black text-white truncate">{coach.full_name ?? "Ton coach"}</p>
            {coach.instagram_handle && (
              <p className="text-xs text-[#F5EDED]/40 flex items-center gap-1 mt-0.5">
                <AtSign size={11} /> {coach.instagram_handle}
              </p>
            )}
          </div>
        </div>

        {coach.bio && (
          <p className="text-sm text-[#F5EDED]/65 leading-relaxed mb-4 whitespace-pre-wrap">{coach.bio}</p>
        )}

        <Link
          href="/dashboard/client/messages"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white no-underline"
          style={{ background: "rgba(224,30,30,0.15)", border: "1px solid rgba(224,30,30,0.35)" }}
        >
          <MessageCircle size={14} /> Envoyer un message
        </Link>
      </div>

      <section className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Ce qui est inclus dans ton accompagnement
        </p>
        <div className="flex flex-col gap-2">
          {INCLUDES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 bg-[#1f0101] border border-[#890404]/15 rounded-xl px-4 py-3">
              <Icon size={15} className="text-[#E01E1E] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <p className="text-[13px] text-[#F5EDED]/70 leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/dashboard/client/communaute/coach"
        className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5 no-underline"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Mot du coach</p>
          <p className="text-[10px] text-[#F5EDED]/35">Les dernières publications de ton coach</p>
        </div>
        <ChevronRight size={15} className="text-[#F5EDED]/25 flex-shrink-0" strokeWidth={1.8} />
      </Link>
    </div>
  );
}
