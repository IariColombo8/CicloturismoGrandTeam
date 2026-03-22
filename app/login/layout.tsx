import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Acceso al panel de administración de Grand Team Bike 2026.",
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
