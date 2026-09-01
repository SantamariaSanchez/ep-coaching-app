import { NextResponse } from "next/server";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";

// Point d'entrée pour le digest quotidien 10h (retour direct 2026-09-01 :
// "tous les jours à 10h tu m'envoies par mail... concis clair et optimisé
// toutes les informations importantes... tu peux aussi me demander mon avis
// sur des choses"). La DÉCISION de ce qui est important aujourd'hui vient
// d'une routine cloud (accès Notion + Supabase + jugement), qui n'a pas
// accès à ce dépôt ni à BREVO_API_KEY. Cette route ne fait que l'envoi
// mécanique via l'infra Brevo déjà existante et fiable de l'appli — même
// séparation "intelligence vs envoi" que le reste du mailing.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml.trim() : "";

  if (!subject || !bodyHtml) {
    return NextResponse.json({ error: "subject et bodyHtml requis" }, { status: 400 });
  }

  const sent = await sendBrevoEmail({
    to: "peccoux.manu@gmail.com",
    subject,
    htmlContent: wrapBrandedEmail(bodyHtml),
  });

  if (!sent) {
    return NextResponse.json({ error: "Échec envoi Brevo" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
