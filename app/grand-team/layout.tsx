import { metadatosPagina } from "@/lib/metadatosPagina"

export const metadata = metadatosPagina({
  titulo: "Grand Team Bike",
  descripcion:
    "El grupo que organiza el cicloturismo Ruinas del Viejo Molino, en Concepción del Uruguay, Entre Ríos. Conocé a la comunidad ciclista.",
  imagen: "grand-team.png",
  ruta: "/grand-team",
})

export default function GrandTeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
