import type React from "react";
import type { Metadata } from "next";
import { Geist, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { EVENTO } from "@/lib/constants";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-geist",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bebas",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://grand-team.vercel.app";

const OG_IMAGE = `${SITE_URL}/METADATOS.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Grand Team Bike 2026 · 1er Cicloturismo Ruinas del Viejo Molino",
    template: "%s · Grand Team Bike",
  },

  description:
    "Inscribite al 1er Cicloturismo Ruinas del Viejo Molino en Concepción del Uruguay. 50 km de aventura, seguro incluido, hidratación y apoyo mecánico. Cupos limitados.",

  applicationName: "Grand Team Bike",

  generator: "Next.js",

  creator: "Grand Team Bike",

  publisher: "Grand Team Bike",

  category: "Sports",

  manifest: "/manifest.json",

  keywords: [
    "cicloturismo",
    "Grand Team Bike",
    "Concepción del Uruguay",
    "Entre Ríos",
    "Ruinas del Viejo Molino",
    "bicicleta",
    "evento ciclismo",
    "Argentina",
    "inscripción 2026",
  ],

  authors: [
    {
      name: "Grand Team Bike",
    },
  ],

  alternates: {
    canonical: "/",
  },

  // Verificacion de propiedad en Google Search Console (etiqueta HTML).
  verification: {
    google: "CK0oGylO6ZC1nk3qv2MBgRNxzQ3LM7dn60Mw-vW6lik",
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    // El de iOS va con fondo negro propio: iOS no respeta la transparencia y,
    // con el logo de letras negras, el nombre del evento desaparecia.
    apple: "/app/apple-touch-icon.png",
  },

  // Nombre y barra de estado cuando se instala en un iPhone. Sin esto, iOS
  // usa el <title> entero, que no entra debajo del icono.
  appleWebApp: {
    capable: true,
    title: "Cicloturismo",
    statusBarStyle: "black-translucent",
  },

  openGraph: {
    type: "website",

    locale: "es_AR",

    url: SITE_URL,

    siteName: "Grand Team Bike",

    title: "Grand Team Bike 2026 · 1er Cicloturismo Ruinas del Viejo Molino",

    description:
      "50 km de aventura por Entre Ríos. Inscribite ahora. Cupos limitados.",

    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Grand Team Bike 2026 · Cicloturismo Ruinas del Viejo Molino",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Grand Team Bike 2026 · Cicloturismo Ruinas del Viejo Molino",

    description: "50 km de aventura por Entre Ríos. Inscribite ahora.",

    images: [OG_IMAGE],

    creator: "@GrandTeamBike",
  },

  robots: {
    index: true,

    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  other: {
    "og:image:secure_url": OG_IMAGE,
    "og:image:type": "image/png",
    "og:image:width": "1200",
    "og:image:height": "630",
    "theme-color": "#000000",
  },
};

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",

  name: "1er Cicloturismo Ruinas del Viejo Molino",

  description: "Cicloturismo de 50 km en Concepción del Uruguay, Entre Ríos.",

  // Sale de lib/constants.ts para que no vuelva a quedar desfasada: estuvo
  // anunciando el 15 de noviembre mientras el resto del sitio (y la remera)
  // decia 8 de noviembre.
  startDate: `${EVENTO.fecha}-03:00`,

  eventStatus: "https://schema.org/EventScheduled",

  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",

  image: [OG_IMAGE],

  location: {
    "@type": "Place",

    name: "Concepción del Uruguay",

    address: {
      "@type": "PostalAddress",
      addressLocality: "Concepción del Uruguay",
      addressRegion: "Entre Ríos",
      addressCountry: "AR",
    },
  },

  organizer: {
    "@type": "Organization",
    name: "Grand Team Bike",
    url: SITE_URL,
  },

  offers: {
    "@type": "Offer",
    url: `${SITE_URL}/inscripcion`,
    availability: "https://schema.org/InStock",
    priceCurrency: "ARS",
    validFrom: "2026-01-01",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Sin JavaScript, los bloques que aparecen al hacer scroll se quedarian
            invisibles (arrancan con opacity 0 y la clase la pone el observer).
            Esta regla los muestra tal cual, sin animacion. */}
        <noscript>
          <style>{`.gt-revelar{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body
        className={`${geist.variable} ${bebasNeue.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventJsonLd),
          }}
        />
      </body>
    </html>
  );
}
