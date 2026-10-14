import { after } from "next/server";
import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";
import { notifyUsers } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "peccoux.manu@gmail.com";

// Email "métier" à l'admin (fondateur), distinct des notifications
// transactionnelles coach/client — événements de plateforme jugés
// suffisamment importants pour être suivis en temps réel (inscriptions,
// paiements, suppressions de compte). Fire-and-forget, ne doit jamais
// faire échouer l'action appelante.
// Les lignes peuvent contenir un peu de mise en forme maîtrisée (<strong>),
// mais jamais de valeur venant d'un utilisateur non échappée : les appelants
// doivent passer les données brutes dans escapeHtml (voir lib/sanitize.ts).
// Sans ça, un nom d'inscription contenant du HTML arrive tel quel dans la
// boîte du fondateur et peut y glisser un faux lien.
//
// 2026-10-13 (retour direct : « que moi j'ai direct les infos quand il y a un
// inscrit, quand il y a des coachs, quand il y a une candidature ») : en plus
// de l'email, chaque événement arrive en notification sur le téléphone du
// fondateur (cloche + push), sauf les récaps passés en { push: false }.
export function notifyAdmin(
  subject: string,
  bodyLines: string[],
  opts?: { push?: boolean; url?: string }
): Promise<void> {
  return runAfterResponse(() => sendAdminNotification(subject, bodyLines, opts));
}

// Beaucoup d'appelants lancent la notif sans l'attendre : sur Vercel, la
// fonction s'arrête dès la réponse envoyée et la notif partait rarement
// (retour direct 2026-10-14 : « je suis censé recevoir des notifs quand un
// coach ajoute son client »). after() garde la fonction en vie jusqu'à la
// fin de l'envoi ; hors requête (script), on envoie tout de suite.
function runAfterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
    return Promise.resolve();
  } catch {
    return task();
  }
}

async function sendAdminNotification(
  subject: string,
  bodyLines: string[],
  opts?: { push?: boolean; url?: string }
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    sendBrevoEmail({
      to: ADMIN_EMAIL,
      subject: `[EP Coaching] ${escapeHtml(subject)}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">${escapeHtml(subject)}</h2>
          ${bodyLines.map((l) => `<p style="margin:4px 0;">${l}</p>`).join("")}
        </div>
      `,
    }),
  ];
  if (opts?.push !== false) {
    tasks.push(sendFounderPush({ title: subject, body: htmlToText(bodyLines.slice(0, 2).join(" · ")), url: opts?.url }));
  }
  await Promise.allSettled(tasks);
}

/** Texte brut d'une ligne d'email (balises retirées, entités de base décodées). */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

let ownerCache: { ids: string[]; at: number } | null = null;

/** Comptes propriétaires de la plateforme (le fondateur), mis en cache 10 min. */
async function platformOwnerIds(): Promise<string[]> {
  if (ownerCache && Date.now() - ownerCache.at < 600_000) return ownerCache.ids;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("id").eq("is_platform_owner", true);
    const ids = (data ?? []).map((r) => r.id as string);
    ownerCache = { ids, at: Date.now() };
    return ids;
  } catch {
    return ownerCache?.ids ?? [];
  }
}

/**
 * Notification (cloche + push) au fondateur seul, pour un événement qui a
 * déjà son propre email ou qui n'en mérite pas (lead, inscription newsletter,
 * onboarding terminé...). Type « admin_event » : jamais coupé par erreur
 * avec la communauté, réglable comme « Mon coaching ».
 */
export function pushFounder(params: { title: string; body?: string; url?: string }): Promise<void> {
  return runAfterResponse(() => sendFounderPush(params));
}

async function sendFounderPush(params: { title: string; body?: string; url?: string }): Promise<void> {
  try {
    const ids = await platformOwnerIds();
    if (!ids.length) return;
    await notifyUsers(ids, { type: "admin_event", title: params.title, body: params.body, url: params.url ?? "/dashboard/coach/admin" });
  } catch {
    // non-blocking
  }
}
