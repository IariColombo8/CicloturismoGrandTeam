import { metadatosPagina } from "@/lib/metadatosPagina"

/**
 * La aclaración de "solo a domicilio y después del evento" va en la propia
 * descripción: es lo que más preguntan, y así se lee antes de entrar.
 */
export const metadata = metadatosPagina({
  titulo: "Pedir la remera",
  descripcion:
    "Hacé tu pedido de la remera oficial del Cicloturismo Ruinas del Viejo Molino. Aclaración: solo con envío a domicilio y la entrega es después del evento.",
  imagen: "remera.png",
  ruta: "/pedir-remera",
})

export default function PedirRemeraLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
