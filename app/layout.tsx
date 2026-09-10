import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { MotionConfig } from "framer-motion";
import ConfirmDialogProvider from "@/components/ui/ConfirmDialogProvider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
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
  themeColor: "#E01E1E",
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
    <html lang="fr" className={`${montserrat.variable} ${playfair.variable} h-full`}>
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
            d'opacité, exactement la même doctrine que le bloc CSS existant. */}
        <MotionConfig reducedMotion="user">
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
