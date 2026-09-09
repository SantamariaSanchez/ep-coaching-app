import Link from "next/link";
import { Watch, CheckCircle2, ChevronRight } from "lucide-react";

// Nouveau (retour direct 2026-09-09, "ajoute des choses auxquelles on n'a
// pas encore pensé" sur Paramètres) : le statut Oura n'existait que sur
// Moi > Sommeil, aucune vue d'ensemble des connexions externes du compte
// depuis Paramètres — pourtant l'endroit naturel où on va chercher "à quoi
// mon compte est relié". Reste volontairement en lecture seule : le vrai
// flux connecter/déconnecter (OAuth, etc.) vit déjà sur Sommeil, pas de
// raison de le dupliquer ici avec le risque de désynchronisation que ça
// implique.
export default function ConnectionsCard({
  ouraConnected,
  ouraConfigured,
  ouraHref,
}: {
  ouraConnected: boolean;
  ouraConfigured: boolean;
  ouraHref: string;
}) {
  if (!ouraConfigured) return null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">Connexions</p>

      <Link
        href={ouraHref}
        className="flex items-center justify-between w-full py-1"
      >
        <div className="flex items-center gap-2.5">
          <Watch size={14} className="text-[#F5EDED]/40" />
          <span className="text-sm text-white font-medium">Bague Oura</span>
        </div>
        <div className="flex items-center gap-2">
          {ouraConnected ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-green-400">
              <CheckCircle2 size={12} /> Connectée
            </span>
          ) : (
            <span className="text-[11px] font-bold text-[#F5EDED]/30">Non connectée</span>
          )}
          <ChevronRight size={13} className="text-[#F5EDED]/20" />
        </div>
      </Link>
    </div>
  );
}
