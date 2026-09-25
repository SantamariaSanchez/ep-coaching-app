"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { getPlatformOwnerId } from "@/lib/job-applications";
import { QUALIFYING_QUESTIONS, type QualifyingAnswers } from "@/lib/job-applications-shared";
import { sendBrevoEmail } from "@/utils/brevo";
import { POLES } from "@/lib/org-roles";
import { cleanText, escapeHtml, safeExternalUrl, LIMITS } from "@/lib/sanitize";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Même pattern que callerIp() dans app/ressources/actions.ts (dupliqué
// plutôt que partagé, pas de lien fonctionnel entre les deux dossiers).
async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

const CV_MAX_BYTES = 5 * 1024 * 1024;

// CV obligatoire en PDF (demande directe 2026-09-25). On vérifie la
// signature binaire "%PDF" plutôt que de croire le type annoncé par le
// navigateur, facile à falsifier.
async function readPdf(value: FormDataEntryValue | null): Promise<{ bytes: Uint8Array } | { error: string }> {
  if (!value || typeof value === "string") return { error: "Ton CV en PDF est requis." };
  if (value.size === 0) return { error: "Ton CV en PDF est requis." };
  if (value.size > CV_MAX_BYTES) return { error: "Ton CV dépasse 5 Mo, compresse-le puis réessaie." };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const magic = String.fromCharCode(...bytes.slice(0, 5));
  if (magic !== "%PDF-") return { error: "Le CV doit être un fichier PDF." };
  return { bytes };
}

// Action publique, sans authentification (voir app/ressources/actions.ts::
// submitLead pour le même principe) : écrit en base via le client admin
// (RLS contournée par design, job_applications n'a aucune policy insert)
// et notifie le fondateur par email, best effort. Reçoit un FormData pour
// transporter le CV (limite de corps des Server Actions : 15 Mo, voir
// next.config.ts).
export async function submitApplication(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const roleKey = String(formData.get("roleKey") ?? "");
  const roleTitle = cleanText(formData.get("roleTitle"), LIMITS.shortText) ?? roleKey;
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  let answers: QualifyingAnswers = {};
  try {
    answers = JSON.parse(String(formData.get("answers") ?? "{}")) as QualifyingAnswers;
  } catch {
    answers = {};
  }

  const ip = await callerIp();
  const limited = await checkRateLimit(`job-application:${ip}`, PRESETS.email.limit, PRESETS.email.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de tentatives, réessaie dans un instant." };
  }

  const name = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!name) return { error: "Ton nom est requis." };
  if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) return { error: "Un email valide est requis." };
  if (!roleKey || !POLES.some((p) => p.roles.some((r) => r.key === roleKey))) return { error: "Poste invalide." };

  // Qualification (demande directe 2026-09-08 : "postuler ne doit pas être
  // juste un email... qualifier les candidats alignés avec la vision de EP
  // Coaching"). Bornée côté serveur : le formulaire peut être contourné.
  const cleanAnswers: QualifyingAnswers = {};
  for (const q of QUALIFYING_QUESTIONS) {
    const raw = answers?.[q.key];
    if (q.key === "link") {
      // "link" n'est jamais required (voir QUALIFYING_QUESTIONS) : pas de
      // validation "requis" à faire ici, seulement nettoyer si présent.
      const url = safeExternalUrl(raw);
      if (url) cleanAnswers[q.key] = url;
      continue;
    }
    const text = cleanText(raw, LIMITS.bio);
    if (text) cleanAnswers[q.key] = text;
    else if (q.required) return { error: `${q.label} est requis.` };
  }

  const cv = await readPdf(formData.get("cv"));
  if ("error" in cv) return { error: cv.error };

  const ownerId = await getPlatformOwnerId();
  if (!ownerId) return { error: "Impossible d'envoyer la candidature, réessaie plus tard." };

  try {
    const admin = createAdminClient();

    // Stockage privé (bucket job-cvs, aucune policy publique). Si le stockage
    // est indisponible, la candidature part quand même : rater un candidat
    // coûte plus cher qu'un CV à redemander, et le fondateur est prévenu.
    let cvPath: string | null = `${ownerId}/${crypto.randomUUID()}.pdf`;
    const upload = await admin.storage.from("job-cvs").upload(cvPath, cv.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) {
      console.error("submitApplication cv upload error:", upload.error);
      cvPath = null;
    }

    const base = {
      owner_id: ownerId,
      role_key: roleKey,
      full_name: name,
      email: trimmedEmail,
      phone: trimmedPhone || null,
      answers: cleanAnswers,
    };
    const payload: Record<string, unknown> = cvPath ? { ...base, cv_path: cvPath } : base;
    let { error } = await admin.from("job_applications").insert(payload);
    if (error && cvPath) {
      // Colonne cv_path absente (migration pas encore exécutée) : on garde la
      // candidature, le CV reste dans le bucket mais n'est pas relié.
      ({ error } = await admin.from("job_applications").insert(base));
      if (!error) cvPath = null;
    }
    if (error) {
      console.error("submitApplication error:", error);
      return { error: "Erreur lors de l'envoi, réessaie." };
    }

    const answersHtml = QUALIFYING_QUESTIONS.filter((q) => cleanAnswers[q.key]).map(
      (q) => `<p style="margin:0 0 10px;"><strong>${escapeHtml(q.label)}</strong><br/>${escapeHtml(cleanAnswers[q.key]!)}</p>`
    ).join("");

    sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Nouvelle candidature : ${roleTitle}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">Nouvelle candidature</h2>
          <p><strong>Poste :</strong> ${escapeHtml(roleTitle)}</p>
          <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
          <p><strong>Email :</strong> ${escapeHtml(trimmedEmail)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(trimmedPhone) || "non renseigné"}</p>
          <p><strong>CV :</strong> ${cvPath ? "joint, à ouvrir depuis Organisation" : "non stocké (stockage indisponible), à redemander au candidat"}</p>
          ${answersHtml ? `<div style="margin:16px 0;padding:14px 16px;background:rgba(224,30,30,0.08);border-radius:8px;">${answersHtml}</div>` : ""}
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/coach/admin/organisation"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px;font-weight:bold;">
            Voir dans l'appli
          </a>
        </div>
      `,
    }).catch(() => {});

    return { ok: true };
  } catch (e) {
    console.error("submitApplication error:", e);
    return { error: "Erreur inattendue." };
  }
}
