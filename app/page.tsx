import dynamic from "next/dynamic"
import Hero from "@/components/home/HeroSection"
import Navbar from "@/components/layout/Navbar"
import { getGaleriaFotos } from "@/lib/galeria"

// Componentes below-the-fold: carga diferida para no bloquear el render inicial
const AboutTeam = dynamic(() => import("@/components/home/AboutTeam"), { ssr: true })
const RemeraSection = dynamic(() => import("@/components/remera/RemeraSection"), { ssr: true })
const RouteMap = dynamic(() => import("@/components/home/RouteMap"), { ssr: true })
const Gallery = dynamic(() => import("@/components/home/Gallery"), { ssr: true })
const Sponsors = dynamic(() => import("@/components/home/Sponsors"), { ssr: true })
const CallToAction = dynamic(() => import("@/components/home/CallToAction"), { ssr: true })
const Footer = dynamic(() => import("@/components/layout/Footer"), { ssr: true })

// Revalidar cada 60s para que las fotos publicadas desde /admin/galeria
// aparezcan sin necesidad de un redeploy.
export const revalidate = 60

export default async function Home() {
  // Se leen en el servidor (build/SSR): primero las fotos publicadas desde
  // /admin/galeria, luego public/fotos equipo. Si no hay nada, la galería usa
  // su respaldo interno.
  const teamPhotos = await getGaleriaFotos()

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <AboutTeam />
      <RemeraSection />
      <RouteMap />
      <Gallery images={teamPhotos} />
      <Sponsors />
      <CallToAction />
      <Footer />
    </main>
  )
}
