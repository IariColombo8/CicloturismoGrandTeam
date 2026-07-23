import type React from "react"
import type { Metadata } from "next"
import { Geist, Bebas_Neue } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/components/providers/AppProviders"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-geist",
})

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bebas",
})

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://grandteambike.com.ar"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Grand Team Bike 2026 · 1er Cicloturismo Ruinas del Viejo Molino",
    template: "%s · Grand Team Bike",
  },

  description:
    "Inscribite al 1er Cicloturismo Ruinas del Viejo Molino en Concepción del Uruguay. 50 km de aventura, seguro incluido, hidratación y apoyo mecánico. Cupos limitados.",

  applicationName: "Grand Team Bike",
  generator: "v0.app",

  keywords: [
    "cicloturismo",
    "Grand Team Bike",
    "Concepción del Uruguay",
    "Entre Ríos",
    "Ruinas del Viejo Molino",
    "bicicleta",
    "evento ciclismo Argentina",
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

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Grand Team Bike",

    title: "Grand Team Bike 2026 · Cicloturismo Ruinas del Viejo Molino",

    description:
      "50 km de aventura por Entre Ríos. Inscribite ahora. Cupos limitados.",

    images: [
      {
        url: "/METADATOS.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Grand Team Bike 2026 - Cicloturismo Ruinas del Viejo Molino",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Grand Team Bike 2026 · Cicloturismo",

    description:
      "50 km de aventura por Entre Ríos. Inscribite al 1er Cicloturismo Ruinas del Viejo Molino.",

    images: ["/METADATOS.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",

  name: "1er Cicloturismo Ruinas del Viejo Molino",

  description:
    "Cicloturismo de 50 km en Concepción del Uruguay, Entre Ríos. Aventura, comunidad y paisajes únicos.",

  startDate: "2026-11-15T08:00:00-03:00",

  eventStatus: "https://schema.org/EventScheduled",

  eventAttendanceMode:
    "https://schema.org/OfflineEventAttendanceMode",

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

  image: [`${SITE_URL}/METADATOS.png`],

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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
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
  )
}