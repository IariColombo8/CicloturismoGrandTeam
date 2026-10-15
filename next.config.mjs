import { execSync } from 'node:child_process'

// Version del sitio: el commit en Vercel y, en local, el commit de git.
//
// Sirve para dos cosas: nombrar la cache del Service Worker (asi cada deploy
// empieza con una cache limpia) y que el navegador pueda darse cuenta de que
// esta mostrando una version vieja y avisarle a la persona.
//
// Tiene que ser **el mismo valor en todo el build**. Antes salia de
// `new Date()`, y como next.config se carga varias veces durante el build, uno
// que cruzaba un cambio de minuto dejaba al navegador con una version y al
// servidor con otra: el cartel "Hicimos actualizaciones" aparecia sin que
// hubiera ninguna actualizacion.
// execSync se importa arriba y no con require: este archivo es un modulo ES,
// donde `require` no existe. Con require, el calculo caia siempre en el catch,
// la version quedaba en "dev" y el aviso de actualizaciones nunca aparecia.
function calcularVersion() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
  if (process.env.NEXT_PUBLIC_BUILD_ID) return process.env.NEXT_PUBLIC_BUILD_ID

  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    // Sin git (o sin commits todavia): el aviso de version queda apagado.
    return 'dev'
  }
}

const VERSION_SITIO = calcularVersion()

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: VERSION_SITIO,
  },
  generateBuildId: () => VERSION_SITIO,
  // Comprimir respuestas del servidor
  compress: true,
  // Optimizacion de imagenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Calidades permitidas: requerido a partir de Next.js 16
    qualities: [40, 65, 75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      // API routes: sin cache
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // Assets estaticos: cache largo
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Imagenes: cache medio
      {
        source: '/sponsor/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Paginas: cache corto con revalidacion
      {
        source: '/((?!api|_next/static).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ]
  },
}

export default nextConfig
