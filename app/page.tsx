import dynamic from "next/dynamic"
import Hero from "@/components/home/HeroSection"
import Navbar from "@/components/layout/Navbar"

// Componentes below-the-fold: carga diferida para no bloquear el render inicial
const AboutTeam = dynamic(() => import("@/components/home/AboutTeam"), { ssr: true })
const RouteMap = dynamic(() => import("@/components/home/RouteMap"), { ssr: true })
const Gallery = dynamic(() => import("@/components/home/Gallery"), { ssr: true })
const Sponsors = dynamic(() => import("@/components/home/Sponsors"), { ssr: true })
const CallToAction = dynamic(() => import("@/components/home/CallToAction"), { ssr: true })
const Footer = dynamic(() => import("@/components/layout/Footer"), { ssr: true })

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <AboutTeam />
      <RouteMap />
      <Gallery />
      <Sponsors />
      <CallToAction />
      <Footer />
    </main>
  )
}
