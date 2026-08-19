"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Home, Users, ClipboardCheck, LogOut, Dumbbell, Apple,
  ClipboardList, TrendingUp, User, Image, BookOpen,
  MessageCircle, Map, GraduationCap, Activity, Footprints, Watch,
  ListChecks, Heart, Trophy, HelpCircle, Crown, Lock, UtensilsCrossed, Video,
  Brain, MessageSquareText, LibraryBig,
  Search, Newspaper, FlaskConical, Microscope, Bell, CalendarDays, Droplet,
  ArrowLeftRight, Settings, Shield, LayoutTemplate, Mail, Inbox, Sparkles,
  AlertTriangle, Wallet, Network, HeartPulse, Rocket, Bot,
} from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import { EPLogo } from "@/components/ui/EPLogo";
import NotificationBell from "@/components/ui/NotificationBell";
import ActiveSessionBanner from "@/components/ui/ActiveSessionBanner";
import CommandPalette from "@/components/ui/CommandPalette";

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeKey = "pending" | "messages" | "questions" | "clientsGroup";

type TabItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  matchSegments: string[];
  exactMatch?: boolean;
  badge?: BadgeKey;
};

type SidebarGroup = {
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

const CLIENT_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/client",
    matchSegments: ["profile", "parametres"],
    exactMatch: true,
  },
  {
    label: "Training",
    icon: Dumbbell,
    href: "/dashboard/client/program",
    matchSegments: ["program", "logbook", "exercises", "gyms"],
  },
  {
    label: "Suivi",
    icon: TrendingUp,
    href: "/dashboard/client/bilan",
    matchSegments: ["photos", "nutrition", "progress", "roadmap", "bilan", "steps", "tracking", "mindset", "agenda", "cycle"],
  },
  {
    label: "Coach",
    icon: MessageCircle,
    href: "/dashboard/client/messages",
    matchSegments: ["messages", "checkin", "reminders", "tasks"],
    badge: "messages",
  },
  {
    label: "Live",
    icon: Video,
    href: "/dashboard/client/live",
    matchSegments: ["live"],
  },
  {
    label: "Contenu",
    icon: GraduationCap,
    href: "/dashboard/client/formations",
    matchSegments: ["formations", "ressources", "recettes", "science"],
  },
  {
    label: "Communauté",
    icon: Heart,
    href: "/dashboard/client/communaute",
    matchSegments: ["communaute", "abonnement"],
  },
];

const COACH_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/coach",
    matchSegments: ["profile", "parametres"],
    exactMatch: true,
  },
  {
    // Section Clients regroupée : Clients + Modèles + Messages vivent
    // ensemble (la bibliothèque de modèles est le point de départ du
    // travail fait dans la fiche d'un client, et les messages concernent
    // ces mêmes clients) — un seul onglet en bas plutôt que Clients et
    // Messages séparés, Messages reste accessible via la bande de
    // sous-onglets qui s'affiche une fois sur "Clients".
    label: "Clients",
    icon: Users,
    href: "/dashboard/coach/clients",
    matchSegments: ["clients", "programmation", "messages", "prioritaires", "mailing", "assistant"],
    badge: "clientsGroup",
  },
  {
    label: "Live",
    icon: Video,
    href: "/dashboard/coach/live",
    matchSegments: ["live"],
  },
  {
    label: "Moi",
    icon: Activity,
    href: "/dashboard/coach/moi/bilan",
    matchSegments: ["moi"],
  },
  {
    label: "Contenu",
    icon: GraduationCap,
    href: "/dashboard/coach/formations",
    matchSegments: ["formations", "ressources", "recettes", "exercises", "gyms", "science", "studio", "compta", "contraintes", "business"],
  },
  {
    label: "Communauté",
    icon: Heart,
    href: "/dashboard/coach/communaute",
    matchSegments: ["communaute"],
    badge: "questions",
  },
];

const COACH_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Tableau de bord", icon: Home, segment: "" }],
  },
  {
    group: "Clients",
    items: [
      { label: "Clients",  icon: Users,          segment: "clients",   badge: "pending" },
      // Axe 3 (VISION.md) : vue consolidée "qui a besoin de moi", tous les
      // signaux triés par priorité en une seule page.
      { label: "Priorités", icon: AlertTriangle, segment: "prioritaires" },
      // Axe 10 (VISION.md) : relance + audit qualité automatiques chaque
      // jour (app/api/cron/coach-assistant), accessible à tout coach.
      { label: "Mon assistant", icon: Bot, segment: "assistant" },
      // Item 8 du chantier 50 idées : bilans/corrections/photos en attente
      // de réponse, regroupés en une seule vue triée par ancienneté.
      { label: "Boîte de réception", icon: Inbox, segment: "inbox" },
      // Juste sous Clients : la conception d'un programme ou d'une diète se
      // fait dans la fiche du client, et cette bibliothèque est le stock de
      // points de départ réutilisables de ce travail. Elle était auparavant
      // dans un groupe "Espace coach" isolé, sans lien avec les clients.
      { label: "Modèles",  icon: LayoutTemplate, segment: "programmation" },
      { label: "Messages", icon: MessageCircle,  segment: "messages",  badge: "messages" },
      // Axe 2 (VISION.md) : mailing groupé à tous ses clients actifs
      // (segmentation par tag Brevo, pas de sous-compte par coach).
      { label: "Mailing", icon: Mail, segment: "mailing" },
    ],
  },
  {
    group: "Contenu",
    items: [
      { label: "Formations", icon: GraduationCap, segment: "formations" },
      { label: "Ressources", icon: BookOpen, segment: "ressources" },
      { label: "Recettes", icon: UtensilsCrossed, segment: "recettes" },
    ],
  },
  {
    // Axe 2 (VISION.md) : espace personnel du coach pour poser des idées de
    // contenu (Insta/YouTube/LinkedIn) — distinct du groupe "Contenu"
    // ci-dessus qui est la bibliothèque destinée aux clients.
    //
    // Axe 6 (VISION.md, réactivé 2026-08-19) : "Développer mon business"
    // ajouté ici — le cadre (funnel TOF/MOF/BOF, checklist de marque
    // personnelle) qui manquait par-dessus le Studio créatif, déjà scopé
    // par coach depuis le début (chaque coach a son propre espace privé).
    group: "Mon business",
    items: [
      { label: "Développer mon business", icon: Rocket, segment: "business" },
      { label: "Studio créatif", icon: Sparkles, segment: "studio" },
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
    group: "Bibliothèque",
    items: [
      { label: "Exercices & salles", icon: LibraryBig, segment: "exercises" },
      // Axe 8 (VISION.md) : blessures, maladies chroniques, handicap,
      // grossesse, ménopause, TCA — contenu de référence pour construire
      // un programme, jamais confié à un coach IA (lib/ai-coaches.ts).
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
    group: "Live",
    items: [{ label: "Coaching live", icon: Video, segment: "live" }],
  },
  {
    group: "Mon Suivi",
    items: [
      { label: "Bilan & progression", icon: ClipboardCheck, segment: "moi/bilan" },
      { label: "Nutrition",      icon: Apple,          segment: "moi/nutrition" },
      { label: "Programme",      icon: Dumbbell,       segment: "moi/programme" },
      { label: "Logbook",        icon: BookOpen,       segment: "moi/logbook" },
      // Manquait entièrement (trouvé en audit 2026-08-19) : un coach était
      // redirigé hors de toute page de lecture de formation, aucun moyen
      // de suivre son propre contenu (dont ENTREPRENARIAL SECRET, écrit
      // pour un coach). Voir app/dashboard/coach/moi/formations/page.tsx.
      { label: "Formations",     icon: GraduationCap,  segment: "moi/formations" },
      { label: "Road Map",       icon: Map,            segment: "moi/roadmap" },
      { label: "Agenda",         icon: CalendarDays,   segment: "moi/agenda" },
      { label: "Steps",          icon: Footprints,     segment: "moi/steps" },
      { label: "Sommeil",        icon: Watch,          segment: "moi/tracking" },
      { label: "Photos",         icon: Image,          segment: "moi/photos" },
      { label: "Mindset",        icon: Brain,          segment: "moi/mindset" },
    ],
  },
  {
    group: "Compte",
    items: [
      { label: "Mon profil", icon: User, segment: "profile" },
      { label: "Paramètres", icon: Settings, segment: "parametres" },
    ],
  },
];

const CLIENT_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Aujourd'hui", icon: Home, segment: "" }],
  },
  {
    group: "Training",
    items: [
      { label: "Programme", icon: Dumbbell,  segment: "program" },
      { label: "Logbook",   icon: BookOpen,  segment: "logbook" },
    ],
  },
  {
    group: "Bibliothèque",
    items: [
      { label: "Exercices & salles", icon: LibraryBig, segment: "exercises" },
    ],
  },
  {
    group: "Suivi",
    items: [
      { label: "Bilan & progression", icon: ClipboardCheck, segment: "bilan" },
      { label: "Nutrition",      icon: Apple,           segment: "nutrition" },
      { label: "Road Map",       icon: Map,             segment: "roadmap" },
      { label: "Agenda",         icon: CalendarDays,    segment: "agenda" },
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
      { label: "Mon coach", icon: User, segment: "coach", freeLocked: true },
      { label: "Messages", icon: MessageCircle, segment: "messages", badge: "messages" },
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
    group: "Contenu",
    items: [
      { label: "Formations", icon: GraduationCap, segment: "formations" },
      { label: "Ressources", icon: BookOpen, segment: "ressources" },
      { label: "Recettes", icon: UtensilsCrossed, segment: "recettes" },
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
      { label: "Questions", icon: HelpCircle, segment: "communaute/questions" },
      { label: "Mot du coach", icon: MessageSquareText, segment: "communaute/coach" },
      { label: "Mon coaching", icon: Crown, segment: "abonnement" },
    ],
  },
  {
    group: "Compte",
    items: [
      { label: "Mon profil", icon: User, segment: "profile" },
      { label: "Paramètres", icon: Settings, segment: "parametres" },
    ],
  },
];

// Réservé au propriétaire de la plateforme — auparavant enterré à
// Paramètres → section Administration → bouton (3 niveaux pour une action
// consultée souvent). Un groupe de nav dédié y accède en un geste, sans
// pour autant ajouter d'onglet en bas (voir useNavState/mobileSubItems).
const ADMIN_SIDEBAR_ITEMS: SidebarGroup["items"] = [
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
];

// ── Hook ────────────────────────────────────────────────────────────────────

function useNavState(isFreeTier: boolean, showCycle: boolean, isPlatformOwner: boolean) {
  const pathname = usePathname();
  const isCoach = pathname.startsWith("/dashboard/coach");
  const base = isCoach ? "/dashboard/coach" : "/dashboard/client";
  // Même jeu d'onglets pour tout le monde côté client, gratuit ou coaché :
  // rien n'est grisé ni caché dans la nav. Les quelques pages qui n'ont de
  // sens qu'avec un coach humain (checkin, tasks, live) restent listées avec
  // un badge "freeLocked" pour un membre gratuit, et affichent leur propre
  // message d'explication (CoachOnlyGate) au clic plutôt qu'un blocage muet.
  const tabs = isCoach ? COACH_TABS : CLIENT_TABS;
  const rawSidebar = isCoach ? COACH_SIDEBAR : CLIENT_SIDEBAR;
  // L'onglet "Cycle" n'a de sens que pour une cliente dont la fiche indique
  // le genre "Femme" — retiré du rendu tant qu'on ne le sait pas, plutôt que
  // de le masquer en CSS (la page /cycle redirige de toute façon sinon).
  const withoutCycle = showCycle
    ? rawSidebar
    : rawSidebar.map((g) => ({ ...g, items: g.items.filter((item) => item.segment !== "cycle") }));
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

  function isSidebarActive(segment: string): boolean {
    if (segment === "") return pathname === base;
    return pathname.startsWith(`${base}/${segment}`);
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
    if (activeTab.exactMatch) {
      return [
        ...(sidebar.find((g) => g.group === "Administration")?.items ?? []),
        ...(sidebar.find((g) => g.group === "Compte")?.items ?? []),
      ];
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

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardNav({
  children,
  initialIsFreeTier = false,
}: {
  children: React.ReactNode;
  initialIsFreeTier?: boolean;
}) {
  const [isFreeTier, setIsFreeTier] = useState(initialIsFreeTier);
  const [showCycleTab, setShowCycleTab] = useState(false);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const { isCoach, base, tabs, sidebar, isTabActive, isSidebarActive, mobileSubItems } =
    useNavState(isFreeTier, showCycleTab, isPlatformOwner);
  const router = useRouter();

  // Aplati tabs + sidebar en une seule liste {label, href} pour la palette
  // de commande (Cmd/Ctrl+K) — pas de nouvelle source de vérité, juste la
  // nav déjà calculée ci-dessus, réutilisée telle quelle.
  const commandPaletteNavItems = useMemo(
    () => [
      ...tabs.map((t) => ({ label: t.label, href: t.href })),
      ...sidebar.flatMap((g) =>
        g.items.map(({ label, segment, href: hrefOverride }) => ({
          label,
          href: hrefOverride ?? (segment ? `${base}/${segment}` : base),
        }))
      ),
    ],
    [tabs, sidebar, base]
  );
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

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
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // Prefetch de toute la nav visible, pas seulement de 3 ou 4 routes fixes :
  // au clic sur un onglet, le RSC payload est déjà en cache et la page
  // s'affiche sans le temps d'attente perceptible qu'il y avait avant.
  // Les onglets du bas (ou du haut sur desktop) partent tout de suite, le
  // reste de la sidebar est étalé ensuite pour ne pas déclencher une rafale
  // de requêtes pendant le rendu initial de la page courante.
  // Sérialisés en chaîne : `tabs`/`sidebar` sont recalculés à chaque rendu
  // (nouvelles références), les passer tels quels en dépendances relancerait
  // le prefetch en boucle. La chaîne, elle, ne change que si la nav change.
  const tabHrefsKey = tabs.map((t) => t.href).join("|");
  const sidebarHrefsKey = sidebar
    .flatMap((g) => g.items.map(({ segment, href }) => href ?? (segment ? `${base}/${segment}` : base)))
    .join("|");

  useEffect(() => {
    const tabHrefs = tabHrefsKey ? tabHrefsKey.split("|") : [];
    const sidebarHrefs = sidebarHrefsKey ? sidebarHrefsKey.split("|") : [];
    const seen = new Set<string>();
    const rest: string[] = [];

    tabHrefs.forEach((href) => {
      if (seen.has(href)) return;
      seen.add(href);
      router.prefetch(href);
    });
    sidebarHrefs.forEach((href) => {
      if (seen.has(href)) return;
      seen.add(href);
      rest.push(href);
    });

    let i = 0;
    // Une route toutes les ~120 ms : la nav entière est chaude en quelques
    // secondes sans jamais saturer la connexion au chargement initial.
    const timer = setInterval(() => {
      if (i >= rest.length) {
        clearInterval(timer);
        return;
      }
      router.prefetch(rest[i]);
      i += 1;
    }, 120);

    return () => clearInterval(timer);
  }, [tabHrefsKey, sidebarHrefsKey, router]);

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
    supabase.auth.getUser().then(({ data: { user } }) => {
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
          width: 220,
          background: "rgba(6,0,0,0.88)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRight: "1px solid rgba(224,30,30,0.1)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 28, paddingBottom: 24, position: "relative" }}>
          <EPLogo size="md" showCoaching />
          <div style={{ position: "absolute", right: 14, top: 24 }}>
            <NotificationBell />
          </div>
        </div>

        <div className="ep-divider-subtle" style={{ margin: "0 16px 8px" }} />

        {/* Sidebar nav */}
        <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
          {sidebar.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.group && (
                <p style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(245,237,237,0.18)",
                  padding: "14px 10px 5px",
                  margin: 0,
                }}>
                  {group.group}
                </p>
              )}
              {group.items.map(({ label, icon: Icon, segment, badge, href: hrefOverride, locked }, i) => {
                const active = isSidebarActive(segment);
                const href = hrefOverride ?? (segment ? `${base}/${segment}` : base);
                const count = getBadgeCount(badge);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="animate-fade-up ep-nav-link"
                    style={{
                      animationDelay: `${(gi * 3 + i) * 30}ms`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      marginBottom: 1,
                      position: "relative",
                      color: active ? "#F5EDED" : "rgba(245,237,237,0.32)",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "rgba(224,30,30,0.05)";
                      el.style.color = "rgba(245,237,237,0.65)";
                    }}
                    onMouseLeave={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "transparent";
                      el.style.color = "rgba(245,237,237,0.32)";
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
                          background: "rgba(224,30,30,0.1)",
                          borderLeft: "2px solid #E01E1E",
                        }}
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.7}
                      style={{ color: active ? "#E01E1E" : "inherit", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1 }}>{label}</span>
                    {locked && (
                      <Lock size={11} style={{ color: "rgba(245,237,237,0.25)", flexShrink: 0 }} strokeWidth={2} />
                    )}
                    {count > 0 && (
                      <span
                        className="animate-pulse-glow animate-badge-pop"
                        style={{
                          background: "#E01E1E",
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
        <div style={{ borderTop: "1px solid rgba(224,30,30,0.08)", padding: "14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #E01E1E, #890404)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#F5EDED",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(224,30,30,0.25)",
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#F5EDED",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {userName ?? "…"}
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(245,237,237,0.28)",
                textTransform: "capitalize",
              }}>
                {userRole ?? "…"}
              </div>
            </div>
          </div>

          {userRole === "coach" && hasPersonalCoach && (
            <Link
              href={isCoach ? "/dashboard/client" : "/dashboard/coach"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "rgba(245,237,237,0.4)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 2,
              }}
              className="ep-nav-link"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "#E01E1E";
                el.style.background = "rgba(224,30,30,0.07)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "rgba(245,237,237,0.4)";
                el.style.background = "transparent";
              }}
            >
              <ArrowLeftRight size={14} strokeWidth={1.7} />
              {isCoach ? "Mon coaching perso" : "Mon espace coach"}
            </Link>
          )}

          {userRole === "client" && (
            <Link
              href="/dashboard/client/abonnement"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "rgba(245,237,237,0.4)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 2,
              }}
              className="ep-nav-link"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "#E01E1E";
                el.style.background = "rgba(224,30,30,0.07)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "rgba(245,237,237,0.4)";
                el.style.background = "transparent";
              }}
            >
              <Crown size={14} strokeWidth={1.7} />
              Mon coaching
            </Link>
          )}

          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "rgba(245,237,237,0.22)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#E01E1E";
              el.style.background = "rgba(224,30,30,0.07)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "rgba(245,237,237,0.22)";
              el.style.background = "transparent";
            }}
          >
            <LogOut size={14} strokeWidth={1.7} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main
        style={{
          marginLeft: isDesktop ? 220 : 0,
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
        {!isDesktop && mobileSubItems.length > 1 && (
          <nav
            style={{
              position: "sticky",
              top: 0,
              zIndex: 30,
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
              padding: "10px 12px",
              background: "rgba(6,0,0,0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(224,30,30,0.1)",
            }}
          >
            {mobileSubItems.map(({ label, icon: Icon, segment, badge, href: hrefOverride, locked }) => {
              const active = isSidebarActive(segment);
              const href = hrefOverride ?? (segment ? `${base}/${segment}` : base);
              const count = getBadgeCount(badge);
              return (
                <Link
                  key={href}
                  href={href}
                  className="ep-nav-link"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: active ? "rgba(224,30,30,0.14)" : "rgba(245,237,237,0.04)",
                    color: active ? "#E01E1E" : "rgba(245,237,237,0.45)",
                    fontWeight: active ? 700 : 600,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    border: active ? "1px solid rgba(224,30,30,0.3)" : "1px solid transparent",
                    position: "relative",
                  }}
                >
                  <Icon size={13} strokeWidth={active ? 2.2 : 1.7} />
                  {label}
                  {locked && <Lock size={10} style={{ flexShrink: 0 }} strokeWidth={2} />}
                  {count > 0 && (
                    <span
                      className="animate-badge-pop"
                      style={{
                        background: "#E01E1E",
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
        )}

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
              <Link
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
                        background: "rgba(224,30,30,0.14)",
                      }}
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.3 : 1.6}
                    style={{
                      color: active ? "#E01E1E" : "rgba(245,237,237,0.28)",
                      transition: "color 0.2s, stroke-width 0.2s",
                    }}
                  />
                  {count > 0 && (
                    <span className="animate-badge-pop" style={{
                      position: "absolute",
                      top: 1,
                      right: 3,
                      background: "#E01E1E",
                      color: "#fff",
                      borderRadius: "50%",
                      width: 15,
                      height: 15,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      border: "1.5px solid #070000",
                    }}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.03em",
                  color: active ? "#E01E1E" : "rgba(245,237,237,0.28)",
                  transition: "color 0.2s",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}>
                  {tab.label}
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
