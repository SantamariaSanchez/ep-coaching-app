"use client";

import Link from "next/link";
import { hiddenSegments, isOn, type AppSetup, type Modules } from "@/lib/app-setup";
import AppSetupPrompt from "@/components/setup/AppSetupPrompt";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Home, Users, ClipboardCheck, LogOut, Dumbbell, Apple,
  ClipboardList, TrendingUp, User, Image, BookOpen,
  MessageCircle, Map, GraduationCap, Activity, Footprints, Watch,
  ListChecks, Heart, Trophy, HelpCircle, Crown, Lock, UtensilsCrossed, Video, BarChart3, SlidersHorizontal, UsersRound, LayoutGrid, NotebookPen, LifeBuoy,
  Brain, MessageSquareText, LibraryBig,
  Search, Newspaper, FlaskConical, Microscope, Bell, CalendarDays, Droplet,
  ArrowLeftRight, Settings, Shield, LayoutTemplate, Mail, Inbox, Sparkles,
  AlertTriangle, Wallet, Network, HeartPulse, Rocket, Bot, FileText, PhoneCall, Megaphone,
  BookOpenCheck, Gauge, Award, CalendarCheck, Crosshair, BrainCircuit, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import { EPLogo } from "@/components/ui/EPLogo";
import ActiveSessionBanner from "@/components/ui/ActiveSessionBanner";
import InstallAppHint from "@/components/ui/InstallAppHint";
import CommandPalette from "@/components/ui/CommandPalette";
import { useT } from "@/components/i18n/I18nProvider";
import { useTypingInSession } from "@/components/client/session/useTypingInSession";

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeKey = "pending" | "messages" | "questions" | "clientsGroup";

export type TabItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  matchSegments: string[];
  exactMatch?: boolean;
  badge?: BadgeKey;
};

export type SidebarGroup = {
  group: string;
  items: Array<{
    label: string;
    icon: React.ElementType;
    segment: string;
    badge?: BadgeKey;
    href?: string; // overrides the computed `${base}/${segment}` link
    locked?: boolean; // shows a small lock badge (premium teaser for free members)
    // Réservé aux clients coachés uniquement (checkin, tasks, live) : lock
    // affiché seulement pour les membres gratuits, jamais pour un client payant.
    freeLocked?: boolean;
  }>;
};

// ── Navigation data ─────────────────────────────────────────────────────────

// Navigation téléphone repensée (lancement App Store, 2026-09-30) : 5
// onglets max, chacun avec une logique claire, le reste dans « Plus ».
const CLIENT_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/client",
    matchSegments: [],
    exactMatch: true,
  },
  {
    label: "Training",
    icon: Dumbbell,
    href: "/dashboard/client/program",
    matchSegments: ["program", "logbook", "performances", "exercises", "gyms"],
  },
  {
    label: "Suivi",
    icon: TrendingUp,
    href: "/dashboard/client/bilan",
    matchSegments: ["photos", "nutrition", "progress", "roadmap", "bilan", "steps", "tracking", "mindset", "agenda", "cycle", "semaine"],
  },
  {
    label: "Coach",
    icon: MessageCircle,
    href: "/dashboard/client/messages",
    matchSegments: ["messages", "checkin", "reminders", "tasks", "coach", "live"],
    badge: "messages",
  },
  {
    label: "Plus",
    icon: LayoutGrid,
    href: "/dashboard/client/plus",
    matchSegments: ["plus", "formations", "ressources", "recettes", "science", "communaute", "abonnement", "profile", "parametres", "mon-appli", "notes", "aide", "claude"],
  },
];

const COACH_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/coach",
    matchSegments: [],
    exactMatch: true,
  },
  {
    label: "Clients",
    icon: Users,
    href: "/dashboard/coach/clients",
    matchSegments: ["clients", "programmation", "messages", "prioritaires", "mailing", "assistant", "inbox", "live"],
    badge: "clientsGroup",
  },
  {
    label: "Business",
    icon: Rocket,
    href: "/dashboard/coach/studio",
    matchSegments: ["positionnement", "studio", "stats-reseaux", "formations", "admin/ventes", "admin/equipe", "business", "mon-equipe", "compta", "documents", "masterclass"],
  },
  {
    label: "Moi",
    icon: Activity,
    href: "/dashboard/coach/moi/bilan",
    matchSegments: ["moi"],
  },
  {
    label: "Plus",
    icon: LayoutGrid,
    href: "/dashboard/coach/plus",
    matchSegments: ["plus", "ressources", "recettes", "exercises", "gyms", "science", "contraintes", "communaute", "profile", "parametres", "mon-appli", "finance", "admin", "notes", "aide", "claude"],
    badge: "questions",
  },
];

export const COACH_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Tableau de bord", icon: Home, segment: "" }],
  },
  {
    group: "Clients",
    items: [
      { label: "Clients",  icon: Users,          segment: "clients",   badge: "pending" },
      { label: "Priorités", icon: AlertTriangle, segment: "prioritaires" },
      { label: "Messages", icon: MessageCircle,  segment: "messages",  badge: "messages" },
      { label: "Boîte de réception", icon: Inbox, segment: "inbox" },
      { label: "Coaching live", icon: Video, segment: "live" },
      { label: "Modèles",  icon: LayoutTemplate, segment: "programmation" },
      { label: "Mon assistant", icon: Bot, segment: "assistant" },
      { label: "Mailing", icon: Mail, segment: "mailing" },
    ],
  },
  {
    group: "Mon business",
    // Ordre par utilité (demande d'Emmanuel 2026-10-28) : le Studio créatif
    // d'abord, c'est ce qu'il ouvre tous les jours ; « Business » sur mobile
    // ouvre le PREMIER élément de ce groupe (computeNav → firstVisible), donc
    // l'ordre ci-dessous est aussi la page d'arrivée. La niche et l'avatar se
    // posent une fois puis se consultent peu : ils passent après les outils
    // du quotidien.
    items: [
      { label: "Studio créatif", icon: Sparkles, segment: "studio" },
      { label: "Mes stats réseaux", icon: BarChart3, segment: "stats-reseaux" },
      { label: "Appels de vente", icon: PhoneCall, segment: "admin/ventes" },
      { label: "Pilotage", icon: Gauge, segment: "business/pilotage" },
      { label: "Mes formations", icon: GraduationCap, segment: "formations" },
      { label: "Mon équipe", icon: UsersRound, segment: "mon-equipe" },
      { label: "Publicité", icon: Megaphone, segment: "business/ads" },
      { label: "Ma niche et mon avatar", icon: Crosshair, segment: "positionnement" },
      { label: "Développer mon business", icon: Rocket, segment: "business" },
      { label: "Documents", icon: FileText, segment: "documents" },
      { label: "Masterclass", icon: BookOpenCheck, segment: "masterclass" },
    ],
  },
  {
    // Axe 4 (VISION.md) : journal revenus/dépenses du coach pour SON
    // activité — distinct de "Mon abonnement plateforme" (Compte) et du
    // MRR plateforme (Administration, réservé au fondateur).
    group: "Comptabilité",
    items: [
      { label: "Revenus & dépenses", icon: Wallet, segment: "compta" },
    ],
  },
  {
    group: "Mes notes",
    items: [{ label: "Notes", icon: NotebookPen, segment: "notes" }],
  },
  {
    group: "Bibliothèque",
    items: [
      { label: "Ressources", icon: BookOpen, segment: "ressources" },
      { label: "Recettes", icon: UtensilsCrossed, segment: "recettes" },
      { label: "Exercices & salles", icon: LibraryBig, segment: "exercises" },
      { label: "Contraintes & populations", icon: HeartPulse, segment: "contraintes" },
    ],
  },
  {
    group: "Science",
    items: [
      { label: "Recherche", icon: Search, segment: "science/recherche" },
      { label: "Actualité", icon: Newspaper, segment: "science/actualite" },
      { label: "Bibliothèque", icon: FlaskConical, segment: "science/bibliotheque" },
      { label: "Nos études", icon: Microscope, segment: "science/etudes" },
    ],
  },
  {
    group: "Communauté",
    items: [
      { label: "Victoires", icon: Trophy, segment: "communaute/victoires" },
      { label: "Questions", icon: HelpCircle, segment: "communaute/questions", badge: "questions" },
      { label: "Mot du coach", icon: MessageSquareText, segment: "communaute/coach" },
      { label: "Membres", icon: Heart, segment: "communaute/membres" },
    ],
  },
  {
    group: "Mon Suivi",
    items: [
      { label: "Bilan & progression", icon: ClipboardCheck, segment: "moi/bilan" },
      { label: "Nutrition",      icon: Apple,          segment: "moi/nutrition" },
      // Remonté ici (retour direct 2026-09-22 : "l'agenda c'est important
      // alors en max 2 clics à accéder") — en 7e position sur 12, la
      // pastille "Agenda" tombait hors de l'écran mobile et n'était
      // atteignable qu'en faisant défiler la bande de sous-onglets
      // horizontalement, ce qui la rendait perçue comme cachée même si
      // techniquement accessible en 2 taps. 3e position = visible d'emblée,
      // juste après Bilan et Nutrition, sans scroll.
      { label: "Agenda",         icon: CalendarDays,   segment: "moi/agenda" },
      // Revue de la semaine (audit 2026-09-29) : le rituel de pilotage perso
      // du dimanche, placé juste après l'agenda pour rester visible sans
      // scroll sur mobile, comme lui.
      { label: "Ma semaine",     icon: CalendarCheck,  segment: "moi/semaine" },
      { label: "Programme",      icon: Dumbbell,       segment: "moi/programme" },
      { label: "Logbook",        icon: BookOpen,       segment: "moi/logbook" },
      // Performances par discipline (2026-10-07) : masqué tant qu'aucune
      // discipline n'est choisie dans Mon appli (hiddenSegments).
      { label: "Performances",   icon: Trophy,         segment: "moi/performances" },
      // Manquait entièrement (trouvé en audit 2026-08-19) : un coach était
      // redirigé hors de toute page de lecture de formation, aucun moyen
      // de suivre son propre contenu (dont ENTREPRENARIAL SECRET, écrit
      // pour un coach). Voir app/dashboard/coach/moi/formations/page.tsx.
      { label: "Formations",     icon: GraduationCap,  segment: "moi/formations" },
      { label: "Road Map",       icon: Map,            segment: "moi/roadmap" },
      { label: "Steps",          icon: Footprints,     segment: "moi/steps" },
      { label: "Sommeil",        icon: Watch,          segment: "moi/tracking" },
      { label: "Photos",         icon: Image,          segment: "moi/photos" },
      { label: "Mindset",        icon: Brain,          segment: "moi/mindset" },
      // Manquait entièrement côté coach (trouvé en creusant Steps : le
      // bouton "créer un rappel depuis une habitude de routine" n'apparaît
      // jamais faute de page/route "Mes rappels" côté coach, alors que
      // RemindersView est déjà 100% générique — voir
      // app/dashboard/coach/moi/reminders/page.tsx).
      { label: "Rappels",        icon: Bell,           segment: "moi/reminders" },
    ],
  },
  {
    group: "Compte",
    items: [
      { label: "Mon profil", icon: User, segment: "profile" },
      // Questionnaire de personnalisation (2026-09-29) : ce que chacun suit.
      { label: "Mon appli", icon: SlidersHorizontal, segment: "mon-appli" },
      { label: "Claude et Notion", icon: BrainCircuit, segment: "claude" },
      { label: "Paramètres", icon: Settings, segment: "parametres" },
      { label: "Aide et tutoriels", icon: LifeBuoy, segment: "aide" },
    ],
  },
];

export const CLIENT_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Aujourd'hui", icon: Home, segment: "" }],
  },
  {
    group: "Training",
    items: [
      { label: "Programme", icon: Dumbbell,  segment: "program" },
      { label: "Logbook",   icon: BookOpen,  segment: "logbook" },
      { label: "Performances", icon: Trophy, segment: "performances" },
    ],
  },
  {
    group: "Suivi",
    items: [
      { label: "Bilan & progression", icon: ClipboardCheck, segment: "bilan" },
      { label: "Nutrition",      icon: Apple,           segment: "nutrition" },
      // Remonté ici (retour direct 2026-09-22 : "l'agenda c'est important
      // alors en max 2 clics à accéder") — même correctif que côté coach
      // ci-dessus : 4e pastille sur 9 = hors écran, scroll nécessaire.
      { label: "Agenda",         icon: CalendarDays,    segment: "agenda" },
      // Revue de la semaine, ouverte à tous (gratuit compris) : contrairement
      // au check-in, personne n'a besoin d'un coach pour la lire.
      { label: "Ma semaine",     icon: CalendarCheck,   segment: "semaine" },
      { label: "Road Map",       icon: Map,             segment: "roadmap" },
      { label: "Steps",          icon: Footprints,      segment: "steps" },
      { label: "Sommeil",       icon: Watch,           segment: "tracking" },
      { label: "Photos",         icon: Image,           segment: "photos" },
      { label: "Mindset",        icon: Brain,           segment: "mindset" },
      // N'apparaît que pour les clientes dont la fiche client indique le
      // genre "Femme" — filtré dynamiquement dans useNavState (showCycle).
      { label: "Cycle",          icon: Droplet,         segment: "cycle" },
    ],
  },
  {
    group: "Coach",
    items: [
      // Item 25 : qui est ton coach, comment le joindre, ce qui est inclus —
      // freeLocked comme les autres items coach-only de ce groupe.
      { label: "Messages", icon: MessageCircle, segment: "messages", badge: "messages" },
      { label: "Mon coach", icon: User, segment: "coach", freeLocked: true },
      // locked: sans coach personnel, ces trois pages affichent le message
      // "reserve aux membres coaching" (CoachOnlyGate) plutot que du contenu
      // vide — voir app/dashboard/client/{tasks,checkin,live}/page.tsx.
      { label: "Mes tâches", icon: ListChecks,  segment: "tasks", freeLocked: true },
      { label: "Rappels", icon: Bell,           segment: "reminders" },
      { label: "Check-in", icon: ClipboardList, segment: "checkin", freeLocked: true },
      { label: "Coaching live", icon: Video,   segment: "live", freeLocked: true },
    ],
  },
  {
    group: "Mes notes",
    items: [{ label: "Notes", icon: NotebookPen, segment: "notes" }],
  },
  {
    group: "Contenu",
    items: [
      { label: "Formations", icon: GraduationCap, segment: "formations" },
      { label: "Ressources", icon: BookOpen, segment: "ressources" },
      { label: "Recettes", icon: UtensilsCrossed, segment: "recettes" },
      { label: "Exercices & salles", icon: LibraryBig, segment: "exercises" },
    ],
  },
  {
    group: "Science",
    items: [
      { label: "Recherche", icon: Search, segment: "science/recherche" },
      { label: "Actualité", icon: Newspaper, segment: "science/actualite" },
      { label: "Bibliothèque", icon: FlaskConical, segment: "science/bibliotheque" },
      { label: "Nos études", icon: Microscope, segment: "science/etudes" },
    ],
  },
  {
    group: "Communauté",
    items: [
      { label: "Classement", icon: Award, segment: "communaute/classement" },
      { label: "Victoires", icon: Trophy, segment: "communaute/victoires" },
      { label: "Questions", icon: HelpCircle, segment: "communaute/questions" },
      { label: "Mot du coach", icon: MessageSquareText, segment: "communaute/coach" },
      { label: "Mon coaching", icon: Crown, segment: "abonnement" },
    ],
  },
  {
    group: "Compte",
    items: [
      { label: "Mon profil", icon: User, segment: "profile" },
      // Questionnaire de personnalisation (2026-09-29) : ce que chacun suit.
      { label: "Mon appli", icon: SlidersHorizontal, segment: "mon-appli" },
      { label: "Claude et Notion", icon: BrainCircuit, segment: "claude" },
      { label: "Paramètres", icon: Settings, segment: "parametres" },
      { label: "Aide et tutoriels", icon: LifeBuoy, segment: "aide" },
    ],
  },
];

// Réservé au propriétaire de la plateforme — auparavant enterré à
// Paramètres → section Administration → bouton (3 niveaux pour une action
// consultée souvent). Un groupe de nav dédié y accède en un geste, sans
// pour autant ajouter d'onglet en bas (voir useNavState/mobileSubItems).
export const ADMIN_SIDEBAR_ITEMS: SidebarGroup["items"] = [
  { label: "Finance", icon: TrendingUp, segment: "finance" },
  { label: "Coachs", icon: Shield, segment: "admin" },
  // Leads captés sur la page publique /ressources (voir lib/lead-magnets.ts)
  // — donnée plateforme, pas des clients d'un coach en particulier, donc
  // réservée au propriétaire comme le reste de ce groupe.
  { label: "Leads", icon: Mail, segment: "admin/leads" },
  // Organigramme, formation avant embauche, fiches techniques — demande
  // explicite du 2026-08-15 : "faut y pousser dans l'appli, je vois aucun
  // nouvel onglet". Vivait avant uniquement dans un artifact externe.
  { label: "Organisation", icon: Network, segment: "admin/organisation" },
  // Pilotage de l'équipe recrutée (2026-09-25) : pipeline, RDV du jour,
  // rapports et automatisations, voir app/dashboard/coach/admin/equipe.
  { label: "Équipe", icon: Users, segment: "admin/equipe" },
  // Espace personnel de production video (scripts mot pour mot des 5
  // formations qu'il filme lui-meme, statut de tournage, lien YouTube) —
  // demande du 2026-09-23. Nom "Tournage" plutot que "Formations" pour ne
  // pas entrer en collision avec /formations, le catalogue "Academie EP"
  // deja existant (visible cote coach/client, produit paye).
  { label: "Tournage", icon: Video, segment: "admin/tournage" },
  // Stats de tous les réseaux synchronisées via Windsor (2026-09-29).
  { label: "Stats réseaux", icon: BarChart3, segment: "admin/stats-reseaux" },
];

// ── Hook ────────────────────────────────────────────────────────────────────

function useNavState(isFreeTier: boolean, showCycle: boolean, isPlatformOwner: boolean, hidden: Set<string> = new Set()) {
  return computeNav(usePathname(), isFreeTier, showCycle, isPlatformOwner, hidden);
}

// Calcul pur de la navigation pour une adresse donnée : utilisé par la vraie
// barre de navigation et par l'aperçu « Voir comme mon client », qui
// reconstruit ainsi les onglets réels d'un client (personnalisation Mon
// appli, gratuit ou coaché, cycle) sans en dupliquer les règles.
export function computeNav(pathname: string, isFreeTier: boolean, showCycle: boolean, isPlatformOwner: boolean, hidden: Set<string> = new Set()) {
  const isCoach = pathname.startsWith("/dashboard/coach");
  const base = isCoach ? "/dashboard/coach" : "/dashboard/client";
  // Même jeu d'onglets pour tout le monde côté client, gratuit ou coaché :
  // rien n'est grisé ni caché dans la nav. Les quelques pages qui n'ont de
  // sens qu'avec un coach humain (checkin, tasks, live) restent listées avec
  // un badge "freeLocked" pour un membre gratuit, et affichent leur propre
  // message d'explication (CoachOnlyGate) au clic plutôt qu'un blocage muet.
  const rawSidebar = isCoach ? COACH_SIDEBAR : CLIENT_SIDEBAR;
  // L'onglet "Cycle" n'a de sens que pour une cliente dont la fiche indique
  // le genre "Femme" — retiré du rendu tant qu'on ne le sait pas, plutôt que
  // de le masquer en CSS (la page /cycle redirige de toute façon sinon).
  // Personnalisation "Mon appli" : les rubriques que la personne a coupées
  // quittent le menu (voir hiddenSegments dans lib/app-setup.ts).
  const isHidden = (segment: string) => hidden.has(segment) || (hidden.has("moi/*") && segment.startsWith("moi/"));
  const withoutCycle = rawSidebar
    .map((g) => ({ ...g, items: g.items.filter((item) => (showCycle || item.segment !== "cycle") && !isHidden(item.segment)) }))
    .filter((g) => g.items.length > 0);
  // Onglets selon Mon appli : Business ouvre le premier outil actif, un
  // onglet dont toutes les pages sont coupées disparaît (ex. Moi pour un
  // coach qui ne se suit pas, Training sans entraînement).
  const firstVisible = (group: string) => {
    const item = withoutCycle.find((g) => g.group === group)?.items[0];
    return item ? `${base}/${item.segment}` : null;
  };
  const tabs = (isCoach ? COACH_TABS : CLIENT_TABS)
    .filter((t) => !(t.label === "Moi" && hidden.has("moi/*")))
    .filter((t) => !(t.label === "Training" && isHidden("program") && isHidden("logbook")))
    .map((t) => (t.label === "Business" ? { ...t, href: firstVisible("Mon business") ?? t.href } : t));
  const sidebarWithAdmin =
    isCoach && isPlatformOwner
      ? [{ group: "Administration", items: ADMIN_SIDEBAR_ITEMS }, ...withoutCycle]
      : withoutCycle;
  // Résout freeLocked -> locked une bonne fois pour toutes ici, pour que le
  // rendu (desktop + bande mobile) n'ait jamais à connaître isFreeTier.
  const sidebar = isCoach
    ? sidebarWithAdmin
    : sidebarWithAdmin.map((g) => ({
        ...g,
        items: g.items.map((item) =>
          item.freeLocked ? { ...item, locked: item.locked || isFreeTier } : item
        ),
      }));

  function isTabActive(tab: TabItem): boolean {
    // matchSegments s'applique même aux onglets exactMatch (ex. "Aujourd'hui")
    // pour couvrir des pages sans rapport avec le contenu de l'onglet mais
    // rattachées à lui malgré tout — voir "Compte" (profil/paramètres)
    // ci-dessous, seul point d'entrée cohérent indépendant du rôle affiché.
    const exact = tab.exactMatch ? pathname === tab.href : false;
    return exact || tab.matchSegments.some((seg) => pathname.startsWith(`${base}/${seg}`));
  }

  // Un seul élément actif : le chemin le plus précis gagne (sur
  // /admin/leads, « Leads » est actif, pas aussi « Coachs » qui pointe sur
  // /admin, retour direct 2026-10-08).
  const allSegments = sidebar.flatMap((g) => g.items.map((i) => i.segment)).filter(Boolean);
  const matches = (seg: string) => pathname === `${base}/${seg}` || pathname.startsWith(`${base}/${seg}/`);
  const bestSegment = allSegments.filter(matches).sort((a, b) => b.length - a.length)[0] ?? null;
  function isSidebarActive(segment: string): boolean {
    if (segment === "") return pathname === base;
    return segment === bestSegment;
  }

  // Items belonging to the currently active bottom tab — surfaced as a
  // secondary scrollable strip on mobile so every sidebar destination
  // (not just the 5-7 top-level sections) stays reachable without opening
  // the drawer. "science/*" leaves are collapsed into a single "Science"
  // pill: Science already has its own dedicated sub-strip one level down
  // (ScienceSubNav), so listing its 4 pages here too would just duplicate
  // that strip on top of itself.
  type SidebarItem = SidebarGroup["items"][number];
  const activeTab = tabs.find(isTabActive);
  const flatSidebarItems = sidebar.flatMap((g) => g.items);
  const mobileSubItems: SidebarItem[] = (() => {
    if (!activeTab) return [];
    // "Aujourd'hui" (exactMatch) n'a pas de frères dans la sidebar (groupe ""
    // à part) — plutôt qu'une bande vide, elle affiche "Compte" (Mon profil,
    // Paramètres), plus "Administration" pour le propriétaire de la
    // plateforme : le seul point d'entrée cohérent vers ces pages, qui n'ont
    // de rapport avec aucun onglet de contenu (Moi, Communauté...) où elles
    // vivaient auparavant.
    if (activeTab.exactMatch) return [];
    // « Plus » : seulement les pages sœurs de la rubrique ouverte (ex. les 4
    // pages Science), jamais tout le contenu de Plus d'un coup.
    if (activeTab.href.endsWith("/plus")) {
      const group = sidebar.find((g) => g.items.some((item) => item.segment && isSidebarActive(item.segment)));
      // Science a déjà sa propre bande (ScienceSubNav).
      return group && group.group !== "Science" ? group.items : [];
    }
    return [
      ...flatSidebarItems.filter(
        (item) =>
          !item.segment.startsWith("science/") &&
          activeTab.matchSegments.some(
            (seg) => item.segment === seg || item.segment.startsWith(`${seg}/`)
          )
      ),
      ...(activeTab.matchSegments.includes("science")
        ? [{ label: "Science", icon: FlaskConical, segment: "science", href: `${base}/science/recherche` } as SidebarItem]
        : []),
    ];
  })();

  return {
    isCoach,
    base,
    tabs,
    sidebar,
    isTabActive,
    isSidebarActive,
    mobileSubItems,
  };
}

// Pages qui posent elles-mêmes note rapide et recherche dans la ligne de
// leur titre (accueil client, components/client/home/HomeClient.tsx) : la
// nav n'ajoute pas sa petite ligne d'icônes au-dessus (~46 px de perdus).
const PAGES_WITH_OWN_TOOLS = new Set(["/dashboard/client"]);

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardNav({
  children,
  initialIsFreeTier = false,
}: {
  children: React.ReactNode;
  initialIsFreeTier?: boolean;
}) {
  const t = useT();
  const [isFreeTier, setIsFreeTier] = useState(initialIsFreeTier);
  const [showCycleTab, setShowCycleTab] = useState(false);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [appSetup, setAppSetup] = useState<AppSetup | null>(null);
  const pathForSetup = usePathname();
  const hidden = useMemo(
    () => hiddenSegments(appSetup, pathForSetup.startsWith("/dashboard/coach") ? "coach" : "client"),
    [appSetup, pathForSetup]
  );
  const { isCoach, base, tabs, sidebar, isTabActive, isSidebarActive, mobileSubItems } =
    useNavState(isFreeTier, showCycleTab || (!!appSetup?.completed && isOn(appSetup, "cycle")), isPlatformOwner, hidden);
  const router = useRouter();

  // Aplati tabs + sidebar en une seule liste {label, href} pour la palette
  // de commande (Cmd/Ctrl+K) — pas de nouvelle source de vérité, juste la
  // nav déjà calculée ci-dessus, réutilisée telle quelle.
  const commandPaletteNavItems = useMemo(
    () => [
      ...tabs.map((tab) => ({ label: t(tab.label), href: tab.href })),
      ...sidebar.flatMap((g) =>
        g.items.map(({ label, segment, href: hrefOverride }) => ({
          label: t(label),
          href: hrefOverride ?? (segment ? `${base}/${segment}` : base),
        }))
      ),
    ],
    [tabs, sidebar, base, t]
  );
  const pathname = usePathname();
  const onSessionPage = pathname.includes("/logbook/session/");
  const [isDesktop, setIsDesktop] = useState(false);
  // Version ordinateur : barre latérale de 240 px à partir de 1024 px, rail
  // d'icônes de 68 px en dessous (tablette) ou à la demande (touche « [ » ou
  // bouton en bas). Le choix de la personne est mémorisé ; sans choix, la
  // largeur de la fenêtre décide.
  const [isWide, setIsWide] = useState(false);
  const [railPref, setRailPref] = useState<boolean | null>(null);
  const collapsed = isDesktop && (railPref ?? !isWide);
  const sidebarW = collapsed ? 68 : 240;

  // Clavier ouvert (téléphone, appli native) : la nav du bas remontait
  // au-dessus du clavier et recouvrait le champ en cours de saisie. Même
  // mécanisme que la séance, qui gère déjà le sien (voir useTypingInSession).
  // Messagerie exclue : la conversation cale déjà sa hauteur sur la nav
  // (components/messaging/ConversationView.tsx).
  useTypingInSession(!onSessionPage && !pathname.includes("/messages"));

  // Reprise automatique d'une séance active après relance à froid de l'app —
  // sur mobile, verrouiller l'écran pendant une séance peut faire évincer le
  // processus par l'OS ; à la réouverture (icône ré-appuyée), l'app repart de
  // start_url ("/") et non de la page où on était, ce qui donnait l'impression
  // que la séance avait "disparu" alors que sa progression était toujours là.
  // sessionStorage (contrairement à localStorage) est vidé quand le process
  // repart de zéro mais survit à un simple verrouillage d'écran tant que l'app
  // reste en mémoire — il sert ici à ne déclencher la redirection qu'une seule
  // fois par lancement réel, jamais lors d'une navigation normale dans l'app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ep-session-resume-checked")) return;
    sessionStorage.setItem("ep-session-resume-checked", "1");

    const activeId = localStorage.getItem("ep-active-session-id");
    if (!activeId) return;
    if (pathname.includes("/logbook/session/")) return;

    const sessionBase = isCoach ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";
    router.replace(`${sessionBase}/session/${activeId}`);
    // Volontairement exécuté une seule fois au montage (relance de l'app) —
    // pas à chaque changement de route, sinon ça interromprait une navigation
    // volontaire vers une autre page pendant que la séance tourne en fond.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pendingCount,    setPendingCount]    = useState(0);
  const [unreadMessages,  setUnreadMessages]  = useState(0);
  const [openQuestions,   setOpenQuestions]   = useState(0);
  const [userName,        setUserName]        = useState<string | null>(null);
  const [userRole,        setUserRole]        = useState<string | null>(null);
  const [hasPersonalCoach, setHasPersonalCoach] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsWide(wide.matches);
    const hw = (e: MediaQueryListEvent) => setIsWide(e.matches);
    wide.addEventListener("change", hw);
    try {
      const saved = localStorage.getItem("ep-sidebar-collapsed");
      if (saved === "1" || saved === "0") setRailPref(saved === "1");
    } catch {}
    const mq = window.matchMedia("(min-width: 768px)");
    // `window` n'existe pas côté serveur : lire matchMedia pendant le rendu
    // (même via un initialiseur "lazy" de useState) produirait un mismatch
    // d'hydratation, donc ça ne peut être lu qu'ici, après montage. La valeur
    // initiale ET les changements ultérieurs passent par le même setState,
    // c'est le seul endroit qui synchronise cet état avec l'API navigateur.
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => {
      mq.removeEventListener("change", h);
      wide.removeEventListener("change", hw);
    };
  }, []);

  function toggleRail() {
    const next = !collapsed;
    setRailPref(next);
    try { localStorage.setItem("ep-sidebar-collapsed", next ? "1" : "0"); } catch {}
  }

  // Raccourcis clavier (ordinateur) : « / » recherche, « [ » replie la barre,
  // « g » puis une lettre pour aller à une page. Jamais dans un champ de saisie.
  useEffect(() => {
    if (!isDesktop) return;
    let armed = 0;
    const go: Record<string, string> = isCoach
      ? { h: base, c: `${base}/clients`, m: `${base}/messages`, b: `${base}/studio`, a: `${base}/moi/agenda`, n: `${base}/moi/nutrition`, l: `${base}/moi/logbook`, p: `${base}/programmation` }
      : { h: base, p: `${base}/program`, l: `${base}/logbook`, n: `${base}/nutrition`, b: `${base}/bilan`, a: `${base}/agenda`, m: `${base}/messages` };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("ep:open-search")); return; }
      if (e.key === "[") { toggleRail(); return; }
      if (e.key === "g") { armed = Date.now(); return; }
      if (armed && Date.now() - armed < 1200 && go[e.key]) { armed = 0; router.push(go[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // toggleRail ne dépend que de `collapsed`, relu à chaque frappe via la fermeture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, isCoach, base, router, collapsed]);

  // Retour direct 2026-09-16 (Supabase passé en dépassement de quota,
  // "ça repart le 27 septembre") : ce prefetch chauffait TOUTE la nav (81
  // segments coach+client confondus, ~30-50 pour un rôle donné) à chaque
  // montage du dashboard, `router.prefetch` déclenchant le rendu SERVEUR
  // complet de chaque page (donc ses requêtes Supabase) même pour des
  // sections jamais visitées dans la session. Avec un tableau bord composé
  // de dizaines de segments, la quasi-totalité de ces lectures étaient
  // perdues. Seuls les onglets toujours visibles (tabs, 4-6 items) restent
  // préchauffés d'office ; le reste de la sidebar est déjà des <Link>
  // (préchauffés par Next.js lui-même quand ils entrent dans le viewport,
  // ou au survol) donc rien à ajouter à la main pour rester réactif.
  const tabHrefsKey = tabs.map((t) => t.href).join("|");

  // Perf 2026-10-13 (mesuré : ~25 préchargements lancés dès l'ouverture,
  // en concurrence avec la page affichée sur un téléphone en 4G) : les
  // onglets se préchargent une fois la page affichée et le téléphone au
  // repos, l'un après l'autre.
  useEffect(() => {
    const tabHrefs = tabHrefsKey ? tabHrefsKey.split("|") : [];
    let cancelled = false;
    const idle = (cb: () => void) =>
      typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function" ? (window as unknown as { requestIdleCallback: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1200);
    const timer = window.setTimeout(() => {
      const next = (i: number) => {
        if (cancelled || i >= tabHrefs.length) return;
        router.prefetch(tabHrefs[i]);
        window.setTimeout(() => idle(() => next(i + 1)), 250);
      };
      idle(() => next(0));
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tabHrefsKey, router]);

  // Retour direct 2026-09-18 ("changer d'onglet ça charge à chaque fois, ça
  // doit être instantané") : les tabs du bas sont préchauffés d'office
  // depuis l'Axe ci-dessus, mais PAS les pages à l'intérieur d'une section
  // (Nutrition/Programme/Logbook sous "Moi", Formations/Ressources/Recettes
  // sous "Contenu"...) — elles restent de simples <Link> au comportement
  // par défaut de Next.js, qui ne préchauffe la donnée complète d'une page
  // dynamique (seulement son squelette `loading.tsx`), donc chaque clic
  // dedans déclenche un vrai aller-retour serveur. mobileSubItems est déjà
  // le bon périmètre borné (3 à 12 items : seulement les frères de l'onglet
  // ACTUELLEMENT ouvert, jamais les ~81 segments de toute la nav) — même
  // raisonnement que le prefetch des tabs ci-dessus, juste un niveau plus
  // bas, désormais possible sans reproduire le dépassement de quota Supabase
  // de l'Axe du 2026-09-16 (résolu depuis, passage en Pro).
  const subItemHrefsKey = mobileSubItems
    .map(({ href: hrefOverride, segment }) => hrefOverride ?? (segment ? `${base}/${segment}` : base))
    .join("|");

  // Sous-pages : seulement après les onglets, au repos, et pas au démarrage.
  useEffect(() => {
    const subHrefs = subItemHrefsKey ? subItemHrefsKey.split("|") : [];
    let cancelled = false;
    const timer = window.setTimeout(() => {
      subHrefs.slice(0, 6).forEach((href, i) => window.setTimeout(() => !cancelled && router.prefetch(href), i * 400));
    }, 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [subItemHrefsKey, router]);

  useEffect(() => {
    if (isCoach) {
      fetch("/api/coach/pending-count")
        .then((r) => r.json())
        .then((d) => setPendingCount(d.count ?? 0))
        .catch(() => {});
      fetch("/api/coach/open-questions-count")
        .then((r) => r.json())
        .then((d) => setOpenQuestions(d.count ?? 0))
        .catch(() => {});
    }
  }, [isCoach]);

  useEffect(() => {
    fetch("/api/messages/unread")
      .then((r) => r.json())
      .then((d) => setUnreadMessages(d.count ?? 0))
      .catch(() => {});

    const supabase = createClientSupabase();
    // getSession (lecture locale du cookie) au lieu de getUser (aller-retour
    // de ~2 s mesuré vers le serveur d'auth au démarrage) : l'identifiant
    // suffit ici, la base revérifie le jeton de toute façon (RLS).
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, role, subscription_status, coach_id, is_platform_owner")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const role = (data as { role: string }).role;
            setUserName((data as { full_name: string | null }).full_name);
            setUserRole(role);
            setHasPersonalCoach(role === "coach" && !!(data as { coach_id: string | null }).coach_id);
            setIsPlatformOwner(!!(data as { is_platform_owner: boolean | null }).is_platform_owner);
            supabase
              .from("user_app_setup")
              .select("answers, modules, completed_at")
              .eq("user_id", user.id)
              .maybeSingle()
              .then(({ data: setup }) => {
                const row = setup as { answers: Record<string, unknown> | null; modules: Modules | null; completed_at: string | null } | null;
                setAppSetup(row ? { answers: row.answers ?? {}, modules: row.modules ?? {}, completed: !!row.completed_at } : { answers: {}, modules: {}, completed: false });
              });
            setIsFreeTier(
              role === "client" &&
                (data as { subscription_status: string }).subscription_status !== "active"
            );

            if (role === "client") {
              supabase
                .from("client_intake")
                .select("gender")
                .eq("client_id", user.id)
                .maybeSingle()
                .then(({ data: intake }) => {
                  setShowCycleTab((intake as { gender: string | null } | null)?.gender === "Femme");
                });
            }
          }
        });

    });

    const ch = supabase
      .channel("nav-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        fetch("/api/messages/unread").then((r) => r.json()).then((d) => setUnreadMessages(d.count ?? 0)).catch(() => {})
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () =>
        fetch("/api/messages/unread").then((r) => r.json()).then((d) => setUnreadMessages(d.count ?? 0)).catch(() => {})
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Badge natif sur l'icône de l'appli (écran d'accueil, dock, barre des
  // tâches) — le seul "widget" que le web permet vraiment de poser sur
  // l'écran d'accueil : pas de contenu visuel façon widget iOS/Android (ça,
  // c'est réservé aux apps natives), mais un chiffre visible sans même
  // rouvrir l'appli. Supporté sur Android/Chrome et iOS 16.4+ en PWA
  // installée ; silencieusement ignoré ailleurs (ex. onglet de navigateur
  // classique, desktop).
  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.setAppBadge !== "function") return;
    const total = pendingCount + unreadMessages + openQuestions;
    if (total > 0) {
      navigator.setAppBadge(total).catch(() => {});
    } else {
      navigator.clearAppBadge?.().catch(() => {});
    }
  }, [pendingCount, unreadMessages, openQuestions]);

  async function handleSignOut() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function getBadgeCount(badge?: BadgeKey): number {
    if (badge === "pending")      return pendingCount;
    if (badge === "messages")     return unreadMessages;
    if (badge === "questions")    return openQuestions;
    // Onglet Clients fusionné (Clients + Modèles + Messages) : le badge doit
    // rester visible pour les deux signaux qu'il remplace, sinon un message
    // non lu devient invisible tant qu'on n'a pas ouvert l'onglet.
    if (badge === "clientsGroup") return pendingCount + unreadMessages;
    return 0;
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "EP";

  // Recherche + note rapide, téléphone. La page Plus a déjà sa recherche,
  // la page Notes sa saisie : pas de bouton en double.
  const showSearchTool = !pathname.endsWith("/plus");
  const showNoteTool = !pathname.endsWith("/notes");
  const toolStyle: React.CSSProperties = { width: 36, height: 36, flexShrink: 0 };
  const mobileTools =
    showSearchTool || showNoteTool ? (
      <>
        {showNoteTool && (
          <Link prefetch={false} href={`${base}/notes?capture=1`} aria-label={t("Note rapide")} title={t("Note rapide")} className="ep-btn-icon" style={toolStyle}>
            <NotebookPen size={16} strokeWidth={1.8} style={{ color: "rgba(var(--ep-ink-rgb),0.6)" }} />
          </Link>
        )}
        {showSearchTool && (
          <button type="button" onClick={() => window.dispatchEvent(new Event("ep:open-search"))} aria-label={t("Rechercher")} title={t("Rechercher")} className="ep-btn-icon" style={toolStyle}>
            <Search size={17} strokeWidth={1.8} style={{ color: "rgba(var(--ep-ink-rgb),0.6)" }} />
          </button>
        )}
      </>
    ) : null;

  // ── Desktop sidebar ─────────────────────────────────────────────────────────
  return (
    <>
      <aside
        style={{
          display: isDesktop ? "flex" : "none",
          flexDirection: "column",
          position: "fixed",
          left: 0, top: 0,
          height: "100%",
          zIndex: 40,
          width: sidebarW,
          transition: "width 0.2s var(--ep-ease-out)",
          overflow: "hidden",
          background: "rgba(var(--ep-bg-rgb),0.88)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRight: "1px solid rgba(var(--ep-accent-rgb),0.1)",
          boxShadow: "4px 0 32px rgba(var(--ep-shade-rgb),0.5)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 28, paddingBottom: 24, position: "relative" }}>
          {collapsed ? <EPLogo size="sm" showCoaching={false} /> : <EPLogo size="md" showCoaching />}
        </div>

        {/* Bouton de recherche visible (2026-09-08) : la palette de commande
            existait déjà (clients, pages, aliments, exercices...) mais
            n'avait jamais de point d'entrée visible, seulement Ctrl/Cmd+K —
            personne ne peut découvrir un raccourci qui ne s'affiche nulle
            part. */}
        <div style={{ display: "flex", flexDirection: collapsed ? "column" : "row", gap: 6, margin: collapsed ? "0 12px 12px" : "0 16px 12px" }}>
        <button
          title={`${t("Rechercher")} (/)`}
          type="button"
          onClick={() => window.dispatchEvent(new Event("ep:open-search"))}
          style={{
            flex: 1, minWidth: 0,
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8,
            minHeight: 40, padding: "8px 10px",
            background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-accent-rgb),0.14)",
            borderRadius: 10, color: "rgba(var(--ep-ink-rgb),0.35)", cursor: "pointer",
            fontSize: 12, fontWeight: 600, textAlign: "left",
          }}
        >
          <Search size={13} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ flex: 1 }}>{t("Rechercher")}</span>}
          {!collapsed && <span style={{
            fontSize: 10, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)",
            border: "1px solid rgba(var(--ep-ink-rgb),0.2)", borderRadius: 4, padding: "1px 5px",
          }}>
            ⌘K
          </span>}
        </button>
        {/* Note rapide : le même geste qu'au téléphone, sans bouton flottant. */}
        <Link
          prefetch={false}
          href={`${base}/notes?capture=1`}
          aria-label={t("Note rapide")}
          title={t("Note rapide")}
          style={{
            width: collapsed ? "100%" : 40, minHeight: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-accent-rgb),0.14)",
            borderRadius: 10, color: "rgba(var(--ep-ink-rgb),0.6)",
          }}
        >
          <NotebookPen size={14} strokeWidth={1.8} />
        </Link>
        </div>

        <div className="ep-divider-subtle" style={{ margin: "0 16px 8px" }} />

        {/* Sidebar nav */}
        <nav style={{ flex: 1, padding: collapsed ? "0 8px" : "0 10px", overflowY: "auto", overflowX: "hidden" }}>
          {sidebar.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.group && collapsed && gi > 0 && <div className="ep-divider-subtle" style={{ margin: "8px 10px" }} />}
              {group.group && !collapsed && (
                <p style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(var(--ep-ink-rgb),0.45)",
                  padding: "14px 10px 5px",
                  margin: 0,
                }}>
                  {t(group.group)}
                </p>
              )}
              {group.items.map(({ label, icon: Icon, segment, badge, href: hrefOverride, locked }, i) => {
                const active = isSidebarActive(segment);
                const href = hrefOverride ?? (segment ? `${base}/${segment}` : base);
                const count = getBadgeCount(badge);
                return (
                  <Link prefetch={false}
                    key={href}
                    href={href}
                    title={collapsed ? t(label) : undefined}
                    aria-label={collapsed ? t(label) : undefined}
                    className="animate-fade-up ep-nav-link"
                    style={{
                      animationDelay: `${(gi * 3 + i) * 30}ms`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 10,
                      minHeight: 40,
                      padding: collapsed ? "9px 0" : "9px 12px",
                      borderRadius: 10,
                      marginBottom: 1,
                      position: "relative",
                      color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "rgba(var(--ep-accent-rgb),0.05)";
                      el.style.color = "rgba(var(--ep-ink-rgb),0.65)";
                    }}
                    onMouseLeave={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "transparent";
                      el.style.color = "rgba(var(--ep-ink-rgb),0.6)";
                    }}
                  >
                    {/* layoutId partagé : Framer Motion fait glisser ce fond
                        d'un item à l'autre au lieu de le faire sauter — un
                        seul élément "voyage" visuellement entre les deux
                        positions plutôt que de disparaître puis réapparaître
                        ailleurs. z-index négatif : passe derrière icône/texte
                        sans qu'ils aient besoin d'un positionnement dédié. */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        // bounce: 0 — un item de nav qui se sélectionne n'est
                        // pas un geste avec de l'élan (flick, drag relâché),
                        // c'est un repositionnement : la doctrine Apple range
                        // ça avec les déplacements/repositionnements, sans
                        // rebond, pas avec les interactions à élan.
                        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          zIndex: -1,
                          borderRadius: 10,
                          background: "rgba(var(--ep-accent-rgb),0.1)",
                          borderLeft: "2px solid var(--ep-accent)",
                        }}
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.7}
                      style={{ color: active ? "var(--ep-accent)" : "inherit", flexShrink: 0 }}
                    />
                    {!collapsed && <span style={{ flex: 1 }}>{t(label)}</span>}
                    {locked && !collapsed && (
                      <Lock size={11} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} strokeWidth={2} />
                    )}
                    {count > 0 && (
                      <span
                        className="animate-pulse-glow animate-badge-pop"
                        style={{
                          ...(collapsed ? { position: "absolute", top: 3, right: 8 } : {}),
                          background: "var(--ep-accent)",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 16,
                          height: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div style={{ borderTop: "1px solid rgba(var(--ep-accent-rgb),0.08)", padding: collapsed ? "12px 8px" : "14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, marginBottom: 10 }} title={collapsed ? userName ?? undefined : undefined}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--ep-accent), var(--ep-line))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--ep-ink)",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(var(--ep-accent-rgb),0.25)",
            }}>
              {initials}
            </div>
            {!collapsed && <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ep-ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {userName ?? "…"}
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(var(--ep-ink-rgb),0.28)",
                textTransform: "capitalize",
              }}>
                {userRole ?? "…"}
              </div>
            </div>}
          </div>

          {userRole === "coach" && hasPersonalCoach && (
            <Link prefetch={false}
              href={isCoach ? "/dashboard/client" : "/dashboard/coach"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 8,
                width: "100%",
                minHeight: 40,
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "rgba(var(--ep-ink-rgb),0.4)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 2,
              }}
              className="ep-nav-link"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "var(--ep-accent)";
                el.style.background = "rgba(var(--ep-accent-rgb),0.07)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "rgba(var(--ep-ink-rgb),0.4)";
                el.style.background = "transparent";
              }}
            >
              <ArrowLeftRight size={14} strokeWidth={1.7} />
              {!collapsed && (isCoach ? t("Mon coaching perso") : t("Mon espace coach"))}
            </Link>
          )}

          {userRole === "client" && (
            <Link prefetch={false}
              href="/dashboard/client/abonnement"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 8,
                width: "100%",
                minHeight: 40,
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "rgba(var(--ep-ink-rgb),0.4)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 2,
              }}
              className="ep-nav-link"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "var(--ep-accent)";
                el.style.background = "rgba(var(--ep-accent-rgb),0.07)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "rgba(var(--ep-ink-rgb),0.4)";
                el.style.background = "transparent";
              }}
            >
              <Crown size={14} strokeWidth={1.7} />
              {!collapsed && t("Mon coaching")}
            </Link>
          )}

          <button
            onClick={handleSignOut}
            title={collapsed ? t("Déconnexion") : undefined}
            aria-label={t("Déconnexion")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              width: "100%",
              minHeight: 40,
              padding: "7px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "rgba(var(--ep-ink-rgb),0.5)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "var(--ep-accent)";
              el.style.background = "rgba(var(--ep-accent-rgb),0.07)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "rgba(var(--ep-ink-rgb),0.5)";
              el.style.background = "transparent";
            }}
          >
            <LogOut size={14} strokeWidth={1.7} />
            {!collapsed && t("Déconnexion")}
          </button>

          {!collapsed && <InstallAppHint />}

          <button
            type="button"
            onClick={toggleRail}
            title={`${collapsed ? t("Agrandir le menu") : t("Réduire le menu")} ([)`}
            aria-label={collapsed ? t("Agrandir le menu") : t("Réduire le menu")}
            style={{
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8,
              width: "100%", minHeight: 40, padding: "7px 10px", marginTop: 2, borderRadius: 8,
              background: "transparent", border: "none", color: "rgba(var(--ep-ink-rgb),0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {collapsed ? <PanelLeftOpen size={15} strokeWidth={1.7} /> : <PanelLeftClose size={15} strokeWidth={1.7} />}
            {!collapsed && t("Réduire le menu")}
          </button>
        </div>
      </aside>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main
        style={{
          marginLeft: isDesktop ? sidebarW : 0,
          transition: "margin-left 0.2s var(--ep-ease-out)",
          // Bottom padding: 72px nav + safe area inset
          paddingBottom: isDesktop ? 0 : "calc(72px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Mobile secondary tab strip — exposes every sibling page within
            the active bottom-tab section, since the bottom nav only has
            room for the top-level sections. Plus rien de fixed en haut
            (menu/profil/cloche sont descendus dans la barre du bas) donc
            plus besoin de marge pour les éviter — la bande colle en haut. */}
        {/* Séance en cours : la bande collait en haut au même endroit que
            l'en-tête de séance (chrono, progression) et passait dessous. */}
        {/* Recherche et note rapide (2026-10-21, « le truc note et loupe ça
            chevauche tout ») : plus de boutons flottants au-dessus du
            contenu. Ils vivent dans l'en-tête de la page : au bout de la
            bande des sous-onglets quand elle existe, sinon sur une petite
            ligne en tête de page qui défile avec elle. Un tap, jamais rien
            de recouvert, clavier ouvert compris. */}
        {!isDesktop && !onSessionPage && mobileSubItems.length > 1 && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 30,
              display: "flex",
              alignItems: "center",
              background: "rgba(var(--ep-bg-rgb),0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(var(--ep-accent-rgb),0.1)",
            }}
          >
          <nav
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              gap: 6,
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              // Sans ça, un swipe horizontal sur cette bande pouvait être
              // intercepté par le scroll vertical de la page entière au lieu
              // de faire défiler seulement les onglets.
              touchAction: "pan-x",
              overscrollBehavior: "contain",
              padding: "4px 8px 4px 12px",
            }}
          >
            {mobileSubItems.map(({ label, icon: Icon, segment, badge, href: hrefOverride, locked }) => {
              const active = isSidebarActive(segment);
              const href = hrefOverride ?? (segment ? `${base}/${segment}` : base);
              const count = getBadgeCount(badge);
              return (
                <Link prefetch={false}
                  key={href}
                  href={href}
                  className="ep-nav-link"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    // Zone tactile de 44 px (HIG) sans allonger la bande :
                    // la hauteur reprend celle des anciens 10 px de marge.
                    minHeight: 44,
                    padding: "0 14px",
                    alignSelf: "center",
                    borderRadius: 999,
                    background: active ? "rgba(var(--ep-accent-rgb),0.14)" : "rgba(var(--ep-ink-rgb),0.04)",
                    color: active ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.55)",
                    fontWeight: active ? 700 : 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    border: active ? "1px solid rgba(var(--ep-accent-rgb),0.3)" : "1px solid transparent",
                    position: "relative",
                  }}
                >
                  <Icon size={13} strokeWidth={active ? 2.2 : 1.7} />
                  {t(label)}
                  {locked && <Lock size={10} style={{ flexShrink: 0 }} strokeWidth={2} />}
                  {count > 0 && (
                    <span
                      className="animate-badge-pop"
                      style={{
                        background: "var(--ep-accent)",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 14,
                        height: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {mobileTools && (
            <div style={{ flexShrink: 0, display: "flex", gap: 6, padding: "0 10px 0 8px", borderLeft: "1px solid rgba(var(--ep-line-rgb),0.14)" }}>{mobileTools}</div>
          )}
          </div>
        )}
        {!isDesktop && !onSessionPage && mobileSubItems.length <= 1 && mobileTools && !PAGES_WITH_OWN_TOOLS.has(pathname) && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, padding: "10px 12px 0", position: "relative", zIndex: 2 }}>{mobileTools}</div>
        )}

        {appSetup && !appSetup.completed && !pathname.includes("/mon-appli") && <AppSetupPrompt href={`${base}/mon-appli`} />}
        {children}
      </main>

      {/* ── Mobile bottom nav — Oura style ─────────────────────────────────── */}
      <nav
        className="ep-bottom-nav"
        style={{ display: isDesktop ? "none" : "block" }}
      >
        <div style={{
          display: "flex",
          alignItems: "stretch",
          padding: "6px 4px 8px",
          height: 72,
          gap: 2,
        }}>
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            const count = getBadgeCount(tab.badge);

            return (
              <Link prefetch={false}
                key={tab.href}
                href={tab.href}
                className="ep-nav-tab"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  textDecoration: "none",
                  borderRadius: 12,
                  minHeight: 56,
                  position: "relative",
                }}
              >
                {/* Icon container with pill — même indicateur partagé que la
                    sidebar desktop (voir layoutId plus haut), pas de scroll
                    ici donc rien de plus à gérer. */}
                <div
                  style={{
                    position: "relative",
                    width: 48,
                    height: 30,
                    borderRadius: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active-pill"
                      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: -1,
                        borderRadius: 15,
                        background: "rgba(var(--ep-accent-rgb),0.14)",
                      }}
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.3 : 1.6}
                    style={{
                      color: active ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.45)",
                      transition: "color 0.2s, stroke-width 0.2s",
                    }}
                  />
                  {count > 0 && (
                    <span className="animate-badge-pop" style={{
                      position: "absolute",
                      top: 1,
                      right: 3,
                      background: "var(--ep-accent)",
                      color: "#fff",
                      borderRadius: "50%",
                      width: 15,
                      height: 15,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      border: "1.5px solid var(--ep-bg)",
                    }}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 600,
                  letterSpacing: "0.02em",
                  color: active ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.55)",
                  transition: "color 0.2s",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}>
                  {t(tab.label)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ActiveSessionBanner />
      <CommandPalette navItems={commandPaletteNavItems} isCoach={isCoach} />
    </>
  );
}
