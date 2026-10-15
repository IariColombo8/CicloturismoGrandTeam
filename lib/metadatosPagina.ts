import type { Metadata } from "next"

/**
 * Metadatos de cada página pública, con su propia imagen de vista previa.
 *
 * La imagen importa más de lo que parece: estos links se comparten por
 * WhatsApp, y antes todos mostraban la misma pieza del evento. El de "Mi QR"
 * se veía igual que el de la inscripción, así que no se entendía cuál era cuál.
 * Las imágenes se arman con `node scripts/generar-og.mjs`.
 */

interface DatosPagina {
  titulo: string
  descripcion: string
  /** Archivo dentro de /public/og. */
  imagen: string
  ruta: string
}

export function metadatosPagina({ titulo, descripcion, imagen, ruta }: DatosPagina): Metadata {
  const tituloCompleto = `${titulo} · Cicloturismo Ruinas del Viejo Molino`
  const imagenes = [
    {
      url: `/og/${imagen}`,
      width: 1200,
      height: 630,
      alt: tituloCompleto,
    },
  ]

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: ruta,
      siteName: "Grand Team Bike",
      title: tituloCompleto,
      description: descripcion,
      images: imagenes,
    },
    twitter: {
      card: "summary_large_image",
      title: tituloCompleto,
      description: descripcion,
      images: imagenes,
    },
  }
}
