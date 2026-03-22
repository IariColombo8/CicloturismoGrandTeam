import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contactá al equipo Grand Team Bike. Estamos para responder tus consultas sobre el evento de cicloturismo.",
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
