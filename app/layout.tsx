import "./globals.css"
import { Inter, Poppins } from "next/font/google"

// Configura las fuentes
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
})

const poppins = Poppins({ 
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
})

export const metadata = {
  // Metadatos básicos
  title: {
    default: "Grand Team Bike 2026 - Evento de Cicloturismo",
    template: "%s | Grand Team Bike 2026"
  },
  description: "Únete al evento de ciclismo más emocionante de la región. Grand Team Bike 2026 en Ruinas del Viejo Molino. Vive una experiencia única sobre ruedas con rutas espectaculares, premios increíbles y una comunidad apasionada por el ciclismo. ¡Inscríbete ahora!",
  keywords: [
    "ciclismo",
    "cicloturismo", 
    "grand team bike",
    "evento deportivo",
    "bicicleta",
    "ruinas del viejo molino",
    "competencia ciclismo",
    "ciclismo 2026",
    "evento ciclístico"
  ],
  authors: [{ name: "Grand Team Bike" }],
  creator: "Grand Team Bike",
  publisher: "Grand Team Bike",

  // Metadatos para redes sociales (Open Graph - Facebook, WhatsApp, LinkedIn)
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://grandteambike.com",
    siteName: "Grand Team Bike 2026",
    title: "Grand Team Bike 2026 - Evento de Cicloturismo",
    description: "🚴‍♂️ El evento de ciclismo más emocionante de la región. Grand Team Bike 2026 en Ruinas del Viejo Molino. Rutas espectaculares, premios increíbles y una comunidad apasionada. ¡Inscríbete ahora y vive la aventura!",
    images: [
      {
        url: "/og-image.jpg", // Imagen principal para compartir (1200x630px recomendado)
        width: 1200,
        height: 630,
        alt: "Grand Team Bike 2026 - Evento de Cicloturismo",
      },
      {
        url: "/og-image-square.jpg", // Imagen cuadrada alternativa (opcional)
        width: 800,
        height: 800,
        alt: "Grand Team Bike 2026",
      }
    ],
  },

  // Metadatos para Twitter
  twitter: {
    card: "summary_large_image",
    title: "Grand Team Bike 2026 - Evento de Cicloturismo",
    description: "🚴‍♂️ El evento de ciclismo más emocionante de la región. Grand Team Bike 2026 en Ruinas del Viejo Molino. Rutas espectaculares, premios increíbles y una comunidad apasionada. ¡Inscríbete ahora!",
    images: ["/twitter-image.jpg"], // 1200x600px recomendado
    creator: "@grandteambike", // Tu usuario de Twitter
    site: "@grandteambike",
  },

  // Metadatos para WhatsApp (usa Open Graph)
  // WhatsApp tomará automáticamente los datos de openGraph

  // Favicon y iconos
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/apple-touch-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Configuración de viewport
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },

  // Verificación de sitio (opcional)
  verification: {
    google: "tu-codigo-de-verificacion-google", // Reemplaza con tu código
    // yandex: "codigo-yandex",
    // bing: "codigo-bing",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Información adicional
  category: "sports",
  
  // Manifest para PWA (opcional)
  manifest: "/manifest.json",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Meta tags adicionales que no están en metadata */}
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}