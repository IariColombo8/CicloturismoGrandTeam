import type { Metadata } from "next"

/**
 * Metadatos propios de /mi-qr.
 *
 * La página es un componente de cliente y no puede exportar `metadata`, así que
 * van acá. Importa porque este link se comparte por WhatsApp entre los
 * inscriptos: la vista previa tiene que decir para qué sirve la página, en vez
 * de repetir la descripción del evento como si fuera la inscripción.
 */

const TITULO = "Mi inscripción y mi QR"
const DESCRIPCION =
  "Consultá el estado de tu inscripción al Cicloturismo Ruinas del Viejo Molino y descargá tu código QR para la acreditación del día del evento. Solo necesitás tu DNI."

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/mi-qr" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/mi-qr",
    siteName: "Grand Team Bike",
    title: `${TITULO} · Cicloturismo Ruinas del Viejo Molino`,
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITULO} · Cicloturismo Ruinas del Viejo Molino`,
    description: DESCRIPCION,
  },
}

export default function MiQRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
