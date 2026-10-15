import { metadatosPagina } from "@/lib/metadatosPagina"

export const metadata = metadatosPagina({
  titulo: "Inscripción",
  descripcion:
    "Inscribite al 1er Cicloturismo Ruinas del Viejo Molino: 50 km el 8 de noviembre de 2026, en Concepción del Uruguay. Seguro, hidratación y apoyo mecánico incluidos.",
  imagen: "inscripcion.png",
  ruta: "/inscripcion",
})

export default function InscripcionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
