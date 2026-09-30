"use server";

import { captureLead } from "@/lib/lead-capture";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { LeadOriginInput } from "@/lib/lead-origin";

// La logique de capture (base, setter, mail de livraison, newsletter) vit
// dans lib/lead-capture.ts, partagée avec la route publique du site vitrine.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length >= 6 ? digits : null;
}

// Adresse IP de l'appelant — même pattern que callerIp() dans
// app/auth/client/actions.ts, dupliqué ici plutôt que partagé pour éviter un
// import croisé entre deux dossiers publics sans lien fonctionnel.
async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

// Capture email/téléphone avant de débloquer un lead magnet (voir
// lib/lead-magnets.ts et components/ressources/LeadMagnetLanding.tsx) —
// écrit directement en base avec le client admin puisqu'il n'y a aucune
// session (page publique, personne n'est connecté à ce stade).
export async function submitLead(
  slug: string,
  email: string,
  phone: string,
  origin?: LeadOriginInput | null
): Promise<{ error?: string }> {
  // Masterclass Axe P : action publique, sans authentification, qui insère
  // en base via le client admin (RLS contournée) ET déclenche un envoi
  // d'email — strictement aucune limite avant ce fix. Même preset que les
  // autres envois d'email déclenchés par un utilisateur (5/h), par IP.
  const ip = await callerIp();
  const limited = await checkRateLimit(`lead-submit:${ip}`, PRESETS.email.limit, PRESETS.email.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de tentatives, réessaie dans un instant." };
  }

  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedEmail && !trimmedPhone) {
    return { error: "Laisse au moins ton email ou ton numéro." };
  }
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
    return { error: "Cet email ne semble pas valide." };
  }
  const normalizedPhone = trimmedPhone ? normalizePhone(trimmedPhone) : null;
  if (trimmedPhone && !normalizedPhone) {
    return { error: "Ce numéro ne semble pas valide." };
  }

  return captureLead({ slug, email: trimmedEmail, phone: normalizedPhone, origin, source: "ressources_public" });
}
