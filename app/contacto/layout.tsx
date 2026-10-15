import { metadatosPagina } from "@/lib/metadatosPagina"

export const metadata = metadatosPagina({
  titulo: "Contacto",
  descripcion:
    "¿Tenés dudas sobre el cicloturismo? Escribinos y te respondemos. Equipo Grand Team Bike, Concepción del Uruguay, Entre Ríos.",
  imagen: "contacto.png",
  ruta: "/contacto",
})

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
