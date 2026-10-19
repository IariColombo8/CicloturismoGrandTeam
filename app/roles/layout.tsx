import { metadatosPagina } from "@/lib/metadatosPagina"

/**
 * Metadatos de /roles. La pagina es un componente de cliente y no puede
 * exportar `metadata`, asi que van aca.
 *
 * `robots: noindex`: la lista tiene nombres de la gente del equipo y se
 * comparte por link, no se publica. La vista previa de WhatsApp igual funciona
 * (eso no depende de la indexacion), que es como circula el link.
 */
export const metadata = {
  ...metadatosPagina({
    titulo: "Quién hace qué",
    descripcion:
      "La lista del equipo para el día del evento: quién pedalea, quién ayuda, quién ayuda sin pedalear y quién lleva familiares para dar una mano.",
    imagen: "roles.png",
    ruta: "/roles",
  }),
  robots: { index: false, follow: false },
}

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
