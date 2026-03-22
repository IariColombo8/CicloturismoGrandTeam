import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inscripción",
  description: "Formulario de inscripción para el 1er Cicloturismo Ruinas del Viejo Molino. Completá tus datos y asegurá tu lugar.",
}

export default function InscripcionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
