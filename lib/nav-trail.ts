// Bouton « Retour » qui ne fait plus perdre l'endroit où l'on était (retour
// direct 2026-10-20 : « quand on fait retour, ça nous enlève de l'endroit où
// on était », et sur les pages légales ouvertes depuis le site vitrine, le
// retour renvoyait dans l'appli au lieu du site).
//
// Principe : revenir réellement en arrière (history.back) dès qu'il existe
// une page précédente, qu'elle soit dans l'appli (liste filtrée, onglet
// précis d'une fiche) ou ailleurs (site vitrine). La page fixe passée en
// `fallbackHref` ne sert que s'il n'y a rien derrière (lien ouvert dans un
// nouvel onglet, notification, PWA relancée).
//
// Le « fil » est la liste des pages vues dans CET onglet (sessionStorage,
// alimenté par NavTrailTracker) : il permet de savoir si la page précédente
// est bien celle que le bouton annonce (ex. « Tous les clients » ne revient
// en arrière que si l'on vient de la liste, sinon il ouvre la liste).

export const SITE_VITRINE_URL = "https://santamariasanchez.github.io/EPCoaching/";
const SITE_VITRINE_ORIGIN = "https://santamariasanchez.github.io";

const KEY = "ep-nav-trail";
const MAX = 30;

export function readTrail(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX)));
  } catch {}
}

/** Appelé à chaque changement de page (voir NavTrailTracker). */
export function recordVisit(url: string) {
  const trail = readTrail();
  const last = trail[trail.length - 1];
  if (last === url) return;
  // Retour arrière du navigateur : on dépile au lieu d'empiler.
  if (trail[trail.length - 2] === url) {
    writeTrail(trail.slice(0, -1));
    return;
  }
  // Même page, paramètres différents (onglet, filtre) : on remplace.
  if (last && last.split("?")[0] === url.split("?")[0]) {
    writeTrail([...trail.slice(0, -1), url]);
    return;
  }
  writeTrail([...trail, url]);
}

/** Met à jour l'adresse de la page courante (onglet ou filtre synchronisé dans l'URL). */
export function replaceCurrentVisit(url: string) {
  const trail = readTrail();
  if (trail.length === 0) return writeTrail([url]);
  writeTrail([...trail.slice(0, -1), url]);
}

/** Page précédente dans l'appli pour cet onglet, ou null si on vient d'arriver. */
export function previousInAppUrl(): string | null {
  const trail = readTrail();
  return trail.length >= 2 ? trail[trail.length - 2] : null;
}

/** Site d'où l'on vient si ce n'est pas l'appli (site vitrine, moteur de recherche...). */
export function externalReferrer(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    if (url.origin === window.location.origin) return null;
    // Le navigateur ne transmet souvent que l'origine (« https://santamariasanchez.github.io/ ») :
    // on renvoie vers la page d'accueil du site vitrine plutôt que vers la racine du domaine.
    if (url.origin === SITE_VITRINE_ORIGIN && (url.pathname === "/" || url.pathname === "")) return SITE_VITRINE_URL;
    return ref;
  } catch {
    return null;
  }
}

export function isFromVitrine(): boolean {
  return externalReferrer()?.startsWith(SITE_VITRINE_ORIGIN) ?? false;
}

type Pusher = { push: (href: string) => void };

/**
 * Revient à la page précédente, sinon ouvre `fallbackHref`.
 * `expect` : chemin(s) exact(s) que la page précédente doit avoir pour qu'on
 * y revienne (ex. "/dashboard/coach/clients" pour « Tous les clients », ses
 * filtres et sa position compris) ; sinon on ouvre `fallbackHref`, qui reste
 * la destination annoncée par le libellé.
 */
export function goBack(router: Pusher, fallbackHref: string, expect?: string | string[]) {
  const prev = previousInAppUrl();
  if (prev) {
    const prevPath = prev.split("?")[0];
    const expected = expect === undefined ? null : Array.isArray(expect) ? expect : [expect];
    if (!expected || expected.includes(prevPath)) {
      backWithSafetyNet(router, fallbackHref);
    } else {
      router.push(fallbackHref);
    }
    return;
  }
  // Première page de l'onglet : on vient d'ailleurs (site vitrine, lien
  // partagé) ou la page a été ouverte directement.
  const ext = externalReferrer();
  if (ext && window.history.length > 1) return backWithSafetyNet(router, fallbackHref, ext);
  if (ext) {
    window.location.href = ext;
    return;
  }
  router.push(fallbackHref);
}

// history.back() ne fait rien quand il n'y a pas de vraie page derrière
// (onglet restauré, appli installée relancée) : passé ce délai sans
// changement d'adresse, on ouvre la page de secours.
function backWithSafetyNet(router: Pusher, fallbackHref: string, externalFallback?: string) {
  const before = window.location.href;
  window.history.back();
  window.setTimeout(() => {
    if (window.location.href !== before) return;
    if (externalFallback) window.location.href = externalFallback;
    else router.push(fallbackHref);
  }, 450);
}

/**
 * Inscrit un réglage d'écran (onglet, filtre, tri) dans l'adresse sans
 * recharger ni empiler d'historique : un retour arrière ou un rafraîchissement
 * retrouve alors le même onglet ou la même liste filtrée.
 */
export function syncSearchParams(values: Record<string, string | null>) {
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(values)) {
      if (v === null || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    // null comme dans la doc Next : le routeur recopie lui-même son état interne.
    window.history.replaceState(null, "", next);
    replaceCurrentVisit(`${url.pathname}${url.search}`);
  } catch {}
}
