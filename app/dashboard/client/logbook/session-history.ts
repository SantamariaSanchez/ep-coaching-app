import { createServerSupabase } from "@/lib/supabase-server";
import type { Session, SessionSet, SessionWithSets } from "@/utils/sessions";

// Historique complet des séances terminées ("Voir tout l'historique" du
// logbook perso, ?historique=tout), partagé par le logbook membre et
// l'espace "Moi" du coach (app/dashboard/coach/moi/logbook).
//
// Pourquoi pas getAllClientSessions(clientId, 100) : il charge les séries de
// toutes les séances en UNE requête, et PostgREST plafonne une réponse à
// 1000 lignes. Triées par created_at croissant, ce sont les séances les plus
// RÉCENTES qui auraient perdu leurs séries au-delà (100 séances x 12 séries
// suffisent). Ici les séries sont lues par petits paquets de séances, et
// chaque paquet page par page : aucune série ne peut manquer.

// Plafond de séances affichées : plusieurs années d'entraînement à 4 séances
// par semaine, sans transformer la page en téléchargement interminable.
export const FULL_HISTORY_MAX_SESSIONS = 500;

// 25 séances par requête : une URL courte (25 UUID) et, à une vingtaine de
// séries par séance, bien moins que les 1000 lignes d'une page PostgREST.
const SESSIONS_PER_QUERY = 25;
const PAGE_SIZE = 1000;

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

async function loadSetsFor(supabase: Supabase, sessionIds: string[]): Promise<SessionSet[]> {
  const all: SessionSet[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("session_sets")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data as SessionSet[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/**
 * Séances terminées du client, les plus récentes d'abord, avec TOUTES leurs
 * séries (vidéos signées comme dans getAllClientSessions). Renvoie null si
 * la lecture échoue : la page retombe alors sur les dernières séances et
 * le dit, au lieu d'afficher un historique vide ou incomplet sans un mot.
 */
export async function getFullSessionHistory(clientId: string): Promise<SessionWithSets[] | null> {
  try {
    const supabase = await createServerSupabase();
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(FULL_HISTORY_MAX_SESSIONS);
    if (sessionsError) throw sessionsError;
    const sessions = (sessionRows as Session[]) ?? [];
    if (sessions.length === 0) return [];

    const ids = sessions.map((s) => s.id);
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += SESSIONS_PER_QUERY) {
      batches.push(ids.slice(i, i + SESSIONS_PER_QUERY));
    }
    const sets = (await Promise.all(batches.map((batch) => loadSetsFor(supabase, batch)))).flat();
    // Même ordre que getAllClientSessions (created_at croissant) : la carte
    // d'historique garde la dernière version d'une série en double et
    // l'ordre des exercices tel qu'ils ont été faits.
    sets.sort((a, b) => a.created_at.localeCompare(b.created_at));

    // video_url n'est qu'un chemin de stockage : on l'échange contre une URL
    // signée d'une heure (même bucket et même durée que le reste du
    // logbook). Un échec de signature ne bloque rien : la série garde sa
    // pastille vidéo, sans lien.
    const withVideo = sets.filter((s) => s.video_url);
    const urlByPath: Record<string, string> = {};
    if (withVideo.length > 0) {
      const { data: signed, error: signError } = await supabase.storage
        .from("set-videos")
        .createSignedUrls(withVideo.map((s) => s.video_url as string), 3600);
      if (signError) console.error("Historique complet : signature des vidéos impossible:", signError);
      for (const row of signed ?? []) {
        if (row.path && row.signedUrl) urlByPath[row.path] = row.signedUrl;
      }
    }

    const setsBySession: Record<string, SessionSet[]> = {};
    for (const s of sets) {
      // Non signée : le chemin brut reste (safeExternalUrl le refuse comme
      // lien, la carte affiche alors la pastille vidéo seule).
      const withUrl = s.video_url && urlByPath[s.video_url] ? { ...s, video_url: urlByPath[s.video_url] } : s;
      (setsBySession[s.session_id] ??= []).push(withUrl);
    }
    return sessions.map((s) => ({ ...s, sets: setsBySession[s.id] ?? [] }));
  } catch (e) {
    console.error("Historique complet des séances illisible:", e);
    return null;
  }
}
