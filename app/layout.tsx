import VisitBeacon from "@/components/VisitBeacon";
import StaleBuildGuard from "@/components/StaleBuildGuard";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import AccessibilityMotionConfig from "@/components/ui/AccessibilityMotionConfig";
import { ACCESSIBILITY_INIT_SCRIPT } from "@/lib/accessibility";
import { AMBIANCE_INIT_SCRIPT } from "@/lib/theme-color";
import ConfirmDialogProvider from "@/components/ui/ConfirmDialogProvider";
import NavTrailTracker from "@/components/ui/NavTrailTracker";
import "./globals.css";

// Polices servies depuis le dépôt (polices variables latin, mêmes fichiers
// que Google Fonts) : next/font/google fait échouer le build Turbopack par
// intermittence (« next/font/google queries have exactly one entry »).
const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  variable: "--font-montserrat",
  weight: "400 900",
});

const playfair = localFont({
  src: [
    { path: "./fonts/playfair-latin.woff2", style: "normal", weight: "400 700" },
    { path: "./fonts/playfair-latin-italic.woff2", style: "italic", weight: "400 700" },
  ],
  variable: "--font-playfair",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
const SITE_TITLE = "EP Coaching";
const SITE_DESCRIPTION =
  "La communauté et tous les outils pour enfin atteindre ton objectif. Gratuit dès aujourd'hui.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EP",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "EP Coaching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // maximumScale seul ne suffit pas : Safari iOS zoome quand même au focus
  // d'un champ, puis dézoome à la perte du focus (déjà limité en forçant
  // 16px sur les champs mobiles dans globals.css, mais ça reste fragile —
  // un futur champ oublié reproduirait le bug). userScalable=false coupe le
  // zoom entièrement, dans une appli ce n'est pas un site de contenu où le
  // zoom d'accessibilité est attendu.
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning : le script de <head> peut poser
    // data-text-scale / data-reduce-motion sur <html> avant l'hydratation
    // (Paramètres > Accessibilité), le DOM doit alors l'emporter.
    <html lang="fr" className={`${montserrat.variable} ${playfair.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AMBIANCE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {/* "Mouvement réduit" (app/globals.css) couvre déjà les animations
            CSS (classes .animate-*, transitions Tailwind) via
            @media (prefers-reduced-motion: reduce), mais Framer Motion ne
            lit jamais cette media query de lui-même : les 5 endroits qui
            l'utilisent (assistant de création programme/repas, questionnaire
            + tour d'onboarding, pastille active de la nav) continuaient à
            faire glisser/translater leur contenu même pour qui a explicitement
            demandé moins de mouvement au niveau OS (motion sickness, trouble
            vestibulaire) — un seul point de réglage ici plutôt que 5 fixes
            dispersés. reducedMotion="user" est l'API native de Framer Motion
            pour ça : elle respecte la préférence système en temps réel et
            neutralise transforms/layout animations (translateX, la pastille
            de nav qui glisse via layoutId) tout en gardant les fondus
            d'opacité, exactement la même doctrine que le bloc CSS existant.
            AccessibilityMotionConfig force en plus le mode réduit quand il
            est activé dans Paramètres > Accessibilité. */}
        {/* Fil des pages vues dans l'onglet, pour les boutons « Retour » (lib/nav-trail.ts). */}
        <NavTrailTracker />
        {/* Visites des pages publiques, sans cookie (lib/visit-tracking.ts). */}
        <VisitBeacon />
        {/* Appli rouverte après une mise à jour : rechargement propre (lib/stale-build.ts). */}
        <StaleBuildGuard />
        <AccessibilityMotionConfig>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </AccessibilityMotionConfig>
      </body>
    </html>
  );
}
