import Anthropic from "@anthropic-ai/sdk";
import { sendBrevoEmail } from "@/utils/brevo";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAgentByKey } from "@/lib/ai-agents";

// Acquisition réellement automatisée par l'agent Setter (demande directe
// 2026-08-19 : "les agents IA doivent gérer EP Coaching, l'acquisition
// client c'est le focus" — confirmé "envoi automatique réel par email
// (Brevo)" plutôt qu'un brouillon à valider). Dès qu'un lead laisse son
// email en téléchargeant un guide gratuit sur /ressources (submitLead),
// Santiago (agent Setter, lib/ai-agents.ts) lui écrit vraiment un email
// de qualification personnalisé — pas le mail générique de livraison du
// guide (déjà envoyé séparément, voir app/ressources/actions.ts), un
// vrai suivi commercial avec les 3 questions de son script.
//
// Fire-and-forget par construction (jamais awaited dans le chemin
// critique de soumission du formulaire) : un souci ici ne doit jamais
// faire échouer la remise du guide au lead, la seule chose qu'il attend
// activement à cet instant.
export async function maybeSendLeadQualification(
  leadId: string,
  email: string,
  magnetTitle: string
): Promise<void> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return;

    const setter = getAgentByKey("setter");
    if (!setter) return;

    const admin = createAdminClient();

    // Jamais deux fois le même email, même s'il télécharge plusieurs
    // guides (une ligne "leads" par téléchargement, mais une seule
    // qualification par personne réelle).
    const { data: already } = await admin
      .from("leads")
      .select("id")
      .eq("email", email)
      .not("qualification_sent_at", "is", null)
      .limit(1)
      .maybeSingle();
    if (already) return;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: setter.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Une personne vient de télécharger le guide gratuit "${magnetTitle}" sur le site EP Coaching. C'est son premier contact avec la marque, elle n'est pas encore cliente. Écris un email court de qualification (3 à 5 phrases, jamais plus), qui commence par une vraie question liée au sujet du guide, glisse naturellement les 3 questions de qualification (objectif, expérience de coaching antérieure, disponibilité) sans que ça ressemble à une liste à puces ou à un formulaire, et propose de répondre directement à cet email si elle veut être rappelée. Zéro lien, zéro bouton, zéro mise en forme design : un email qui ressemble à un vrai message tapé par une personne. Réponds uniquement avec le corps de l'email en HTML simple (des balises <p> uniquement), sans objet ni signature.`,
        },
      ],
    });

    const body = (response.content[0] as { type: string; text: string }).text?.trim();
    if (!body) return;

    const sent = await sendBrevoEmail({
      to: email,
      subject: `Une question sur "${magnetTitle}"`,
      htmlContent: `<div style="font-family:sans-serif;color:#222;line-height:1.6;font-size:15px;">${body}<p style="margin-top:24px;font-size:11px;color:#999;">Réponds STOP à cet email si tu ne veux plus être recontacté(e).</p></div>`,
    });

    if (sent) {
      await admin.from("leads").update({ qualification_sent_at: new Date().toISOString() }).eq("id", leadId);
    }
  } catch (e) {
    console.error("maybeSendLeadQualification error:", e);
  }
}
