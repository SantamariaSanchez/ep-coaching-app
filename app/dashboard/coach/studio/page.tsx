import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachContentIdeas } from "@/lib/content-ideas";
import { getIdeationNotes, getInspirations, getCoachScripts } from "@/lib/coach-ideation";
import { getBusinessCanvas } from "@/lib/coach-business-canvas";
import { getRealLeadsByScriptId } from "@/lib/content-leads-tracking";
import IdeationHub from "@/components/coach/IdeationHub";

// Idéation (ex "Idées & brouillons", renommé le 2026-08-15) : espace de
// création de contenu du coach — poser des idées Insta/YouTube/LinkedIn
// avant qu'elles se perdent (alimenté en partie par les questions posées
// dans l'onglet Communauté), noter ce qui ne rentre dans aucune case, et
// garder une trace des références vues ailleurs qui méritent d'inspirer un
// futur post. Voir components/coach/IdeationHub.tsx pour les 5 sections
// (Landing pages retiré le 2026-08-17, jugé inutile en usage réel ;
// Générateur transformé en pur générateur de prompt, plus d'appel IA).
export default async function CoachStudioPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const [ideas, notes, inspirations, scripts, canvas] = await Promise.all([
    getCoachContentIdeas(user.id),
    getIdeationNotes(user.id),
    getInspirations(user.id),
    getCoachScripts(user.id),
    // Personnalisation de l'onglet Prompts (retour direct 2026-09-10) : le
    // Business Model Canvas du coach (déjà rempli dans "Développer mon
    // business" pour qui l'a fait) sert de contexte auto-injecté devant
    // chaque prompt copié, voir IdeationScripts.tsx/buildCoachContext.
    getBusinessCanvas(user.id),
  ]);
  // Le texte intégral des guides (générateur de prompts SocialGenerator,
  // ≈1,6 Mo pour 482 guides publiés) n'est plus chargé ici — voir
  // fetchGuidesForGenerator dans actions.ts, appelé à la demande par
  // SocialGenerator.tsx seulement quand son onglet est réellement ouvert.
  // Retour direct 2026-09-18 : "j'ai mis 30s pour aller sur le prompteur",
  // cette page transportait ce poids sur CHAQUE visite de Studio créatif.
  // Dépend de `scripts` (résout leur source_reference), donc après le
  // Promise.all ci-dessus plutôt que dans le même lot.
  const realLeadsByScriptId = await getRealLeadsByScriptId(scripts);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Studio créatif
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Idéation</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Un endroit pour ne rien perdre : une idée qui te vient, une question de membre qui
          mérite un post, un script à finir, une référence vue ailleurs.
        </p>
      </div>

      <IdeationHub
        initialIdeas={ideas}
        initialNotes={notes}
        initialInspirations={inspirations}
        initialScripts={scripts}
        canvas={canvas}
        realLeadsByScriptId={realLeadsByScriptId}
      />
    </div>
  );
}
