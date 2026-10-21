// Pasa una imagen por el optimizador de Next (/_next/image) cuando se puede.
//
// Por que: los 52 logos de sponsors viven en Supabase Storage, que los sirve
// con `Cache-Control: no-cache` y en el tamaño original (fotos de celular de
// 100 KB a 2 MB para una tarjeta de 160 px). Se bajaban enteros en cada visita
// y eran la mayor parte de los 19 MB que medía PageSpeed en la home.
//
// Pasados por /_next/image salen en AVIF/WebP, al ancho que de verdad se
// muestra y con cache de un año (`minimumCacheTTL` en next.config.mjs), sin
// tocar nada en Supabase ni en el panel.
//
// Regla de oro: si la URL no se puede optimizar (un host que no está en
// `images.remotePatterns`, un data: URI, una ruta rara), se devuelve tal cual.
// Nunca se rompe una imagen por intentar achicarla; a lo sumo pesa como antes.

// Anchos permitidos: tienen que estar en `deviceSizes` o `imageSizes` de
// next.config.mjs o el optimizador responde 400.
const ANCHOS = [16, 32, 48, 64, 96, 128, 256, 640, 750, 828, 1080, 1200]

// Calidades permitidas (`images.qualities` en next.config.mjs).
const CALIDADES = [40, 65, 75, 85]

// Hosts que next.config.mjs declara en remotePatterns. Si cambia uno, cambia
// el otro: una URL que no matchee devuelve 400 y la imagen no se ve.
function hostOptimizable(host: string): boolean {
  return (
    host.endsWith(".supabase.co") ||
    host === "drive.google.com" ||
    host === "lh3.googleusercontent.com"
  )
}

// El sitio se referencia a sí mismo en varios lados (content_settings guarda
// URLs absolutas tipo https://grand-team.vercel.app/remerab.png). Esas se
// vuelven rutas relativas para que el optimizador las tome como estáticas.
function esElPropioSitio(host: string): boolean {
  if (typeof window !== "undefined" && host === window.location.host) return true

  const propio = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grand-team.vercel.app"
  try {
    return host === new URL(propio).host
  } catch {
    return false
  }
}

function anchoPermitido(ancho: number): number {
  return ANCHOS.find((a) => a >= ancho) ?? ANCHOS[ANCHOS.length - 1]
}

function calidadPermitida(calidad: number): number {
  return CALIDADES.find((c) => c >= calidad) ?? CALIDADES[CALIDADES.length - 1]
}

/**
 * Devuelve la URL servida por /_next/image, o la original si no se puede.
 *
 * @param src    URL de la imagen (relativa, absoluta o data:).
 * @param ancho  Ancho en píxeles al que se va a mostrar (se redondea al
 *               permitido inmediatamente superior).
 */
export function urlOptimizada(
  src: string | null | undefined,
  ancho = 256,
  calidad = 65,
): string {
  const valor = src?.trim()
  if (!valor) return ""

  // Un SVG embebido ya pesa lo que pesa y el optimizador no los procesa.
  if (valor.startsWith("data:") || valor.startsWith("blob:")) return valor

  let ruta = valor

  if (/^https?:\/\//i.test(valor)) {
    let url: URL
    try {
      url = new URL(valor)
    } catch {
      return valor
    }

    if (esElPropioSitio(url.host)) {
      ruta = `${url.pathname}${url.search}`
    } else if (!hostOptimizable(url.host)) {
      return valor
    }
  } else if (!valor.startsWith("/")) {
    // Ruta relativa sin barra: no se sabe contra qué resolverla.
    return valor
  }

  const w = anchoPermitido(ancho)
  const q = calidadPermitida(calidad)

  return `/_next/image?url=${encodeURIComponent(ruta)}&w=${w}&q=${q}`
}

/**
 * srcSet de 1x y 2x para pantallas de alta densidad (casi todos los celulares).
 * Sin esto, los logos se ven borrosos en un teléfono moderno.
 */
export function srcSetOptimizado(
  src: string | null | undefined,
  ancho = 256,
  calidad = 65,
): string | undefined {
  const x1 = urlOptimizada(src, ancho, calidad)
  if (!x1.startsWith("/_next/image")) return undefined

  const x2 = urlOptimizada(src, ancho * 2, calidad)
  return x1 === x2 ? undefined : `${x1} 1x, ${x2} 2x`
}
