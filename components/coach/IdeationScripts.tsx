"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Copy, Check, FileText, Lightbulb, Sparkles, Megaphone, Clapperboard, Search, ChevronDown, Camera } from "lucide-react";
import { createScript, updateScript, deleteScript, type ScriptDeletionReason } from "@/app/dashboard/coach/studio/actions";
import Teleprompter from "@/components/coach/Teleprompter";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";
import { CONTENT_PROMPTS, HOOK_BANK, CTA_EXAMPLES, TECHNICAL_SHEETS } from "@/lib/content-library";
import type { CoachScript, ScriptFormat, ScriptStatus } from "@/lib/coach-ideation";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";
import type { SlugLeadCounts } from "@/lib/content-leads-tracking";
import Link from "next/link";

const STATUS_LABELS: Record<ScriptStatus, { label: string; color: string }> = {
  a_tourner: { label: "À tourner", color: "#facc15" },
  tourne: { label: "Tourné", color: "#60a5fa" },
  publie: { label: "Publié", color: "#4ade80" },
};
// Cycle de vie confirmé le 2026-09-10 : écrire (déjà géré par le formulaire/
// les routines) → tourner → poster, et une fois posté le script est FINI
// (voir plus bas, section "Publiés" repliée, séparée des scripts encore à
// produire). Le retour publie -> a_tourner reste volontairement possible en
// reclicant, comme un "rouvrir si je me suis trompé", pas un vrai 4e état.
const STATUS_CYCLE: Record<ScriptStatus, ScriptStatus> = { a_tourner: "tourne", tourne: "publie", publie: "a_tourner" };
const STATUS_TITLES: Record<ScriptStatus, string> = {
  a_tourner: "Cliquer une fois tourné",
  tourne: "Cliquer une fois posté",
  publie: "Terminé — cliquer pour rouvrir si erreur",
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${min}min${rest}` : `${min}min`;
}

// Plateformes affichables — objet plutôt qu'un simple texte brut, pour que
// "youtube" (et tout futur "linkedin"/"tiktok") ait son propre badge visible
// au lieu de se fondre dans le badge "format" (voir Axe BJ, MASTERCLASS.md :
// les scripts YouTube produits par la routine quotidienne étaient jusque-là
// visuellement identiques à des scripts Instagram dans cette liste).
// Élargi le 2026-09-16 (retour direct : "je veux être une référence pour
// tout sujet dans ma niche... met en place mon contenu pour X, Reddit,
// WhatsApp, Discord, Telegram, YouTube en format texte, les carrousels et
// stories Insta") : `platform` reste du texte libre en base (pas de CHECK
// sur coach_scripts, voir migration 20260901d), ces nouvelles valeurs sont
// juste reconnues ici pour un badge propre au lieu de retomber sur aucun
// badge (voir `platformInfo ?? null` plus bas).
// Retour direct 2026-09-18 : "enlève Telegram, Pinterest, Reddit, Twitch,
// Discord, WhatsApp, TikTok, Facebook, YouTube Communauté et X, c'est
// Reel Insta ça englobe tout" — revient sur l'élargissement du 2026-09-16.
// Carrousel/Story Insta retirés aussi, mais pour une autre raison : ce ne
// sont pas des scripts parlés (la création de carrousel vit ailleurs dans
// l'appli), les garder ici pousserait à leur écrire un "mot pour mot" qui
// n'a pas de sens pour ce format.
// Facebook réintroduit le 2026-09-22 (retour direct : "on s'est encore
// fait bannir le Insta donc on a encore Facebook, donc travaille sur ça
// les scripts") — pas un caprice de plus sur la liste, une vraie
// nécessité opérationnelle : le compte Instagram est inaccessible (jeton
// Windsor.ai invalide, confirmé côté API au moment de ce retour), Facebook
// reste la chaîne de diffusion disponible. Traité comme Instagram/YouTube
// (filmé, pas écrit) : un Reel Facebook se tourne pareil qu'un Reel Insta.
export const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram Reel", color: "#E1306C" },
  facebook: { label: "Facebook Reel", color: "#1877F2" },
  threads: { label: "Threads", color: "#F5EDED" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};

// Retour direct 2026-09-18 : LinkedIn et Threads sont du contenu ÉCRIT
// (reçu par mail, décidé et posté direct), jamais filmé — contrairement à
// Instagram Reel/YouTube. Pas de description distincte du texte du post,
// pas de bouton Prompteur (rien à filmer), et un nouveau script sur ces
// plateformes se crée directement en statut "publié" (voir submitNew),
// jamais à_tourner/tourné qui n'a pas de sens ici.
const WRITTEN_PLATFORMS = new Set(["linkedin", "threads"]);

type Tab = "mes-scripts" | "prompts" | "hooks" | "cta" | "technique";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "mes-scripts", label: "Mes scripts", icon: FileText },
  { id: "prompts", label: "Prompts", icon: Sparkles },
  { id: "hooks", label: "Hooks", icon: Lightbulb },
  { id: "cta", label: "CTA", icon: Megaphone },
  { id: "technique", label: "Montage", icon: Clapperboard },
];

// Espace Scripts (Idéation) — demande explicite du 2026-08-15 : un vrai
// espace de production de contenu, pas juste une liste d'idées. Deux
// natures de contenu bien distinctes ici : "Mes scripts" est un espace de
// travail (CRUD, propre à chaque coach), le reste (Prompts/Hooks/CTA/
// Montage) est une bibliothèque de référence statique (lib/content-library.ts)
// partagée par tous, à copier-coller plutôt qu'à modifier.
export default function IdeationScripts({
  initialScripts,
  canvas,
  realLeadsByScriptId,
}: {
  initialScripts: CoachScript[];
  canvas: BusinessCanvas | null;
  realLeadsByScriptId: Record<string, SlugLeadCounts>;
}) {
  const [subTab, setSubTab] = useState<Tab>("mes-scripts");

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 999,
              fontSize: 11, fontWeight: 700,
              border: subTab === id ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
              background: subTab === id ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
              color: subTab === id ? "#F5EDED" : "rgba(245,237,237,0.55)",
              cursor: "pointer",
            }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/*
        Repasse 2026-09-15 (retour à froid sur le code livré en rafale les
        jours précédents) : rendu conditionnel avant ce correctif — exactement
        le même piège déjà trouvé et corrigé sur CoachMoiNutritionTabs.tsx
        (MASTERCLASS.md Axe BW, "ça reste seulement si je reste sur la page").
        Changer d'onglet ici (ex. aller voir un Hook) puis revenir sur "Mes
        scripts" DÉMONTAIT MyScripts, perdant la recherche tapée, les filtres
        choisis, et surtout un brouillon de script/description ouvert en
        édition mais pas encore enregistré. Les bibliothèques (Prompts/Hooks/
        CTA/Montage) sont de simples vues de lib/content-library.ts (aucun
        fetch réseau, filtrage local) : les garder montées en permanence ne
        coûte rien. Seule la visibilité change désormais.
      */}
      <div hidden={subTab !== "mes-scripts"}>
        <MyScripts initialScripts={initialScripts} realLeadsByScriptId={realLeadsByScriptId} />
      </div>
      <div hidden={subTab !== "prompts"}>
        <PromptLibrary canvas={canvas} />
      </div>
      <div hidden={subTab !== "hooks"}>
        <HookLibrary />
      </div>
      <div hidden={subTab !== "cta"}>
        <CTALibrary />
      </div>
      <div hidden={subTab !== "technique"}>
        <TechnicalLibrary />
      </div>
    </div>
  );
}

// ── Copie presse-papier générique ──────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Presse-papier indisponible (permission refusée, contexte non
          // sécurisé) — pas grave, le texte reste sélectionnable/copiable
          // à la main juste en dessous.
        }
      }}
      aria-label="Copier"
      style={{
        display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        background: copied ? "rgba(74,222,128,0.15)" : "rgba(0,0,0,0.3)",
        border: `1px solid ${copied ? "rgba(74,222,128,0.4)" : "rgba(245,237,237,0.15)"}`,
        borderRadius: 8, padding: "6px 10px", fontSize: 10.5, fontWeight: 700,
        color: copied ? "#4ade80" : "rgba(245,237,237,0.5)", cursor: "pointer",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

// ── Mes scripts (workspace) ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: 999,
  color: "#F5EDED",
  padding: "6px 10px",
  fontSize: 11.5,
  fontWeight: 700,
  outline: "none",
  cursor: "pointer",
};

function MyScripts({
  initialScripts,
  realLeadsByScriptId,
}: {
  initialScripts: CoachScript[];
  realLeadsByScriptId: Record<string, SlugLeadCounts>;
}) {
  const [scripts, setScripts] = useState(initialScripts);
  useEffect(() => {
    setScripts(initialScripts);
  }, [initialScripts]);

  // Tournage automatique (retour direct 2026-09-18 : "moi je veux pas un
  // bouton Prompteur sur chaque script mais un seul bouton en haut et
  // ensuite ça me fait tourner les scripts du plus ancien au plus récent")
  // — un seul bouton lance une file (scripts filmables à tourner, du plus
  // ancien au plus récent), le Prompteur s'enchaîne seul d'un script au
  // suivant via onFinishedTake, voir Teleprompter.tsx.
  const [filmQueueIds, setFilmQueueIds] = useState<string[] | null>(null);
  const [filmQueueIndex, setFilmQueueIndex] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("court");
  // Retour direct 2026-09-22 : "on s'est encore fait bannir le Insta donc
  // on a encore Facebook" — le compte Instagram est inaccessible pour
  // l'instant (confirmé : jeton Windsor.ai invalide au moment de ce
  // retour), Facebook reste postable. Défaut changé pour suivre la
  // réalité opérationnelle actuelle ; Instagram reste choisissable dans le
  // menu pour préparer du contenu en attendant que le compte revienne.
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Retour direct 2026-09-11 ("on peut copier mais je veux pouvoir
  // modifier") : même schéma openId/draft que pour le script, appliqué à
  // la description (instagram_caption) — jusque-là copiable seulement.
  const [captionOpenId, setCaptionOpenId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  // Tracking de performance (2026-09-10) — édition d'un seul script à la
  // fois, même schéma que openId/draft ci-dessus pour le contenu.
  const [perfEditId, setPerfEditId] = useState<string | null>(null);
  const [perfViews, setPerfViews] = useState("");
  const [perfLikes, setPerfLikes] = useState("");
  const [perfComments, setPerfComments] = useState("");
  // Ajoutés le 2026-09-17 (retour direct : "like et comment et partage et
  // save"), même schéma que les 3 champs ci-dessus.
  const [perfShares, setPerfShares] = useState("");
  const [perfSaves, setPerfSaves] = useState("");

  // Moyenne des vues sur les scripts déjà loggés, pour repérer "au-dessus
  // de la moyenne" automatiquement plutôt que de demander au coach de le
  // signaler lui-même à part (ce que faisait la page Notion "Suivi
  // Performance", jamais alimentée en pratique — voir MASTERCLASS.md Axe BJ).
  const avgViews = useMemo(() => {
    const withViews = scripts.filter((s): s is CoachScript & { views: number } => s.views != null);
    if (withViews.length < 2) return null; // pas assez de données pour qu'une "moyenne" veuille dire quelque chose
    return withViews.reduce((sum, s) => sum + s.views, 0) / withViews.length;
  }, [scripts]);

  // Retour direct 2026-09-16 ("pas juste tracker pour tracker mais analyser
  // et réitérer") : jusqu'ici les vues/likes se logguent script par script
  // sans jamais de vue d'ensemble semaine par semaine. Approximation
  // assumée : `updated_at` sert de proxy pour "quand publié/mesuré" (pas de
  // colonne `published_at` dédiée) — imprécis si un vieux script publié est
  // retouché plus tard, mais reste le meilleur signal disponible sans
  // migration pour une v1 de ce résumé.
  const [weeklyPerfNow] = useState(() => Date.now());
  const weeklyPerf = useMemo(() => {
    const now = weeklyPerfNow;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const published = scripts.filter((s) => s.status === "publie");
    const inWindow = (s: CoachScript, start: number, end: number) => {
      const t = new Date(s.updated_at).getTime();
      return t >= start && t < end;
    };
    const thisWeek = published.filter((s) => inWindow(s, now - weekMs, now));
    const lastWeek = published.filter((s) => inWindow(s, now - 2 * weekMs, now - weekMs));
    if (thisWeek.length === 0 && lastWeek.length === 0) return null;

    const sumViews = (list: CoachScript[]) => list.reduce((sum, s) => sum + (s.views ?? 0), 0);
    const thisWeekViews = sumViews(thisWeek);
    const lastWeekViews = sumViews(lastWeek);
    const missingViews = thisWeek.filter((s) => s.views == null).length;
    const best = [...thisWeek].filter((s) => s.views != null).sort((a, b) => b.views! - a.views!)[0] ?? null;

    return { publishedCount: thisWeek.length, views: thisWeekViews, lastWeekViews, missingViews, best };
  }, [scripts, weeklyPerfNow]);

  function openPerfEdit(script: CoachScript) {
    setPerfEditId(script.id);
    setPerfViews(script.views != null ? String(script.views) : "");
    setPerfLikes(script.likes != null ? String(script.likes) : "");
    setPerfComments(script.comments_count != null ? String(script.comments_count) : "");
    setPerfShares(script.shares != null ? String(script.shares) : "");
    setPerfSaves(script.saves != null ? String(script.saves) : "");
  }

  function savePerf(id: string) {
    const views = perfViews.trim() ? Number(perfViews) : null;
    const likes = perfLikes.trim() ? Number(perfLikes) : null;
    const commentsCount = perfComments.trim() ? Number(perfComments) : null;
    const shares = perfShares.trim() ? Number(perfShares) : null;
    const saves = perfSaves.trim() ? Number(perfSaves) : null;
    if ([views, likes, commentsCount, shares, saves].some((v) => v != null && (!Number.isFinite(v) || v < 0))) {
      setError("Chiffres invalides.");
      return;
    }
    setError(null);
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, views, likes, comments_count: commentsCount, shares, saves } : s)));
    setPerfEditId(null);
    startTransition(async () => {
      const result = await updateScript(id, { views, likes, commentsCount, shares, saves });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  // Cycle de vie à tourner → tourné → publié (retour direct 2026-09-10) :
  // une fois publié, le script est terminé, replié par défaut plutôt que de
  // rester mélangé aux scripts encore à produire (voir avgViews plus haut,
  // qui s'appuie déjà sur ce même statut).
  const [showPublished, setShowPublished] = useState(false);

  // Retour direct 2026-09-11 ("faut une utilité de tracking derrière pour
  // prendre des décisions, rajoute une barre de recherche... pas au mot
  // près") : recherche multi-mots, insensible à la casse/aux accents, sur
  // titre+script+hook+pilier — pas une simple sous-chaîne exacte qui rate
  // "poulet riz" si le texte dit "riz et poulet". Élargie le 2026-09-16
  // (fuzzyMatchAny, lib/fuzzy-search.ts) pour tolérer aussi une faute de
  // frappe/lettre manquante, pas seulement les accents/la casse.
  const [searchQuery, setSearchQuery] = useState("");
  function matchesSearch(script: CoachScript): boolean {
    return fuzzyMatchAny([script.title, script.content, script.hook, script.pillar], searchQuery);
  }

  // Retour direct 2026-09-11 ("améliore le triage, qu'on puisse filtrer
  // genre posté/pas posté, youtube/insta, et le pilier") : trois filtres
  // combinables avec la recherche, "tous" par défaut (aucun filtrage tant
  // que rien n'est choisi). Le pilier est une liste ouverte (texte libre
  // en base), donc calculée depuis les scripts réellement présents plutôt
  // qu'une liste figée qui se périmerait.
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<string | "all">("all");
  const [pillarFilter, setPillarFilter] = useState<string | "all">("all");
  const pillarOptions = useMemo(
    () => Array.from(new Set(scripts.map((s) => s.pillar).filter((p): p is string => !!p))).sort(),
    [scripts]
  );
  function matchesFilters(script: CoachScript): boolean {
    if (statusFilter !== "all" && script.status !== statusFilter) return false;
    if (platformFilter !== "all" && script.platform !== platformFilter) return false;
    if (pillarFilter !== "all" && script.pillar !== pillarFilter) return false;
    return true;
  }

  // Retour direct 2026-09-11 ("si un script est là depuis trop longtemps
  // faut le faire remonter pour que je le tourne et post, ou si un
  // tournage est toujours pas posté") : un script qui traîne dans une
  // étape est un vrai problème de production (le pipeline s'engorge), pas
  // juste une info secondaire — donc remonté en premier dans la liste, pas
  // seulement signalé par une couleur. `updated_at` avance à chaque
  // changement de statut (cycleStatus), donc c'est bien "depuis combien de
  // temps dans CETTE étape", pas depuis la création du script.
  const STALE_DAYS: Record<ScriptStatus, number> = { a_tourner: 3, tourne: 2, publie: Infinity };
  // Initialiseur paresseux (calculé une seule fois, au montage) plutôt que
  // Date.now() directement pendant le rendu : appel impur, fait échouer
  // react-hooks/purity (même correctif déjà utilisé ailleurs dans ce
  // projet, voir CoachMailingComposer.tsx) — une photo figée au chargement
  // suffit très largement ici, une dérive de quelques minutes sur un
  // décompte en jours ne change rien.
  const [now] = useState(() => Date.now());
  function daysInStage(script: CoachScript): number {
    return (now - new Date(script.updated_at).getTime()) / 86400000;
  }
  // Un filtre de statut explicite (ex. "publié" pour ne voir QUE le
  // posté) n'a plus de sens avec le repli "publiés" — dans ce cas, une
  // seule liste plate qui respecte le filtre, sans repli.
  const filtered = scripts.filter(matchesSearch).filter(matchesFilters);
  const activeScripts = (statusFilter === "all" ? filtered.filter((s) => s.status !== "publie") : filtered)
    .slice()
    .sort((a, b) => daysInStage(b) - daysInStage(a));
  const publishedScripts =
    statusFilter === "all" ? filtered.filter((s) => s.status === "publie") : [];

  // File du tournage automatique : uniquement du contenu filmé (jamais
  // LinkedIn/Threads, voir WRITTEN_PLATFORMS), pas encore tourné, avec un
  // vrai script à lire — du plus ancien au plus récent (l'inverse du tri
  // "le plus en retard d'abord" utilisé pour activeScripts, ici on veut
  // vraiment vider le plus vieux stock en premier).
  const filmableScripts = useMemo(
    () =>
      scripts
        .filter((s) => !WRITTEN_PLATFORMS.has(s.platform) && s.status === "a_tourner" && !!s.content)
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [scripts]
  );

  function startFilmingQueue() {
    if (filmableScripts.length === 0) return;
    setFilmQueueIds(filmableScripts.map((s) => s.id));
    setFilmQueueIndex(0);
  }

  // Appelé par le Prompteur une fois une prise sauvegardée (jamais sur un
  // clic — voir Teleprompter.tsx) : marque le script courant "tourné" puis
  // avance dans la file, sans aucune action de la personne entre deux
  // prises. Referme elle-même la file une fois le dernier script atteint,
  // plutôt que via un effet séparé qui devrait rejouer un setState en cascade.
  function finishCurrentTake() {
    const id = filmQueueIds?.[filmQueueIndex];
    if (id) {
      const backup = scripts;
      setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, status: "tourne" } : s)));
      startTransition(async () => {
        const result = await updateScript(id, { status: "tourne" });
        if (result.error) {
          setScripts(backup);
          setError(result.error);
        }
      });
    }
    const nextIndex = filmQueueIndex + 1;
    if (!filmQueueIds || nextIndex >= filmQueueIds.length) {
      setFilmQueueIds(null);
      setFilmQueueIndex(0);
    } else {
      setFilmQueueIndex(nextIndex);
    }
  }

  // Script introuvable (ex. supprimé entre-temps) : ne rend rien plutôt que
  // de crasher — la personne referme via le X du Prompteur pour en relancer
  // une nouvelle si besoin.
  const currentFilmScript =
    filmQueueIds && filmQueueIndex < filmQueueIds.length
      ? scripts.find((s) => s.id === filmQueueIds[filmQueueIndex]) ?? null
      : null;

  function submitNew() {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Titre requis.");
      return;
    }
    startTransition(async () => {
      // Écrit (LinkedIn/Threads) : direct en publié, jamais à_tourner.
      const initialStatus: ScriptStatus = WRITTEN_PLATFORMS.has(newPlatform) ? "publie" : "a_tourner";
      const result = await createScript({ title: t, format, platform: newPlatform, status: initialStatus });
      if (result.error) {
        setError(result.error);
        return;
      }
      const newScript: CoachScript = {
        id: result.id ?? `tmp-${Date.now()}`,
        coach_id: "",
        title: t,
        format,
        platform: newPlatform,
        content: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        duration_seconds: null,
        hook: null,
        pillar: null,
        source_reference: null,
        cta: null,
        instagram_caption: null,
        status: initialStatus,
        views: null,
        likes: null,
        comments_count: null,
        shares: null,
        saves: null,
      };
      setScripts((prev) => [newScript, ...prev]);
      setTitle("");
      setShowForm(false);
      setOpenId(newScript.id);
      setDraft("");
    });
  }

  // MASTERCLASS.md Axe B (rattrapé le 2026-08-19) : résultat jamais
  // vérifié — un échec serveur laissait l'écran afficher un état faux
  // sans retour en arrière, jusqu'au prochain rechargement complet.
  function saveContent(id: string) {
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, content: draft || null } : s)));
    setOpenId(null);
    startTransition(async () => {
      const result = await updateScript(id, { content: draft });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  function saveCaption(id: string) {
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, instagram_caption: captionDraft || null } : s)));
    setCaptionOpenId(null);
    startTransition(async () => {
      const result = await updateScript(id, { caption: captionDraft });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  // Retour direct 2026-09-16 : élargir les plateformes disponibles ne sert
  // à rien si un script déjà écrit reste coincé sur "instagram" (valeur par
  // défaut à la création) sans façon de le retagger. Même mécanisme
  // optimiste que cycleStatus.
  function updatePlatform(id: string, platform: string) {
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, platform } : s)));
    startTransition(async () => {
      const result = await updateScript(id, { platform });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  function cycleStatus(id: string, current: ScriptStatus) {
    const next = STATUS_CYCLE[current];
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
    startTransition(async () => {
      const result = await updateScript(id, { status: next });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  function remove(id: string, reason: ScriptDeletionReason, detail?: string) {
    const idx = scripts.findIndex((s) => s.id === id);
    const backup = scripts[idx];
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (openId === id) setOpenId(null);
    setDeleteTarget(null);
    setDeleteDetail("");
    startTransition(async () => {
      const result = await deleteScript(id, reason, detail);
      if (result.error && backup) {
        setScripts((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
        setError(result.error);
      }
    });
  }

  // Retour direct 2026-09-16 : "demande avant de juste cliquer sur la
  // poubelle, pourquoi supprimer, car faux ou car sujet nul etc" — un clic
  // sur la corbeille n'efface plus rien directement, il ouvre ce petit choix
  // de raison. La raison choisie est journalisée côté serveur (voir
  // deleteScript) pour repérer plus tard les piliers/angles les plus
  // souvent rejetés, un vrai signal pour la stratégie de contenu.
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteDetail, setDeleteDetail] = useState("");
  const [showDeleteDetailInput, setShowDeleteDetailInput] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={startFilmingQueue}
          disabled={filmableScripts.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(224,30,30,0.15)", color: "#E01E1E", padding: "8px 14px",
            borderRadius: 999, fontWeight: 800, fontSize: 12,
            border: "1px solid rgba(224,30,30,0.4)", cursor: filmableScripts.length === 0 ? "default" : "pointer",
            opacity: filmableScripts.length === 0 ? 0.4 : 1,
          }}
        >
          <Camera size={14} /> Lancer le tournage{filmableScripts.length > 0 ? ` (${filmableScripts.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#E01E1E", color: "#fff", padding: "8px 14px",
            borderRadius: 999, fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer",
          }}
        >
          <Plus size={14} /> Nouveau script
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du script"
            aria-label="Titre du script"
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {(["court", "long"] as ScriptFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                style={{
                  fontSize: 11.5, fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                  border: format === f ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
                  background: format === f ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
                  color: format === f ? "#F5EDED" : "rgba(245,237,237,0.55)",
                }}
              >
                Format {f}
              </button>
            ))}
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              aria-label="Plateforme du script"
              style={{ ...inputStyle, width: "auto", padding: "7px 10px" }}
            >
              {Object.entries(PLATFORM_LABELS).map(([id, { label }]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button
            type="button"
            onClick={submitNew}
            disabled={isPending}
            style={{
              marginTop: 10, background: "#E01E1E", color: "#fff", padding: "9px 18px",
              borderRadius: "var(--radius-lg)", fontWeight: 800, fontSize: 12.5, border: "none",
              cursor: "pointer", opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "..." : "Créer"}
          </button>
        </div>
      )}

      {scripts.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <FileText size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun script pour l&apos;instant. Pioche un prompt ou un hook dans les onglets à côté pour démarrer.</p>
        </div>
      ) : (
        <>
          {weeklyPerf && (
            <div className="ep-card" style={{ padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(245,237,237,0.4)", marginBottom: 10 }}>
                Performance de la semaine
              </p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: weeklyPerf.missingViews > 0 ? 8 : 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#F5EDED" }}>{weeklyPerf.publishedCount}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.4)" }}>publié{weeklyPerf.publishedCount > 1 ? "s" : ""} cette semaine</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#F5EDED" }}>
                    {weeklyPerf.views.toLocaleString("fr-FR")}
                    {weeklyPerf.lastWeekViews > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, color: weeklyPerf.views >= weeklyPerf.lastWeekViews ? "#4ade80" : "#f87171" }}>
                        {weeklyPerf.views >= weeklyPerf.lastWeekViews ? "▲" : "▼"}{" "}
                        {Math.abs(Math.round(((weeklyPerf.views - weeklyPerf.lastWeekViews) / weeklyPerf.lastWeekViews) * 100))}%
                      </span>
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.4)" }}>
                    vues loguées {weeklyPerf.lastWeekViews > 0 ? `(vs ${weeklyPerf.lastWeekViews.toLocaleString("fr-FR")} la semaine passée)` : "cette semaine"}
                  </p>
                </div>
                {weeklyPerf.best && (
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{weeklyPerf.best.views!.toLocaleString("fr-FR")}</p>
                    <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      🔥 meilleur : {weeklyPerf.best.title}
                    </p>
                  </div>
                )}
              </div>
              {weeklyPerf.missingViews > 0 && (
                <p style={{ margin: 0, fontSize: 11, color: "#facc15" }}>
                  {weeklyPerf.missingViews} script{weeklyPerf.missingViews > 1 ? "s" : ""} publié{weeklyPerf.missingViews > 1 ? "s" : ""} cette semaine sans vues loguées, ces chiffres restent incomplets tant qu&apos;ils ne sont pas remplis (bouton &laquo;&nbsp;Loguer les résultats&nbsp;&raquo; sur chaque script publié).
                </p>
              )}
            </div>
          )}

          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un script (titre, texte, hook, pilier)"
              aria-label="Rechercher un script"
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>

          {/* Retour direct 2026-09-11 : filtres combinables statut/
              plateforme/pilier, en plus de la recherche — trois listes
              déroulantes plutôt que des rangées de pills (le pilier est une
              liste ouverte qui peut grossir, des pills deviendraient vite
              illisibles). */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ScriptStatus | "all")}
              aria-label="Filtrer par statut"
              style={selectStyle}
            >
              <option value="all">Tous les statuts</option>
              <option value="a_tourner">À tourner</option>
              <option value="tourne">Tourné</option>
              <option value="publie">Publié</option>
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              aria-label="Filtrer par plateforme"
              style={selectStyle}
            >
              <option value="all">Toutes plateformes</option>
              {Object.entries(PLATFORM_LABELS).map(([id, { label }]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            {pillarOptions.length > 0 && (
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                aria-label="Filtrer par pilier"
                style={selectStyle}
              >
                <option value="all">Tous les piliers</option>
                {pillarOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            {(statusFilter !== "all" || platformFilter !== "all" || pillarFilter !== "all") && (
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setPillarFilter("all"); }}
                style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.4)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {activeScripts.length === 0 && publishedScripts.length === 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 text-center mb-3">
              <p className="text-sm text-[#F5EDED]/35">
                {searchQuery.trim().length > 0
                  ? <>Aucun script ne correspond à &quot;{searchQuery}&quot;.</>
                  : "Aucun script ne correspond à ces filtres."}
              </p>
            </div>
          ) : (
          <>
          {/* Cycle de vie (retour direct 2026-09-10) : écrire → tourner →
              poster, et une fois posté le script est FINI — il ne doit plus
              se mélanger visuellement avec ceux encore à produire. Séparés
              en deux groupes plutôt qu'une seule liste plate qui grossit vite
              (5 reels/jour + 1 YouTube/jour, voir Axe BJ) : "publiés" replié
              par défaut, pas supprimé (le tracking de performance juste en
              dessous reste consultable dedans). Retour direct 2026-09-11 :
              triés par ancienneté dans l'étape actuelle (le plus en retard
              en premier), pas par date de création — pour vraiment faire
              remonter ce qui traîne et débloquer le pipeline. */}
          {activeScripts.length === 0 && publishedScripts.length > 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 text-center mb-3">
              <p className="text-sm text-[#F5EDED]/35">Tout ce qui était à produire est posté. 🎉</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeScripts.map(renderScript)}
            </div>
          )}

          {publishedScripts.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setShowPublished((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  background: "none", border: "none", cursor: "pointer", padding: "8px 0",
                  borderTop: "1px solid rgba(245,237,237,0.08)",
                }}
              >
                <Check size={12} style={{ color: "#4ade80" }} strokeWidth={3} />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.4)" }}>
                  Publiés, terminés ({publishedScripts.length})
                </span>
                <ChevronDown
                  size={13}
                  style={{ color: "rgba(245,237,237,0.3)", marginLeft: "auto", transform: showPublished ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
                />
              </button>
              {showPublished && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {publishedScripts.map(renderScript)}
                </div>
              )}
            </div>
          )}
          </>
          )}
        </>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full sm:max-w-sm bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl z-10 p-5">
            <p style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.5, marginBottom: 4 }}>
              Supprimer « {deleteTarget.title} » ?
            </p>
            <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", marginBottom: 16 }}>
              Pourquoi ce script ne sert plus ? Ça aide à repérer les piliers/angles qui marchent le moins.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => remove(deleteTarget.id, "info_fausse")}
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,237,237,0.15)", background: "rgba(0,0,0,0.25)", color: "#F5EDED", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                Information fausse ou dépassée
              </button>
              <button
                type="button"
                onClick={() => remove(deleteTarget.id, "sujet_nul")}
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,237,237,0.15)", background: "rgba(0,0,0,0.25)", color: "#F5EDED", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                Sujet qui n&apos;intéresse pas / angle raté
              </button>
              {!showDeleteDetailInput ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteDetailInput(true)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,237,237,0.15)", background: "rgba(0,0,0,0.25)", color: "#F5EDED", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Autre raison
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <textarea
                    value={deleteDetail}
                    onChange={(e) => setDeleteDetail(e.target.value)}
                    placeholder="Précise en une phrase (optionnel)"
                    aria-label="Autre raison"
                    rows={2}
                    style={{ ...inputStyle, resize: "none" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => remove(deleteTarget.id, "autre", deleteDetail)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
                  >
                    Confirmer la suppression
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ textAlign: "center", padding: "8px 12px", background: "none", border: "none", color: "rgba(245,237,237,0.4)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {currentFilmScript && filmQueueIds && (
        <Teleprompter
          scriptId={currentFilmScript.id}
          title={currentFilmScript.title}
          content={currentFilmScript.content ?? ""}
          queueProgress={{ index: filmQueueIndex + 1, total: filmQueueIds.length }}
          onClose={() => setFilmQueueIds(null)}
          onFinishedTake={finishCurrentTake}
        />
      )}
    </div>
  );

  function renderScript(script: CoachScript) {
    const statusInfo = STATUS_LABELS[script.status] ?? STATUS_LABELS.a_tourner;
    const duration = formatDuration(script.duration_seconds);
    const platformInfo = PLATFORM_LABELS[script.platform] ?? null;
    // Retour direct 2026-09-11 : combien de jours dans l'étape actuelle,
    // affiché seulement passé le seuil de retard (STALE_DAYS) — sous ce
    // seuil c'est un délai normal, pas la peine de le signaler.
    const stageDays = daysInStage(script);
    const isStale = stageDays >= STALE_DAYS[script.status];
    const isVeryStale = stageDays >= STALE_DAYS[script.status] * 2;
    return (
            <div key={script.id} className="ep-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={script.platform}
                  onChange={(e) => updatePlatform(script.id, e.target.value)}
                  aria-label="Plateforme du script"
                  title="Changer la plateforme"
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 6px", borderRadius: 999, cursor: "pointer",
                    background: `${(platformInfo ?? { color: "#F5EDED" }).color}22`,
                    color: (platformInfo ?? { color: "#F5EDED" }).color,
                    border: `1px solid ${(platformInfo ?? { color: "#F5EDED" }).color}44`,
                  }}
                >
                  {!platformInfo && <option value={script.platform}>{script.platform}</option>}
                  {Object.entries(PLATFORM_LABELS).map(([id, { label }]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                <span
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E",
                  }}
                >
                  {script.format}
                </span>
                {duration && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(245,237,237,0.45)" }}>{duration}</span>
                )}
                {script.pillar && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(245,237,237,0.4)", padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(245,237,237,0.12)" }}>
                    {script.pillar}
                  </span>
                )}
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED", flex: 1, minWidth: 120 }}>{script.title}</p>
                {isStale && (
                  <span
                    title={`Dans cette étape depuis ${Math.floor(stageDays)} jour${Math.floor(stageDays) > 1 ? "s" : ""} — au-delà du délai normal`}
                    style={{
                      fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 999,
                      background: isVeryStale ? "rgba(248,113,113,0.18)" : "rgba(250,204,21,0.15)",
                      color: isVeryStale ? "#f87171" : "#facc15",
                      border: `1px solid ${isVeryStale ? "#f87171" : "#facc15"}55`,
                    }}
                  >
                    ⏳ {Math.floor(stageDays)}j
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => cycleStatus(script.id, script.status)}
                  title={STATUS_TITLES[script.status]}
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
                    padding: "3px 8px", borderRadius: 999, cursor: "pointer", border: `1px solid ${statusInfo.color}55`,
                    background: "transparent", color: statusInfo.color,
                  }}
                >
                  {statusInfo.label}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget({ id: script.id, title: script.title });
                    setDeleteDetail("");
                    setShowDeleteDetailInput(false);
                  }}
                  aria-label="Supprimer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Script mot pour mot — retour direct 2026-09-02 : "le script
                  que je dois lire mot pour mot y'a pas encore" — c'était déjà
                  là en base, mais noyé sous la description Instagram et
                  tronqué à 80px sans le moindre libellé. Maintenant en
                  premier, en entier, clairement identifié. */}
              <div style={{ marginTop: 10, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#E01E1E" }}>
                    {/* Retour direct 2026-09-18 : LinkedIn/Threads sont du
                        texte posté tel quel, jamais lu à voix haute. */}
                    {WRITTEN_PLATFORMS.has(script.platform) ? "Texte du post" : "Script (mot pour mot)"}
                  </span>
                  {script.content && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <CopyButton text={script.content} />
                    </div>
                  )}
                </div>
                {openId === script.id ? (
                  <div>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={8}
                      aria-label="Contenu du script"
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => saveContent(script.id)}
                        style={{
                          background: "#E01E1E", color: "#fff", padding: "9px 18px", borderRadius: "var(--radius-lg)",
                          fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
                        }}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        style={{
                          background: "transparent", color: "rgba(245,237,237,0.5)", padding: "9px 18px",
                          borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: 12.5,
                          border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  // Retour direct 2026-09-18 : "un espace réduit, genre 1/3
                  // de l'écran pour ceux qui sont longs mais pas plus, et
                  // que ça défile dans le rectangle, pas tout l'onglet" —
                  // hauteur plafonnée avec défilement interne au lieu d'un
                  // bloc qui grandissait sans limite et allongeait toute la
                  // page pour un script long.
                  <p
                    onClick={() => {
                      setOpenId(script.id);
                      setDraft(script.content ?? "");
                    }}
                    style={{
                      margin: 0, fontSize: 13, color: "#F5EDED", lineHeight: 1.6,
                      whiteSpace: "pre-wrap", cursor: "text",
                      maxHeight: "33vh", overflowY: "auto",
                    }}
                  >
                    {script.content || <span style={{ color: "rgba(245,237,237,0.25)" }}>Vide, clique pour écrire.</span>}
                  </p>
                )}
              </div>

              {(script.hook || script.cta || script.source_reference) && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  {script.hook && (
                    <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)" }}>
                      <span style={{ fontWeight: 800, color: "rgba(245,237,237,0.35)" }}>Hook </span>{script.hook}
                    </p>
                  )}
                  {script.cta && (
                    <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)" }}>
                      <span style={{ fontWeight: 800, color: "rgba(245,237,237,0.35)" }}>CTA parlé </span>{script.cta}
                    </p>
                  )}
                  {script.source_reference && (
                    <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.35)", fontStyle: "italic" }}>
                      Source : {script.source_reference}
                    </p>
                  )}
                </div>
              )}

              {/* Signal réel (retour direct 2026-09-17, inspiré du SaaS
                  "Insider" cité par le coach) : contrairement aux vues/likes
                  au-dessus (saisis à la main, purement déclaratifs), ce
                  chiffre vient de vraies captures dans la table `leads`,
                  résolues depuis le numéro de leadmagnet cité en CTA. Jamais
                  "généré par CE script" dans le libellé : plusieurs scripts
                  différents peuvent citer le même numéro à des dates
                  différentes (voir lib/content-leads-tracking.ts). */}
              {realLeadsByScriptId[script.id] && (
                <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: "#facc15" }}>
                  📩 {realLeadsByScriptId[script.id].total} lead{realLeadsByScriptId[script.id].total > 1 ? "s" : ""} captés sur ce numéro
                  {realLeadsByScriptId[script.id].last30Days > 0 && ` (${realLeadsByScriptId[script.id].last30Days} sur les 30 derniers jours)`}
                </p>
              )}

              {/* Description à poster avec la vidéo — distincte du script
                  parlé ci-dessus. Même colonne "instagram_caption" réutilisée
                  pour toute plateforme (YouTube inclus) : le libellé
                  s'adapte, la donnée reste une seule colonne texte libre.
                  Retour direct 2026-09-18 : sur LinkedIn/Threads (contenu
                  écrit), il n'y a rien à décrire en plus du texte du post
                  lui-même, ce bloc entier n'a pas de sens et n'apparaît
                  plus pour ces deux plateformes. */}
              {!WRITTEN_PLATFORMS.has(script.platform) && (script.instagram_caption || captionOpenId === script.id) && (
                <div style={{ marginTop: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa" }}>
                      Description {platformInfo?.label ?? ""}
                    </span>
                    {script.instagram_caption && <CopyButton text={script.instagram_caption} />}
                  </div>
                  {captionOpenId === script.id ? (
                    <div>
                      <textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        rows={8}
                        aria-label="Description du script"
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => saveCaption(script.id)}
                          style={{
                            background: "#60a5fa", color: "#000", padding: "9px 18px", borderRadius: "var(--radius-lg)",
                            fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
                          }}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setCaptionOpenId(null)}
                          style={{
                            background: "transparent", color: "rgba(245,237,237,0.5)", padding: "9px 18px",
                            borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: 12.5,
                            border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer",
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Retour direct 2026-09-18 : "les description ça sert
                    // à rien que j'aie une vue dessus, fait apparaître
                    // seulement 1 ligne c'est suffisant" — juste de quoi
                    // confirmer qu'elle existe, pas la relire en entier ici
                    // (clique pour l'ouvrir en entier si besoin, inchangé).
                    <p
                      onClick={() => {
                        setCaptionOpenId(script.id);
                        setCaptionDraft(script.instagram_caption ?? "");
                      }}
                      style={{
                        margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.5, cursor: "text",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      {script.instagram_caption}
                    </p>
                  )}
                </div>
              )}
              {!WRITTEN_PLATFORMS.has(script.platform) && !script.instagram_caption && captionOpenId !== script.id && (
                <button
                  type="button"
                  onClick={() => { setCaptionOpenId(script.id); setCaptionDraft(""); }}
                  style={{
                    marginTop: 10, fontSize: 11, fontWeight: 700, color: "#60a5fa", background: "none",
                    border: "1px dashed rgba(96,165,250,0.3)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", width: "100%",
                  }}
                >
                  + Ajouter une description {platformInfo?.label ?? ""}
                </button>
              )}

              {/* Tracking de performance (2026-09-10) — seulement une fois
                  publié, jamais avant : loguer des vues sur un script pas
                  encore posté n'a pas de sens. Un seul champ obligatoire
                  (vues) pour rester rapide au quotidien, likes/commentaires
                  repliés en options plutôt qu'imposés. */}
              {script.status === "publie" && (
                <div style={{ marginTop: 10, background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  {perfEditId === script.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfViews} onChange={(e) => setPerfViews(e.target.value)}
                          placeholder="Vues" aria-label="Vues"
                          style={{ ...inputStyle, width: 90, padding: "8px 10px" }}
                          autoFocus
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfLikes} onChange={(e) => setPerfLikes(e.target.value)}
                          placeholder="Likes (optionnel)" aria-label="Likes"
                          style={{ ...inputStyle, width: 130, padding: "8px 10px" }}
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfComments} onChange={(e) => setPerfComments(e.target.value)}
                          placeholder="Commentaires (optionnel)" aria-label="Commentaires"
                          style={{ ...inputStyle, width: 150, padding: "8px 10px" }}
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfShares} onChange={(e) => setPerfShares(e.target.value)}
                          placeholder="Partages (optionnel)" aria-label="Partages"
                          style={{ ...inputStyle, width: 130, padding: "8px 10px" }}
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfSaves} onChange={(e) => setPerfSaves(e.target.value)}
                          placeholder="Enregistrements (optionnel)" aria-label="Enregistrements"
                          style={{ ...inputStyle, width: 160, padding: "8px 10px" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button" onClick={() => savePerf(script.id)}
                          style={{ background: "#4ade80", color: "#0a1f0a", padding: "7px 14px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, border: "none", cursor: "pointer" }}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button" onClick={() => setPerfEditId(null)}
                          style={{ background: "transparent", color: "rgba(245,237,237,0.4)", padding: "7px 14px", borderRadius: 8, fontWeight: 700, fontSize: 11.5, border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer" }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : script.views != null ? (
                    <button
                      type="button"
                      onClick={() => openPerfEdit(script)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left" }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#4ade80" }}>{script.views.toLocaleString("fr-FR")} vues</span>
                      {script.likes != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.likes.toLocaleString("fr-FR")} likes</span>}
                      {script.comments_count != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.comments_count.toLocaleString("fr-FR")} commentaires</span>}
                      {script.shares != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.shares.toLocaleString("fr-FR")} partages</span>}
                      {script.saves != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.saves.toLocaleString("fr-FR")} enreg.</span>}
                      {avgViews != null && script.views > avgViews && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#facc15", background: "rgba(250,204,21,0.12)", padding: "2px 7px", borderRadius: 999 }}>
                          🔥 Au-dessus de la moyenne
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(245,237,237,0.25)", fontWeight: 700 }}>Modifier</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPerfEdit(script)}
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#4ade80", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      + Loguer les résultats (vues)
                    </button>
                  )}
                </div>
              )}
            </div>
    );
  }
}

// ── Recherche générique pour les bibliothèques ──────────────────────────

function LibrarySearch({ query, onChange, placeholder }: { query: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ ...inputStyle, paddingLeft: 32 }}
      />
    </div>
  );
}

// ── Bibliothèque de prompts ───────────────────────────────────────────────

// Personnalisation automatique (retour direct 2026-09-10 : "hyper
// personnalisé à eux, leur business, leur niche, leur client") — plutôt que
// de dupliquer les infos du Business Model Canvas dans chacun des ~25
// prompts (impossible à tenir à jour), un seul paragraphe de contexte est
// composé ici à partir du canvas déjà rempli par le coach (lib/coach-
// business-canvas.ts) et préfixé devant CHAQUE prompt au moment de la
// copie. Le prompt copié colle dans Claude/ChatGPT avec le contexte déjà
// dedans, sans que le coach ait à le retaper à chaque fois.
function buildCoachContext(canvas: BusinessCanvas | null): string | null {
  if (!canvas) return null;
  const parts: string[] = [];
  if (canvas.customer_segments) parts.push(`Mon client cible : ${canvas.customer_segments}`);
  if (canvas.value_proposition) parts.push(`Ma proposition de valeur, ce qui me différencie : ${canvas.value_proposition}`);
  if (canvas.customer_relationships) parts.push(`Comment je suis mes clients : ${canvas.customer_relationships}`);
  if (parts.length === 0) return null;
  return `Contexte sur mon activité de coach (garde-le en tête pour toute la suite de cette conversation) :\n${parts.join("\n")}\n\n---\n\n`;
}

function PromptLibrary({ canvas }: { canvas: BusinessCanvas | null }) {
  const [query, setQuery] = useState("");
  const context = useMemo(() => buildCoachContext(canvas), [canvas]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONTENT_PROMPTS;
    return CONTENT_PROMPTS.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      {context ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <Sparkles size={13} style={{ color: "#4ade80", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.5 }}>
            Ces prompts sont personnalisés avec ton Business Model Canvas : le contexte sur ton activité est
            automatiquement ajouté quand tu cliques Copier.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.18)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <Sparkles size={13} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.55)", lineHeight: 1.5, flex: 1 }}>
            Remplis ton{" "}
            <Link href="/dashboard/coach/business" style={{ color: "#E01E1E", fontWeight: 700, textDecoration: "underline" }}>
              Business Model Canvas
            </Link>{" "}
            (au moins ta clientèle cible et ta proposition de valeur) pour que ces prompts se personnalisent
            automatiquement à ta situation au lieu de rester génériques.
          </p>
        </div>
      )}
      <LibrarySearch query={query} onChange={setQuery} placeholder="Chercher un prompt..." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p, i) => (
          <div key={i} className="ep-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E" }}>
                {p.category}
              </span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED", flex: 1 }}>{p.title}</p>
              <CopyButton text={context ? context + p.prompt : p.prompt} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>{p.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Banque de hooks ────────────────────────────────────────────────────────

function HookLibrary() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "visuel" | "texte">("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOOK_BANK.filter((h) => {
      if (kindFilter !== "all" && h.kind !== kindFilter) return false;
      if (!q) return true;
      return h.text.toLowerCase().includes(q) || h.category.toLowerCase().includes(q);
    });
  }, [query, kindFilter]);

  return (
    <div>
      <LibrarySearch query={query} onChange={setQuery} placeholder="Chercher un hook..." />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["all", "texte", "visuel"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: kindFilter === k ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
              background: kindFilter === k ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
              color: kindFilter === k ? "#F5EDED" : "rgba(245,237,237,0.55)",
            }}
          >
            {k === "all" ? "Tous" : k === "texte" ? "Texte" : "Visuel"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(245,237,237,0.3)", alignSelf: "center" }}>
          {filtered.length} hook{filtered.length > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.15)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.3)", flexShrink: 0, width: 46 }}>
              {h.kind}
            </span>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.75)", flex: 1, lineHeight: 1.5 }}>{h.text}</p>
            <CopyButton text={h.text} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exemples de CTA ────────────────────────────────────────────────────────

function CTALibrary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {CTA_EXAMPLES.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.15)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.5 }}>{c.text}</p>
            <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(245,237,237,0.3)" }}>{c.goal}</p>
          </div>
          <CopyButton text={c.text} />
        </div>
      ))}
    </div>
  );
}

// ── Fiches techniques de montage ───────────────────────────────────────────

function TechnicalLibrary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {TECHNICAL_SHEETS.map((sheet, i) => (
        <div key={i} className="ep-card" style={{ padding: 18 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 800, color: "#F5EDED" }}>{sheet.title}</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>{sheet.summary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sheet.steps.map((step, j) => (
              <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#E01E1E", color: "#fff",
                    fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                  }}
                >
                  {j + 1}
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
