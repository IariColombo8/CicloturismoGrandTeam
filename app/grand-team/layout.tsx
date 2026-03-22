import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Grand Team",
  description: "Conocé al equipo Grand Team Bike. Información sobre nuestros miembros y la comunidad ciclista.",
}

export default function GrandTeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
