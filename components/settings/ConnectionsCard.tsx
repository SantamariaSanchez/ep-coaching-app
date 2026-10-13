"use client";

import { useT } from "@/components/i18n/I18nProvider";
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
  const t = useT();
  if (!ouraConfigured) return null;

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">{t("Connexions")}</p>

      <Link
        href={ouraHref}
        className="flex items-center justify-between w-full py-1"
      >
        <div className="flex items-center gap-2.5">
          <Watch size={14} className="text-(--ep-ink)/40" />
          <span className="text-sm text-(--ep-strong) font-medium">{t("Bague Oura")}</span>
        </div>
        <div className="flex items-center gap-2">
          {ouraConnected ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-green-400">
              <CheckCircle2 size={12} />{" "}{t("Connectée")}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-(--ep-ink)/30">{t("Non connectée")}</span>
          )}
          <ChevronRight size={13} className="text-(--ep-ink)/20" />
        </div>
      </Link>
    </div>
  );
}
