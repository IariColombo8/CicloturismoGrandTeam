import type React from "react"
import type { Metadata } from "next"
import { Geist, Bebas_Neue } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-geist",
})

// Fuente display atlética para titulos (H1/H2). Un solo peso, swap, sin
// bloquear el render. El cuerpo sigue usando Geist.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bebas",
})

// ────────────────────────────────────────────────────────────────────
// SEO · usá esta variable para tu dominio real cuando lo conozcas.
// Si tenés NEXT_PUBLIC_SITE_URL en .env, lo respeta.
// ────────────────────────────────────────────────────────────────────
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
  generator: "v0.app",
  applicationName: "Grand Team Bike",
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
  authors: [{ name: "Grand Team Bike" }],
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
      "50 km de aventura por Entre Ríos. Inscribite ahora, los cupos son limitados.",
    images: [
      {
        url: "/og-cover.jpg",
        width: 1200,
        height: 630,
        alt: "Grand Team Bike 2026 — Cicloturismo Ruinas del Viejo Molino",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grand Team Bike 2026 · Cicloturismo",
    description:
      "50 km de aventura por Entre Ríos. Inscribite al 1er Cicloturismo Ruinas del Viejo Molino.",
    images: ["/og-cover.jpg"],
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

// JSON-LD del evento (SportsEvent). Google lo muestra como tarjeta enriquecida
// con fecha, lugar y precio. Editá `startDate`/`location` cuando se confirmen.
const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: "1er Cicloturismo Ruinas del Viejo Molino",
  description:
    "Cicloturismo de 50 km en Concepción del Uruguay, Entre Ríos. Aventura, comunidad y paisajes únicos.",
  startDate: "2026-11-15T08:00:00-03:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
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
  image: [`${SITE_URL}/og-cover.jpg`],
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
      <body className={`${geist.variable} ${bebasNeue.variable} font-sans antialiased`}>
        <SupabaseProvider>
          {children}
          <Toaster />
        </SupabaseProvider>
        <Analytics />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      </body>
    </html>
  )
}
