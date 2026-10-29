import type { ReactNode } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

/**
 * Marco comun de /privacidad y /terminos.
 * Google pide las dos URLs publicas para publicar la app OAuth de Gmail.
 */
export default function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string
  actualizado: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <h1 className="text-3xl font-bold text-yellow-400 sm:text-4xl">{titulo}</h1>
        <p className="mt-2 text-sm text-gray-400">Última actualización: {actualizado}</p>
        <div className="mt-8 space-y-4 break-words text-[15px] leading-relaxed text-gray-300 [&_a]:text-yellow-400 [&_a]:underline [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
