import { Suspense } from "react";
import QuickNote from "@/components/home/QuickNote";
import { AgendaW, MealW, WorkoutW, LiveW, BodyW, ShoppingW, PrepW, WidgetSkeleton } from "@/components/home/Widgets";

// Accueil membre en widgets, dans l'ordre de SES priorités (2026-10-08,
// retour direct : « un mec qui veut mieux manger, bam, recettes et courses ;
// un gars qui veut faire des compétitions, bam, photos, road map, suivi de
// data ; une meuf qui veut un gros cul, bam, la prog »). L'ordre vient du
// profil (lib/persona.ts, focus) : séance, repas, bilan, courses, prépa...
// Chaque widget montre l'info elle-même et charge seul.
const C = "/dashboard/client";

type Key = "seance" | "manger" | "bilan" | "courses" | "prepa" | "agenda" | "note" | "live";

const FROM_INTENT: Record<string, Key> = {
  seance: "seance",
  seance_adaptee: "seance",
  douleur: "seance",
  records: "seance",
  manger: "manger",
  bilan: "bilan",
  pas: "bilan",
  sante: "bilan",
  courses: "courses",
  prepa: "prepa",
  posing: "prepa",
  agenda: "agenda",
  note: "note",
};

export function widgetOrder(focus: string[]): Key[] {
  const out: Key[] = [];
  for (const f of focus) {
    const k = FROM_INTENT[f];
    if (k && !out.includes(k)) out.push(k);
  }
  // Le socle du quotidien est toujours là, même si le profil ne le cite pas.
  for (const k of ["seance", "manger", "bilan"] as Key[]) if (!out.includes(k)) out.push(k);
  return out;
}

function W({ children, h = 110 }: { children: React.ReactNode; h?: number }) {
  return <Suspense fallback={<WidgetSkeleton h={h} />}>{children}</Suspense>;
}

export default function ClientWidgets({ userId, focus, coachId, coached }: { userId: string; focus: string[]; coachId: string | null; coached: boolean }) {
  const order = widgetOrder(focus);
  const render = (k: Key) => {
    switch (k) {
      case "seance":
        return <W key={k} h={130}><WorkoutW userId={userId} href={`${C}/program`} /></W>;
      case "manger":
        return <W key={k} h={130}><MealW userId={userId} href={`${C}/nutrition`} /></W>;
      case "bilan":
        return <W key={k}><BodyW userId={userId} href={`${C}/bilan`} /></W>;
      case "courses":
        return <W key={k} h={90}><ShoppingW userId={userId} href={`${C}/nutrition?vue=courses`} /></W>;
      case "prepa":
        return <W key={k}><PrepW userId={userId} href={`${C}/roadmap`} /></W>;
      case "agenda":
        return <W key={k}><AgendaW userId={userId} href={`${C}/agenda`} hideEmpty /></W>;
      case "note":
        return <QuickNote key={k} notesHref={`${C}/notes`} />;
      default:
        return null;
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {order.map(render)}
      {coached && (
        <Suspense fallback={null}>
          <LiveW userId={userId} role="client" coachId={coachId} href={`${C}/live`} />
        </Suspense>
      )}
    </div>
  );
}
