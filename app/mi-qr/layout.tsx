import { metadatosPagina } from "@/lib/metadatosPagina"

/**
 * Metadatos de /mi-qr. La página es un componente de cliente y no puede
 * exportar `metadata`, así que van acá.
 */
export const metadata = metadatosPagina({
  titulo: "Mi inscripción y mi QR",
  descripcion:
    "Consultá el estado de tu inscripción al Cicloturismo Ruinas del Viejo Molino y descargá tu código QR para la acreditación del día del evento. Solo necesitás tu DNI.",
  imagen: "mi-qr.png",
  ruta: "/mi-qr",
})

export default function MiQRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
