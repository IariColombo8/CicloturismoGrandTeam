import dynamic from "next/dynamic"
import Hero from "@/components/home/HeroSection"
import Navbar from "@/components/layout/Navbar"
import { getTeamPhotos } from "@/lib/teamPhotos"

// Componentes below-the-fold: carga diferida para no bloquear el render inicial
const AboutTeam = dynamic(() => import("@/components/home/AboutTeam"), { ssr: true })
const RouteMap = dynamic(() => import("@/components/home/RouteMap"), { ssr: true })
const Gallery = dynamic(() => import("@/components/home/Gallery"), { ssr: true })
const Sponsors = dynamic(() => import("@/components/home/Sponsors"), { ssr: true })
const CallToAction = dynamic(() => import("@/components/home/CallToAction"), { ssr: true })
const Footer = dynamic(() => import("@/components/layout/Footer"), { ssr: true })

export default function Home() {
  // Se leen en el servidor (build/SSR). Si la carpeta está vacía, la galería
  // usa su respaldo interno.
  const teamPhotos = getTeamPhotos()

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <AboutTeam />
      <RouteMap />
      <Gallery images={teamPhotos} />
      <Sponsors />
      <CallToAction />
      <Footer />
    </main>
  )
}
