import { metadatosPagina } from "@/lib/metadatosPagina"

/**
 * Metadatos de /sorteos. La página es un componente de cliente y no puede
 * exportar `metadata`, así que van acá.
 */
export const metadata = metadatosPagina({
  titulo: "Sorteos y ganadores",
  descripcion:
    "Mirá los premios que sorteamos entre todos los inscriptos al Cicloturismo Ruinas del Viejo Molino y los ganadores de cada sorteo del día del evento.",
  imagen: "sorteos.png",
  ruta: "/sorteos",
})

export default function SorteosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
